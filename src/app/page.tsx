'use client'

import { useState, useEffect } from 'react'

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

export default function Home() {
  const [isRunning, setIsRunning] = useState(false)
  const [config, setConfig] = useState<BotConfig>({
    pair: 'ETH-USDC',
    margin: 100,
    leverage: 10,
    spread: 0.1,
    orderCount: 5,
    stopLoss: 5,
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

  // Simulate price updates
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentPrice(prev => {
        const change = (Math.random() - 0.5) * 10
        setPriceChange(change)
        return Math.round((prev + change) * 100) / 100
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

      setTrades(prev => [newTrade, ...prev.slice(0, 9)])
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

  return (
    <div className="min-h-screen p-6 md:p-10">
      {/* Header */}
      <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-10">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#00ffb2] to-[#00d4aa] flex items-center justify-center">
              <svg className="w-6 h-6 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
            </div>
            <div>
              <h1 className="text-2xl font-bold gradient-text">MM Bot</h1>
              <p className="text-sm text-[#71717a]">Market Making Dashboard</p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-6">
          {/* Price Display */}
          <div className="glass-card px-5 py-3">
            <div className="flex items-center gap-4">
              <div>
                <p className="text-xs text-[#71717a] mb-1">ETH/USDC</p>
                <p className="text-xl font-mono font-semibold">${currentPrice.toLocaleString()}</p>
              </div>
              <div className={`px-2 py-1 rounded-lg text-sm font-mono ${priceChange >= 0 ? 'bg-[#00ffb2]/10 text-[#00ffb2]' : 'bg-red-500/10 text-red-400'}`}>
                {priceChange >= 0 ? '+' : ''}{priceChange.toFixed(2)}
              </div>
            </div>
          </div>

          {/* Status Indicator */}
          <div className="flex items-center gap-2">
            <div className={`w-3 h-3 rounded-full ${isRunning ? 'bg-[#00ffb2] status-running' : 'bg-[#71717a]'}`} />
            <span className="text-sm text-[#a1a1aa]">{isRunning ? 'Running' : 'Stopped'}</span>
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        {/* Left Column - Configuration */}
        <div className="xl:col-span-4 space-y-6">
          {/* Bot Configuration */}
          <div className="glass-card p-6">
            <h2 className="text-lg font-semibold mb-6 flex items-center gap-2">
              <svg className="w-5 h-5 text-[#00ffb2]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              Configuration
            </h2>

            <div className="space-y-5">
              <div>
                <label className="text-sm text-[#a1a1aa] mb-2 block">Trading Pair</label>
                <select
                  value={config.pair}
                  onChange={(e) => setConfig({...config, pair: e.target.value})}
                  disabled={isRunning}
                  className="w-full"
                >
                  <option value="ETH-USDC">ETH / USDC</option>
                  <option value="BTC-USDC">BTC / USDC</option>
                  <option value="SOL-USDC">SOL / USDC</option>
                  <option value="ARB-USDC">ARB / USDC</option>
                </select>
              </div>

              <div>
                <label className="text-sm text-[#a1a1aa] mb-2 block">Margin Amount</label>
                <div className="relative">
                  <input
                    type="number"
                    value={config.margin}
                    onChange={(e) => setConfig({...config, margin: Number(e.target.value)})}
                    disabled={isRunning}
                    className="w-full pr-16"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[#71717a] text-sm">USDC</span>
                </div>
              </div>

              <div>
                <div className="flex justify-between mb-2">
                  <label className="text-sm text-[#a1a1aa]">Leverage</label>
                  <span className="text-sm font-mono text-[#00ffb2]">{config.leverage}x</span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="50"
                  value={config.leverage}
                  onChange={(e) => setConfig({...config, leverage: Number(e.target.value)})}
                  disabled={isRunning}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-[#71717a] mt-1">
                  <span>1x</span>
                  <span>25x</span>
                  <span>50x</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-[#a1a1aa] mb-2 block">Spread %</label>
                  <input
                    type="number"
                    step="0.01"
                    value={config.spread}
                    onChange={(e) => setConfig({...config, spread: Number(e.target.value)})}
                    disabled={isRunning}
                    className="w-full"
                  />
                </div>
                <div>
                  <label className="text-sm text-[#a1a1aa] mb-2 block">Orders</label>
                  <input
                    type="number"
                    value={config.orderCount}
                    onChange={(e) => setConfig({...config, orderCount: Number(e.target.value)})}
                    disabled={isRunning}
                    className="w-full"
                  />
                </div>
              </div>

              <div>
                <label className="text-sm text-[#a1a1aa] mb-2 block">Stop Loss %</label>
                <input
                  type="number"
                  step="0.1"
                  value={config.stopLoss}
                  onChange={(e) => setConfig({...config, stopLoss: Number(e.target.value)})}
                  disabled={isRunning}
                  className="w-full"
                />
              </div>

              {/* Start/Stop Button */}
              <button
                onClick={() => setIsRunning(!isRunning)}
                className={`w-full py-4 rounded-xl font-semibold text-lg transition-all ${
                  isRunning ? 'btn-danger' : 'btn-primary'
                }`}
              >
                {isRunning ? 'Stop Bot' : 'Start Bot'}
              </button>
            </div>
          </div>

          {/* Position Size Info */}
          <div className="glass-card p-6">
            <h3 className="text-sm text-[#a1a1aa] mb-4">Position Summary</h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-[#71717a]">Notional Size</span>
                <span className="font-mono">${(config.margin * config.leverage).toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#71717a]">Liq. Distance</span>
                <span className="font-mono text-[#f56e0f]">{(100 / config.leverage).toFixed(1)}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#71717a]">Max Loss</span>
                <span className="font-mono text-red-400">-${(config.margin * config.stopLoss / 100).toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column - Stats & Data */}
        <div className="xl:col-span-8 space-y-6">
          {/* Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="glass-card p-5">
              <p className="text-xs text-[#71717a] mb-1">Total PnL</p>
              <p className={`text-2xl font-bold font-mono ${stats.totalPnL >= 0 ? 'text-[#00ffb2]' : 'text-red-400'}`}>
                {stats.totalPnL >= 0 ? '+' : ''}${stats.totalPnL.toFixed(2)}
              </p>
            </div>
            <div className="glass-card p-5">
              <p className="text-xs text-[#71717a] mb-1">Volume</p>
              <p className="text-2xl font-bold font-mono">${stats.totalVolume.toLocaleString()}</p>
            </div>
            <div className="glass-card p-5">
              <p className="text-xs text-[#71717a] mb-1">Trades</p>
              <p className="text-2xl font-bold font-mono">{stats.tradesCount}</p>
            </div>
            <div className="glass-card p-5">
              <p className="text-xs text-[#71717a] mb-1">Uptime</p>
              <p className="text-2xl font-bold font-mono text-[#00ffb2]">{stats.uptime}</p>
            </div>
          </div>

          {/* Order Book */}
          <div className="glass-card p-6">
            <h2 className="text-lg font-semibold mb-5 flex items-center gap-2">
              <svg className="w-5 h-5 text-[#f56e0f]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              Order Book
            </h2>
            <div className="grid grid-cols-2 gap-6">
              {/* Bids */}
              <div>
                <div className="flex justify-between text-xs text-[#71717a] mb-3 px-2">
                  <span>PRICE</span>
                  <span>SIZE</span>
                </div>
                {[...Array(config.orderCount)].map((_, i) => {
                  const price = currentPrice - (i + 1) * (currentPrice * config.spread / 100)
                  const size = (Math.random() * 5 + 1).toFixed(3)
                  const width = 100 - i * 12
                  return (
                    <div key={`bid-${i}`} className="relative mb-1">
                      <div
                        className="absolute inset-y-0 left-0 bg-[#00ffb2]/10 rounded-r"
                        style={{ width: `${width}%` }}
                      />
                      <div className="relative flex justify-between px-2 py-2 text-sm font-mono">
                        <span className="text-[#00ffb2]">${price.toFixed(2)}</span>
                        <span className="text-[#a1a1aa]">{size}</span>
                      </div>
                    </div>
                  )
                })}
              </div>
              {/* Asks */}
              <div>
                <div className="flex justify-between text-xs text-[#71717a] mb-3 px-2">
                  <span>SIZE</span>
                  <span>PRICE</span>
                </div>
                {[...Array(config.orderCount)].map((_, i) => {
                  const price = currentPrice + (i + 1) * (currentPrice * config.spread / 100)
                  const size = (Math.random() * 5 + 1).toFixed(3)
                  const width = 100 - i * 12
                  return (
                    <div key={`ask-${i}`} className="relative mb-1">
                      <div
                        className="absolute inset-y-0 right-0 bg-red-500/10 rounded-l"
                        style={{ width: `${width}%` }}
                      />
                      <div className="relative flex justify-between px-2 py-2 text-sm font-mono">
                        <span className="text-[#a1a1aa]">{size}</span>
                        <span className="text-red-400">${price.toFixed(2)}</span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>

          {/* Recent Trades */}
          <div className="glass-card p-6">
            <h2 className="text-lg font-semibold mb-5 flex items-center gap-2">
              <svg className="w-5 h-5 text-[#add015]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Recent Trades
            </h2>
            {trades.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 rounded-full bg-[#18181b] mx-auto mb-4 flex items-center justify-center">
                  <svg className="w-8 h-8 text-[#71717a]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <p className="text-[#71717a]">No trades yet</p>
                <p className="text-sm text-[#52525b]">Start the bot to begin trading</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table>
                  <thead>
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
                        <td className="font-mono text-[#a1a1aa]">{trade.time}</td>
                        <td>
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${
                            trade.side === 'LONG'
                              ? 'bg-[#00ffb2]/10 text-[#00ffb2]'
                              : 'bg-red-500/10 text-red-400'
                          }`}>
                            {trade.side === 'LONG' ? '↑' : '↓'} {trade.side}
                          </span>
                        </td>
                        <td className="text-right font-mono">${trade.price.toFixed(2)}</td>
                        <td className="text-right font-mono text-[#a1a1aa]">{trade.amount}</td>
                        <td className={`text-right font-mono ${trade.pnl >= 0 ? 'text-[#00ffb2]' : 'text-red-400'}`}>
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
      <footer className="mt-10 pt-6 border-t border-[#27272a] text-center">
        <p className="text-sm text-[#52525b]">
          MM Bot v0.1 · Demo Mode · Not connected to real exchange
        </p>
      </footer>
    </div>
  )
}
