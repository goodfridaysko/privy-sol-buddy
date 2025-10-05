import { Connection, PublicKey, VersionedTransaction } from '@solana/web3.js';
import { connection } from './solana';

// Jupiter API endpoint - using Lite (free) version
const JUPITER_QUOTE_API = 'https://lite-api.jup.ag/swap/v1/quote';
const JUPITER_SWAP_API = 'https://lite-api.jup.ag/swap/v1/swap';

interface SwapParams {
  inputMint: string; // Token mint address (SOL: So11111111111111111111111111111111111111112)
  outputMint: string; // Token mint address
  amount: number; // Amount in smallest unit (lamports for SOL)
  slippageBps: number; // Slippage in basis points (50 = 0.5%)
  userPublicKey: string; // User's wallet address
}

interface QuoteResponse {
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
 * Get a swap quote from Jupiter
 */
export async function getSwapQuote(params: SwapParams): Promise<QuoteResponse> {
  const { inputMint, outputMint, amount, slippageBps } = params;

  const url = new URL(JUPITER_QUOTE_API);
  url.searchParams.append('inputMint', inputMint);
  url.searchParams.append('outputMint', outputMint);
  url.searchParams.append('amount', amount.toString());
  url.searchParams.append('slippageBps', slippageBps.toString());

  console.log('🔍 Fetching Jupiter quote:', url.toString());
  
  const response = await fetch(url.toString());
  if (!response.ok) {
    const errorText = await response.text();
    console.error('❌ Jupiter quote error:', response.status, errorText);
    throw new Error(`Failed to fetch swap quote: ${response.status}`);
  }

  const data = await response.json();
  console.log('✅ Jupiter quote received:', data);
  return data;
}

/**
 * Execute a Jupiter swap
 * @param quote - Quote from getSwapQuote
 * @param userPublicKey - User's wallet address
 * @param signTransaction - Function to sign the transaction (from Privy wallet)
 */
export async function executeSwap(
  quote: QuoteResponse,
  userPublicKey: string,
  signTransaction: (tx: VersionedTransaction) => Promise<VersionedTransaction>
): Promise<string> {
  // Get swap transaction from Jupiter
  console.log('🔄 Requesting swap transaction from Jupiter...');
  
  const swapResponse = await fetch(JUPITER_SWAP_API, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      quoteResponse: quote,
      userPublicKey,
      wrapAndUnwrapSol: true,
      dynamicComputeUnitLimit: true,
      prioritizationFeeLamports: 'auto',
    }),
  });

  if (!swapResponse.ok) {
    const errorText = await swapResponse.text();
    console.error('❌ Jupiter swap error:', swapResponse.status, errorText);
    throw new Error(`Failed to get swap transaction: ${swapResponse.status}`);
  }

  const { swapTransaction } = await swapResponse.json();
  console.log('✅ Swap transaction received');

  // Deserialize transaction - use browser-compatible base64 decoding
  const transactionBuf = Uint8Array.from(atob(swapTransaction), c => c.charCodeAt(0));
  const transaction = VersionedTransaction.deserialize(transactionBuf);

  // Sign with Privy wallet
  const signedTransaction = await signTransaction(transaction);

  // Send transaction
  const signature = await connection.sendRawTransaction(
    signedTransaction.serialize(),
    {
      skipPreflight: false,
      maxRetries: 2,
    }
  );

  // Confirm transaction
  await connection.confirmTransaction(signature, 'confirmed');

  return signature;
}

/**
 * Common Solana token mint addresses
 */
export const TOKEN_MINTS = {
  SOL: 'So11111111111111111111111111111111111111112',
  USDC: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
  USDT: 'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB',
  TRAPANI: 'Hq1sM1Tc8nepd63th9L2Np3WYJ6TUY1pbwYSKmAjpump',
};
