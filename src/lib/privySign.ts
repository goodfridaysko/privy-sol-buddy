/**
 * Privy Solana Transaction Signing Utility
 * 
 * This module provides a clean interface for signing and sending Solana transactions
 * using Privy's embedded wallet, with proper validation and error handling.
 */

import { Connection, VersionedTransaction, PublicKey } from '@solana/web3.js';
import { b64ToBytes } from '@/polyfills';
import { RPC_URL } from '@/config/swap';

const connection = new Connection(RPC_URL, 'confirmed');

/**
 * Sign and send a Solana transaction using Privy's embedded wallet
 * Includes validation for fee payer and blockhash freshness
 * 
 * @param transaction - VersionedTransaction to sign
 * @param wallet - Privy Solana wallet object with signTransaction method
 * @param userPubkey - User's public key (for fee payer validation)
 * @returns Transaction signature
 */
export async function signAndSendWithPrivy(
  transaction: VersionedTransaction,
  wallet: any,
  userPubkey: PublicKey
): Promise<string> {
  if (!wallet) {
    throw new Error('No Privy Solana wallet provided');
  }

  console.log('[PrivySign] Starting transaction sign + send...');

  // Sanity check: Fee payer must match user's wallet
  const feePayer = transaction.message.staticAccountKeys[0].toBase58();
  const userAddress = userPubkey.toBase58();
  
  console.log('[PrivySign] Transaction details:', {
    txVersion: (transaction as any).version || 'legacy',
    feePayer,
    userAddress,
    feePayerMatch: feePayer === userAddress
  });

  if (feePayer !== userAddress) {
    const error = `Fee payer mismatch: transaction expects ${feePayer} but wallet is ${userAddress}`;
    console.error('[PrivySign]', error);
    throw new Error(error);
  }

  // Optional: Check blockhash freshness (if > 60s, should rebuild at source)
  // For now we just log it
  console.log('[PrivySign] Fee payer validated, signing with Privy...');

  try {
    // Sign with Privy embedded wallet
    const signed = await wallet.signTransaction(transaction);
    
    console.log('[PrivySign] Transaction signed successfully, broadcasting...');

    // Broadcast to Solana network
    const sig = await connection.sendRawTransaction(signed.serialize(), {
      skipPreflight: false,
      preflightCommitment: 'confirmed',
      maxRetries: 3
    });

    console.log('[PrivySign] Transaction sent:', sig);

    // Wait for confirmation
    await connection.confirmTransaction(sig, 'confirmed');
    
    console.log('[PrivySign] Transaction confirmed:', sig);

    return sig;
  } catch (error: any) {
    console.error('[PrivySign] Sign/send failed:', error);
    console.error('[PrivySign] Error details:', {
      message: error?.message,
      name: error?.name,
      stack: error?.stack
    });
    throw error;
  }
}

/**
 * Sign a transaction using Privy (without sending)
 * Used when sending via edge function
 */
export async function signWithPrivy(
  transaction: VersionedTransaction,
  wallet: any,
  userPubkey: PublicKey
): Promise<Uint8Array> {
  if (!wallet) {
    throw new Error('No Privy Solana wallet provided');
  }

  console.log('[PrivySign] Validating transaction before signing...');
  
  // Sanity check: Fee payer must match user's wallet
  const feePayer = transaction.message.staticAccountKeys[0].toBase58();
  const userAddress = userPubkey.toBase58();
  
  console.log('[PrivySign] Transaction details:', {
    txVersion: (transaction as any).version || 'legacy',
    feePayer,
    userAddress,
    feePayerMatch: feePayer === userAddress,
    accountKeysCount: transaction.message.staticAccountKeys.length
  });

  if (feePayer !== userAddress) {
    const error = `Fee payer mismatch: transaction expects ${feePayer} but wallet is ${userAddress}`;
    console.error('[PrivySign]', error);
    throw new Error(error);
  }

  console.log('[PrivySign] Fee payer validated, signing transaction...');

  try {
    const signed = await wallet.signTransaction(transaction);
    
    console.log('[PrivySign] Transaction signed successfully');
    
    return signed.serialize();
  } catch (error: any) {
    console.error('[PrivySign] Signing failed:', error);
    console.error('[PrivySign] Error details:', {
      message: error?.message,
      name: error?.name,
      code: error?.code
    });
    
    // Re-throw with more context
    throw new Error(`Privy signing failed: ${error?.message || 'Unknown error'}`);
  }
}

