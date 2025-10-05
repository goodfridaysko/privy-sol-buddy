import { useWallets } from '@privy-io/react-auth';
import { useMemo } from 'react';

/**
 * useEmbeddedSolWallet: Returns the Privy-managed embedded Solana wallet
 * - Auto-created on first login
 * - Non-custodial, encrypted client-side
 * - Returns wallet address, signing capabilities
 */
export function useEmbeddedSolWallet() {
  const { wallets } = useWallets();

  const solanaWallet = useMemo(() => {
    if (!wallets || wallets.length === 0) return null;
    
    // Find the Solana embedded wallet
    const wallet = wallets.find(
      (w) => 
        w.walletClientType === 'privy' && 
        (w.address?.length === 44 || w.address?.length === 43 || w.address?.length === 32)
    );
    
    return wallet || null;
  }, [wallets]);

  const address = solanaWallet?.address;

  return {
    wallet: solanaWallet,
    address,
    hasWallet: !!solanaWallet,
    isLoading: !wallets,
  };
}
