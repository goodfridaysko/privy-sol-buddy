import { useFundWallet } from '@privy-io/react-auth';

/**
 * useFund: Wrapper for Privy's funding flow
 * - Opens MoonPay widget for on-ramp
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
      await fundWallet({ address });
    } catch (error) {
      console.error('Funding error:', error);
      throw error;
    }
  };

  return {
    fundWallet: openFundingFlow,
  };
}
