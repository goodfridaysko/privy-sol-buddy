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
 * Get SOL balance for an address using backend proxy
 * This avoids client-side rate limits by using our edge function
 */
export async function getBalance(address: string): Promise<number> {
  try {
    console.log('🔍 Fetching balance via backend proxy...');
    
    const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/get-sol-balance`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({ address }),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();
    console.log('✅ Balance fetched:', data.balance, 'SOL');
    return data.balance || 0;
  } catch (error) {
    console.error('❌ Failed to fetch balance:', error);
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
