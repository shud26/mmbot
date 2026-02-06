'use client'

import { useState, useCallback, useMemo } from 'react'
import { useAccount, usePublicClient, useWalletClient } from 'wagmi'
import { createNadoClient, NADO_PRODUCTS, calculateMMOrders, getProductId } from '@/lib/nado'

export interface UseNadoReturn {
  // State
  isLoading: boolean
  error: string | null
  clientReady: boolean // Is Nado client initialized?
  pendingOrders: { digest: string; side: 'LONG' | 'SHORT'; price: number; amount: number }[]

  // Actions
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
  cancelAllOrders: (productId: number) => Promise<void>

  // Helpers
  getProductId: (pair: string) => number | undefined
}

export function useNado(): UseNadoReturn {
  const { address, isConnected } = useAccount()
  const publicClient = usePublicClient()
  const { data: walletClient } = useWalletClient()

  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pendingOrders, setPendingOrders] = useState<
    { digest: string; side: 'LONG' | 'SHORT'; price: number; amount: number }[]
  >([])

  // Create Nado client when wallet is connected
  const nadoClient = useMemo(() => {
    console.log('[Nado] Creating client...', {
      hasWalletClient: !!walletClient,
      hasPublicClient: !!publicClient
    })

    if (!walletClient || !publicClient) {
      console.log('[Nado] Missing client - walletClient or publicClient is null')
      return null
    }

    try {
      const client = createNadoClient('inkMainnet', {
        walletClient: walletClient as any,
        publicClient: publicClient as any,
      })
      console.log('[Nado] Client created successfully!', client)
      return client
    } catch (err) {
      console.error('[Nado] Failed to create client:', err)
      return null
    }
  }, [walletClient, publicClient])

  const clientReady = !!nadoClient

  // Submit a single order
  const submitOrder = useCallback(
    async (
      productId: number,
      price: number,
      amount: number // positive = long, negative = short
    ): Promise<{ success: boolean; digest?: string; error?: string }> => {
      if (!address || !isConnected || !nadoClient) {
        return { success: false, error: 'Wallet not connected or Nado client not ready' }
      }

      try {
        setIsLoading(true)
        setError(null)

        const side = amount >= 0 ? 'LONG' : 'SHORT'
        console.log(`[Nado] Placing ${side} order: price=${price}, amount=${amount}`)

        // Use SDK engine client to place order
        const result = await nadoClient.context.engineClient.placeOrder({
          productId,
          order: {
            subaccountOwner: address,
            subaccountName: '', // Default subaccount
            price,
            amount: amount.toString(),
            expiration: Math.floor(Date.now() / 1000) + 86400, // 24 hours
            appendix: 0,
          },
          verifyingAddr: nadoClient.context.contractAddresses.endpoint,
          chainId: 57073, // Ink mainnet
        })

        console.log('[Nado] Order result:', result)

        if (result.status === 'success') {
          const digest = result.data?.digest || result.orderParams?.nonce || `order-${Date.now()}`
          setPendingOrders((prev) => [
            ...prev,
            { digest, side, price, amount: Math.abs(amount) },
          ])
          return { success: true, digest }
        } else {
          return { success: false, error: 'Order failed' }
        }
      } catch (err) {
        const errorMsg = (err as Error).message
        console.error('[Nado] Order error:', errorMsg)
        setError(errorMsg)
        return { success: false, error: errorMsg }
      } finally {
        setIsLoading(false)
      }
    },
    [address, isConnected, nadoClient]
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
      if (!address || !isConnected || !nadoClient) {
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
    [address, isConnected, nadoClient, submitOrder]
  )

  // Cancel all pending orders
  const cancelAllOrders = useCallback(async (productId: number) => {
    if (!nadoClient || !address) return

    setIsLoading(true)

    try {
      // Cancel all orders for the product using engine client
      await nadoClient.context.engineClient.cancelProductOrders({
        subaccountOwner: address,
        subaccountName: '',
        productIds: [productId],
        verifyingAddr: nadoClient.context.contractAddresses.endpoint,
        chainId: 57073,
      })
      setPendingOrders([])
    } catch (err) {
      console.error('Cancel error:', err)
    }

    setIsLoading(false)
  }, [nadoClient, address])

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
