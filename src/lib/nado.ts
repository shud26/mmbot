/**
 * Nado DEX API Integration
 *
 * Nado is a CLOB DEX on Ink Chain (Kraken L2)
 * - Testnet: https://gateway.test.nado.xyz/v2
 * - Mainnet: https://gateway.nado.xyz/v2
 *
 * All prices and amounts use 18 decimals (1e18 = 1 unit)
 */

import BigNumber from 'bignumber.js'

// Configure BigNumber for precision
BigNumber.config({ DECIMAL_PLACES: 18, ROUNDING_MODE: BigNumber.ROUND_DOWN })

// API Endpoints
export const NADO_TESTNET = 'https://gateway.test.nado.xyz/v2'
export const NADO_MAINNET = 'https://gateway.nado.xyz/v2'

// Use mainnet for real trading
export const NADO_API = NADO_MAINNET

// EIP712 Domain for signing orders (chainId as number for wagmi)
export const NADO_EIP712_DOMAIN = {
  name: 'Nado',
  version: '1',
  chainId: 57073, // Ink Mainnet
}

// EIP712 Types for Order (wagmi requires specific format)
export const ORDER_TYPES = {
  Order: [
    { name: 'sender', type: 'address' },
    { name: 'priceX18', type: 'int128' },
    { name: 'amount', type: 'int128' },
    { name: 'expiration', type: 'uint64' },
    { name: 'nonce', type: 'uint64' },
  ],
} as const

// EIP712 Message Type (for wagmi signing - uses bigint)
export interface NadoOrderEIP712Message {
  sender: `0x${string}`
  priceX18: bigint
  amount: bigint
  expiration: bigint
  nonce: bigint
}

// Product IDs on Nado (market identifiers)
export const NADO_PRODUCTS: Record<string, number> = {
  'BTC-USDC': 1,
  'ETH-USDC': 2,
  'SOL-USDC': 3,
  'INK-USDC': 4, // Likely product ID, may need to verify
}

// Interfaces
export interface NadoOrderRequest {
  sender: `0x${string}`
  priceX18: string // Price in 18 decimals (e.g., "2500000000000000000000" for $2500)
  amount: string   // Amount in 18 decimals (positive = long, negative = short)
  expiration: string // Unix timestamp (uint64 max = 4294967295 for no expiry)
  nonce: string    // Unique nonce (usually timestamp-based)
}

export interface NadoPlaceOrderPayload {
  place_order: {
    product_id: number
    order: NadoOrderRequest
    signature: `0x${string}`
    id: number // Request ID (any unique number)
  }
}

export interface NadoCancelOrderPayload {
  cancel_orders: {
    product_id: number
    digest: string // Order digest (hash)
  }
}

export interface NadoProduct {
  product_id: number
  symbol: string
  mark_price: string
  index_price: string
  funding_rate: string
  open_interest: string
}

export interface NadoOrderbook {
  bids: [string, string][] // [price, size]
  asks: [string, string][] // [price, size]
  timestamp: number
}

export interface NadoPosition {
  product_id: number
  amount: string
  entry_price: string
  unrealized_pnl: string
  liquidation_price: string
}

// Helper: Convert number to X18 format (18 decimals)
export function toX18(value: number | string): string {
  return new BigNumber(value).times(new BigNumber(10).pow(18)).toFixed(0)
}

// Helper: Convert X18 to number
export function fromX18(valueX18: string): number {
  return new BigNumber(valueX18).div(new BigNumber(10).pow(18)).toNumber()
}

// Helper: Generate unique nonce
export function generateNonce(): string {
  const timestamp = Date.now()
  const random = Math.floor(Math.random() * 1000000)
  return `${timestamp}${random}`
}

// API: Get products (markets) info
export async function getProducts(): Promise<NadoProduct[]> {
  try {
    const response = await fetch(`${NADO_API}/products`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    })

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }

    const data = await response.json()
    return data.products || []
  } catch (error) {
    console.error('Nado getProducts error:', error)
    throw error
  }
}

// API: Get orderbook for a product
export async function getOrderbook(productId: number): Promise<NadoOrderbook> {
  try {
    const response = await fetch(`${NADO_API}/orderbook?product_id=${productId}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    })

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }

    return await response.json()
  } catch (error) {
    console.error('Nado getOrderbook error:', error)
    throw error
  }
}

// API: Get positions for an address
export async function getPositions(address: `0x${string}`): Promise<NadoPosition[]> {
  try {
    const response = await fetch(`${NADO_API}/positions?address=${address}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    })

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }

    const data = await response.json()
    return data.positions || []
  } catch (error) {
    console.error('Nado getPositions error:', error)
    throw error
  }
}

// API: Place an order (requires signature)
export async function placeOrder(payload: NadoPlaceOrderPayload): Promise<{ success: boolean; digest?: string; error?: string }> {
  try {
    const response = await fetch(`${NADO_API}/execute`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })

    const data = await response.json()

    if (!response.ok) {
      return { success: false, error: data.error || data.message || 'Order failed' }
    }

    return { success: true, digest: data.digest }
  } catch (error) {
    console.error('Nado placeOrder error:', error)
    return { success: false, error: (error as Error).message }
  }
}

// API: Cancel an order
export async function cancelOrder(productId: number, digest: string): Promise<{ success: boolean; error?: string }> {
  try {
    const payload: NadoCancelOrderPayload = {
      cancel_orders: {
        product_id: productId,
        digest,
      },
    }

    const response = await fetch(`${NADO_API}/execute`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })

    const data = await response.json()

    if (!response.ok) {
      return { success: false, error: data.error || 'Cancel failed' }
    }

    return { success: true }
  } catch (error) {
    console.error('Nado cancelOrder error:', error)
    return { success: false, error: (error as Error).message }
  }
}

// Create order message for EIP712 signing
export function createOrderMessage(
  sender: `0x${string}`,
  price: number,
  amount: number, // positive = long, negative = short
  expirationSeconds: number = 86400 // Default 24 hours
): NadoOrderRequest {
  const now = Math.floor(Date.now() / 1000)
  const expiration = now + expirationSeconds

  return {
    sender,
    priceX18: toX18(price),
    amount: toX18(amount),
    expiration: expiration.toString(),
    nonce: generateNonce(),
  }
}

// Convert order request to EIP712 message format (for wagmi signing)
export function toEIP712Message(order: NadoOrderRequest): NadoOrderEIP712Message {
  return {
    sender: order.sender,
    priceX18: BigInt(order.priceX18),
    amount: BigInt(order.amount),
    expiration: BigInt(order.expiration),
    nonce: BigInt(order.nonce),
  }
}

// Build EIP712 typed data for signing
export function buildOrderTypedData(order: NadoOrderRequest) {
  return {
    domain: NADO_EIP712_DOMAIN,
    types: ORDER_TYPES,
    primaryType: 'Order' as const,
    message: order,
  }
}

// Full flow: Create and sign an order
export async function createSignedOrder(
  signTypedDataAsync: (params: {
    domain: typeof NADO_EIP712_DOMAIN
    types: typeof ORDER_TYPES
    primaryType: 'Order'
    message: NadoOrderRequest
  }) => Promise<`0x${string}`>,
  sender: `0x${string}`,
  productId: number,
  price: number,
  amount: number, // positive = long, negative = short
  expirationSeconds?: number
): Promise<NadoPlaceOrderPayload> {
  // Create order message
  const order = createOrderMessage(sender, price, amount, expirationSeconds)

  // Build typed data for signing
  const typedData = buildOrderTypedData(order)

  // Sign the order
  const signature = await signTypedDataAsync(typedData)

  // Build the final payload
  return {
    place_order: {
      product_id: productId,
      order,
      signature,
      id: Date.now(), // Unique request ID
    },
  }
}

// Utility: Calculate MM spread orders (bid + ask)
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

// Log order details (for debugging)
export function logOrder(order: NadoOrderRequest, side: 'LONG' | 'SHORT'): void {
  const priceNum = fromX18(order.priceX18)
  const amountNum = fromX18(order.amount)

  console.log(`[Nado] ${side} Order:`)
  console.log(`  Sender: ${order.sender}`)
  console.log(`  Price: $${priceNum.toFixed(2)}`)
  console.log(`  Amount: ${Math.abs(amountNum).toFixed(4)}`)
  console.log(`  Expires: ${new Date(parseInt(order.expiration) * 1000).toISOString()}`)
  console.log(`  Nonce: ${order.nonce}`)
}
