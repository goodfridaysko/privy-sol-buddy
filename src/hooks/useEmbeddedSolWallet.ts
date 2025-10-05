import { useWallets } from '@privy-io/react-auth';
import { useMemo } from 'react';

/**
 * useEmbeddedSolWallet: Returns the Privy-managed embedded Solana wallet
 * - Auto-created on first login
 * - Non-custodial, encrypted client-side
 * - Returns wallet address, signing capabilities
 */
export function useEmbeddedSolWallet() {
  const { wallets, ready } = useWallets();

  const solanaWallet = useMemo(() => {
    console.log('🔍 Checking wallets:', { 
      count: wallets?.length, 
      ready,
      wallets: wallets?.map(w => ({
        type: w.walletClientType,
        address: w.address,
        addressLength: w.address?.length
      }))
    });
    
    if (!ready) {
      console.log('⏳ Wallets not ready yet');
      return null;
    }
    
    if (!wallets || wallets.length === 0) {
      console.log('❌ No wallets found');
      return null;
    }
    
    // Find Solana embedded wallet by Privy client type and Solana address format (32-44 chars base58)
    const wallet = wallets.find(
      (w) => w.walletClientType === 'privy' && 
             w.address && 
             w.address.length >= 32 && 
             w.address.length <= 44
    );
    
    if (wallet) {
      console.log('✅ Found Solana wallet:', {
        address: wallet.address,
        clientType: wallet.walletClientType
      });
    } else {
      console.log('❌ No Solana wallet found in:', wallets.map(w => ({
        type: w.walletClientType,
        addr: w.address
      })));
    }
    
    return wallet || null;
  }, [wallets, ready]);

  const address = solanaWallet?.address;

  return {
    wallet: solanaWallet,
    address,
    hasWallet: !!solanaWallet,
    isLoading: !ready,
  };
}
