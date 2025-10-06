/**
 * Jupiter V6 Swap Integration (Legacy Transaction Support)
 * Alternative to PumpPortal with better legacy transaction support
 */

import { Connection, PublicKey, Transaction } from "@solana/web3.js";
import { RPC_URL } from '@/config/swap';

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
    console.log("Starting Jupiter swap...");
    
    // 1. Get quote
    const quoteUrl = new URL("https://quote-api.jup.ag/v6/quote");
    quoteUrl.searchParams.append("inputMint", inputMint);
    quoteUrl.searchParams.append("outputMint", outputMint);
    quoteUrl.searchParams.append("amount", amountLamports.toString());
    quoteUrl.searchParams.append("slippageBps", slippageBps.toString());
    
    console.log("Fetching quote from Jupiter...");
    const quoteResponse = await fetch(quoteUrl.toString());
    
    if (!quoteResponse.ok) {
      const error = await quoteResponse.text();
      throw new Error(`Quote failed: ${error}`);
    }
    
    const quoteData: JupiterQuoteResponse = await quoteResponse.json();
    console.log("Quote received:", {
      inAmount: quoteData.inAmount,
      outAmount: quoteData.outAmount,
      priceImpactPct: quoteData.priceImpactPct
    });
    
    // 2. Get swap transaction with LEGACY flag
    const swapRequest: JupiterSwapRequest = {
      quoteResponse: quoteData,
      userPublicKey: userAddress,
      dynamicComputeUnitLimit: true,
      prioritizationFeeLamports: "auto",
      asLegacyTransaction: true // FORCE LEGACY
    };
    
    console.log("Requesting swap transaction from Jupiter...");
    const swapResponse = await fetch("https://quote-api.jup.ag/v6/swap", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json"
      },
      body: JSON.stringify(swapRequest)
    });
    
    if (!swapResponse.ok) {
      const error = await swapResponse.text();
      throw new Error(`Swap request failed: ${error}`);
    }
    
    const swapData = await swapResponse.json();
    console.log("Swap response received");
    
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
