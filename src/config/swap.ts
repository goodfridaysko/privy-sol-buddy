/**
 * Swap Configuration - PumpPortal Trading API
 * Production-grade settings for SOL → TRAPANI swaps
 */

export const TRAPANI_MINT = 'Hq1sM1Tc8nepd63th9L2Np3WYJ6TUY1pbwYSKmAjpump';
export const SOL_MINT = 'So11111111111111111111111111111111111111112';
export const SLIPPAGE_PERCENT = 10; // 10% slippage tolerance
export const PRIORITY_FEE = 0.00001; // Priority fee in SOL
export const RPC_URL = 'https://api.mainnet-beta.solana.com';

// Safety limits
export const MIN_SOL_AMOUNT = 0.001; // Minimum swap amount in SOL
export const MIN_SOL_RESERVE = 0.005; // Keep for rent + fees
export const MAX_RETRIES = 3;
export const REQUEST_TIMEOUT_MS = 20000;

export const EXPLORER_URL = 'https://solscan.io';
