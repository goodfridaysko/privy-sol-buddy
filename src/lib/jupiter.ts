/**
 * Jupiter V6 Swap Integration
 * Direct API integration for embedded wallet compatibility
 */

import { PublicKey, VersionedTransaction } from '@solana/web3.js';
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
 * Get swap quote from Jupiter
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

  const response = await fetch(`${JUPITER_API}/quote?${params}`);
  if (!response.ok) {
    throw new Error('Failed to get swap quote');
  }

  return await response.json();
}

/**
 * Build swap transaction from quote
 */
export async function buildSwapTransaction(
  quote: SwapQuote,
  userPublicKey: string
): Promise<string> {
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
    throw new Error('Failed to build swap transaction');
  }

  const { swapTransaction } = await response.json();
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
