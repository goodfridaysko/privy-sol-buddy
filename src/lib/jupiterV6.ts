/**
 * Jupiter V6 API Integration - Direct Client-Side Calls
 * All quote and swap calculations happen in the UI for smooth UX with Privy
 */

import { VersionedTransaction } from '@solana/web3.js';

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
  swapTransaction: string; // base64 encoded transaction
  lastValidBlockHeight: number;
  prioritizationFeeLamports: number;
}

/**
 * Fetch quote directly from Jupiter V6 API (client-side for smooth UX)
 */
export async function fetchJupiterQuote(
  inputMint: string,
  outputMint: string,
  amountLamports: number,
  slippageBps: number
): Promise<JupiterQuoteResponse> {
  console.log('[Jupiter Quote] Fetching directly from API:', {
    inputMint: inputMint.slice(0, 8) + '...',
    outputMint: outputMint.slice(0, 8) + '...',
    amount: amountLamports,
    amountSOL: (amountLamports / 1e9).toFixed(4),
  });

  const params = new URLSearchParams({
    inputMint,
    outputMint,
    amount: amountLamports.toString(),
    slippageBps: slippageBps.toString(),
    restrictIntermediateTokens: 'true',
  });

  const url = `https://lite-api.jup.ag/swap/v1/quote?${params}`;
  console.log('[Jupiter Quote] Calling:', url);

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Accept': 'application/json',
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('[Jupiter Quote] API error:', errorText);
    throw new Error(`Quote failed (${response.status}): ${errorText}`);
  }

  const data = await response.json();

  if (!data || !data.inputMint || !data.outputMint) {
    console.error('[Jupiter Quote] Invalid response:', data);
    throw new Error('Invalid quote response from Jupiter');
  }

  console.log('[Jupiter Quote] Success:', {
    inAmount: data.inAmount,
    outAmount: data.outAmount,
    priceImpact: data.priceImpactPct,
  });

  return data;
}

/**
 * Build swap transaction directly from Jupiter V6 API (client-side for smooth UX)
 * Returns properly formatted transaction for Privy signing
 */
export async function buildJupiterSwap(
  quote: JupiterQuoteResponse,
  userPublicKey: string
): Promise<Uint8Array> {
  console.log('[Jupiter Swap] Building transaction directly from API:', {
    user: userPublicKey.slice(0, 8) + '...',
    inAmount: quote.inAmount,
    outAmount: quote.outAmount,
  });

  const swapBody = {
    quoteResponse: quote,
    userPublicKey,
    wrapAndUnwrapSol: true,
    useSharedAccounts: true, // Auto-create ATA if needed (~0.002 SOL)
    dynamicComputeUnitLimit: true,
    dynamicSlippage: true,
    prioritizationFeeLamports: {
      priorityLevelWithMaxLamports: {
        maxLamports: 1000000,
        priorityLevel: "veryHigh"
      }
    }
  };

  console.log('[Jupiter Swap] Calling Jupiter swap API...');
  const response = await fetch('https://lite-api.jup.ag/swap/v1/swap', {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    },
    body: JSON.stringify(swapBody),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('[Jupiter Swap] API error:', errorText);
    throw new Error(`Swap failed (${response.status}): ${errorText}`);
  }

  const data = await response.json();
  
  if (!data || !data.swapTransaction) {
    console.error('[Jupiter Swap] Invalid response:', data);
    throw new Error('Invalid swap transaction response from Jupiter');
  }

  console.log('[Jupiter Swap] Transaction built successfully');

  // Convert base64 to Uint8Array
  const transactionBuf = Uint8Array.from(atob(data.swapTransaction), c => c.charCodeAt(0));
  
  // Deserialize and re-serialize to ensure proper format for Privy
  try {
    const transaction = VersionedTransaction.deserialize(transactionBuf);
    console.log('[Jupiter Swap] Transaction deserialized successfully, re-serializing for Privy');
    return transaction.serialize();
  } catch (error) {
    console.error('[Jupiter Swap] Failed to deserialize transaction:', error);
    // If deserialization fails, return the raw buffer
    return transactionBuf;
  }
}
