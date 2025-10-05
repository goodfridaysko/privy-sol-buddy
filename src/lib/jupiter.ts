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
  try {
    console.log('📊 Fetching Jupiter quote via edge function:', {
      inputMint,
      outputMint,
      amount,
      amountSOL: amount / 1e9,
      slippageBps
    });

    // Use edge function to avoid CORS issues
    const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/jupiter-quote`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({
        inputMint,
        outputMint,
        amount,
        slippageBps,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Jupiter quote error:', errorText);
      throw new Error(`Failed to get quote: ${errorText}`);
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
  } catch (error) {
    console.error('💥 Quote fetch failed:', error);
    throw error;
  }
}

export async function getJupiterSwapTransaction(
  quote: JupiterQuote,
  userPublicKey: string
): Promise<VersionedTransaction> {
  try {
    console.log('🔧 Building swap transaction via edge function for:', userPublicKey);

    // Use edge function to avoid CORS issues
    const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/jupiter-swap`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({
        quoteResponse: quote,
        userPublicKey,
        wrapAndUnwrapSol: true,
        dynamicComputeUnitLimit: true,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Jupiter swap error:', errorText);
      throw new Error(`Failed to build swap transaction: ${errorText}`);
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
  } catch (error) {
    console.error('💥 Swap transaction build failed:', error);
    throw error;
  }
}
