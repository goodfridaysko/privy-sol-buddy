import { JUPITER_API_ENDPOINTS } from '@/config/swap';

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

  const maxRetries = 2; // Reduced retries since we're trying multiple endpoints
  let lastError: Error | null = null;

  // Try each Jupiter API endpoint
  for (const apiEndpoint of JUPITER_API_ENDPOINTS) {
    console.log(`🔍 Trying Jupiter endpoint: ${apiEndpoint}`);
    
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        // Direct API call - Jupiter supports CORS
        const url = new URL(`${apiEndpoint}/quote`);
        url.searchParams.append('inputMint', inputMint);
        url.searchParams.append('outputMint', outputMint);
        url.searchParams.append('amount', amount.toString());
        url.searchParams.append('slippageBps', slippageBps.toString());
        url.searchParams.append('onlyDirectRoutes', 'false');
        url.searchParams.append('asLegacyTransaction', 'false');

        console.log(`🔍 Fetching quote, attempt ${attempt + 1}`);

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout

        const response = await fetch(url.toString(), {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
          },
          mode: 'cors',
          signal: controller.signal,
        }).catch(err => {
          console.error('Fetch error:', err);
          throw new Error(`Network error: ${err.message}`);
        }).finally(() => {
          clearTimeout(timeoutId);
        });

        console.log('Response status:', response.status);

        if (!response.ok) {
          const errorText = await response.text();
          console.error('Response error:', errorText);
          throw new Error(`API error: ${response.status}`);
        }

        const data = await response.json();
        
        if (!data.outAmount || data.outAmount === '0') {
          throw new Error('No valid route found');
        }

        console.log('✅ Quote received successfully from', apiEndpoint);
        return data as QuoteResponse;
      } catch (error) {
        lastError = error as Error;
        console.error(`❌ Attempt ${attempt + 1} failed for ${apiEndpoint}:`, error.message);
        
        if (attempt < maxRetries - 1) {
          const waitTime = 1000;
          console.log(`⏳ Retrying in ${waitTime}ms...`);
          await new Promise(resolve => setTimeout(resolve, waitTime));
        }
      }
    }
  }

  console.error('❌ All endpoints and retries failed');
  throw new Error('Unable to connect to Jupiter API. Please check your network connection.');
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

  const maxRetries = 2;
  let lastError: Error | null = null;

  // Try each Jupiter API endpoint
  for (const apiEndpoint of JUPITER_API_ENDPOINTS) {
    console.log(`🔄 Trying swap endpoint: ${apiEndpoint}`);
    
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000); // 15s timeout

        const response = await fetch(`${apiEndpoint}/swap`, {
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
          mode: 'cors',
          signal: controller.signal,
        }).catch(err => {
          throw new Error(`Network error: ${err.message}`);
        }).finally(() => {
          clearTimeout(timeoutId);
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`API error: ${response.status}`);
        }

        const data = await response.json();
        
        if (!data.swapTransaction) {
          throw new Error('No transaction returned');
        }

        console.log('✅ Swap transaction built from', apiEndpoint);
        return data as SwapResponse;
      } catch (error) {
        lastError = error as Error;
        console.error(`❌ Attempt ${attempt + 1} failed for ${apiEndpoint}:`, error.message);
        
        if (attempt < maxRetries - 1) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
    }
  }

  throw new Error('Unable to connect to Jupiter API. Please check your network connection.');
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
