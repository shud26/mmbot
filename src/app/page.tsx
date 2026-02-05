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
  side: 'BUY' | 'SELL'
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

  // Simulate price updates
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentPrice(prev => {
        const change = (Math.random() - 0.5) * 10
        return Math.round((prev + change) * 100) / 100
      })
    }, 2000)
    return () => clearInterval(interval)
  }, [])

  // Simulate bot activity when running
  useEffect(() => {
    if (!isRunning) return

    const interval = setInterval(() => {
      const side = Math.random() > 0.5 ? 'BUY' : 'SELL'
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

  const handleStart = () => {
    setIsRunning(true)
  }

  const handleStop = () => {
    setIsRunning(false)
  }

  return (
    <div className="min-h-screen p-4 md:p-8">
      {/* Header */}
      <header className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold gradient-text">MM Bot</h1>
          <p className="text-gray-400 text-sm">Market Making Dashboard</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <p className="text-gray-400 text-xs">ETH Price</p>
            <p className="text-xl font-mono font-bold">${currentPrice.toLocaleString()}</p>
          </div>
          <div className={`w-3 h-3 rounded-full ${isRunning ? 'bg-green-500 animate-pulse' : 'bg-gray-500'}`} />
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Bot Configuration */}
        <div className="lg:col-span-1">
          <div className="bg-[#1a1a1a] rounded-xl p-6 border border-[#2a2a2a]">
            <h2 className="text-lg font-semibold mb-4">Bot Configuration</h2>

            <div className="space-y-4">
              <div>
                <label className="text-gray-400 text-sm">Trading Pair</label>
                <select
                  value={config.pair}
                  onChange={(e) => setConfig({...config, pair: e.target.value})}
                  disabled={isRunning}
                  className="w-full mt-1 bg-[#0f0f0f] border border-[#2a2a2a] rounded-lg px-3 py-2 focus:border-[#00d4aa] focus:outline-none disabled:opacity-50"
                >
                  <option value="ETH-USDC">ETH-USDC</option>
                  <option value="BTC-USDC">BTC-USDC</option>
                  <option value="SOL-USDC">SOL-USDC</option>
                </select>
              </div>

              <div>
                <label className="text-gray-400 text-sm">Margin (USDC)</label>
                <input
                  type="number"
                  value={config.margin}
                  onChange={(e) => setConfig({...config, margin: Number(e.target.value)})}
                  disabled={isRunning}
                  className="w-full mt-1 bg-[#0f0f0f] border border-[#2a2a2a] rounded-lg px-3 py-2 focus:border-[#00d4aa] focus:outline-none disabled:opacity-50"
                />
              </div>

              <div>
                <label className="text-gray-400 text-sm">Leverage</label>
                <input
                  type="range"
                  min="1"
                  max="50"
                  value={config.leverage}
                  onChange={(e) => setConfig({...config, leverage: Number(e.target.value)})}
                  disabled={isRunning}
                  className="w-full mt-1 accent-[#00d4aa] disabled:opacity-50"
                />
                <p className="text-right text-sm text-[#00d4aa]">{config.leverage}x</p>
              </div>

              <div>
                <label className="text-gray-400 text-sm">Spread (%)</label>
                <input
                  type="number"
                  step="0.01"
                  value={config.spread}
                  onChange={(e) => setConfig({...config, spread: Number(e.target.value)})}
                  disabled={isRunning}
                  className="w-full mt-1 bg-[#0f0f0f] border border-[#2a2a2a] rounded-lg px-3 py-2 focus:border-[#00d4aa] focus:outline-none disabled:opacity-50"
                />
              </div>

              <div>
                <label className="text-gray-400 text-sm">Orders per Side</label>
                <input
                  type="number"
                  value={config.orderCount}
                  onChange={(e) => setConfig({...config, orderCount: Number(e.target.value)})}
                  disabled={isRunning}
                  className="w-full mt-1 bg-[#0f0f0f] border border-[#2a2a2a] rounded-lg px-3 py-2 focus:border-[#00d4aa] focus:outline-none disabled:opacity-50"
                />
              </div>

              <div>
                <label className="text-gray-400 text-sm">Stop Loss (%)</label>
                <input
                  type="number"
                  step="0.1"
                  value={config.stopLoss}
                  onChange={(e) => setConfig({...config, stopLoss: Number(e.target.value)})}
                  disabled={isRunning}
                  className="w-full mt-1 bg-[#0f0f0f] border border-[#2a2a2a] rounded-lg px-3 py-2 focus:border-[#00d4aa] focus:outline-none disabled:opacity-50"
                />
              </div>

              {/* Start/Stop Button */}
              <button
                onClick={isRunning ? handleStop : handleStart}
                className={`w-full py-3 rounded-lg font-semibold transition-all ${
                  isRunning
                    ? 'bg-red-500/20 text-red-500 border border-red-500/50 hover:bg-red-500/30'
                    : 'bg-[#00d4aa] text-black hover:bg-[#00b894]'
                }`}
              >
                {isRunning ? 'STOP BOT' : 'START BOT'}
              </button>
            </div>
          </div>
        </div>

        {/* Stats & Trades */}
        <div className="lg:col-span-2 space-y-6">
          {/* Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-[#1a1a1a] rounded-xl p-4 border border-[#2a2a2a]">
              <p className="text-gray-400 text-sm">Total PnL</p>
              <p className={`text-2xl font-bold font-mono ${stats.totalPnL >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                ${stats.totalPnL.toFixed(2)}
              </p>
            </div>
            <div className="bg-[#1a1a1a] rounded-xl p-4 border border-[#2a2a2a]">
              <p className="text-gray-400 text-sm">Volume</p>
              <p className="text-2xl font-bold font-mono">${stats.totalVolume.toLocaleString()}</p>
            </div>
            <div className="bg-[#1a1a1a] rounded-xl p-4 border border-[#2a2a2a]">
              <p className="text-gray-400 text-sm">Trades</p>
              <p className="text-2xl font-bold font-mono">{stats.tradesCount}</p>
            </div>
            <div className="bg-[#1a1a1a] rounded-xl p-4 border border-[#2a2a2a]">
              <p className="text-gray-400 text-sm">Uptime</p>
              <p className="text-2xl font-bold font-mono text-[#00d4aa]">{stats.uptime}</p>
            </div>
          </div>

          {/* Order Book Visualization */}
          <div className="bg-[#1a1a1a] rounded-xl p-6 border border-[#2a2a2a]">
            <h2 className="text-lg font-semibold mb-4">Order Book</h2>
            <div className="grid grid-cols-2 gap-4">
              {/* Bids */}
              <div>
                <p className="text-green-500 text-sm mb-2">BIDS (Buy)</p>
                {[...Array(config.orderCount)].map((_, i) => {
                  const price = currentPrice - (i + 1) * (currentPrice * config.spread / 100)
                  const width = 100 - i * 15
                  return (
                    <div key={`bid-${i}`} className="relative mb-1">
                      <div
                        className="absolute inset-y-0 left-0 bg-green-500/20 rounded"
                        style={{ width: `${width}%` }}
                      />
                      <div className="relative flex justify-between px-2 py-1 text-sm font-mono">
                        <span className="text-green-500">${price.toFixed(2)}</span>
                        <span className="text-gray-400">{(Math.random() * 10).toFixed(3)}</span>
                      </div>
                    </div>
                  )
                })}
              </div>
              {/* Asks */}
              <div>
                <p className="text-red-500 text-sm mb-2">ASKS (Sell)</p>
                {[...Array(config.orderCount)].map((_, i) => {
                  const price = currentPrice + (i + 1) * (currentPrice * config.spread / 100)
                  const width = 100 - i * 15
                  return (
                    <div key={`ask-${i}`} className="relative mb-1">
                      <div
                        className="absolute inset-y-0 right-0 bg-red-500/20 rounded"
                        style={{ width: `${width}%` }}
                      />
                      <div className="relative flex justify-between px-2 py-1 text-sm font-mono">
                        <span className="text-gray-400">{(Math.random() * 10).toFixed(3)}</span>
                        <span className="text-red-500">${price.toFixed(2)}</span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>

          {/* Recent Trades */}
          <div className="bg-[#1a1a1a] rounded-xl p-6 border border-[#2a2a2a]">
            <h2 className="text-lg font-semibold mb-4">Recent Trades</h2>
            {trades.length === 0 ? (
              <p className="text-gray-500 text-center py-8">No trades yet. Start the bot to begin trading.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-gray-400 border-b border-[#2a2a2a]">
                      <th className="text-left pb-2">Time</th>
                      <th className="text-left pb-2">Side</th>
                      <th className="text-right pb-2">Price</th>
                      <th className="text-right pb-2">Amount</th>
                      <th className="text-right pb-2">PnL</th>
                    </tr>
                  </thead>
                  <tbody>
                    {trades.map((trade) => (
                      <tr key={trade.id} className="border-b border-[#2a2a2a]/50">
                        <td className="py-2 font-mono text-gray-400">{trade.time}</td>
                        <td className={`py-2 font-semibold ${trade.side === 'BUY' ? 'text-green-500' : 'text-red-500'}`}>
                          {trade.side}
                        </td>
                        <td className="py-2 text-right font-mono">${trade.price.toFixed(2)}</td>
                        <td className="py-2 text-right font-mono">{trade.amount}</td>
                        <td className={`py-2 text-right font-mono ${trade.pnl >= 0 ? 'text-green-500' : 'text-red-500'}`}>
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
      <footer className="mt-8 text-center text-gray-500 text-sm">
        <p>MM Bot Dashboard v0.1 | Not connected to real exchange (Demo Mode)</p>
      </footer>
    </div>
  )
}
