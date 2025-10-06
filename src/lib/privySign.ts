/**
 * Privy Solana Transaction Signing Utility
 * 
 * This module provides a clean interface for signing and sending Solana transactions
 * using Privy's embedded wallet, without relying on window.solana or external wallet adapters.
 */

import { Connection, VersionedTransaction } from '@solana/web3.js';
import { b64ToBytes } from '@/polyfills';
import { RPC_URL } from '@/config/swap';

const connection = new Connection(RPC_URL, 'confirmed');

/**
 * Sign and send a Solana transaction using Privy's embedded wallet
 * 
 * @param swapTxB64 - Base64 encoded transaction from Jupiter/PumpPortal
 * @param wallet - Privy Solana wallet object with signTransaction method
 * @returns Transaction signature
 */
export async function signAndSendWithPrivy(
  swapTxB64: string,
  wallet: any
): Promise<string> {
  if (!wallet) {
    throw new Error('No Privy Solana wallet provided');
  }

  console.log('[PrivySign] Deserializing transaction...');
  
  // Deserialize Jupiter/PumpPortal tx (no Buffer needed!)
  const bytes = b64ToBytes(swapTxB64);
  const tx = VersionedTransaction.deserialize(bytes);

  console.log('[PrivySign] Transaction deserialized, signing...');

  // Sign with Privy embedded wallet
  const signed = await wallet.signTransaction(tx);

  console.log('[PrivySign] Transaction signed, broadcasting...');

  // Broadcast to Solana network
  const sig = await connection.sendRawTransaction(signed.serialize(), {
    skipPreflight: false,
    preflightCommitment: 'confirmed'
  });

  console.log('[PrivySign] Transaction sent:', sig);

  // Optional: Wait for confirmation
  await connection.confirmTransaction(sig, 'confirmed');
  
  console.log('[PrivySign] Transaction confirmed:', sig);

  return sig;
}

/**
 * Sign a transaction using Privy (without sending)
 * Used when sending via edge function
 */
export async function signWithPrivy(
  transaction: VersionedTransaction,
  wallet: any
): Promise<Uint8Array> {
  if (!wallet) {
    throw new Error('No Privy Solana wallet provided');
  }

  console.log('[PrivySign] Signing transaction...');
  
  const signed = await wallet.signTransaction(transaction);
  
  console.log('[PrivySign] Transaction signed');
  
  return signed.serialize();
}
