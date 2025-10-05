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
    const url = `${JUPITER_QUOTE_API}/quote?inputMint=${inputMint}&outputMint=${outputMint}&amount=${amount}&slippageBps=${slippageBps}`;
    
    console.log('📊 Fetching Jupiter quote:', {
      inputMint,
      outputMint,
      amount,
      amountSOL: amount / 1e9
    });

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    });

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
    console.log('🔧 Building swap transaction for:', userPublicKey);

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

    const response = await fetch(`${JUPITER_QUOTE_API}/swap`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify(swapRequest),
    });

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
  } catch (error) {
    console.error('💥 Swap transaction build failed:', error);
    throw error;
  }
}
