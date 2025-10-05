import { useState, useEffect } from 'react';

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
        // Fetch SOL price from CoinGecko (free, no API key needed)
        const solResponse = await fetch(
          'https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd'
        );
        const solData = await solResponse.json();
        const solPrice = solData?.solana?.usd || 0;

        // Fetch TRAPANI price from Jupiter Price API v2
        const trapaniResponse = await fetch(
          `https://api.jup.ag/price/v2?ids=Hq1sM1Tc8nepd63th9L2Np3WYJ6TUY1pbwYSKmAjpump`
        );
        const trapaniData = await trapaniResponse.json();
        const trapaniPrice = trapaniData?.data?.['Hq1sM1Tc8nepd63th9L2Np3WYJ6TUY1pbwYSKmAjpump']?.price || 0;

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
