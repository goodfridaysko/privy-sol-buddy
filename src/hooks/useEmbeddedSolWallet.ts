import { usePrivy } from '@privy-io/react-auth';
import { useMemo } from 'react';

/**
 * useEmbeddedSolWallet: Returns the Privy-managed embedded Solana wallet
 * - Auto-created on first login
 * - Non-custodial, encrypted client-side
 * - Returns wallet address, signing capabilities
 */
export function useEmbeddedSolWallet() {
  const { ready, authenticated, user } = usePrivy();

  const solanaWallet = useMemo(() => {
    console.log('🔍 Checking Privy user wallets:', { 
      ready,
      authenticated,
      hasUser: !!user,
      walletsCount: user?.linkedAccounts?.length,
      wallets: user?.linkedAccounts?.filter((account: any) => account.type === 'wallet')
    });
    
    if (!ready || !authenticated) {
      console.log('⏳ Privy not ready or not authenticated');
      return null;
    }
    
    if (!user?.linkedAccounts) {
      console.log('❌ No linked accounts found');
      return null;
    }
    
    // Find Solana wallet using chainType
    const walletAccount: any = user.linkedAccounts.find(
      (account: any) => account.type === 'wallet' && account.chainType === 'solana'
    );
    
    if (walletAccount) {
      console.log('✅ Found Solana wallet:', {
        address: walletAccount.address,
        chainType: walletAccount.chainType,
        walletClientType: walletAccount.walletClientType
      });
    } else {
      console.log('❌ No Solana wallet found. Available accounts:', 
        user.linkedAccounts.map((a: any) => ({
          type: a.type,
          chainType: a.chainType,
          address: a.address
        }))
      );
    }
    
    return walletAccount || null;
  }, [ready, authenticated, user]);

  const address = solanaWallet?.address as string | undefined;

  return {
    wallet: solanaWallet,
    address,
    hasWallet: !!solanaWallet,
    isLoading: !ready,
  };
}
