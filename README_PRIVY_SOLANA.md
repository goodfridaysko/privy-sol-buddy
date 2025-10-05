# Solana + Privy Wallet - Production Guide

## Overview
This is a production-ready Solana wallet built with Privy's embedded wallet technology. Users can login, get a self-custodial wallet, fund it, send SOL, and swap tokens—all without managing seed phrases.

## Key Features
- **Privy Authentication**: Email, SMS, or passkey login (no seed phrases)
- **Embedded Solana Wallet**: Auto-provisioned, self-custodial, encrypted client-side
- **MoonPay Integration**: Buy SOL with credit/debit card
- **Send SOL**: Transfer SOL to any Solana address
- **Jupiter Swaps**: Swap SOL ↔ USDC/USDT with best rates

## Setup Instructions

### 1. Get a Privy App ID
1. Go to [Privy Dashboard](https://dashboard.privy.io)
2. Create a new app or use existing one
3. Enable Solana in the "Chains" settings
4. Copy your App ID

### 2. Configure Environment
Create a `.env` file in the root:
```bash
VITE_PRIVY_APP_ID=your_privy_app_id_here
```

### 3. Install & Run
```bash
npm install
npm run dev
```

## How It Works

### Local Encryption & Custody
- **Privy's Embedded Wallets** use MPC (Multi-Party Computation) to encrypt private keys
- Keys are split across multiple parties—user's device, Privy's infrastructure, and recovery share
- **No single party can access the full key**
- Private keys never leave the user's control in plaintext
- All signing happens client-side with encrypted key shares

### Wallet Backup & Export
Users can back up their wallet in Privy settings:
1. Log in to your app
2. Access Privy settings (usually in user menu)
3. Options:
   - **Export Private Key**: Download encrypted private key (requires authentication)
   - **Recovery Code**: Generate a recovery code for account restoration
   - **Email Recovery**: Set up email-based recovery

**Note**: Privy embedded wallets are recoverable via the user's login method (email/SMS/passkey). No seed phrase needed!

### Switching Clusters (Mainnet/Devnet/Testnet)

To switch Solana clusters, edit `src/lib/solana.ts`:

```typescript
// Current: Mainnet
export const CLUSTER = 'mainnet-beta';

// For testing, use:
export const CLUSTER = 'devnet'; // or 'testnet'
export const connection = new Connection(clusterApiUrl(CLUSTER), 'confirmed');
```

**Important**: When using devnet/testnet:
- Jupiter swaps may not work (limited liquidity)
- MoonPay only supports mainnet funding
- Use Solana faucet for devnet SOL: `solana airdrop 2 <your-address> --url devnet`

## Architecture

### File Structure
```
src/
├── privy/
│   └── PrivyClient.tsx          # Privy provider + config
├── hooks/
│   ├── useAuth.ts               # Login/logout
│   ├── useEmbeddedSolWallet.ts  # Get wallet & address
│   ├── useBalance.ts            # SOL balance fetching
│   └── useFund.ts               # MoonPay funding
├── lib/
│   ├── solana.ts                # Solana connection & tx helpers
│   └── jupiter.ts               # Jupiter swap integration
├── components/
│   ├── WalletCard.tsx           # Balance & fund UI
│   ├── SendSolForm.tsx          # Send SOL form
│   └── SwapForm.tsx             # Jupiter swap UI
└── pages/
    └── Index.tsx                # Main app UI
```

### Key Concepts

**No Backend Required**: 
- All crypto operations happen client-side
- Privy handles auth & key management infrastructure
- No API keys or secrets in your code

**Transaction Signing**:
- Transactions are built with `@solana/web3.js`
- Privy wallet signs them client-side using encrypted key shares
- Broadcasts directly to Solana RPC nodes

**Security Best Practices**:
- ✅ No private keys in code or localStorage
- ✅ All signing done via Privy's encrypted wallet
- ✅ User always in control of their keys
- ✅ MPC ensures no single point of failure

## Production Checklist

- [ ] Set real Privy App ID in `.env`
- [ ] Configure allowed domains in Privy dashboard
- [ ] Test on mainnet with small amounts first
- [ ] Implement error handling & user feedback
- [ ] Add transaction history tracking
- [ ] Consider rate limiting for API calls
- [ ] Add analytics (optional)
- [ ] Enable Privy's email recovery for users
- [ ] Test wallet export/recovery flows

## Common Issues

**Wallet not appearing after login?**
- Check Privy dashboard: Solana chain enabled?
- Verify `embeddedWallets.solana.createOnLogin` is set
- Check browser console for errors

**MoonPay not opening?**
- MoonPay only works on mainnet
- Ensure Privy app has MoonPay integration enabled
- Check user's region (MoonPay has geographic restrictions)

**Jupiter swap failing?**
- Check you're on mainnet (devnet has limited liquidity)
- Verify slippage tolerance (increase if needed)
- Ensure sufficient SOL for transaction fees

## Resources

- [Privy Docs](https://docs.privy.io)
- [Solana Web3.js Docs](https://solana-labs.github.io/solana-web3.js/)
- [Jupiter API Docs](https://station.jup.ag/docs/apis/swap-api)
- [MoonPay](https://www.moonpay.com/)

## License
MIT
