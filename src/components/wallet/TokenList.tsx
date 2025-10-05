import { useBalance } from '@/hooks/useBalance';
import { Coins } from 'lucide-react';

interface TokenListProps {
  address: string;
}

export function TokenList({ address }: TokenListProps) {
  const { data: balance = 0 } = useBalance(address);

  // In a real app, you'd fetch all tokens from the wallet
  const tokens = [
    {
      symbol: 'SOL',
      name: 'Solana',
      balance: balance,
      usdValue: balance * 150,
      icon: '◎',
      change24h: 5.2,
    },
  ];

  return (
    <div className="px-6 pb-6">
      <div className="space-y-2">
        {tokens.map((token) => (
          <div
            key={token.symbol}
            className="flex items-center justify-between p-4 rounded-lg bg-card hover:bg-muted/50 transition-colors cursor-pointer border border-border"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-primary shadow-glow flex items-center justify-center text-xl">
                {token.icon}
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

      {tokens.length === 1 && (
        <div className="mt-8 text-center py-8">
          <Coins className="h-12 w-12 mx-auto mb-3 text-muted-foreground" />
          <p className="text-muted-foreground">No other tokens yet</p>
          <p className="text-sm text-muted-foreground mt-1">
            Receive or swap to add more tokens
          </p>
        </div>
      )}
    </div>
  );
}
