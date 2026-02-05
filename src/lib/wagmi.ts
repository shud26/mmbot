import { http, createConfig } from 'wagmi'
import { mainnet, arbitrum, base, optimism } from 'wagmi/chains'
import { injected, walletConnect } from 'wagmi/connectors'

// Ink Chain (Kraken L2) - Custom Chain Definition
export const inkChain = {
  id: 57073,
  name: 'Ink',
  nativeCurrency: {
    decimals: 18,
    name: 'Ethereum',
    symbol: 'ETH',
  },
  rpcUrls: {
    default: { http: ['https://rpc-gel.inkonchain.com'] },
    public: { http: ['https://rpc-gel.inkonchain.com'] },
  },
  blockExplorers: {
    default: { name: 'Ink Explorer', url: 'https://explorer.inkonchain.com' },
  },
} as const

// Ink Sepolia (Testnet)
export const inkSepolia = {
  id: 763373,
  name: 'Ink Sepolia',
  nativeCurrency: {
    decimals: 18,
    name: 'Sepolia Ether',
    symbol: 'ETH',
  },
  rpcUrls: {
    default: { http: ['https://rpc-gel-sepolia.inkonchain.com'] },
    public: { http: ['https://rpc-gel-sepolia.inkonchain.com'] },
  },
  blockExplorers: {
    default: { name: 'Ink Sepolia Explorer', url: 'https://explorer-sepolia.inkonchain.com' },
  },
  testnet: true,
} as const

export const config = createConfig({
  chains: [inkChain, inkSepolia, mainnet, arbitrum, base, optimism],
  connectors: [
    injected(),
  ],
  transports: {
    [inkChain.id]: http(),
    [inkSepolia.id]: http(),
    [mainnet.id]: http(),
    [arbitrum.id]: http(),
    [base.id]: http(),
    [optimism.id]: http(),
  },
})

// USDC Contract Addresses
export const USDC_ADDRESSES: Record<number, `0x${string}`> = {
  [inkChain.id]: '0x0000000000000000000000000000000000000000', // TODO: Add real Ink USDC address
  [mainnet.id]: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
  [arbitrum.id]: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
  [base.id]: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
  [optimism.id]: '0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85',
}

// ERC20 ABI for balance checking
export const ERC20_ABI = [
  {
    constant: true,
    inputs: [{ name: '_owner', type: 'address' }],
    name: 'balanceOf',
    outputs: [{ name: 'balance', type: 'uint256' }],
    type: 'function',
  },
  {
    constant: true,
    inputs: [],
    name: 'decimals',
    outputs: [{ name: '', type: 'uint8' }],
    type: 'function',
  },
] as const
