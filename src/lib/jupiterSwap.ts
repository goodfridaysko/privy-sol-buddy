/**
 * Jupiter V6 Swap Integration via Backend Proxy
 * Solves DNS/CORS issues by routing through edge functions
 */

import { Connection, PublicKey, Transaction } from "@solana/web3.js";
import { RPC_URL } from '@/config/swap';
import { supabase } from '@/integrations/supabase/client';

interface JupiterQuoteResponse {
  inputMint: string;
  outputMint: string;
  inAmount: string;
  outAmount: string;
  otherAmountThreshold: string;
  swapMode: string;
  slippageBps: number;
  priceImpactPct: string;
  routePlan: any[];
}

interface JupiterSwapRequest {
  quoteResponse: JupiterQuoteResponse;
  userPublicKey: string;
  dynamicComputeUnitLimit?: boolean;
  prioritizationFeeLamports?: number | "auto";
  asLegacyTransaction?: boolean;
}

export async function swapWithJupiter(
  wallet: any,
  userAddress: string,
  inputMint: string,
  outputMint: string,
  amountLamports: number,
  slippageBps: number = 1000 // 10% default
) {
  const connection = new Connection(RPC_URL, 'confirmed');
  
  try {
    console.log("[Jupiter] Starting swap via backend proxy...");
    
    // 1. Get quote via edge function (avoids DNS/CORS issues)
    console.log("[Jupiter] Fetching quote...");
    const { data: quoteData, error: quoteError } = await supabase.functions.invoke('jupiter-quote', {
      body: {
        inputMint,
        outputMint,
        amount: amountLamports.toString(),
        slippageBps,
      },
    });

    if (quoteError) {
      throw new Error(`Quote failed: ${quoteError.message}`);
    }

    console.log("[Jupiter] Quote received:", {
      inAmount: quoteData.inAmount,
      outAmount: quoteData.outAmount,
      priceImpactPct: quoteData.priceImpactPct,
    });

    // 2. Get swap transaction via edge function
    console.log("[Jupiter] Requesting swap transaction...");
    const { data: swapData, error: swapError } = await supabase.functions.invoke('jupiter-swap', {
      body: {
        quoteResponse: quoteData,
        userPublicKey: userAddress,
      },
    });

    if (swapError) {
      throw new Error(`Swap request failed: ${swapError.message}`);
    }

    console.log("[Jupiter] Swap transaction received");
    
    // 3. Deserialize transaction
    const swapTransactionBuf = Buffer.from(swapData.swapTransaction, "base64");
    
    // Verify it's legacy
    const firstByte = swapTransactionBuf[0];
    if (firstByte === 0x80 || firstByte === 128) {
      console.error("❌ Jupiter returned v0 transaction despite asLegacyTransaction flag!");
      throw new Error("Jupiter returned versioned transaction, expected legacy");
    }
    
    const transaction = Transaction.from(swapTransactionBuf);
    console.log("✅ Deserialized as legacy transaction");
    console.log("Instructions:", transaction.instructions.length);
    
    // 4. Set fee payer
    const userPublicKey = new PublicKey(userAddress);
    transaction.feePayer = userPublicKey;
    
    // 5. Sign with Privy
    console.log("Signing transaction with Privy...");
    const signedTransaction = await wallet.signTransaction(transaction);
    console.log("✅ Transaction signed successfully!");
    
    // 6. Send transaction
    console.log("Sending transaction...");
    const signature = await connection.sendRawTransaction(
      signedTransaction.serialize(),
      {
        skipPreflight: false,
        preflightCommitment: "confirmed",
        maxRetries: 3
      }
    );
    
    console.log("Transaction sent! Signature:", signature);
    
    // 7. Confirm
    console.log("Waiting for confirmation...");
    const confirmation = await connection.confirmTransaction(
      signature,
      "confirmed"
    );
    
    if (confirmation.value.err) {
      throw new Error(`Transaction failed: ${JSON.stringify(confirmation.value.err)}`);
    }
    
    console.log("✅ Swap successful!");
    return {
      signature,
      inputAmount: quoteData.inAmount,
      outputAmount: quoteData.outAmount,
      priceImpactPct: quoteData.priceImpactPct
    };
    
  } catch (error: any) {
    console.error("Jupiter swap error:", error);
    throw error;
  }
}
