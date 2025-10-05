/**
 * Swap Configuration
 * 
 * Update TRAPANI_MINT with your actual token mint address
 */

export const TRAPANI_MINT = 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263';

export const SOL_MINT = 'So11111111111111111111111111111111111111112';

export const SLIPPAGE_BPS = 50; // 0.5%

export const RPC_URL = 'https://api.mainnet-beta.solana.com';

// Jupiter API endpoints with fallbacks
export const JUPITER_API_ENDPOINTS = [
  'https://quote-api.jup.ag/v6',
  'https://api.jup.ag/v6', // Alternative endpoint
  'https://public.jupiterapi.com/v6', // Public endpoint
];

export const MIN_SOL_AMOUNT = 0.001; // Minimum swap amount in SOL

export const EXPLORER_URL = 'https://solscan.io';
