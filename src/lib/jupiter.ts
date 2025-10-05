/**
 * Jupiter V6 Swap Integration
 * Direct API calls from browser (production-ready)
 */

import { VersionedTransaction } from '@solana/web3.js';
import { TRAPANI_MINT, SOL_MINT, SLIPPAGE_BPS } from '@/config/swap';

const JUPITER_API = 'https://quote-api.jup.ag/v6';

export interface SwapQuote {
  inputMint: string;
  inAmount: string;
  outputMint: string;
  outAmount: string;
  otherAmountThreshold: string;
  swapMode: string;
  slippageBps: number;
  priceImpactPct: string;
  routePlan: any[];
}

/**
 * Get swap quote from Jupiter API (direct browser call)
 */
export async function getSwapQuote(
  inputMint: string,
  outputMint: string,
  amount: number // in SOL or token units
): Promise<SwapQuote> {
  const lamports = Math.floor(amount * 1_000_000_000);
  
  const params = new URLSearchParams({
    inputMint,
    outputMint,
    amount: lamports.toString(),
    slippageBps: SLIPPAGE_BPS.toString(),
  });

  console.log('🔍 Fetching Jupiter quote...');
  const response = await fetch(`${JUPITER_API}/quote?${params}`);
  
  if (!response.ok) {
    const error = await response.text();
    console.error('Jupiter API error:', error);
    throw new Error(`Failed to get quote: ${error}`);
  }

  const quote = await response.json();
  console.log('✅ Got quote:', quote);
  return quote;
}

/**
 * Build swap transaction from quote (direct browser call)
 */
export async function buildSwapTransaction(
  quote: SwapQuote,
  userPublicKey: string
): Promise<string> {
  console.log('🔨 Building swap transaction...');
  
  const response = await fetch(`${JUPITER_API}/swap`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      quoteResponse: quote,
      userPublicKey,
      wrapAndUnwrapSol: true,
      dynamicComputeUnitLimit: true,
      prioritizationFeeLamports: 'auto',
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error('Jupiter swap API error:', error);
    throw new Error(`Failed to build transaction: ${error}`);
  }

  const { swapTransaction } = await response.json();
  console.log('✅ Transaction built');
  return swapTransaction;
}

/**
 * Execute complete swap flow
 */
export async function executeSwap(
  wallet: any,
  userAddress: string,
  inputAmount: number,
  inputMint: string = SOL_MINT,
  outputMint: string = TRAPANI_MINT
): Promise<string> {
  console.log('🔄 Getting Jupiter quote...');
  const quote = await getSwapQuote(inputMint, outputMint, inputAmount);
  
  console.log('📝 Building swap transaction...');
  const swapTransactionBase64 = await buildSwapTransaction(quote, userAddress);
  
  console.log('🖊️ Signing and sending transaction...');
  const transactionBuf = Buffer.from(swapTransactionBase64, 'base64');
  const transaction = VersionedTransaction.deserialize(transactionBuf);
  
  // Use Privy's sendTransaction (signs + sends)
  const signature = await wallet.sendTransaction(transaction);
  
  console.log('✅ Swap transaction sent:', signature);
  return signature;
}
