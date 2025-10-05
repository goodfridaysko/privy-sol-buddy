import { usePrivy } from '@privy-io/react-auth';
import { useMemo } from 'react';

/**
 * useEmbeddedSolWallet: Returns the Privy-managed embedded Solana wallet
 * 
 * This hook provides access to the non-custodial embedded wallet that:
 * - Auto-creates on first login
 * - Encrypts keys client-side
 * - Never exposes seed phrases
 * 
 * @returns {object} Wallet information and ready state
 */
export function useEmbeddedSolWallet() {
  const { ready, authenticated, user } = usePrivy();

  const solanaWallet = useMemo(() => {
    console.log('🔍 Checking Privy user wallets:', { 
      ready,
      authenticated,
      hasUser: !!user,
      walletsCount: user?.linkedAccounts?.length,
    });
    
    if (!ready) {
      console.log('⏳ Privy SDK not ready yet');
      return null;
    }
    
    if (!authenticated) {
      console.log('❌ User not authenticated');
      return null;
    }
    
    if (!user?.linkedAccounts) {
      console.log('❌ No linked accounts found');
      return null;
    }
    
    // Find Solana embedded wallet in linkedAccounts
    const walletAccount: any = user.linkedAccounts.find(
      (account: any) => 
        account.type === 'wallet' && 
        account.chainType === 'solana' &&
        account.walletClientType === 'privy'
    );
    
    if (walletAccount) {
      console.log('✅ Found Solana embedded wallet:', {
        address: walletAccount.address,
        chainType: walletAccount.chainType,
        walletClientType: walletAccount.walletClientType,
      });
    } else {
      console.log('❌ No Solana wallet found. Available accounts:', 
        user.linkedAccounts.map((a: any) => ({
          type: a.type,
          chainType: a.chainType,
          walletClientType: a.walletClientType,
        }))
      );
    }
    
    return walletAccount || null;
  }, [ready, authenticated, user]);

  const address = solanaWallet?.address as string | undefined;
  const hasWallet = !!solanaWallet;

  // Production-grade: Warn if wallet is not yet provisioned
  if (ready && authenticated && !hasWallet && user) {
    console.warn('⚠️ Embedded wallet not yet provisioned. Privy should auto-create on first login.');
  }

  return {
    /** The Privy wallet account metadata */
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
