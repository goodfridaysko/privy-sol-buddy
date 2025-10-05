# Jupiter Swap Integration - Production Guide

## Overview

This is a production-grade, fully functional Jupiter swap integration for Solana that uses your **embedded non-custodial wallet** (Privy). No external wallet connections, no seed phrases, entirely client-side.

## Features

✅ **Non-custodial**: All signing happens client-side with your embedded wallet  
✅ **Client-side only**: No backend required, all Jupiter API calls from browser  
✅ **Production-ready**: Robust error handling, retry logic, user-friendly UX  
✅ **Resilient**: Exponential backoff retries for network issues  
✅ **Mobile & Desktop**: Works on all devices with HTTPS support  
✅ **Zero balance handling**: Integrated MoonPay funding flow  
✅ **Real-time quotes**: Debounced quote fetching with loading states  
✅ **Explorer links**: Direct links to Solscan for transaction verification  

## Configuration

### 1. Set TRAPANI Token Mint

Edit `src/config/swap.ts`:

```typescript
export const TRAPANI_MINT = 'YOUR_REAL_TRAPANI_MINT_ADDRESS_HERE';
```

Replace with your actual TRAPANI token mint address from Solana blockchain.

### 2. Configure Slippage (Optional)

Default is 0.5% (50 basis points). To change:

```typescript
export const SLIPPAGE_BPS = 100; // 1%
```

### 3. Configure RPC Endpoint (Optional)

Default uses Solana's public RPC. For production, consider upgrading to:

```typescript
export const RPC_URL = 'https://your-rpc-provider.com/YOUR_API_KEY';
```

Recommended providers:
- **Helius**: https://helius.dev
- **QuickNode**: https://quicknode.com  
- **Alchemy**: https://alchemy.com

### 4. Minimum Swap Amount (Optional)

```typescript
export const MIN_SOL_AMOUNT = 0.001; // Minimum 0.001 SOL
```

## How It Works

### Non-Custodial Signing

The swap uses your embedded Privy wallet which:
- Never exposes seed phrases
- Keeps keys encrypted locally
- Signs transactions client-side
- Sends signed transactions to Solana network

### Swap Flow

1. **Quote Fetch**: App requests swap route from Jupiter V6 API
   ```
   GET https://quote-api.jup.ag/v6/quote
   ```

2. **Transaction Build**: Jupiter returns serialized transaction
   ```
   POST https://quote-api.jup.ag/v6/swap
   ```

3. **Client-side Signing**: Embedded wallet signs the transaction
   ```typescript
   wallet.sendTransaction(transaction)
   ```

4. **Broadcast**: Signed transaction sent to Solana network

5. **Confirmation**: Balance refresh and explorer link displayed

### Zero Balance Handling

If SOL balance is 0:
- Warning displayed with explanation
- "Fund with Card" button opens MoonPay
- After funding, returns to swap interface
- Auto-refreshes balance

## Files Structure

```
src/
├── config/
│   └── swap.ts              # Configuration (TRAPANI_MINT, slippage, RPC)
├── lib/
│   ├── jupiter.ts           # Jupiter V6 API integration
│   └── solana.ts            # Solana utils, transaction handling
├── hooks/
│   └── useEmbeddedSolWallet.ts  # Embedded wallet hook
├── components/
│   ├── SwapPanel.tsx        # Main swap UI component
│   └── JupiterSwapButton.tsx  # Button to open swap modal
```

## Usage

### Basic Implementation

```tsx
import { SwapPanel } from '@/components/SwapPanel';

function App() {
  return <SwapPanel />;
}
```

### With Custom Output Token

```tsx
import { SwapPanel } from '@/components/SwapPanel';

function App() {
  return <SwapPanel defaultOutMint="YOUR_TOKEN_MINT" />;
}
```

### As Modal (Current Implementation)

```tsx
import { JupiterSwapButton } from '@/components/JupiterSwapButton';

function App() {
  const { address } = useEmbeddedSolWallet();
  
  return <JupiterSwapButton address={address} />;
}
```

## Troubleshooting

### HTTPS Required

Jupiter API and Privy wallet require HTTPS. Local development works on `localhost`, but deployed apps **must use HTTPS**.

### Allowed Origins

If using custom RPC, add your domain to the RPC provider's allowed origins:
- https://yourdomain.com
- https://localhost:3000 (for development)

### Storage & Cookies

Privy wallet requires:
- LocalStorage enabled
- Third-party cookies enabled (for auth)
- No "Block all cookies" browser setting

### Transaction Fails

Common causes:
1. **Insufficient balance**: Reserve 0.01 SOL for transaction fees
2. **Slippage exceeded**: Increase `SLIPPAGE_BPS` in config
3. **Network congestion**: Retry after a few seconds
4. **Expired blockhash**: Auto-retried by the app

### No Routes Found

If Jupiter can't find a route:
- Pool liquidity may be low for TRAPANI
- Try smaller amounts
- Check TRAPANI token is tradeable on Jupiter

## Testing

### Test with Small Amounts

Start with minimum amount (0.001 SOL) to verify:
1. Quote fetches successfully
2. Transaction builds correctly
3. Wallet signing works
4. Transaction confirms on-chain
5. Balance updates after swap

### Test Zero Balance Flow

1. Send all SOL out of wallet
2. Verify zero balance warning appears
3. Click "Fund with Card"
4. Complete MoonPay flow
5. Return to swap and verify balance updated

## Production Checklist

- [ ] Set real TRAPANI_MINT in config
- [ ] Configure production RPC endpoint
- [ ] Test on testnet/devnet first
- [ ] Verify HTTPS on deployed domain
- [ ] Test mobile browsers (iOS Safari, Chrome)
- [ ] Verify error handling with small amounts
- [ ] Test MoonPay funding integration
- [ ] Add domain to RPC allowed origins
- [ ] Monitor transaction success rates
- [ ] Set up error monitoring (Sentry, etc.)

## API Limits

**Jupiter API** (Free tier):
- No API key required
- Rate limits apply
- Retry logic built-in for resilience

For high-volume apps, consider:
- Self-hosting Jupiter API
- Using Jupiter SDK directly
- Adding request caching

## Security

✅ **No private keys exposed**: Wallet managed by Privy  
✅ **Client-side validation**: Amount, balance checks  
✅ **Transaction preview**: User sees expected output before confirming  
✅ **Slippage protection**: Configurable max price impact  
✅ **No backend risk**: Entirely client-side execution  

## Support

For issues:
1. Check console logs for detailed error messages
2. Verify configuration in `src/config/swap.ts`
3. Test with minimum amount first
4. Check Jupiter API status: https://status.jup.ag

## License

This integration follows your project's license terms.
