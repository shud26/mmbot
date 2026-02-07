'use client'

import { useState, useCallback } from 'react'
import { useAccount, useWalletClient } from 'wagmi'
import { encodePacked, keccak256, toHex, pad, parseUnits } from 'viem'

// Nado API endpoint
const NADO_API = 'https://gateway.prod.nado.xyz/v1'

// Product IDs (from Nado docs)
export const NADO_PRODUCTS: Record<string, number> = {
  'BTC-USDC': 2,
  'ETH-USDC': 4,
  'SOL-USDC': 8,
  'INK-USDC': 42,
}

// EIP712 Domain
const getDomain = (productId: number) => ({
  name: 'Nado',
  version: '0.0.1',
  chainId: 57073, // Ink Mainnet
  verifyingContract: `0x${productId.toString(16).padStart(40, '0')}` as `0x${string}`,
})

// EIP712 Types
const ORDER_TYPES = {
  Order: [
    { name: 'sender', type: 'bytes32' },
    { name: 'priceX18', type: 'int128' },
    { name: 'amount', type: 'int128' },
    { name: 'expiration', type: 'uint64' },
    { name: 'nonce', type: 'uint64' },
    { name: 'appendix', type: 'uint128' },
  ],
} as const

export interface UseNadoReturn {
  isLoading: boolean
  error: string | null
  clientReady: boolean
  pendingOrders: { digest: string; side: 'LONG' | 'SHORT'; price: number; amount: number }[]
  submitOrder: (
    productId: number,
    price: number,
    amount: number
  ) => Promise<{ success: boolean; digest?: string; error?: string }>
  submitMarketMakingOrders: (
    productId: number,
    currentPrice: number,
    spreadPercent: number,
    orderCount: number,
    amountPerOrder: number
  ) => Promise<{ success: boolean; ordersPlaced: number; errors: string[] }>
  cancelAllOrders: (productId: number) => Promise<void>
  getProductId: (pair: string) => number | undefined
}

// Create sender bytes32: address (20 bytes) + subaccount name (12 bytes)
function createSender(address: `0x${string}`, subaccountName: string = 'default'): `0x${string}` {
  // Pad subaccount name to 12 bytes
  const nameBytes = new TextEncoder().encode(subaccountName)
  const paddedName = new Uint8Array(12)
  paddedName.set(nameBytes.slice(0, 12))

  // Combine address (20 bytes) + name (12 bytes)
  const addressBytes = address.slice(2) // remove 0x
  const nameHex = Array.from(paddedName).map(b => b.toString(16).padStart(2, '0')).join('')

  return `0x${addressBytes}${nameHex}` as `0x${string}`
}

// Create nonce: (recv_time_millis << 20) + random
// recv_time should be slightly in the future to account for network latency
function createNonce(): bigint {
  const recvTime = BigInt(Date.now() + 5000) // 5 seconds buffer for network latency
  const random = BigInt(Math.floor(Math.random() * 1000000))
  return (recvTime << BigInt(20)) + random
}

// Create appendix: version=1, order type, etc.
function createAppendix(orderType: 'LIMIT' | 'IOC' | 'FOK' | 'POST_ONLY' = 'LIMIT', reduceOnly: boolean = false): bigint {
  const version = BigInt(1)
  const isolated = BigInt(0)
  const typeValue = orderType === 'LIMIT' ? BigInt(0) : orderType === 'IOC' ? BigInt(1) : orderType === 'FOK' ? BigInt(2) : BigInt(3)
  const reduce = reduceOnly ? BigInt(1) : BigInt(0)

  // bits 0-7: version, bit 8: isolated, bits 9-10: type, bit 11: reduce only
  return version | (isolated << BigInt(8)) | (typeValue << BigInt(9)) | (reduce << BigInt(11))
}

export function useNado(): UseNadoReturn {
  const { address, isConnected } = useAccount()
  const { data: walletClient } = useWalletClient()

  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pendingOrders, setPendingOrders] = useState<
    { digest: string; side: 'LONG' | 'SHORT'; price: number; amount: number }[]
  >([])

  const clientReady = !!(walletClient && isConnected && address)

  const getProductId = useCallback((pair: string): number | undefined => {
    return NADO_PRODUCTS[pair]
  }, [])

  // Submit a single order
  const submitOrder = useCallback(
    async (
      productId: number,
      price: number,
      amount: number // positive = long, negative = short
    ): Promise<{ success: boolean; digest?: string; error?: string }> => {
      if (!address || !isConnected || !walletClient) {
        return { success: false, error: 'Wallet not connected' }
      }

      try {
        setIsLoading(true)
        setError(null)

        const side = amount >= 0 ? 'LONG' : 'SHORT'
        console.log(`[Nado] Placing ${side} order: price=${price}, amount=${amount}`)

        // Create order data
        const sender = createSender(address)
        // Round price to 0.1 increment (price_increment_x18 = 10^17)
        const roundedPrice = Math.round(price * 10) / 10
        const priceX18 = parseUnits(roundedPrice.toFixed(1), 18)
        const amountX18 = parseUnits(Math.abs(amount).toFixed(6), 18) * (amount >= 0 ? BigInt(1) : BigInt(-1))
        const expiration = BigInt(Math.floor(Date.now() / 1000) + 86400) // 24 hours
        const nonce = createNonce()
        const appendix = createAppendix('LIMIT')

        const order = {
          sender,
          priceX18,
          amount: amountX18,
          expiration,
          nonce,
          appendix,
        }

        const domain = getDomain(productId)
        console.log('[Nado] Order data:', order)
        console.log('[Nado] Domain:', domain)
        console.log('[Nado] Types:', ORDER_TYPES)
        console.log('[Nado] Requesting signature from wallet...')

        // Sign with EIP712
        const signature = await walletClient.signTypedData({
          domain,
          types: ORDER_TYPES,
          primaryType: 'Order',
          message: order,
        })

        console.log('[Nado] Signature received:', signature)

        // Submit to API
        const requestBody = {
          place_order: {
            product_id: productId,
            order: {
              sender,
              priceX18: priceX18.toString(),
              amount: amountX18.toString(),
              expiration: expiration.toString(),
              nonce: nonce.toString(),
              appendix: appendix.toString(),
            },
            signature,
          },
        }

        console.log('[Nado] Request:', JSON.stringify(requestBody, null, 2))

        const response = await fetch(`${NADO_API}/execute`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept-Encoding': 'gzip',
          },
          body: JSON.stringify(requestBody),
        })

        const result = await response.json()
        console.log('[Nado] Response:', result)

        if (result.status === 'success') {
          const digest = result.data?.digest || `order-${Date.now()}`
          setPendingOrders((prev) => [
            ...prev,
            { digest, side, price, amount: Math.abs(amount) },
          ])
          return { success: true, digest }
        } else {
          const errorMsg = result.error || result.message || 'Order failed'
          setError(errorMsg)
          return { success: false, error: errorMsg }
        }
      } catch (err) {
        const errorMsg = (err as Error).message
        console.error('[Nado] Order error:', err)
        setError(errorMsg)
        return { success: false, error: errorMsg }
      } finally {
        setIsLoading(false)
      }
    },
    [address, isConnected, walletClient]
  )

  // Submit multiple market making orders
  const submitMarketMakingOrders = useCallback(
    async (
      productId: number,
      currentPrice: number,
      spreadPercent: number,
      orderCount: number,
      amountPerOrder: number
    ): Promise<{ success: boolean; ordersPlaced: number; errors: string[] }> => {
      if (!address || !isConnected || !walletClient) {
        return { success: false, ordersPlaced: 0, errors: ['Wallet not connected'] }
      }

      const errors: string[] = []
      let ordersPlaced = 0

      setIsLoading(true)
      setError(null)

      // Calculate bid and ask prices
      for (let i = 0; i < orderCount; i++) {
        const offset = (i + 1) * (spreadPercent / 100)

        // Bid (long) - below current price
        const bidPrice = currentPrice * (1 - offset)
        const bidResult = await submitOrder(productId, bidPrice, amountPerOrder)
        if (bidResult.success) {
          ordersPlaced++
        } else if (bidResult.error) {
          errors.push(`Bid ${i + 1}: ${bidResult.error}`)
        }

        // Ask (short) - above current price
        const askPrice = currentPrice * (1 + offset)
        const askResult = await submitOrder(productId, askPrice, -amountPerOrder)
        if (askResult.success) {
          ordersPlaced++
        } else if (askResult.error) {
          errors.push(`Ask ${i + 1}: ${askResult.error}`)
        }
      }

      setIsLoading(false)

      return {
        success: ordersPlaced > 0,
        ordersPlaced,
        errors,
      }
    },
    [address, isConnected, walletClient, submitOrder]
  )

  // Cancel all orders
  const cancelAllOrders = useCallback(async (productId: number) => {
    if (!walletClient || !address) return

    setIsLoading(true)

    try {
      const sender = createSender(address)
      const nonce = createNonce()

      // EIP712 types for cancellation
      const cancelTypes = {
        CancellationProducts: [
          { name: 'sender', type: 'bytes32' },
          { name: 'productIds', type: 'uint32[]' },
          { name: 'nonce', type: 'uint64' },
        ],
      } as const

      const message = {
        sender,
        productIds: [productId],
        nonce,
      }

      // Get endpoint address for cancel (not product address)
      const cancelDomain = {
        name: 'Nado',
        version: '0.0.1',
        chainId: 57073,
        verifyingContract: '0x05ec92D78ED421f3D3Ada77FFdE167106565974E' as `0x${string}`, // Endpoint address
      }

      const signature = await walletClient.signTypedData({
        domain: cancelDomain,
        types: cancelTypes,
        primaryType: 'CancellationProducts',
        message,
      })

      const requestBody = {
        cancel_product_orders: {
          sender,
          productIds: [productId],
          nonce: nonce.toString(),
          signature,
        },
      }

      const response = await fetch(`${NADO_API}/execute`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept-Encoding': 'gzip',
        },
        body: JSON.stringify(requestBody),
      })

      const result = await response.json()
      console.log('[Nado] Cancel response:', result)

      if (result.status === 'success') {
        setPendingOrders([])
      }
    } catch (err) {
      console.error('[Nado] Cancel error:', err)
    }

    setIsLoading(false)
  }, [walletClient, address])

  return {
    isLoading,
    error,
    clientReady,
    pendingOrders,
    submitOrder,
    submitMarketMakingOrders,
    cancelAllOrders,
    getProductId,
  }
}
