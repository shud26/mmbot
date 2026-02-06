'use client'

import { useState, useCallback, useEffect } from 'react'
import { useAccount, useSignTypedData } from 'wagmi'
import {
  NADO_PRODUCTS,
  NADO_EIP712_DOMAIN,
  ORDER_TYPES,
  NadoOrderRequest,
  NadoPlaceOrderPayload,
  NadoProduct,
  NadoOrderbook,
  NadoPosition,
  getProducts,
  getOrderbook,
  getPositions,
  placeOrder,
  cancelOrder,
  createOrderMessage,
  toEIP712Message,
  toX18,
  fromX18,
  calculateMMOrders,
  logOrder,
} from '@/lib/nado'

export interface UseNadoReturn {
  // State
  isLoading: boolean
  error: string | null
  products: NadoProduct[]
  orderbook: NadoOrderbook | null
  positions: NadoPosition[]
  pendingOrders: { digest: string; side: 'LONG' | 'SHORT'; price: number; amount: number }[]

  // Actions
  fetchProducts: () => Promise<void>
  fetchOrderbook: (productId: number) => Promise<void>
  fetchPositions: () => Promise<void>
  submitOrder: (
    productId: number,
    price: number,
    amount: number // positive = long, negative = short
  ) => Promise<{ success: boolean; digest?: string; error?: string }>
  submitMarketMakingOrders: (
    productId: number,
    currentPrice: number,
    spreadPercent: number,
    orderCount: number,
    amountPerOrder: number
  ) => Promise<{ success: boolean; ordersPlaced: number; errors: string[] }>
  cancelAllOrders: () => Promise<void>

  // Helpers
  getProductId: (pair: string) => number | undefined
}

export function useNado(): UseNadoReturn {
  const { address, isConnected } = useAccount()
  const { signTypedDataAsync } = useSignTypedData()

  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [products, setProducts] = useState<NadoProduct[]>([])
  const [orderbook, setOrderbook] = useState<NadoOrderbook | null>(null)
  const [positions, setPositions] = useState<NadoPosition[]>([])
  const [pendingOrders, setPendingOrders] = useState<
    { digest: string; side: 'LONG' | 'SHORT'; price: number; amount: number }[]
  >([])

  // Fetch products on mount
  const fetchProducts = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)
      const data = await getProducts()
      setProducts(data)
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setIsLoading(false)
    }
  }, [])

  // Fetch orderbook for a product
  const fetchOrderbook = useCallback(async (productId: number) => {
    try {
      const data = await getOrderbook(productId)
      setOrderbook(data)
    } catch (err) {
      console.error('Orderbook fetch error:', err)
    }
  }, [])

  // Fetch positions for connected wallet
  const fetchPositions = useCallback(async () => {
    if (!address) return

    try {
      const data = await getPositions(address)
      setPositions(data)
    } catch (err) {
      console.error('Positions fetch error:', err)
    }
  }, [address])

  // Submit a single order
  const submitOrder = useCallback(
    async (
      productId: number,
      price: number,
      amount: number // positive = long, negative = short
    ): Promise<{ success: boolean; digest?: string; error?: string }> => {
      if (!address || !isConnected) {
        return { success: false, error: 'Wallet not connected' }
      }

      try {
        setIsLoading(true)
        setError(null)

        // Create order message
        const order = createOrderMessage(address, price, amount)
        const side = amount >= 0 ? 'LONG' : 'SHORT'
        logOrder(order, side)

        // Sign the order with EIP712 (wagmi requires bigint for numeric fields)
        const eip712Message = toEIP712Message(order)
        const signature = await signTypedDataAsync({
          domain: NADO_EIP712_DOMAIN,
          types: ORDER_TYPES,
          primaryType: 'Order',
          message: eip712Message,
        })

        // Build payload
        const payload: NadoPlaceOrderPayload = {
          place_order: {
            product_id: productId,
            order,
            signature,
            id: Date.now(),
          },
        }

        // Submit to Nado API
        const result = await placeOrder(payload)

        if (result.success && result.digest) {
          // Track pending order
          setPendingOrders((prev) => [
            ...prev,
            {
              digest: result.digest!,
              side,
              price,
              amount: Math.abs(amount),
            },
          ])
        }

        return result
      } catch (err) {
        const errorMsg = (err as Error).message
        setError(errorMsg)
        return { success: false, error: errorMsg }
      } finally {
        setIsLoading(false)
      }
    },
    [address, isConnected, signTypedDataAsync]
  )

  // Submit multiple market making orders (bid + ask spreads)
  const submitMarketMakingOrders = useCallback(
    async (
      productId: number,
      currentPrice: number,
      spreadPercent: number,
      orderCount: number,
      amountPerOrder: number
    ): Promise<{ success: boolean; ordersPlaced: number; errors: string[] }> => {
      if (!address || !isConnected) {
        return { success: false, ordersPlaced: 0, errors: ['Wallet not connected'] }
      }

      const { bids, asks } = calculateMMOrders(currentPrice, spreadPercent, orderCount, amountPerOrder)
      const allOrders = [...bids, ...asks]
      const errors: string[] = []
      let ordersPlaced = 0

      setIsLoading(true)
      setError(null)

      for (const orderData of allOrders) {
        try {
          const result = await submitOrder(productId, orderData.price, orderData.amount)
          if (result.success) {
            ordersPlaced++
          } else if (result.error) {
            errors.push(result.error)
          }
        } catch (err) {
          errors.push((err as Error).message)
        }
      }

      setIsLoading(false)

      return {
        success: ordersPlaced > 0,
        ordersPlaced,
        errors,
      }
    },
    [address, isConnected, submitOrder]
  )

  // Cancel all pending orders
  const cancelAllOrders = useCallback(async () => {
    if (!address) return

    setIsLoading(true)

    for (const order of pendingOrders) {
      try {
        // We need the product ID - for now assume ETH-USDC
        const productId = NADO_PRODUCTS['ETH-USDC'] || 2
        await cancelOrder(productId, order.digest)
      } catch (err) {
        console.error('Cancel error:', err)
      }
    }

    setPendingOrders([])
    setIsLoading(false)
  }, [address, pendingOrders])

  // Helper: Get product ID from pair string
  const getProductId = useCallback((pair: string): number | undefined => {
    return NADO_PRODUCTS[pair]
  }, [])

  // Disable auto-fetch for now - API format needs adjustment
  // useEffect(() => {
  //   fetchProducts()
  // }, [fetchProducts])

  // useEffect(() => {
  //   if (isConnected && address) {
  //     fetchPositions()
  //   }
  // }, [isConnected, address, fetchPositions])

  return {
    isLoading,
    error,
    products,
    orderbook,
    positions,
    pendingOrders,
    fetchProducts,
    fetchOrderbook,
    fetchPositions,
    submitOrder,
    submitMarketMakingOrders,
    cancelAllOrders,
    getProductId,
  }
}
