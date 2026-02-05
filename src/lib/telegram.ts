const TELEGRAM_BOT_TOKEN = process.env.NEXT_PUBLIC_TELEGRAM_TOKEN || ''
const TELEGRAM_CHAT_ID = process.env.NEXT_PUBLIC_TELEGRAM_CHAT_ID || ''

export interface TelegramSettings {
  enabled: boolean
  chatId: string
  notifyOnTrade: boolean
  notifyOnPnL: boolean
  pnlThreshold: number
}

export async function sendTelegramMessage(message: string, chatId?: string) {
  const targetChatId = chatId || TELEGRAM_CHAT_ID

  if (!TELEGRAM_BOT_TOKEN || !targetChatId) {
    console.log('Telegram not configured')
    return false
  }

  try {
    const response = await fetch(
      `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: targetChatId,
          text: message,
          parse_mode: 'HTML'
        })
      }
    )
    return response.ok
  } catch (error) {
    console.error('Telegram error:', error)
    return false
  }
}

export function formatTradeMessage(trade: {
  pair: string
  side: string
  price: number
  amount: number
  pnl: number
}) {
  const emoji = trade.side === 'LONG' ? '🟢' : '🔴'
  const pnlEmoji = trade.pnl >= 0 ? '💰' : '📉'

  return `
${emoji} <b>Nado MM Bot Trade</b>

<b>Pair:</b> ${trade.pair}
<b>Side:</b> ${trade.side}
<b>Price:</b> $${trade.price.toFixed(2)}
<b>Size:</b> ${trade.amount}
${pnlEmoji} <b>PnL:</b> ${trade.pnl >= 0 ? '+' : ''}$${trade.pnl.toFixed(2)}
`
}

export function formatDailyReport(stats: {
  totalPnL: number
  totalVolume: number
  tradesCount: number
  winRate: number
}) {
  const emoji = stats.totalPnL >= 0 ? '📈' : '📉'

  return `
${emoji} <b>Nado MM Bot Daily Report</b>

💰 <b>Total PnL:</b> ${stats.totalPnL >= 0 ? '+' : ''}$${stats.totalPnL.toFixed(2)}
📊 <b>Volume:</b> $${stats.totalVolume.toLocaleString()}
🔄 <b>Trades:</b> ${stats.tradesCount}
✅ <b>Win Rate:</b> ${stats.winRate}%
`
}
