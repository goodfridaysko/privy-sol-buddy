import { VersionedTransaction } from '@solana/web3.js';

const RAYDIUM_API = 'https://transaction-v1.raydium.io';

export interface RaydiumQuote {
  id: string;
  success: boolean;
  version: string;
  data: {
    swapType: string;
    inputMint: string;
    inputAmount: string;
    outputMint: string;
    outputAmount: string;
    otherAmountThreshold: string;
    slippageBps: number;
    priceImpactPct: number;
    routePlan: any[];
  };
}

export async function getRaydiumQuote(
  inputMint: string,
  outputMint: string,
  amount: number,
  slippageBps: number = 50
): Promise<RaydiumQuote> {
  try {
    const url = `${RAYDIUM_API}/compute/swap-base-in?inputMint=${inputMint}&outputMint=${outputMint}&amount=${amount}&slippageBps=${slippageBps}&txVersion=V0`;
    
    console.log('📊 Fetching Raydium quote:', { amount: amount / 1e9, url });

    const response = await fetch(url);

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Raydium API error: ${errorText}`);
    }

    const quote = await response.json();
    
    if (!quote.success || !quote.data) {
      throw new Error('Invalid quote response');
    }

    console.log('✅ Quote received:', {
      inputAmount: quote.data.inputAmount,
      outputAmount: quote.data.outputAmount,
      priceImpact: quote.data.priceImpactPct
    });

    return quote;
  } catch (error) {
    console.error('💥 Quote fetch failed:', error);
    throw error;
  }
}

export async function getRaydiumSwapTransaction(
  quote: RaydiumQuote,
  walletAddress: string,
  priorityFee: string = '10000'
): Promise<VersionedTransaction> {
  try {
    console.log('🔧 Building Raydium swap transaction');

    const response = await fetch(`${RAYDIUM_API}/transaction/swap-base-in`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        computeUnitPriceMicroLamports: priorityFee,
        swapResponse: quote,
        txVersion: 'V0',
        wallet: walletAddress,
        wrapSol: true,
        unwrapSol: false,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Raydium swap failed: ${errorText}`);
    }

    const swapData = await response.json();
    
    if (!swapData.success || !swapData.data?.[0]?.transaction) {
      throw new Error('Invalid swap transaction response');
    }

    console.log('✅ Transaction built successfully');

    // Deserialize transaction
    const transactionBuf = Uint8Array.from(
      atob(swapData.data[0].transaction), 
      c => c.charCodeAt(0)
    );
    
    return VersionedTransaction.deserialize(transactionBuf);
  } catch (error) {
    console.error('💥 Swap transaction build failed:', error);
    throw error;
  }
}
