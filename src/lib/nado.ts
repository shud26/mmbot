/**
 * Nado DEX API Integration using official SDK
 *
 * Uses @nadohq/client for proper order signing and submission
 */

// Re-export from SDK for convenience
export { createNadoClient } from '@nadohq/client'
export type { NadoClient } from '@nadohq/client'

// Product IDs on Nado (from API - perp products)
export const NADO_PRODUCTS: Record<string, number> = {
  'BTC-USDC': 2,  // BTC perpetual
  'ETH-USDC': 4,  // ETH perpetual
  'SOL-USDC': 8,  // SOL perpetual
  'INK-USDC': 42, // INK perpetual
}

// Get product ID from pair string
export function getProductId(pair: string): number | undefined {
  return NADO_PRODUCTS[pair]
}

// Calculate MM spread orders (bid + ask)
export function calculateMMOrders(
  currentPrice: number,
  spreadPercent: number,
  orderCount: number,
  amountPerOrder: number
): { bids: { price: number; amount: number }[]; asks: { price: number; amount: number }[] } {
  const bids: { price: number; amount: number }[] = []
  const asks: { price: number; amount: number }[] = []

  for (let i = 0; i < orderCount; i++) {
    const offset = (i + 1) * (spreadPercent / 100)

    // Bid (long) - below current price
    bids.push({
      price: currentPrice * (1 - offset),
      amount: amountPerOrder, // positive = long
    })

    // Ask (short) - above current price
    asks.push({
      price: currentPrice * (1 + offset),
      amount: -amountPerOrder, // negative = short
    })
  }

  return { bids, asks }
}
