import { Dialog, DialogContent } from '@/components/ui/dialog';
import { useEffect, useState } from 'react';

interface MoonPayModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  walletAddress: string;
}

/**
 * MoonPayModal: Embeds MoonPay widget directly in the app
 * - Shows MoonPay iframe in a full-screen modal
 * - Supports cash-to-crypto deposits via credit/debit card
 * - Test mode enabled
 */
export function MoonPayModal({ open, onOpenChange, walletAddress }: MoonPayModalProps) {
  const [moonPayUrl, setMoonPayUrl] = useState('');

  useEffect(() => {
    if (open && walletAddress) {
      const MOONPAY_API_KEY = 'pk_test_OgBAeHtOzfgW0XwvcUkEQa6v66xqusf';
      
      // Build MoonPay URL
      const url = new URL('https://buy-sandbox.moonpay.com');
      url.searchParams.set('apiKey', MOONPAY_API_KEY);
      url.searchParams.set('currencyCode', 'sol');
      url.searchParams.set('walletAddress', walletAddress);
      url.searchParams.set('colorCode', '9333ea');
      url.searchParams.set('showWalletAddressForm', 'false');
      
      setMoonPayUrl(url.toString());
      console.log('🌙 MoonPay URL:', url.toString());
    }
  }, [open, walletAddress]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[500px] h-[700px] p-0 overflow-hidden">
        {moonPayUrl && (
          <iframe
            src={moonPayUrl}
            className="w-full h-full border-0"
            allow="payment"
            title="MoonPay"
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
