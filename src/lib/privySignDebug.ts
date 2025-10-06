/**
 * Enhanced debugging utility for Privy transaction signing
 * Provides detailed logs to diagnose transaction compatibility issues
 */

import { Transaction, VersionedTransaction, PublicKey } from "@solana/web3.js";
import bs58 from "bs58";

export async function signWithPrivyDebug(
  transaction: Transaction | VersionedTransaction,
  wallet: any,
  userAddress: string
): Promise<Transaction | VersionedTransaction> {
  console.log("=== TRANSACTION DEBUG START ===");
  
  try {
    // 1. Check transaction type and version
    console.log("Transaction type:", transaction.constructor.name);
    console.log("Is VersionedTransaction:", transaction instanceof VersionedTransaction);
    console.log("Is Legacy Transaction:", transaction instanceof Transaction);
    
    // 2. Inspect transaction structure
    if (transaction instanceof VersionedTransaction) {
      console.log("VersionedTransaction detected!");
      console.log("Version:", transaction.version);
      console.log("Message:", transaction.message);
      
      // Check if it's actually v0
      if (transaction.version === 0) {
        console.error("❌ Transaction is version 0 - Privy may not support this!");
      }
      
      // Try to serialize to see the structure
      try {
        const serialized = transaction.serialize();
        console.log("Serialized length:", serialized.length);
        console.log("First 100 bytes:", Array.from(serialized.slice(0, 100)));
      } catch (e) {
        console.error("Failed to serialize versioned transaction:", e);
      }
    } else if (transaction instanceof Transaction) {
      console.log("Legacy Transaction detected ✅");
      console.log("Signatures count:", transaction.signatures.length);
      console.log("Instructions count:", transaction.instructions.length);
      console.log("Recent blockhash:", transaction.recentBlockhash);
      console.log("Fee payer:", transaction.feePayer?.toString());
      console.log("Blockhash set:", !!transaction.recentBlockhash);
      
      // Inspect each instruction
      transaction.instructions.forEach((ix, idx) => {
        console.log(`Instruction ${idx}:`, {
          programId: ix.programId.toString(),
          keys: ix.keys.length,
          dataLength: ix.data.length
        });
      });
    } else {
      console.error("❌ Unknown transaction type!");
      console.log("Transaction object keys:", Object.keys(transaction));
      console.log("Transaction prototype:", Object.getPrototypeOf(transaction));
    }
    
    // 3. Validate fee payer
    const userPublicKey = new PublicKey(userAddress);
    if (transaction instanceof Transaction) {
      if (!transaction.feePayer) {
        console.log("⚠️ No fee payer set, setting to user wallet");
        transaction.feePayer = userPublicKey;
      } else if (!transaction.feePayer.equals(userPublicKey)) {
        console.error("❌ Fee payer mismatch!");
        console.log("Transaction fee payer:", transaction.feePayer.toString());
        console.log("User wallet:", userAddress);
        transaction.feePayer = userPublicKey;
        console.log("✅ Updated fee payer to match user wallet");
      }
    }
    
    // 4. Check Privy wallet object
    console.log("Privy wallet type:", typeof wallet);
    console.log("Privy wallet methods:", Object.keys(wallet));
    console.log("Has signTransaction:", typeof wallet.signTransaction === 'function');
    console.log("Has signAndSendTransaction:", typeof wallet.signAndSendTransaction === 'function');
    
    // 5. Try signing
    console.log("Attempting to sign transaction...");
    let signedTx;
    
    try {
      console.log("Trying wallet.signTransaction...");
      signedTx = await wallet.signTransaction(transaction);
      console.log("✅ Successfully signed with signTransaction!");
    } catch (error1: any) {
      console.error("❌ signTransaction failed:", error1);
      console.error("Error type:", error1?.constructor?.name);
      console.error("Error message:", error1?.message);
      console.error("Error stack:", error1?.stack);
      
      // If versioned transaction, try conversion
      if (transaction instanceof VersionedTransaction) {
        console.log("Attempting to convert VersionedTransaction to Legacy...");
        try {
          const legacyTx = Transaction.from(transaction.message.serialize());
          legacyTx.recentBlockhash = transaction.message.recentBlockhash;
          legacyTx.feePayer = userPublicKey;
          
          console.log("Converted to legacy, trying to sign again...");
          signedTx = await wallet.signTransaction(legacyTx);
          console.log("✅ Successfully signed converted transaction!");
          return signedTx;
        } catch (convError: any) {
          console.error("❌ Conversion/signing failed:", convError);
        }
      }
      
      if (!signedTx) {
        throw new Error(`Signing failed: ${error1?.message || 'Unknown error'}`);
      }
    }
    
    // 6. Verify signature
    if (signedTx instanceof Transaction) {
      console.log("Signed transaction signatures:", signedTx.signatures.length);
      const userSig = signedTx.signatures.find(sig => 
        sig.publicKey.equals(userPublicKey)
      );
      console.log("User signature present:", !!userSig);
      if (userSig?.signature) {
        console.log("Signature (base58):", bs58.encode(userSig.signature));
      }
    }
    
    console.log("=== TRANSACTION DEBUG END ===");
    return signedTx;
    
  } catch (error: any) {
    console.error("=== TRANSACTION DEBUG ERROR ===");
    console.error("Final error:", error);
    console.error("Error type:", error?.constructor?.name);
    console.error("Error message:", error?.message);
    throw error;
  }
}
