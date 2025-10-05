import { toast } from 'sonner';
import { useState } from 'react';

/**
 * useFund: MoonPay integration state management
 * - Controls MoonPay modal visibility
 * - Handles cash-to-crypto deposits
 */
export function useFund() {
  const [showMoonPay, setShowMoonPay] = useState(false);
  const [fundingAddress, setFundingAddress] = useState('');

  const openFundingFlow = (address: string) => {
    console.log('🚀 Opening MoonPay for:', address);
    setFundingAddress(address);
    setShowMoonPay(true);
    
    toast.success('MoonPay opened', {
      description: 'Test mode - use test card'
    });
  };

  const closeFundingFlow = () => {
    setShowMoonPay(false);
    setFundingAddress('');
  };

  return {
    fundWallet: openFundingFlow,
    showMoonPay,
    fundingAddress,
    closeFundingFlow,
  };
}
