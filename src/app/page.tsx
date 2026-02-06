'use client'

import { useState, useEffect, useCallback } from 'react'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Area, AreaChart } from 'recharts'
import { Moon, Sun, Settings, TrendingUp, TrendingDown, Activity, Zap, BarChart3, Clock, DollarSign, Send, Save, Loader2, Wallet, ExternalLink, Copy, Check, Radio, AlertTriangle } from 'lucide-react'
import { ConnectButton } from '@rainbow-me/rainbowkit'
import { useAccount, useBalance, useChainId, useSwitchChain } from 'wagmi'
import { formatEther } from 'viem'
import { supabase, saveTrade, getTrades, getStats, Trade as DBTrade } from '@/lib/supabase'
import { inkChain, inkSepolia } from '@/lib/wagmi'
import { useNado } from '@/hooks/useNado'

interface BotConfig {
  pair: string
  margin: number
  leverage: number
  spread: number
  orderCount: number
  stopLoss: number
}

interface Trade {
  id: number
  time: string
  side: 'LONG' | 'SHORT'
  price: number
  amount: number
  pnl: number
}

interface PricePoint {
  time: string
  price: number
}

interface TelegramSettings {
  enabled: boolean
  chatId: string
  botToken: string
  notifyOnTrade: boolean
  notifyOnPnL: boolean
  pnlThreshold: number
}

export default function Home() {
  const [theme, setTheme] = useState<'dark' | 'light'>('dark')
  const [isRunning, setIsRunning] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [copied, setCopied] = useState(false)
  const [liveMode, setLiveMode] = useState(false) // Demo vs Live mode
  const [orderStatus, setOrderStatus] = useState<{ type: 'success' | 'error' | null; message: string }>({ type: null, message: '' })
  const [config, setConfig] = useState<BotConfig>({
    pair: 'ETH-USDC',
    margin: 100,
    leverage: 10,
    spread: 0.1,
    orderCount: 5,
    stopLoss: 5,
  })
  const [telegramSettings, setTelegramSettings] = useState<TelegramSettings>({
    enabled: false,
    chatId: '6329588659',
    botToken: '',
    notifyOnTrade: true,
    notifyOnPnL: true,
    pnlThreshold: 10,
  })
  const [stats, setStats] = useState({
    totalPnL: 0,
    totalVolume: 0,
    tradesCount: 0,
    winRate: 0,
    uptime: '00:00:00',
  })
  const [trades, setTrades] = useState<Trade[]>([])
  const [currentPrice, setCurrentPrice] = useState(2450.50)
  const [priceChange, setPriceChange] = useState(0)
  const [priceHistory, setPriceHistory] = useState<PricePoint[]>([])
  const [dbConnected, setDbConnected] = useState(false)

  // Wagmi hooks
  const { address, isConnected } = useAccount()
  const chainId = useChainId()
  const { switchChain } = useSwitchChain()
  const { data: ethBalance } = useBalance({
    address: address,
  })

  // Nado DEX hook
  const {
    isLoading: nadoLoading,
    error: nadoError,
    pendingOrders,
    submitOrder,
    submitMarketMakingOrders,
    cancelAllOrders,
    getProductId,
  } = useNado()

  // Copy address to clipboard
  const copyAddress = () => {
    if (address) {
      navigator.clipboard.writeText(address)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  // Send telegram message
  const sendTelegram = useCallback(async (message: string) => {
    if (!telegramSettings.enabled || !telegramSettings.botToken || !telegramSettings.chatId) return

    try {
      await fetch(`https://api.telegram.org/bot${telegramSettings.botToken}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: telegramSettings.chatId,
          text: message,
          parse_mode: 'HTML'
        })
      })
    } catch (error) {
      console.error('Telegram error:', error)
    }
  }, [telegramSettings])

  // Theme effect
  useEffect(() => {
    const saved = localStorage.getItem('nado-theme') as 'dark' | 'light'
    if (saved) setTheme(saved)
  }, [])

  useEffect(() => {
    localStorage.setItem('nado-theme', theme)
    document.documentElement.setAttribute('data-theme', theme)
  }, [theme])

  // Load telegram settings
  useEffect(() => {
    const saved = localStorage.getItem('nado-telegram')
    if (saved) setTelegramSettings(JSON.parse(saved))
  }, [])

  // Load stats from DB on mount
  useEffect(() => {
    const loadData = async () => {
      try {
        const dbStats = await getStats()
        if (dbStats.tradesCount > 0) {
          setStats(prev => ({
            ...prev,
            totalPnL: dbStats.totalPnL,
            totalVolume: dbStats.totalVolume,
            tradesCount: dbStats.tradesCount,
          }))
        }

        const dbTrades = await getTrades(20)
        if (dbTrades.length > 0) {
          setTrades(dbTrades.map((t: DBTrade) => ({
            id: Date.now() + Math.random(),
            time: new Date(t.created_at || '').toLocaleTimeString(),
            side: t.side as 'LONG' | 'SHORT',
            price: Number(t.price),
            amount: Number(t.amount),
            pnl: Number(t.pnl),
          })))
        }

        setDbConnected(true)
      } catch (error) {
        console.error('DB load error:', error)
      }
    }
    loadData()
  }, [])

  // Simulate price updates
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentPrice(prev => {
        const change = (Math.random() - 0.5) * 10
        setPriceChange(change)
        const newPrice = Math.round((prev + change) * 100) / 100

        setPriceHistory(prevHistory => {
          const newPoint = {
            time: new Date().toLocaleTimeString(),
            price: newPrice
          }
          const updated = [...prevHistory, newPoint]
          return updated.slice(-30)
        })

        return newPrice
      })
    }, 2000)
    return () => clearInterval(interval)
  }, [])

  // Bot activity when running
  useEffect(() => {
    if (!isRunning) return

    // In Live mode, submit real MM orders to Nado
    if (liveMode && isConnected) {
      const placeMMOrders = async () => {
        const productId = getProductId(config.pair)
        if (!productId) {
          setOrderStatus({ type: 'error', message: `Unknown pair: ${config.pair}` })
          return
        }

        // Calculate position size based on margin and leverage
        const positionValue = config.margin * config.leverage
        const amountPerOrder = positionValue / config.orderCount / currentPrice

        setOrderStatus({ type: null, message: 'Submitting orders...' })

        const result = await submitMarketMakingOrders(
          productId,
          currentPrice,
          config.spread,
          config.orderCount,
          amountPerOrder
        )

        if (result.success) {
          setOrderStatus({ type: 'success', message: `${result.ordersPlaced} orders placed!` })

          // Send telegram notification
          if (telegramSettings.enabled && telegramSettings.notifyOnTrade) {
            sendTelegram(`🚀 <b>MM Orders Placed</b>\n\n${config.pair}\nOrders: ${result.ordersPlaced}\nSpread: ${config.spread}%\nAmount/order: ${amountPerOrder.toFixed(4)}`)
          }
        } else {
          setOrderStatus({ type: 'error', message: result.errors.join(', ') || 'Order failed' })
        }
      }

      placeMMOrders()

      // In live mode, we don't continuously place orders - just once on start
      // The orders will sit on the orderbook until filled or cancelled
      return
    }

    // Demo mode: Simulate trades
    const interval = setInterval(async () => {
      const side = Math.random() > 0.5 ? 'LONG' : 'SHORT'
      const pnl = (Math.random() - 0.4) * 2
      const tradePrice = currentPrice + (Math.random() - 0.5) * 5
      const amount = Math.round(Math.random() * 100) / 100

      const newTrade: Trade = {
        id: Date.now(),
        time: new Date().toLocaleTimeString(),
        side,
        price: tradePrice,
        amount,
        pnl: Math.round(pnl * 100) / 100,
      }

      // Save to Supabase
      setIsSaving(true)
      await saveTrade({
        pair: config.pair,
        side,
        price: tradePrice,
        amount,
        pnl: Math.round(pnl * 100) / 100,
        margin: config.margin,
        leverage: config.leverage,
      })
      setIsSaving(false)

      // Send telegram notification
      if (telegramSettings.enabled && telegramSettings.notifyOnTrade) {
        const emoji = side === 'LONG' ? '🟢' : '🔴'
        const pnlEmoji = pnl >= 0 ? '💰' : '📉'
        sendTelegram(`${emoji} <b>Nado Trade</b>\n\n${config.pair} ${side}\nPrice: $${tradePrice.toFixed(2)}\nSize: ${amount}\n${pnlEmoji} PnL: ${pnl >= 0 ? '+' : ''}$${pnl.toFixed(2)}`)
      }

      setTrades(prev => [newTrade, ...prev.slice(0, 19)])

      const newPnL = Math.round((stats.totalPnL + pnl) * 100) / 100

      if (telegramSettings.enabled && telegramSettings.notifyOnPnL && Math.abs(newPnL) >= telegramSettings.pnlThreshold) {
        sendTelegram(`⚠️ <b>PnL Alert</b>\n\nTotal PnL: ${newPnL >= 0 ? '+' : ''}$${newPnL.toFixed(2)}\nThreshold: $${telegramSettings.pnlThreshold}`)
      }

      setStats(prev => ({
        ...prev,
        totalPnL: newPnL,
        totalVolume: Math.round((prev.totalVolume + amount * currentPrice) * 100) / 100,
        tradesCount: prev.tradesCount + 1,
        winRate: Math.round(Math.random() * 30 + 50),
      }))
    }, 3000)

    return () => clearInterval(interval)
  }, [isRunning, liveMode, isConnected, currentPrice, config, telegramSettings, sendTelegram, stats.totalPnL, getProductId, submitMarketMakingOrders])

  // Uptime counter
  useEffect(() => {
    if (!isRunning) return

    const startTime = Date.now()
    const interval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startTime) / 1000)
      const hours = Math.floor(elapsed / 3600).toString().padStart(2, '0')
      const minutes = Math.floor((elapsed % 3600) / 60).toString().padStart(2, '0')
      const seconds = (elapsed % 60).toString().padStart(2, '0')
      setStats(prev => ({ ...prev, uptime: `${hours}:${minutes}:${seconds}` }))
    }, 1000)

    return () => clearInterval(interval)
  }, [isRunning])

  const saveTelegramSettings = () => {
    localStorage.setItem('nado-telegram', JSON.stringify(telegramSettings))
    setShowSettings(false)
  }

  const testTelegram = async () => {
    if (!telegramSettings.botToken || !telegramSettings.chatId) {
      alert('Bot Token과 Chat ID를 모두 입력해주세요')
      return
    }

    try {
      const response = await fetch(`https://api.telegram.org/bot${telegramSettings.botToken}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: telegramSettings.chatId,
          text: '🤖 Nado MM Bot 연결 테스트 성공!',
          parse_mode: 'HTML'
        })
      })

      if (response.ok) {
        alert('✅ 텔레그램 메시지 전송 성공!')
      } else {
        alert('❌ 전송 실패 - Token이나 Chat ID를 확인해주세요')
      }
    } catch (error) {
      alert('❌ 오류 발생')
    }
  }

  const handleStartStop = async () => {
    if (!isRunning) {
      // Starting bot
      if (telegramSettings.enabled && telegramSettings.botToken) {
        const modeText = liveMode ? '🔴 LIVE' : '🟢 DEMO'
        sendTelegram(`🚀 <b>Nado MM Bot Started!</b>\n\nMode: ${modeText}\nPair: ${config.pair}\nMargin: $${config.margin}\nLeverage: ${config.leverage}x`)
      }
      setIsRunning(true)
    } else {
      // Stopping bot
      if (liveMode) {
        // Cancel all pending orders when stopping in live mode
        const productId = getProductId(config.pair)
        if (productId) {
          setOrderStatus({ type: null, message: 'Cancelling orders...' })
          await cancelAllOrders(productId)
          setOrderStatus({ type: 'success', message: 'All orders cancelled' })
        }
      }

      if (telegramSettings.enabled && telegramSettings.botToken) {
        sendTelegram('🛑 <b>Nado MM Bot Stopped</b>\n\nTotal PnL: ' + (stats.totalPnL >= 0 ? '+' : '') + '$' + stats.totalPnL.toFixed(2) + '\nTrades: ' + stats.tradesCount)
      }
      setIsRunning(false)
    }
  }

  return (
    <div className="min-h-screen p-4 md:p-8">
      {/* Header */}
      <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
        <div className="flex items-center gap-4">
          <div className="logo-float w-12 h-12 rounded-2xl bg-gradient-to-br from-[#8b5cf6] to-[#7c3aed] flex items-center justify-center shadow-lg">
            <Zap className="w-7 h-7 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold gradient-text">Nado MM Bot</h1>
            <p className="text-sm text-[var(--foreground-dim)]">Ink Chain Market Maker</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Wallet Connect Button */}
          <ConnectButton.Custom>
            {({ account, chain, openAccountModal, openChainModal, openConnectModal, mounted }) => {
              const ready = mounted
              const connected = ready && account && chain

              return (
                <div
                  {...(!ready && {
                    'aria-hidden': true,
                    style: {
                      opacity: 0,
                      pointerEvents: 'none',
                      userSelect: 'none',
                    },
                  })}
                >
                  {(() => {
                    if (!connected) {
                      return (
                        <button
                          onClick={openConnectModal}
                          className="btn-primary flex items-center gap-2 py-2.5 px-4"
                        >
                          <Wallet className="w-4 h-4" />
                          Connect Wallet
                        </button>
                      )
                    }

                    return (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={openChainModal}
                          className="glass-card px-3 py-2 flex items-center gap-2 hover:border-[var(--accent-primary)] transition-all"
                        >
                          {chain.hasIcon && chain.iconUrl && (
                            <img src={chain.iconUrl} alt={chain.name || 'Chain'} className="w-5 h-5 rounded-full" />
                          )}
                          <span className="text-sm font-medium">{chain.name}</span>
                        </button>

                        <button
                          onClick={openAccountModal}
                          className="glass-card px-3 py-2 flex items-center gap-2 hover:border-[var(--accent-primary)] transition-all"
                        >
                          <div className="w-5 h-5 rounded-full bg-gradient-to-br from-[#8b5cf6] to-[#7c3aed]" />
                          <span className="text-sm font-mono">{account.displayName}</span>
                          <span className="text-sm text-[var(--foreground-muted)]">
                            {account.displayBalance}
                          </span>
                        </button>
                      </div>
                    )
                  })()}
                </div>
              )
            }}
          </ConnectButton.Custom>

          {/* Status */}
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[var(--card-bg)]">
            <div className={`w-2.5 h-2.5 rounded-full ${isRunning ? 'bg-[var(--accent-green)] status-running' : 'bg-[var(--foreground-dim)]'}`} />
            <span className="text-sm text-[var(--foreground-muted)]">{isRunning ? 'Running' : 'Stopped'}</span>
          </div>

          {/* Theme Toggle */}
          <button
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            className="p-2.5 rounded-xl bg-[var(--card-bg)] border border-[var(--card-border)] hover:border-[var(--accent-primary)] transition-all"
          >
            {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </button>

          {/* Settings */}
          <button
            onClick={() => setShowSettings(true)}
            className="p-2.5 rounded-xl bg-[var(--card-bg)] border border-[var(--card-border)] hover:border-[var(--accent-primary)] transition-all"
          >
            <Settings className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Wallet Info Card - Show when connected */}
      {isConnected && address && (
        <div className="glass-card p-4 mb-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#8b5cf6] to-[#7c3aed] flex items-center justify-center">
                <Wallet className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-sm text-[var(--foreground-dim)]">Connected Wallet</p>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-sm">
                    {address.slice(0, 6)}...{address.slice(-4)}
                  </span>
                  <button onClick={copyAddress} className="text-[var(--foreground-dim)] hover:text-[var(--foreground)]">
                    {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                  </button>
                  <a
                    href={`https://explorer.inkonchain.com/address/${address}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[var(--foreground-dim)] hover:text-[var(--foreground)]"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </a>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-6">
              <div>
                <p className="text-xs text-[var(--foreground-dim)]">ETH Balance</p>
                <p className="text-lg font-mono font-semibold">
                  {ethBalance ? parseFloat(formatEther(ethBalance.value)).toFixed(4) : '0.0000'} ETH
                </p>
              </div>
              <div>
                <p className="text-xs text-[var(--foreground-dim)]">Network</p>
                <p className="text-lg font-semibold text-[var(--accent-primary)]">
                  {chainId === inkChain.id ? 'Ink Mainnet' : chainId === inkSepolia.id ? 'Ink Sepolia' : 'Other'}
                </p>
              </div>
              {chainId !== inkChain.id && chainId !== inkSepolia.id && (
                <button
                  onClick={() => switchChain({ chainId: inkChain.id })}
                  className="btn-secondary text-sm"
                >
                  Switch to Ink
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Price Chart */}
      <div className="glass-card p-5 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold flex items-center gap-2">
            <Activity className="w-5 h-5 text-[var(--accent-primary)]" />
            {config.pair} Price
          </h2>
          <div className="flex items-center gap-3">
            <div className={`flex items-center gap-1 px-2 py-1 rounded-lg text-sm font-mono ${
              priceChange >= 0
                ? 'bg-[var(--accent-green)]/10 text-[var(--accent-green)]'
                : 'bg-[var(--accent-red)]/10 text-[var(--accent-red)]'
            }`}>
              {priceChange >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
              {priceChange >= 0 ? '+' : ''}{priceChange.toFixed(2)}
            </div>
            <span className="text-2xl font-mono font-bold">${currentPrice.toLocaleString()}</span>
          </div>
        </div>
        <div className="h-[180px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={priceHistory}>
              <defs>
                <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <XAxis
                dataKey="time"
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 10, fill: 'var(--foreground-dim)' }}
                interval="preserveStartEnd"
              />
              <YAxis
                domain={['auto', 'auto']}
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 10, fill: 'var(--foreground-dim)' }}
                width={60}
                tickFormatter={(v) => `$${v}`}
              />
              <Tooltip
                contentStyle={{
                  background: 'var(--card-bg)',
                  border: '1px solid var(--card-border)',
                  borderRadius: '8px',
                  fontSize: '12px'
                }}
                labelStyle={{ color: 'var(--foreground-muted)' }}
              />
              <Area
                type="monotone"
                dataKey="price"
                stroke="#8b5cf6"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#colorPrice)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        {/* Left Column */}
        <div className="xl:col-span-4 space-y-6">
          {/* Bot Configuration */}
          <div className="glass-card p-6">
            <h2 className="text-lg font-semibold mb-5 flex items-center gap-2">
              <Settings className="w-5 h-5 text-[var(--accent-primary)]" />
              Bot Configuration
            </h2>

            <div className="space-y-4">
              {/* Live/Demo Mode Toggle */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-[var(--background)]">
                <div className="flex items-center gap-2">
                  <Radio className={`w-4 h-4 ${liveMode ? 'text-[var(--accent-red)]' : 'text-[var(--accent-green)]'}`} />
                  <span className="font-medium">{liveMode ? 'LIVE MODE' : 'DEMO MODE'}</span>
                </div>
                <button
                  onClick={() => setLiveMode(!liveMode)}
                  disabled={isRunning}
                  className={`toggle ${liveMode ? 'active' : ''} ${isRunning ? 'opacity-50 cursor-not-allowed' : ''}`}
                />
              </div>

              {liveMode && (
                <div className="flex items-start gap-2 p-3 rounded-xl bg-[var(--accent-red)]/10 border border-[var(--accent-red)]/30">
                  <AlertTriangle className="w-5 h-5 text-[var(--accent-red)] flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-[var(--accent-red)]">
                    Live mode will submit real orders to Nado DEX. Use with caution!
                  </p>
                </div>
              )}

              {/* Order Status */}
              {orderStatus.type && (
                <div className={`p-3 rounded-xl ${
                  orderStatus.type === 'success'
                    ? 'bg-[var(--accent-green)]/10 text-[var(--accent-green)]'
                    : 'bg-[var(--accent-red)]/10 text-[var(--accent-red)]'
                }`}>
                  <p className="text-sm">{orderStatus.message}</p>
                </div>
              )}

              {nadoError && (
                <div className="p-3 rounded-xl bg-[var(--accent-red)]/10 text-[var(--accent-red)]">
                  <p className="text-sm">Nado Error: {nadoError}</p>
                </div>
              )}
              <div>
                <label className="text-sm text-[var(--foreground-muted)] mb-2 block">Trading Pair</label>
                <select
                  value={config.pair}
                  onChange={(e) => setConfig({...config, pair: e.target.value})}
                  disabled={isRunning}
                >
                  <option value="ETH-USDC">ETH / USDC</option>
                  <option value="BTC-USDC">BTC / USDC</option>
                  <option value="INK-USDC">INK / USDC</option>
                  <option value="SOL-USDC">SOL / USDC</option>
                </select>
              </div>

              <div>
                <label className="text-sm text-[var(--foreground-muted)] mb-2 block">Margin Amount</label>
                <div className="relative">
                  <input
                    type="number"
                    value={config.margin}
                    onChange={(e) => setConfig({...config, margin: Number(e.target.value)})}
                    disabled={isRunning}
                    className="pr-16"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--foreground-dim)] text-sm">USDC</span>
                </div>
              </div>

              <div>
                <div className="flex justify-between mb-2">
                  <label className="text-sm text-[var(--foreground-muted)]">Leverage</label>
                  <span className="text-sm font-mono text-[var(--accent-primary)]">{config.leverage}x</span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="50"
                  value={config.leverage}
                  onChange={(e) => setConfig({...config, leverage: Number(e.target.value)})}
                  disabled={isRunning}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm text-[var(--foreground-muted)] mb-2 block">Spread %</label>
                  <input
                    type="number"
                    step="0.01"
                    value={config.spread}
                    onChange={(e) => setConfig({...config, spread: Number(e.target.value)})}
                    disabled={isRunning}
                  />
                </div>
                <div>
                  <label className="text-sm text-[var(--foreground-muted)] mb-2 block">Stop Loss %</label>
                  <input
                    type="number"
                    step="0.1"
                    value={config.stopLoss}
                    onChange={(e) => setConfig({...config, stopLoss: Number(e.target.value)})}
                    disabled={isRunning}
                  />
                </div>
              </div>

              <button
                onClick={handleStartStop}
                disabled={!isConnected || nadoLoading}
                className={`w-full py-3.5 rounded-xl font-semibold text-base transition-all flex items-center justify-center gap-2 ${
                  !isConnected || nadoLoading
                    ? 'bg-[var(--card-bg)] text-[var(--foreground-dim)] cursor-not-allowed'
                    : isRunning
                    ? 'btn-danger'
                    : liveMode
                    ? 'bg-[var(--accent-red)] hover:bg-red-500 text-white'
                    : 'btn-primary'
                }`}
              >
                {nadoLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                {!isConnected
                  ? 'Connect Wallet First'
                  : nadoLoading
                  ? 'Processing...'
                  : isRunning
                  ? 'Stop Bot'
                  : liveMode
                  ? '🔴 Start Live Trading'
                  : 'Start Bot'}
              </button>

              {/* Pending Orders Count */}
              {pendingOrders.length > 0 && (
                <div className="mt-3 p-3 rounded-xl bg-[var(--accent-primary)]/10">
                  <p className="text-sm text-[var(--accent-primary)] text-center">
                    📋 {pendingOrders.length} pending orders on Nado
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 gap-3">
            <div className="glass-card p-4">
              <div className="flex items-center gap-2 mb-1">
                <DollarSign className="w-4 h-4 text-[var(--foreground-dim)]" />
                <span className="text-xs text-[var(--foreground-dim)]">Total PnL</span>
              </div>
              <p className={`text-xl font-bold font-mono ${stats.totalPnL >= 0 ? 'text-[var(--accent-green)]' : 'text-[var(--accent-red)]'}`}>
                {stats.totalPnL >= 0 ? '+' : ''}${stats.totalPnL.toFixed(2)}
              </p>
            </div>
            <div className="glass-card p-4">
              <div className="flex items-center gap-2 mb-1">
                <BarChart3 className="w-4 h-4 text-[var(--foreground-dim)]" />
                <span className="text-xs text-[var(--foreground-dim)]">Volume</span>
              </div>
              <p className="text-xl font-bold font-mono">${stats.totalVolume.toLocaleString()}</p>
            </div>
            <div className="glass-card p-4">
              <div className="flex items-center gap-2 mb-1">
                <Activity className="w-4 h-4 text-[var(--foreground-dim)]" />
                <span className="text-xs text-[var(--foreground-dim)]">Trades</span>
              </div>
              <p className="text-xl font-bold font-mono">{stats.tradesCount}</p>
            </div>
            <div className="glass-card p-4">
              <div className="flex items-center gap-2 mb-1">
                <Clock className="w-4 h-4 text-[var(--foreground-dim)]" />
                <span className="text-xs text-[var(--foreground-dim)]">Uptime</span>
              </div>
              <p className="text-xl font-bold font-mono text-[var(--accent-primary)]">{stats.uptime}</p>
            </div>
          </div>

          {/* DB Status */}
          <div className={`glass-card p-3 flex items-center justify-center gap-2 ${dbConnected ? 'border-green-500/30' : 'border-red-500/30'}`}>
            {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            <span className="text-sm">{dbConnected ? 'Database Connected' : 'Database Error'}</span>
          </div>
        </div>

        {/* Right Column */}
        <div className="xl:col-span-8 space-y-6">
          {/* Order Book */}
          <div className="glass-card p-6">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-[var(--accent-orange)]" />
              Order Book
            </h2>
            <div className="grid grid-cols-2 gap-6">
              <div>
                <div className="flex justify-between text-xs text-[var(--foreground-dim)] mb-2 px-2">
                  <span>PRICE (BID)</span>
                  <span>SIZE</span>
                </div>
                {[...Array(config.orderCount)].map((_, i) => {
                  const price = currentPrice - (i + 1) * (currentPrice * config.spread / 100)
                  const size = (Math.random() * 5 + 1).toFixed(3)
                  const width = 100 - i * 15
                  return (
                    <div key={`bid-${i}`} className="relative mb-1">
                      <div className="absolute inset-y-0 left-0 bg-[var(--accent-green)]/10 rounded-r" style={{ width: `${width}%` }} />
                      <div className="relative flex justify-between px-2 py-1.5 text-sm font-mono">
                        <span className="text-[var(--accent-green)]">${price.toFixed(2)}</span>
                        <span className="text-[var(--foreground-muted)]">{size}</span>
                      </div>
                    </div>
                  )
                })}
              </div>
              <div>
                <div className="flex justify-between text-xs text-[var(--foreground-dim)] mb-2 px-2">
                  <span>SIZE</span>
                  <span>PRICE (ASK)</span>
                </div>
                {[...Array(config.orderCount)].map((_, i) => {
                  const price = currentPrice + (i + 1) * (currentPrice * config.spread / 100)
                  const size = (Math.random() * 5 + 1).toFixed(3)
                  const width = 100 - i * 15
                  return (
                    <div key={`ask-${i}`} className="relative mb-1">
                      <div className="absolute inset-y-0 right-0 bg-[var(--accent-red)]/10 rounded-l" style={{ width: `${width}%` }} />
                      <div className="relative flex justify-between px-2 py-1.5 text-sm font-mono">
                        <span className="text-[var(--foreground-muted)]">{size}</span>
                        <span className="text-[var(--accent-red)]">${price.toFixed(2)}</span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>

          {/* Recent Trades */}
          <div className="glass-card p-6">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Clock className="w-5 h-5 text-[var(--accent-yellow)]" />
              Recent Trades
              {stats.tradesCount > 0 && (
                <span className="text-xs bg-[var(--accent-primary)]/20 text-[var(--accent-primary)] px-2 py-0.5 rounded-full ml-2">
                  {stats.tradesCount} total
                </span>
              )}
            </h2>
            {trades.length === 0 ? (
              <div className="text-center py-10">
                <div className="w-14 h-14 rounded-2xl bg-[var(--card-bg)] mx-auto mb-3 flex items-center justify-center">
                  <Zap className="w-7 h-7 text-[var(--foreground-dim)]" />
                </div>
                <p className="text-[var(--foreground-muted)]">No trades yet</p>
                <p className="text-sm text-[var(--foreground-dim)]">
                  {isConnected ? 'Start the bot to begin trading' : 'Connect wallet to start'}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto max-h-[300px]">
                <table>
                  <thead className="sticky top-0 bg-[var(--background)]">
                    <tr>
                      <th>Time</th>
                      <th>Side</th>
                      <th className="text-right">Price</th>
                      <th className="text-right">Size</th>
                      <th className="text-right">PnL</th>
                    </tr>
                  </thead>
                  <tbody>
                    {trades.map((trade) => (
                      <tr key={trade.id}>
                        <td className="font-mono text-[var(--foreground-muted)] text-sm">{trade.time}</td>
                        <td>
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold ${
                            trade.side === 'LONG'
                              ? 'bg-[var(--accent-green)]/15 text-[var(--accent-green)]'
                              : 'bg-[var(--accent-red)]/15 text-[var(--accent-red)]'
                          }`}>
                            {trade.side === 'LONG' ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                            {trade.side}
                          </span>
                        </td>
                        <td className="text-right font-mono text-sm">${trade.price.toFixed(2)}</td>
                        <td className="text-right font-mono text-sm text-[var(--foreground-muted)]">{trade.amount}</td>
                        <td className={`text-right font-mono text-sm font-semibold ${trade.pnl >= 0 ? 'text-[var(--accent-green)]' : 'text-[var(--accent-red)]'}`}>
                          {trade.pnl >= 0 ? '+' : ''}{trade.pnl.toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="mt-8 pt-6 border-t border-[var(--card-border)] text-center">
        <p className="text-sm text-[var(--foreground-dim)]">
          Nado MM Bot v0.5 · Ink Chain · {liveMode ? '🔴 LIVE' : '🟢 DEMO'} · {isConnected ? 'Wallet Connected' : 'Wallet Not Connected'}
        </p>
      </footer>

      {/* Settings Modal */}
      {showSettings && (
        <div className="modal-overlay" onClick={() => setShowSettings(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold flex items-center gap-2">
                <Send className="w-5 h-5 text-[var(--accent-primary)]" />
                Telegram Settings
              </h2>
              <button onClick={() => setShowSettings(false)} className="text-[var(--foreground-dim)] hover:text-[var(--foreground)] text-xl">
                ×
              </button>
            </div>

            <div className="space-y-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Enable Notifications</p>
                  <p className="text-sm text-[var(--foreground-dim)]">Send alerts to Telegram</p>
                </div>
                <button
                  onClick={() => setTelegramSettings({...telegramSettings, enabled: !telegramSettings.enabled})}
                  className={`toggle ${telegramSettings.enabled ? 'active' : ''}`}
                />
              </div>

              <div>
                <label className="text-sm text-[var(--foreground-muted)] mb-2 block">Bot Token</label>
                <input
                  type="text"
                  value={telegramSettings.botToken}
                  onChange={(e) => setTelegramSettings({...telegramSettings, botToken: e.target.value})}
                  placeholder="1234567890:ABCdefGHIjklMNOpqrsTUVwxyz"
                />
                <p className="text-xs text-[var(--foreground-dim)] mt-1">@BotFather에서 생성한 토큰</p>
              </div>

              <div>
                <label className="text-sm text-[var(--foreground-muted)] mb-2 block">Chat ID</label>
                <input
                  type="text"
                  value={telegramSettings.chatId}
                  onChange={(e) => setTelegramSettings({...telegramSettings, chatId: e.target.value})}
                  placeholder="6329588659"
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Trade Notifications</p>
                  <p className="text-sm text-[var(--foreground-dim)]">Alert on every trade</p>
                </div>
                <button
                  onClick={() => setTelegramSettings({...telegramSettings, notifyOnTrade: !telegramSettings.notifyOnTrade})}
                  className={`toggle ${telegramSettings.notifyOnTrade ? 'active' : ''}`}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">PnL Threshold Alert</p>
                  <p className="text-sm text-[var(--foreground-dim)]">Alert when PnL exceeds threshold</p>
                </div>
                <button
                  onClick={() => setTelegramSettings({...telegramSettings, notifyOnPnL: !telegramSettings.notifyOnPnL})}
                  className={`toggle ${telegramSettings.notifyOnPnL ? 'active' : ''}`}
                />
              </div>

              {telegramSettings.notifyOnPnL && (
                <div>
                  <label className="text-sm text-[var(--foreground-muted)] mb-2 block">PnL Threshold ($)</label>
                  <input
                    type="number"
                    value={telegramSettings.pnlThreshold}
                    onChange={(e) => setTelegramSettings({...telegramSettings, pnlThreshold: Number(e.target.value)})}
                  />
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button onClick={testTelegram} className="btn-secondary flex-1 flex items-center justify-center gap-2">
                  <Send className="w-4 h-4" />
                  Test
                </button>
                <button onClick={saveTelegramSettings} className="btn-primary flex-1">
                  Save Settings
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
