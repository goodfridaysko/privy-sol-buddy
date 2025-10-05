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
    // Find the Solana embedded wallet - Privy wallets use 'solana:...' format
    return wallets.find(
      (wallet) => 
        wallet.walletClientType === 'privy' && 
        (wallet.chainId?.startsWith('solana') || wallet.address?.length === 44)
    );
  }, [wallets]);

  const address = solanaWallet?.address;

  return {
    wallet: solanaWallet,
    address,
    // Check if wallet exists
    hasWallet: !!solanaWallet,
  };
}
