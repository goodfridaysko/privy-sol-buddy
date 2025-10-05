/**
 * Jupiter V6 API Integration via Supabase Edge Functions
 * Bypasses DNS/network issues by proxying through edge functions
 */

import { VersionedTransaction } from '@solana/web3.js';
import { supabase } from '@/integrations/supabase/client';

export interface JupiterQuoteResponse {
  inputMint: string;
  inAmount: string;
  outputMint: string;
  outAmount: string;
  otherAmountThreshold: string;
  swapMode: string;
  slippageBps: number;
  priceImpactPct: string; // Changed from number to string to match API response
  routePlan: Array<{
    swapInfo: {
      ammKey: string;
      label?: string;
      inputMint: string;
      outputMint: string;
      inAmount: string;
      outAmount: string;
      feeAmount: string;
      feeMint: string;
    };
    percent: number;
  }>;
}

interface SwapResponse {
  swapTransaction: string;
  lastValidBlockHeight: number;
  prioritizationFeeLamports: number;
}

/**
 * Fetch a swap quote via Supabase edge function (bypasses DNS issues)
 */
export async function fetchJupiterQuote(
  inputMint: string,
  outputMint: string,
  amountLamports: number,
  slippageBps: number
): Promise<JupiterQuoteResponse> {
  console.log('[Jupiter Quote] Fetching via edge function:', {
    inputMint: inputMint.slice(0, 8) + '...',
    outputMint: outputMint.slice(0, 8) + '...',
    amount: amountLamports,
    amountSOL: (amountLamports / 1e9).toFixed(4),
  });

  const { data, error } = await supabase.functions.invoke('jupiter-quote', {
    body: {
      inputMint,
      outputMint,
      amount: amountLamports,
      slippageBps,
    },
  });

  if (error) {
    console.error('[Jupiter Quote] Error:', error);
    throw new Error(`Failed to fetch quote: ${error.message}`);
  }

  if (!data || !data.inputMint || !data.outputMint) {
    throw new Error('Invalid quote response');
  }

  console.log('[Jupiter Quote] Success:', {
    inAmount: data.inAmount,
    outAmount: data.outAmount,
    priceImpact: data.priceImpactPct,
  });

  return data;
}

/**
 * Build a swap transaction via Supabase edge function (bypasses DNS issues)
 */
export async function buildJupiterSwap(
  quote: JupiterQuoteResponse,
  userPublicKey: string
): Promise<VersionedTransaction> {
  console.log('[Jupiter Swap] Building transaction via edge function:', {
    user: userPublicKey.slice(0, 8) + '...',
  });

  const { data, error } = await supabase.functions.invoke('jupiter-swap', {
    body: {
      quoteResponse: quote,
      userPublicKey,
    },
  });

  if (error) {
    console.error('[Jupiter Swap] Error:', error);
    throw new Error(`Failed to build swap: ${error.message}`);
  }

  if (!data || !data.swapTransaction) {
    throw new Error('Invalid swap transaction response');
  }

  console.log('[Jupiter Swap] Transaction built successfully');

  // Deserialize the base64 transaction (browser-compatible)
  const transactionBuf = Uint8Array.from(atob(data.swapTransaction), c => c.charCodeAt(0));
  const transaction = VersionedTransaction.deserialize(transactionBuf);

  return transaction;
}
