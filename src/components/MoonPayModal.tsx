import { Dialog, DialogContent } from '@/components/ui/dialog';
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Loader2 } from 'lucide-react';

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
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function getSignedUrl() {
      if (!open || !walletAddress) return;
      
      setIsLoading(true);
      setError(null);
      
      try {
        console.log('🔐 Requesting signed MoonPay URL for:', walletAddress);
        
        const { data, error } = await supabase.functions.invoke('sign-moonpay-url', {
          body: { walletAddress },
        });

        if (error) throw error;
        if (!data?.url) throw new Error('No URL returned');

        console.log('✅ Received signed MoonPay URL');
        setMoonPayUrl(data.url);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to load MoonPay';
        console.error('❌ Error getting signed URL:', err);
        setError(errorMessage);
      } finally {
        setIsLoading(false);
      }
    }

    getSignedUrl();
  }, [open, walletAddress]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[500px] h-[700px] p-0 overflow-hidden">
        {isLoading && (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        )}
        {error && (
          <div className="flex items-center justify-center h-full p-6 text-center">
            <div>
              <p className="text-destructive mb-2">Failed to load MoonPay</p>
              <p className="text-sm text-muted-foreground">{error}</p>
            </div>
          </div>
        )}
        {moonPayUrl && !isLoading && (
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
