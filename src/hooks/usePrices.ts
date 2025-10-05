import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { TRAPANI_MINT } from '@/config/swap';

interface PriceData {
  sol: number;
  trapani: number;
  loading: boolean;
  error: string | null;
}

export function usePrices() {
  const [prices, setPrices] = useState<PriceData>({
    sol: 0,
    trapani: 0,
    loading: true,
    error: null,
  });

  useEffect(() => {
    const fetchPrices = async () => {
      try {
        const { data, error } = await supabase.functions.invoke('get-token-prices', {
          body: { tokenMints: [TRAPANI_MINT] }
        });

        if (error) throw error;

        const solPrice = data?.prices?.['So11111111111111111111111111111111111111112'] || 0;
        const trapaniPrice = data?.prices?.[TRAPANI_MINT] || 0;

        setPrices({
          sol: solPrice,
          trapani: trapaniPrice,
          loading: false,
          error: null,
        });
      } catch (error) {
        console.error('Failed to fetch prices:', error);
        setPrices(prev => ({
          ...prev,
          loading: false,
          error: 'Failed to fetch prices',
        }));
      }
    };

    // Initial fetch
    fetchPrices();

    // Refresh every 30 seconds
    const interval = setInterval(fetchPrices, 30000);

    return () => clearInterval(interval);
  }, []);

  return prices;
}
