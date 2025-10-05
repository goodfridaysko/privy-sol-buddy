import { Connection, PublicKey, VersionedTransaction } from '@solana/web3.js';
import { connection } from './solana';

// Jupiter API endpoint
const JUPITER_API = 'https://quote-api.jup.ag/v6';

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

  const url = new URL(`${JUPITER_API}/quote`);
  url.searchParams.append('inputMint', inputMint);
  url.searchParams.append('outputMint', outputMint);
  url.searchParams.append('amount', amount.toString());
  url.searchParams.append('slippageBps', slippageBps.toString());

  const response = await fetch(url.toString());
  if (!response.ok) {
    throw new Error('Failed to fetch swap quote');
  }

  return response.json();
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
  const swapResponse = await fetch(`${JUPITER_API}/swap`, {
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
    throw new Error('Failed to get swap transaction');
  }

  const { swapTransaction } = await swapResponse.json();

  // Deserialize transaction
  const transactionBuf = Buffer.from(swapTransaction, 'base64');
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
  // Add more tokens as needed
};
