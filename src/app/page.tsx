'use client'

import { useState, useEffect } from 'react'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Area, AreaChart } from 'recharts'
import { Moon, Sun, Settings, Bell, BellOff, TrendingUp, TrendingDown, Activity, Zap, BarChart3, Clock, DollarSign, Send } from 'lucide-react'

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
  notifyOnTrade: boolean
  notifyOnPnL: boolean
  pnlThreshold: number
}

export default function Home() {
  const [theme, setTheme] = useState<'dark' | 'light'>('dark')
  const [isRunning, setIsRunning] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
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
    chatId: '',
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
  const [activeTab, setActiveTab] = useState<'trades' | 'settings'>('trades')

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
          return updated.slice(-30) // Keep last 30 points
        })

        return newPrice
      })
    }, 2000)
    return () => clearInterval(interval)
  }, [])

  // Simulate bot activity when running
  useEffect(() => {
    if (!isRunning) return

    const interval = setInterval(() => {
      const side = Math.random() > 0.5 ? 'LONG' : 'SHORT'
      const pnl = (Math.random() - 0.4) * 2
      const newTrade: Trade = {
        id: Date.now(),
        time: new Date().toLocaleTimeString(),
        side,
        price: currentPrice + (Math.random() - 0.5) * 5,
        amount: Math.round(Math.random() * 100) / 100,
        pnl: Math.round(pnl * 100) / 100,
      }

      setTrades(prev => [newTrade, ...prev.slice(0, 19)])
      setStats(prev => ({
        ...prev,
        totalPnL: Math.round((prev.totalPnL + pnl) * 100) / 100,
        totalVolume: Math.round((prev.totalVolume + newTrade.amount * currentPrice) * 100) / 100,
        tradesCount: prev.tradesCount + 1,
        winRate: Math.round(Math.random() * 30 + 50),
      }))
    }, 3000)

    return () => clearInterval(interval)
  }, [isRunning, currentPrice])

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
    if (!telegramSettings.chatId) {
      alert('Chat ID를 입력해주세요')
      return
    }
    alert('텔레그램 테스트 메시지 전송! (실제 연동 시 작동)')
  }

  return (
    <div className="min-h-screen p-4 md:p-8">
      {/* Header */}
      <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
        <div className="flex items-center gap-4">
          {/* Nado Logo */}
          <div className="logo-float w-12 h-12 rounded-2xl bg-gradient-to-br from-[#8b5cf6] to-[#7c3aed] flex items-center justify-center shadow-lg">
            <Zap className="w-7 h-7 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold gradient-text">Nado MM Bot</h1>
            <p className="text-sm text-[var(--foreground-dim)]">Ink Chain Market Maker</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {/* Price Display */}
          <div className="glass-card px-4 py-2">
            <div className="flex items-center gap-3">
              <div>
                <p className="text-xs text-[var(--foreground-dim)]">{config.pair}</p>
                <p className="text-lg font-mono font-semibold">${currentPrice.toLocaleString()}</p>
              </div>
              <div className={`flex items-center gap-1 px-2 py-1 rounded-lg text-sm font-mono ${
                priceChange >= 0
                  ? 'bg-[var(--accent-green)]/10 text-[var(--accent-green)]'
                  : 'bg-[var(--accent-red)]/10 text-[var(--accent-red)]'
              }`}>
                {priceChange >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                {priceChange >= 0 ? '+' : ''}{priceChange.toFixed(2)}
              </div>
            </div>
          </div>

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

      {/* Price Chart */}
      <div className="glass-card p-5 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold flex items-center gap-2">
            <Activity className="w-5 h-5 text-[var(--accent-primary)]" />
            Price Chart
          </h2>
          <span className="text-sm text-[var(--foreground-dim)]">Last 30 updates</span>
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
        {/* Left Column - Configuration */}
        <div className="xl:col-span-4 space-y-6">
          {/* Bot Configuration */}
          <div className="glass-card p-6">
            <h2 className="text-lg font-semibold mb-5 flex items-center gap-2">
              <Settings className="w-5 h-5 text-[var(--accent-primary)]" />
              Bot Configuration
            </h2>

            <div className="space-y-4">
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
                onClick={() => setIsRunning(!isRunning)}
                className={`w-full py-3.5 rounded-xl font-semibold text-base transition-all ${
                  isRunning ? 'btn-danger' : 'btn-primary'
                }`}
              >
                {isRunning ? 'Stop Bot' : 'Start Bot'}
              </button>
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
        </div>

        {/* Right Column - Order Book & Trades */}
        <div className="xl:col-span-8 space-y-6">
          {/* Order Book */}
          <div className="glass-card p-6">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-[var(--accent-orange)]" />
              Order Book
            </h2>
            <div className="grid grid-cols-2 gap-6">
              {/* Bids */}
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
              {/* Asks */}
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
            </h2>
            {trades.length === 0 ? (
              <div className="text-center py-10">
                <div className="w-14 h-14 rounded-2xl bg-[var(--card-bg)] mx-auto mb-3 flex items-center justify-center">
                  <Zap className="w-7 h-7 text-[var(--foreground-dim)]" />
                </div>
                <p className="text-[var(--foreground-muted)]">No trades yet</p>
                <p className="text-sm text-[var(--foreground-dim)]">Start the bot to begin trading</p>
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
          Nado MM Bot v0.2 · Ink Chain · Demo Mode
        </p>
      </footer>

      {/* Settings Modal */}
      {showSettings && (
        <div className="modal-overlay" onClick={() => setShowSettings(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold flex items-center gap-2">
                <Bell className="w-5 h-5 text-[var(--accent-primary)]" />
                Telegram Settings
              </h2>
              <button onClick={() => setShowSettings(false)} className="text-[var(--foreground-dim)] hover:text-[var(--foreground)]">
                ✕
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
                <label className="text-sm text-[var(--foreground-muted)] mb-2 block">Telegram Chat ID</label>
                <input
                  type="text"
                  value={telegramSettings.chatId}
                  onChange={(e) => setTelegramSettings({...telegramSettings, chatId: e.target.value})}
                  placeholder="예: 6329588659"
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
