import { useQuery } from '@tanstack/react-query';
import { getBalance } from '@/lib/solana';

/**
 * useBalance: Fetch and monitor SOL balance for an address
 * - Auto-refreshes every 10 seconds
 * - Returns balance in SOL (not lamports)
 */
export function useBalance(address: string | undefined) {
  return useQuery({
    queryKey: ['balance', address],
    queryFn: () => {
      if (!address) return 0;
      return getBalance(address);
    },
    enabled: !!address,
    refetchInterval: 10000, // Refresh every 10 seconds
  });
}
