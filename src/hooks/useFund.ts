import { toast } from 'sonner';

/**
 * useFund: Direct MoonPay integration for cash-to-crypto deposits
 * - Opens MoonPay widget directly (no Privy dependency)
 * - Supports credit/debit card purchases
 * - Funds the Solana wallet directly via MoonPay
 * - Test mode enabled with test API key
 */
export function useFund() {
  const MOONPAY_API_KEY = 'pk_test_OgBAeHtOzfgW0XwvcUkEQa6v66xqusf';

  /**
   * Open MoonPay widget directly for Solana deposits
   * @param address - Solana wallet address to fund
   */
  const openFundingFlow = (address: string) => {
    try {
      console.log('🚀 Opening MoonPay widget for Solana wallet:', address);
      
      // Build MoonPay URL with parameters
      const moonPayUrl = new URL('https://buy-sandbox.moonpay.com');
      moonPayUrl.searchParams.set('apiKey', MOONPAY_API_KEY);
      moonPayUrl.searchParams.set('currencyCode', 'sol'); // Solana
      moonPayUrl.searchParams.set('walletAddress', address);
      moonPayUrl.searchParams.set('colorCode', '#9333ea'); // Match app theme
      moonPayUrl.searchParams.set('showWalletAddressForm', 'false');
      
      // Open MoonPay in new window
      const width = 500;
      const height = 700;
      const left = (window.screen.width - width) / 2;
      const top = (window.screen.height - height) / 2;
      
      window.open(
        moonPayUrl.toString(),
        'MoonPay',
        `width=${width},height=${height},left=${left},top=${top},resizable=yes,scrollbars=yes`
      );
      
      console.log('✅ MoonPay widget opened');
      toast.success('MoonPay opened', {
        description: 'Test mode - use test card: 4000 0209 5159 5032'
      });
    } catch (error: any) {
      console.error('❌ MoonPay error:', error);
      toast.error('Failed to open MoonPay', {
        description: error?.message || 'Unknown error'
      });
    }
  };

  return {
    fundWallet: openFundingFlow,
  };
}
