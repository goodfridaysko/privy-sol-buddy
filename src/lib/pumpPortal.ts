/**
 * PumpPortal Trading API Integration
 * Provides buy/sell transactions for pump.fun tokens with Privy wallet signing
 */

import { VersionedTransaction } from '@solana/web3.js';

const PUMPPORTAL_API = 'https://pumpportal.fun/api/trade-local';

export interface PumpPortalTradeParams {
  publicKey: string;
  action: 'buy' | 'sell';
  mint: string;
  amount: number | string; // SOL amount or token amount or percentage (e.g., "100%")
  denominatedInSol: 'true' | 'false';
  slippage: number; // percentage
  priorityFee: number; // in SOL
  pool?: 'pump' | 'raydium' | 'pump-amm' | 'launchlab' | 'raydium-cpmm' | 'bonk' | 'auto';
}

/**
 * Get a swap transaction from PumpPortal API
 * Returns serialized transaction bytes for Privy signing
 */
export async function getPumpPortalTransaction(
  params: PumpPortalTradeParams
): Promise<Uint8Array> {
  console.log('[PumpPortal] Requesting transaction:', {
    action: params.action,
    mint: params.mint.slice(0, 8) + '...',
    amount: params.amount,
    denominatedInSol: params.denominatedInSol,
  });

  const response = await fetch(PUMPPORTAL_API, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(params),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('[PumpPortal] API error:', errorText);
    throw new Error(`PumpPortal API failed (${response.status}): ${errorText}`);
  }

  // Response is serialized transaction bytes
  const data = await response.arrayBuffer();
  const txBytes = new Uint8Array(data);
  
  console.log('[PumpPortal] Transaction received:', {
    size: txBytes.length,
    bytes: txBytes
  });

  return txBytes;
}

/**
 * Helper to buy tokens with SOL
 */
export async function buyTokenWithSOL(
  publicKey: string,
  tokenMint: string,
  solAmount: number,
  slippage: number = 10,
  priorityFee: number = 0.00001
): Promise<Uint8Array> {
  return getPumpPortalTransaction({
    publicKey,
    action: 'buy',
    mint: tokenMint,
    amount: solAmount,
    denominatedInSol: 'true',
    slippage,
    priorityFee,
    pool: 'auto',
  });
}

/**
 * Helper to sell all tokens for SOL
 */
export async function sellTokenForSOL(
  publicKey: string,
  tokenMint: string,
  percentage: string = '100%',
  slippage: number = 10,
  priorityFee: number = 0.00001
): Promise<Uint8Array> {
  return getPumpPortalTransaction({
    publicKey,
    action: 'sell',
    mint: tokenMint,
    amount: percentage,
    denominatedInSol: 'false',
    slippage,
    priorityFee,
    pool: 'auto',
  });
}
