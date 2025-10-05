/**
 * Jupiter V6 API Integration - Production Grade
 * Direct client-side calls with proper error handling
 */

import { VersionedTransaction } from '@solana/web3.js';
import { JUP_BASE, MAX_RETRIES, REQUEST_TIMEOUT_MS } from '@/config/swap';

export interface JupiterQuoteResponse {
  inputMint: string;
  inAmount: string;
  outputMint: string;
  outAmount: string;
  otherAmountThreshold: string;
  swapMode: string;
  slippageBps: number;
  priceImpactPct: number;
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
 * Fetch a swap quote from Jupiter V6
 */
export async function fetchJupiterQuote(
  inputMint: string,
  outputMint: string,
  amountLamports: number,
  slippageBps: number
): Promise<JupiterQuoteResponse> {
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const params = new URLSearchParams({
        inputMint,
        outputMint,
        amount: amountLamports.toString(),
        slippageBps: slippageBps.toString(),
        onlyDirectRoutes: 'false',
        asLegacyTransaction: 'false',
      });

      const url = `${JUP_BASE}/v6/quote?${params.toString()}`;

      console.log(`[Jupiter Quote] Attempt ${attempt}/${MAX_RETRIES}`, {
        inputMint: inputMint.slice(0, 8) + '...',
        outputMint: outputMint.slice(0, 8) + '...',
        amount: amountLamports,
        amountSOL: (amountLamports / 1e9).toFixed(4),
      });

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorBody}`);
      }

      const data: JupiterQuoteResponse = await response.json();

      if (!data.inputMint || !data.outputMint || !data.outAmount) {
        throw new Error('Invalid quote response structure');
      }

      console.log('[Jupiter Quote] Success', {
        inAmount: data.inAmount,
        outAmount: data.outAmount,
        priceImpact: data.priceImpactPct?.toFixed(2) + '%',
      });

      return data;

    } catch (error: any) {
      lastError = error;
      
      const errorMessage = error.message || String(error);
      console.error(`[Jupiter Quote] Attempt ${attempt} failed:`, errorMessage);

      // Don't retry on specific errors
      if (errorMessage.includes('No routes found') || 
          errorMessage.includes('Invalid') ||
          errorMessage.includes('HTTP 400')) {
        throw error;
      }

      // Exponential backoff for retries
      if (attempt < MAX_RETRIES) {
        const delayMs = Math.min(1000 * Math.pow(2, attempt - 1), 5000);
        console.log(`[Jupiter Quote] Retrying in ${delayMs}ms...`);
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
    }
  }

  throw new Error(`Quote failed after ${MAX_RETRIES} attempts: ${lastError?.message || 'Unknown error'}`);
}

/**
 * Build a swap transaction from a quote
 */
export async function buildJupiterSwap(
  quote: JupiterQuoteResponse,
  userPublicKey: string
): Promise<VersionedTransaction> {
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      console.log(`[Jupiter Swap] Building transaction (attempt ${attempt}/2)`, {
        user: userPublicKey.slice(0, 8) + '...',
      });

      const requestBody = {
        quoteResponse: quote,
        userPublicKey,
        wrapAndUnwrapSol: true,
        dynamicComputeUnitLimit: true,
        prioritizationFeeLamports: {
          priorityLevelWithMaxLamports: {
            maxLamports: 10000000,
            priorityLevel: 'high',
          },
        },
      };

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

      const response = await fetch(`${JUP_BASE}/v6/swap`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify(requestBody),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorBody}`);
      }

      const data: SwapResponse = await response.json();

      if (!data.swapTransaction) {
        throw new Error('No swap transaction in response');
      }

      console.log('[Jupiter Swap] Transaction built successfully');

      // Deserialize the base64 transaction
      const transactionBuf = Buffer.from(data.swapTransaction, 'base64');
      const transaction = VersionedTransaction.deserialize(transactionBuf);

      return transaction;

    } catch (error: any) {
      lastError = error;
      console.error(`[Jupiter Swap] Attempt ${attempt} failed:`, error.message);

      if (attempt < 2) {
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
  }

  throw new Error(`Swap build failed after 2 attempts: ${lastError?.message || 'Unknown error'}`);
}
