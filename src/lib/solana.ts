import {
  Connection,
  PublicKey,
  SystemProgram,
  Transaction,
  LAMPORTS_PER_SOL,
  clusterApiUrl,
} from '@solana/web3.js';

// Solana connection - using reliable public RPC endpoint
// Using Helius public endpoint which has better rate limits than Solana's default
const RPC_ENDPOINT = 'https://mainnet.helius-rpc.com/?api-key=public';
export const CLUSTER = 'mainnet-beta';
export const connection = new Connection(RPC_ENDPOINT, 'confirmed');

/**
 * Convert SOL to lamports (1 SOL = 1,000,000,000 lamports)
 */
export function solToLamports(sol: number): number {
  return Math.floor(sol * LAMPORTS_PER_SOL);
}

/**
 * Convert lamports to SOL
 */
export function lamportsToSol(lamports: number): number {
  return lamports / LAMPORTS_PER_SOL;
}

/**
 * Create a SOL transfer transaction
 * @param from - Sender's public key
 * @param to - Recipient's public key (base58 string)
 * @param amountSol - Amount in SOL to send
 */
export async function createTransferTransaction(
  from: PublicKey,
  to: string,
  amountSol: number
): Promise<Transaction> {
  const transaction = new Transaction();

  // Add transfer instruction
  transaction.add(
    SystemProgram.transfer({
      fromPubkey: from,
      toPubkey: new PublicKey(to),
      lamports: solToLamports(amountSol),
    })
  );

  // Get recent blockhash
  const { blockhash } = await connection.getLatestBlockhash();
  transaction.recentBlockhash = blockhash;
  transaction.feePayer = from;

  return transaction;
}

/**
 * Get SOL balance for an address
 */
export async function getBalance(address: string): Promise<number> {
  try {
    const publicKey = new PublicKey(address);
    const balance = await connection.getBalance(publicKey);
    return lamportsToSol(balance);
  } catch (error) {
    console.error('Error fetching balance:', error);
    return 0;
  }
}

/**
 * Validate Solana address
 */
export function isValidSolanaAddress(address: string): boolean {
  try {
    new PublicKey(address);
    return true;
  } catch {
    return false;
  }
}
