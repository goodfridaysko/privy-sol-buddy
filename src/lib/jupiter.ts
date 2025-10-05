/**
 * Jupiter V6 Swap Integration
 * Direct API integration for embedded wallet compatibility
 */

import { VersionedTransaction } from '@solana/web3.js';
import { TRAPANI_MINT, SOL_MINT, SLIPPAGE_BPS } from '@/config/swap';
import { supabase } from '@/integrations/supabase/client';

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
 * Get swap quote from Jupiter via backend proxy
 */
export async function getSwapQuote(
  inputMint: string,
  outputMint: string,
  amount: number // in SOL or token units
): Promise<SwapQuote> {
  const lamports = Math.floor(amount * 1_000_000_000);
  
  const { data, error } = await supabase.functions.invoke('jupiter-quote', {
    body: {
      inputMint,
      outputMint,
      amount: lamports,
      slippageBps: SLIPPAGE_BPS,
    },
  });

  if (error) throw error;
  return data;
}

/**
 * Build swap transaction from quote via backend proxy
 */
export async function buildSwapTransaction(
  quote: SwapQuote,
  userPublicKey: string
): Promise<string> {
  const { data, error } = await supabase.functions.invoke('jupiter-swap', {
    body: {
      quoteResponse: quote,
      userPublicKey,
    },
  });

  if (error) throw error;
  return data.swapTransaction;
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
