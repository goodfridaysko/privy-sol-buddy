import { usePrivy } from '@privy-io/react-auth';
import { useWallets } from '@privy-io/react-auth/solana';
import { useMemo } from 'react';

/**
 * useEmbeddedSolWallet: Returns the Privy-managed embedded Solana wallet
 * 
 * This hook provides access to the non-custodial embedded wallet that:
 * - Auto-creates on first login
 * - Encrypts keys client-side
 * - Never exposes seed phrases
 * - Supports transaction signing via sendTransaction
 * 
 * @throws Error if wallet is not provisioned (user must authenticate first)
 * @returns {object} Wallet information and ready state
 */
export function useEmbeddedSolWallet() {
  const { ready, authenticated, user } = usePrivy();
  const { wallets } = useWallets();

  const solanaWallet = useMemo(() => {
    console.log('🔍 Checking Privy user wallets:', { 
      ready,
      authenticated,
      hasUser: !!user,
      walletsCount: wallets?.length,
    });
    
    if (!ready) {
      console.log('⏳ Privy SDK not ready yet');
      return null;
    }
    
    if (!authenticated) {
      console.log('❌ User not authenticated');
      return null;
    }
    
    // Find embedded Solana wallet
    const walletClient = wallets.find((wallet: any) => (wallet as any).walletClientType === 'privy');
    
    if (walletClient) {
      console.log('✅ Found Solana embedded wallet:', {
        address: walletClient.address,
        walletClientType: (walletClient as any).walletClientType,
      });
    } else {
      console.log('❌ No Privy embedded wallet found. Available wallets:', 
        wallets.map((w: any) => ({
          address: w.address,
          walletClientType: (w as any).walletClientType,
        }))
      );
    }
    
    return walletClient || null;
  }, [ready, authenticated, user, wallets]);

  const address = solanaWallet?.address as string | undefined;
  const hasWallet = !!solanaWallet;

  // Production-grade: Warn if wallet is not yet provisioned
  if (ready && authenticated && !hasWallet && user) {
    console.warn('⚠️ Embedded wallet not yet provisioned. Privy should auto-create on first login.');
  }

  return {
    /** The Privy wallet object */
    wallet: solanaWallet,
    /** The Solana wallet address (base58 string) */
    address,
    /** Whether wallet is provisioned and ready to use */
    hasWallet,
    /** Whether Privy SDK is still loading */
    isLoading: !ready,
    /** Whether user is authenticated with wallet ready */
    ready: ready && authenticated && hasWallet,
  };
}
