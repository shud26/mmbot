import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://ofpbscpcryquxrtojpei.supabase.co'
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9mcGJzY3BjcnlxdXhydG9qcGVpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkyMTY2MTMsImV4cCI6MjA4NDc5MjYxM30.xqmqiAXsxU9rCk6j9tV_0c3UjrX-t5ee5xsLUccpmE4'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export interface Trade {
  id?: string
  created_at?: string
  pair: string
  side: 'LONG' | 'SHORT'
  price: number
  amount: number
  pnl: number
  margin: number
  leverage: number
}

export async function saveTrade(trade: Trade) {
  const { data, error } = await supabase
    .from('nado_trades')
    .insert([trade])
    .select()

  if (error) {
    console.error('Error saving trade:', error)
    return null
  }
  return data
}

export async function getTrades(limit = 50) {
  const { data, error } = await supabase
    .from('nado_trades')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) {
    console.error('Error fetching trades:', error)
    return []
  }
  return data
}

export async function getStats() {
  const { data, error } = await supabase
    .from('nado_trades')
    .select('pnl, amount, price')

  if (error) {
    console.error('Error fetching stats:', error)
    return { totalPnL: 0, totalVolume: 0, tradesCount: 0 }
  }

  const totalPnL = data.reduce((sum, t) => sum + (t.pnl || 0), 0)
  const totalVolume = data.reduce((sum, t) => sum + (t.amount * t.price || 0), 0)

  return {
    totalPnL: Math.round(totalPnL * 100) / 100,
    totalVolume: Math.round(totalVolume * 100) / 100,
    tradesCount: data.length
  }
}
