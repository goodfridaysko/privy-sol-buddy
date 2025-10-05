import { useBalance } from '@/hooks/useBalance';
import { Coins, Loader2 } from 'lucide-react';
import trapaniIcon from '@/assets/trapani-coin.png';

interface TokenListProps {
  address: string;
}

export function TokenList({ address }: TokenListProps) {
  const { data: balance = 0, isLoading, error } = useBalance(address);

  // Token list with SOL and Trapani coin
  const tokens = [
    {
      symbol: 'SOL',
      name: 'Solana',
      balance: balance,
      usdValue: balance * 150,
      icon: '◎',
      iconType: 'text' as const,
      change24h: 5.2,
    },
    {
      symbol: 'TRAPANI',
      name: 'Ray Trapani',
      balance: 0, // Will be fetched from blockchain
      usdValue: 0,
      icon: trapaniIcon,
      iconType: 'image' as const,
      change24h: 0,
      address: 'Hq1sM1Tc8nepd63th9L2Np3WYJ6TUY1pbwYSKmAjpump',
    },
  ];

  if (isLoading) {
    return (
      <div className="px-6 pb-6 text-center py-8">
        <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
        <p className="text-sm text-muted-foreground mt-2">Loading balance...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="px-6 pb-6 text-center py-8">
        <p className="text-sm text-destructive">Failed to load balance</p>
      </div>
    );
  }

  return (
    <div className="px-6 pb-6">
      <div className="space-y-2">
        {tokens.map((token) => (
          <div
            key={token.symbol}
            className="flex items-center justify-between p-4 rounded-lg bg-card hover:bg-muted/50 transition-colors cursor-pointer border border-border"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-primary shadow-glow flex items-center justify-center text-xl overflow-hidden">
                {token.iconType === 'image' ? (
                  <img src={token.icon as string} alt={token.symbol} className="w-full h-full object-cover" />
                ) : (
                  token.icon
                )}
              </div>
              <div>
                <p className="font-semibold">{token.symbol}</p>
                <p className="text-sm text-muted-foreground">{token.name}</p>
              </div>
            </div>
            
            <div className="text-right">
              <p className="font-semibold">{token.balance.toFixed(4)}</p>
              <div className="flex items-center gap-2">
                <p className="text-sm text-muted-foreground">
                  ${token.usdValue.toFixed(2)}
                </p>
                <span className={`text-xs ${token.change24h >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                  {token.change24h >= 0 ? '+' : ''}{token.change24h}%
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

    </div>
  );
}
