# Nado MM Bot v0.5

Market Making Bot for Nado DEX on Ink Chain (Kraken L2).

## Features

### Level 1: Dashboard UI ✅
- Real-time price chart with area visualization
- Order book display (bid/ask spreads)
- Trade history table
- PnL, volume, trades count, uptime stats
- Dark/Light theme toggle

### Level 2: Wallet Connection ✅
- RainbowKit integration
- Multi-chain support (Ink, Ethereum, Arbitrum, Base, Optimism)
- Wallet balance display
- Network switching

### Level 3: Nado DEX Integration ✅
- **Live/Demo mode toggle**
- EIP712 order signing
- Market making order placement (bid + ask spreads)
- Order cancellation
- Pending orders tracking

### Level 4: Advanced Features (Coming Soon)
- Real-time orderbook from Nado WebSocket
- Position management
- Stop-loss automation
- 24/7 server deployment

## Tech Stack

- **Frontend**: Next.js 16 + React 19 + TypeScript
- **Styling**: Tailwind CSS 4
- **Web3**: wagmi 2.x + viem + RainbowKit
- **Charts**: Recharts
- **Database**: Supabase (trade history)
- **DEX**: Nado (Ink Chain)

## Getting Started

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Environment Variables

Create `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_key
```

## Nado DEX API

### Endpoints
- Testnet: `https://gateway.test.nado.xyz/v2`
- Mainnet: `https://gateway.nado.xyz/v2`

### Products (Markets)
| Product | ID |
|---------|-----|
| BTC-USDC | 1 |
| ETH-USDC | 2 |
| SOL-USDC | 3 |
| INK-USDC | 4 |

### Order Format
- Prices: 18 decimals (e.g., $2500 = "2500000000000000000000")
- Amount: 18 decimals, positive = long, negative = short
- Signature: EIP712 typed data

## Usage

1. Connect wallet (MetaMask, WalletConnect, etc.)
2. Switch to Ink Sepolia (testnet) or Ink Mainnet
3. Configure trading pair, margin, leverage, spread
4. Toggle **LIVE MODE** for real trading (Demo mode for practice)
5. Click **Start Bot** to begin market making

⚠️ **Warning**: Live mode submits real orders to Nado DEX. Use testnet first!

## File Structure

```
src/
├── app/
│   └── page.tsx          # Main dashboard
├── hooks/
│   └── useNado.ts        # Nado DEX hook
├── lib/
│   ├── nado.ts           # Nado API client
│   ├── supabase.ts       # Database client
│   ├── telegram.ts       # Telegram notifications
│   └── wagmi.ts          # Web3 config
└── types/
    └── bignumber.d.ts    # Type definitions
```

## Changelog

### v0.5 (2026-02-06)
- Added Nado DEX API integration
- Live/Demo mode toggle
- EIP712 order signing
- Market making order placement

### v0.4
- Added Telegram notifications
- Supabase trade history

### v0.3
- Added wallet connection (RainbowKit)
- Multi-chain support

### v0.2
- Order book visualization
- Trade history table

### v0.1
- Initial dashboard UI
- Price chart

## License

MIT
