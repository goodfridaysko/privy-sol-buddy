import { 
  Connection, 
  PublicKey, 
  LAMPORTS_PER_SOL, 
  VersionedTransaction,
  SystemProgram,
  Transaction
} from '@solana/web3.js';
import { RPC_URL } from '@/config/swap';

// Primary and fallback RPC endpoints
const PRIMARY_RPC = RPC_URL;
const FALLBACK_RPC = 'https://rpc.ankr.com/solana';

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
 * Format SOL amount for display
 */
export function formatSol(lamports: number, decimals: number = 4): string {
  const sol = lamportsToSol(lamports);
  return sol.toFixed(decimals);
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

/**
 * Create a SOL transfer transaction
 * @param from - Sender's public key
 * @param to - Recipient's address (base58 string)
 * @param amountSol - Amount in SOL
 * @returns Promise<Transaction> - Unsigned transaction ready to send
 */
export async function createTransferTransaction(
  from: PublicKey,
  to: string,
  amountSol: number
): Promise<Transaction> {
  const transaction = new Transaction();

  transaction.add(
    SystemProgram.transfer({
      fromPubkey: from,
      toPubkey: new PublicKey(to),
      lamports: solToLamports(amountSol),
    })
  );

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
 * Deserialize a base64 encoded transaction into a VersionedTransaction
 */
export function deserializeTransaction(base64Transaction: string): VersionedTransaction {
  try {
    const transactionBuffer = Buffer.from(base64Transaction, 'base64');
    return VersionedTransaction.deserialize(transactionBuffer);
  } catch (error) {
    console.error('Failed to deserialize transaction:', error);
    throw new Error('Invalid transaction format');
  }
}

/**
 * Send a transaction using the embedded wallet
 * This is a wrapper that handles the wallet's sendTransaction method
 */
export async function sendWithEmbeddedWallet(
  wallet: any,
  transaction: VersionedTransaction
): Promise<string> {
  if (!wallet || !wallet.sendTransaction) {
    throw new Error('Wallet not available or does not support sendTransaction');
  }

  try {
    console.log('📝 Signing and sending transaction with embedded wallet...');
    const signature = await wallet.sendTransaction(transaction);
    console.log('✅ Transaction sent:', signature);
    return signature;
  } catch (error: any) {
    console.error('❌ Transaction failed:', error);
    
    // Parse common errors
    if (error.message?.includes('User rejected')) {
      throw new Error('Transaction was rejected by user');
    } else if (error.message?.includes('insufficient')) {
      throw new Error('Insufficient SOL balance for transaction');
    } else if (error.message?.includes('blockhash')) {
      throw new Error('Transaction expired, please try again');
    }
    
    throw new Error(error.message || 'Transaction failed');
  }
}

/**
 * Get transaction explorer URL
 */
export function getExplorerUrl(signature: string, cluster: string = CLUSTER): string {
  const baseUrl = 'https://solscan.io';
  return `${baseUrl}/tx/${signature}${cluster !== 'mainnet-beta' ? `?cluster=${cluster}` : ''}`;
}

/**
 * Format address for display (shortened)
 */
export function shortenAddress(address: string, chars: number = 4): string {
  if (!address || address.length < chars * 2) return address;
  return `${address.slice(0, chars)}...${address.slice(-chars)}`;
}

/**
 * Wait for transaction confirmation
 */
export async function confirmTransaction(signature: string): Promise<boolean> {
  try {
    const latestBlockhash = await connection.getLatestBlockhash();
    const confirmation = await connection.confirmTransaction({
      signature,
      ...latestBlockhash,
    });
    
    return !confirmation.value.err;
  } catch (error) {
    console.error('Failed to confirm transaction:', error);
    return false;
  }
}
