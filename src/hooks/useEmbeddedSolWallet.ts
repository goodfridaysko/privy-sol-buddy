import { usePrivy, useWallets } from '@privy-io/react-auth';
import { useMemo } from 'react';

/**
 * useEmbeddedSolWallet: Returns the Privy-managed embedded Solana wallet
 * - Auto-created on first login
 * - Non-custodial, encrypted client-side
 * - Returns wallet with sendTransaction capability
 */
export function useEmbeddedSolWallet() {
  const { ready, authenticated, user } = usePrivy();
  const wallets = useWallets();

  const solanaWallet = useMemo(() => {
    console.log('🔍 Checking Privy wallets:', { 
      ready,
      authenticated,
      hasUser: !!user,
      walletsCount: wallets.wallets?.length,
    });
    
    if (!ready || !authenticated) {
      console.log('⏳ Privy not ready or not authenticated');
      return null;
    }
    
    if (!wallets.wallets || wallets.wallets.length === 0) {
      console.log('❌ No wallets found');
      return null;
    }
    
    // Find Solana wallet from Privy wallets
    // Solana wallets have chainType 'solana:...' prefix
    const solWallet = wallets.wallets.find(
      (w: any) => {
        const chainType = (w as any).chainType || '';
        return w.walletClientType === 'privy' && chainType.startsWith('solana');
      }
    );
    
    if (solWallet) {
      console.log('✅ Found Solana embedded wallet:', {
        address: solWallet.address,
        walletClientType: solWallet.walletClientType
      });
    } else {
      console.log('❌ No Solana wallet found. Available wallets:', 
        wallets.wallets.map((w: any) => ({
          walletClientType: w.walletClientType,
          address: w.address,
          chainType: (w as any).chainType
        }))
      );
    }
    
    return solWallet || null;
  }, [ready, authenticated, user, wallets.wallets]);

  const address = solanaWallet?.address as string | undefined;

  return {
    wallet: solanaWallet,
    address,
    hasWallet: !!solanaWallet,
    isLoading: !ready,
  };
}
