import { VersionedTransaction } from '@solana/web3.js';

const JUPITER_QUOTE_API = 'https://quote-api.jup.ag/v6';

export interface JupiterQuote {
  inputMint: string;
  inAmount: string;
  outputMint: string;
  outAmount: string;
  otherAmountThreshold: string;
  swapMode: string;
  slippageBps: number;
  priceImpactPct: number;
  routePlan: any[];
}

export interface SwapRequest {
  quoteResponse: JupiterQuote;
  userPublicKey: string;
  wrapAndUnwrapSol?: boolean;
  dynamicComputeUnitLimit?: boolean;
  priorityLevelWithMaxLamports?: {
    maxLamports: number;
    priorityLevel: string;
  };
}

export async function getJupiterQuote(
  inputMint: string,
  outputMint: string,
  amount: number,
  slippageBps: number = 50
): Promise<JupiterQuote> {
  const maxRetries = 3;
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const url = `${JUPITER_QUOTE_API}/quote?inputMint=${inputMint}&outputMint=${outputMint}&amount=${amount}&slippageBps=${slippageBps}`;
      
      console.log(`📊 Fetching Jupiter quote (attempt ${attempt}/${maxRetries}):`, {
        inputMint,
        outputMint,
        amount,
        amountSOL: amount / 1e9,
        slippageBps
      });

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
        mode: 'cors',
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Jupiter quote error:', errorText);
        throw new Error(`Jupiter API error (${response.status}): ${errorText}`);
      }

      const quote = await response.json();
      
      if (!quote || !quote.inputMint || !quote.outputMint) {
        throw new Error('Invalid quote response from Jupiter');
      }

      console.log('✅ Quote received:', {
        inAmount: quote.inAmount,
        outAmount: quote.outAmount,
        priceImpact: quote.priceImpactPct
      });

      return quote;
    } catch (error: any) {
      lastError = error;
      console.error(`💥 Quote attempt ${attempt} failed:`, error.message);
      
      if (attempt < maxRetries) {
        const delay = Math.min(1000 * Math.pow(2, attempt - 1), 5000);
        console.log(`⏳ Retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  throw new Error(`Failed to fetch quote after ${maxRetries} attempts: ${lastError?.message || 'Unknown error'}`);
}

export async function getJupiterSwapTransaction(
  quote: JupiterQuote,
  userPublicKey: string
): Promise<VersionedTransaction> {
  const maxRetries = 2;
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`🔧 Building swap transaction (attempt ${attempt}/${maxRetries}) for:`, userPublicKey);

      const swapRequest: SwapRequest = {
        quoteResponse: quote,
        userPublicKey,
        wrapAndUnwrapSol: true,
        dynamicComputeUnitLimit: true,
        priorityLevelWithMaxLamports: {
          maxLamports: 10000000,
          priorityLevel: 'high'
        }
      };

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 20000);

      const response = await fetch(`${JUPITER_QUOTE_API}/swap`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        mode: 'cors',
        body: JSON.stringify(swapRequest),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Jupiter swap error:', errorText);
        throw new Error(`Jupiter swap failed (${response.status}): ${errorText}`);
      }

      const { swapTransaction } = await response.json();
      
      if (!swapTransaction) {
        throw new Error('No transaction returned from Jupiter');
      }

      console.log('✅ Swap transaction built successfully');

      // Deserialize the transaction
      const transactionBuf = Uint8Array.from(atob(swapTransaction), c => c.charCodeAt(0));
      const transaction = VersionedTransaction.deserialize(transactionBuf);

      return transaction;
    } catch (error: any) {
      lastError = error;
      console.error(`💥 Swap attempt ${attempt} failed:`, error.message);
      
      if (attempt < maxRetries) {
        const delay = 2000;
        console.log(`⏳ Retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  throw new Error(`Failed to build swap transaction after ${maxRetries} attempts: ${lastError?.message || 'Unknown error'}`);
}
