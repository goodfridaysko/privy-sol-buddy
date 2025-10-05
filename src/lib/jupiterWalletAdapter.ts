import { PublicKey, Transaction, VersionedTransaction } from '@solana/web3.js';

/**
 * Creates a wallet adapter that bridges Privy's embedded wallet
 * with Jupiter Plugin's expected Wallet Adapter interface
 */
export function createJupiterWalletAdapter(privyWallet: any, address: string) {
  const publicKey = new PublicKey(address);

  return {
    publicKey,
    connected: true,
    connecting: false,
    disconnecting: false,
    
    signTransaction: async (transaction: Transaction | VersionedTransaction) => {
      console.log('🔏 Signing transaction with Privy wallet...');
      
      // Privy wallet handles signing internally via sendTransaction
      // We return the transaction as-is since Privy will sign it when sending
      return transaction;
    },
    
    signAllTransactions: async (transactions: (Transaction | VersionedTransaction)[]) => {
      console.log('🔏 Signing multiple transactions...');
      return transactions;
    },
    
    sendTransaction: async (
      transaction: Transaction | VersionedTransaction,
      connection: any,
      options?: any
    ) => {
      console.log('📤 Sending transaction via Privy wallet...');
      
      try {
        // Use Privy's sendTransaction method
        const result = await privyWallet.sendTransaction(transaction, connection, options);
        console.log('✅ Transaction sent:', result);
        return result;
      } catch (error) {
        console.error('❌ Transaction failed:', error);
        throw error;
      }
    },
    
    signMessage: async (message: Uint8Array) => {
      console.log('✍️ Signing message...');
      // If Privy supports message signing, implement here
      throw new Error('Message signing not implemented');
    },
  };
}
