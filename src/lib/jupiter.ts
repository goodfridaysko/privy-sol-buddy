import { JUPITER_API_URL } from '@/config/swap';

// Jupiter API supports CORS for browser requests
const USE_PROXY = false;

export interface QuoteParams {
  inputMint: string;
  outputMint: string;
  amount: number; // in lamports/smallest unit
  slippageBps: number;
}

export interface QuoteResponse {
  inputMint: string;
  inAmount: string;
  outputMint: string;
  outAmount: string;
  otherAmountThreshold: string;
  swapMode: string;
  slippageBps: number;
  priceImpactPct: string;
  routePlan: Array<{
    swapInfo: {
      ammKey: string;
      label: string;
      inputMint: string;
      outputMint: string;
      inAmount: string;
      outAmount: string;
      feeAmount: string;
      feeMint: string;
    };
    percent: number;
  }>;
  contextSlot?: number;
  timeTaken?: number;
}

export interface SwapParams {
  quoteResponse: QuoteResponse;
  userPublicKey: string;
  wrapAndUnwrapSol?: boolean;
  dynamicComputeUnitLimit?: boolean;
  prioritizationFeeLamports?: number;
}

export interface SwapResponse {
  swapTransaction: string; // base64 encoded transaction
  lastValidBlockHeight: number;
  prioritizationFeeLamports?: number;
}

/**
 * Fetch a swap quote from Jupiter V6 API
 * Includes retry logic for resilience
 */
export async function getQuote(params: QuoteParams): Promise<QuoteResponse> {
  const { inputMint, outputMint, amount, slippageBps } = params;

  const maxRetries = 3;
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      // Direct API call - Jupiter supports CORS
      const url = new URL(`${JUPITER_API_URL}/quote`);
      url.searchParams.append('inputMint', inputMint);
      url.searchParams.append('outputMint', outputMint);
      url.searchParams.append('amount', amount.toString());
      url.searchParams.append('slippageBps', slippageBps.toString());
      url.searchParams.append('onlyDirectRoutes', 'false');
      url.searchParams.append('asLegacyTransaction', 'false');

      console.log('🔍 Fetching Jupiter quote:', url.toString());

      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Jupiter quote API error: ${response.status} ${errorText}`);
      }

      const data = await response.json();
      
      if (!data.outAmount || data.outAmount === '0') {
        throw new Error('No valid route found for this swap');
      }

      console.log('✅ Quote received successfully');
      return data as QuoteResponse;
    } catch (error) {
      lastError = error as Error;
      console.error(`Quote attempt ${attempt + 1} failed:`, error);
      
      if (attempt < maxRetries - 1) {
        // Wait before retry (exponential backoff)
        await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, attempt)));
      }
    }
  }

  throw lastError || new Error('Failed to get quote after retries');
}

/**
 * Build a swap transaction from a quote
 * Returns base64 encoded serialized transaction
 */
export async function buildSwapTransaction(params: SwapParams): Promise<SwapResponse> {
  const {
    quoteResponse,
    userPublicKey,
    wrapAndUnwrapSol = true,
    dynamicComputeUnitLimit = true,
    prioritizationFeeLamports,
  } = params;

  const maxRetries = 3;
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      // Direct API call - Jupiter supports CORS
      console.log('🔄 Building swap transaction...');
      const response = await fetch(`${JUPITER_API_URL}/swap`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({
          quoteResponse,
          userPublicKey,
          wrapAndUnwrapSol,
          dynamicComputeUnitLimit,
          prioritizationFeeLamports,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Jupiter swap API error: ${response.status} ${errorText}`);
      }

      const data = await response.json();
      
      if (!data.swapTransaction) {
        throw new Error('No transaction returned from Jupiter');
      }

      console.log('✅ Swap transaction built successfully');
      return data as SwapResponse;
    } catch (error) {
      lastError = error as Error;
      console.error(`Swap transaction build attempt ${attempt + 1} failed:`, error);
      
      if (attempt < maxRetries - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, attempt)));
      }
    }
  }

  throw lastError || new Error('Failed to build swap transaction after retries');
}

/**
 * Calculate price impact percentage
 */
export function calculatePriceImpact(quote: QuoteResponse): number {
  return parseFloat(quote.priceImpactPct);
}

/**
 * Format route for display
 */
export function formatRoute(quote: QuoteResponse): string {
  if (!quote.routePlan || quote.routePlan.length === 0) {
    return 'Direct';
  }

  return quote.routePlan
    .map(route => route.swapInfo.label || 'Unknown')
    .join(' → ');
}
