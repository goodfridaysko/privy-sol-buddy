import {
  Connection,
  PublicKey,
  SystemProgram,
  Transaction,
  LAMPORTS_PER_SOL,
  clusterApiUrl,
} from '@solana/web3.js';

// Solana connection - using Ankr's free public RPC endpoint
// Ankr provides reliable free access with better rate limits than Solana's default
// Fallback to official Solana RPC if Ankr fails
const PRIMARY_RPC = 'https://rpc.ankr.com/solana';
const FALLBACK_RPC = 'https://api.mainnet-beta.solana.com';

export const CLUSTER = 'mainnet-beta';
export const connection = new Connection(PRIMARY_RPC, 'confirmed');
export const fallbackConnection = new Connection(FALLBACK_RPC, 'confirmed');

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
 * Get SOL balance for an address with fallback support
 */
export async function getBalance(address: string): Promise<number> {
  try {
    console.log('🔍 Fetching balance from Ankr RPC...');
    const publicKey = new PublicKey(address);
    const balance = await connection.getBalance(publicKey);
    console.log('✅ Balance fetched successfully:', lamportsToSol(balance), 'SOL');
    return lamportsToSol(balance);
  } catch (error) {
    console.warn('⚠️ Ankr RPC failed, trying fallback...', error);
    
    // Try fallback connection
    try {
      const publicKey = new PublicKey(address);
      const balance = await fallbackConnection.getBalance(publicKey);
      console.log('✅ Balance fetched from fallback:', lamportsToSol(balance), 'SOL');
      return lamportsToSol(balance);
    } catch (fallbackError) {
      console.error('❌ Both RPCs failed:', fallbackError);
      return 0;
    }
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
