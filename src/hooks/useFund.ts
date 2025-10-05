import { useFundWallet } from '@privy-io/react-auth';
import { toast } from 'sonner';

/**
 * useFund: Wrapper for Privy's Solana funding flow with MoonPay
 * - Opens MoonPay widget for on-ramp (test mode enabled)
 * - Supports credit/debit card purchases
 * - Funds the embedded Solana wallet directly
 * 
 * IMPORTANT: Make sure MoonPay is enabled for Solana in Privy Dashboard:
 * 1. Go to dashboard.privy.io
 * 2. Settings → Funding
 * 3. Enable MoonPay for Solana mainnet
 */
export function useFund() {
  const { fundWallet } = useFundWallet();

  /**
   * Open MoonPay funding flow for Solana
   * @param address - Solana wallet address to fund
   */
  const openFundingFlow = async (address: string) => {
    try {
      console.log('🚀 Opening MoonPay funding flow for Solana wallet:', address);
      console.log('📝 Make sure MoonPay is enabled for Solana in Privy Dashboard!');
      
      // Open MoonPay for Solana (test mode configured in PrivyProvider)
      // Privy should auto-detect it's a Solana address
      await fundWallet({ address });
      
      console.log('✅ MoonPay modal opened successfully');
      toast.success('MoonPay opened', {
        description: 'Test mode active - use test cards'
      });
    } catch (error: any) {
      console.error('❌ Funding error:', error);
      console.error('Error details:', {
        message: error?.message,
        stack: error?.stack,
        error
      });
      
      // Provide helpful error message
      if (error?.message?.includes('chain') || error?.message?.includes('NaN')) {
        toast.error('MoonPay not configured', {
          description: 'Enable MoonPay for Solana in Privy Dashboard → Settings → Funding'
        });
      } else {
        toast.error('Failed to open funding flow', {
          description: error?.message || 'Unknown error'
        });
      }
      throw error;
    }
  };

  return {
    fundWallet: openFundingFlow,
  };
}
