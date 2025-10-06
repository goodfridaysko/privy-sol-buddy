/**
 * PumpPortal response debugging utility
 * Analyzes transaction format returned by PumpPortal API
 */

import { Transaction, VersionedTransaction, PublicKey } from "@solana/web3.js";
import { signWithPrivyDebug } from './privySignDebug';

export async function debugPumpPortalResponse(swapResponse: string) {
  console.log("=== PUMPPORTAL RESPONSE DEBUG ===");
  
  try {
    // 1. Check raw response
    console.log("Raw response length:", swapResponse.length);
    console.log("First 100 chars:", swapResponse.substring(0, 100));
    
    // 2. Decode base64
    const buffer = Buffer.from(swapResponse, 'base64');
    console.log("Decoded buffer length:", buffer.length);
    console.log("First 20 bytes:", Array.from(buffer.slice(0, 20)));
    
    // 3. Check version byte
    const firstByte = buffer[0];
    console.log("First byte (version indicator):", firstByte);
    
    if (firstByte === 0x80 || firstByte === 128) {
      console.log("❌ This looks like a v0 VersionedTransaction!");
      console.log("PumpPortal is NOT respecting asLegacyTransaction flag");
    } else {
      console.log("✅ This appears to be a legacy transaction");
    }
    
    // 4. Try to deserialize
    let transaction;
    let transactionType = "unknown";
    
    try {
      transaction = VersionedTransaction.deserialize(buffer);
      transactionType = "VersionedTransaction";
      console.log("Successfully deserialized as VersionedTransaction");
      console.log("Version:", (transaction as VersionedTransaction).version);
    } catch (e1) {
      console.log("Not a VersionedTransaction, trying legacy...");
      
      try {
        transaction = Transaction.from(buffer);
        transactionType = "Transaction (Legacy)";
        console.log("Successfully deserialized as Legacy Transaction");
      } catch (e2) {
        console.error("Failed to deserialize as either format!");
        console.error("Versioned error:", e1);
        console.error("Legacy error:", e2);
      }
    }
    
    // 5. Inspect transaction
    if (transaction) {
      console.log("Transaction type:", transactionType);
      
      if (transaction instanceof VersionedTransaction) {
        console.log("Message version:", transaction.message.version);
        console.log("Static account keys:", transaction.message.staticAccountKeys.length);
        console.log("Instructions:", transaction.message.compiledInstructions.length);
        console.log("Recent blockhash:", transaction.message.recentBlockhash);
        
        const hasLookupTables = transaction.message.addressTableLookups && 
                                transaction.message.addressTableLookups.length > 0;
        console.log("Has address lookup tables:", hasLookupTables);
        if (hasLookupTables) {
          console.log("❌ This transaction uses address lookup tables (v0 only feature)");
        }
      } else if (transaction instanceof Transaction) {
        console.log("Instructions:", transaction.instructions.length);
        console.log("Signatures:", transaction.signatures.length);
        console.log("Recent blockhash:", transaction.recentBlockhash);
        console.log("Fee payer:", transaction.feePayer?.toString());
      }
    }
    
    console.log("=== END PUMPPORTAL DEBUG ===");
    return { transaction, transactionType };
    
  } catch (error) {
    console.error("Debug error:", error);
    throw error;
  }
}

export async function handlePumpPortalSwap(
  swapResponse: string,
  wallet: any,
  userAddress: string
) {
  const { transaction, transactionType } = await debugPumpPortalResponse(swapResponse);
  
  if (transaction instanceof VersionedTransaction && transaction.version === 0) {
    console.log("⚠️ Detected v0 transaction from PumpPortal");
    console.log("Options:");
    console.log("1. PumpPortal asLegacyTransaction flag not working");
    console.log("2. Attempting conversion to legacy format...");
    
    try {
      const legacyTx = Transaction.from(transaction.message.serialize());
      legacyTx.recentBlockhash = transaction.message.recentBlockhash;
      legacyTx.feePayer = new PublicKey(userAddress);
      
      console.log("Converted to legacy transaction, attempting to sign...");
      return await signWithPrivyDebug(legacyTx, wallet, userAddress);
    } catch (convError) {
      console.error("Conversion failed:", convError);
      throw new Error("PumpPortal returned v0 transaction which cannot be converted");
    }
  }
  
  return await signWithPrivyDebug(transaction!, wallet, userAddress);
}
