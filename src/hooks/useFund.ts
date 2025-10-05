import { useFundWallet } from '@privy-io/react-auth';

/**
 * useFund: Wrapper for Privy's funding flow with MoonPay
 * - Opens MoonPay widget for on-ramp (test mode enabled)
 * - Supports credit/debit card purchases
 * - Funds the embedded Solana wallet directly
 */
export function useFund() {
  const { fundWallet } = useFundWallet();

  /**
   * Open MoonPay funding flow
   * @param address - Solana wallet address to fund
   */
  const openFundingFlow = async (address: string) => {
    try {
      console.log('🚀 Opening MoonPay funding flow for:', address);
      
      // Open MoonPay (test mode configured in PrivyProvider)
      await fundWallet({ address });
      
      console.log('✅ MoonPay modal opened successfully');
    } catch (error) {
      console.error('❌ Funding error:', error);
      throw error;
    }
  };

  return {
    fundWallet: openFundingFlow,
  };
}
