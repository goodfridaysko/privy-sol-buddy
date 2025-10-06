import { Card } from '@/components/ui/card';
import { useBalance } from '@/hooks/useBalance';
import { usePrices } from '@/hooks/usePrices';
import { Coins } from 'lucide-react';
import trapaniCoin from '@/assets/trapani-coin.png';

interface TrapaniBalancesProps {
  address: string;
}

export function TrapaniBalances({ address }: TrapaniBalancesProps) {
  const { data: solBalance = 0 } = useBalance(address);
  const { sol: solPrice, trapani: trapaniPrice } = usePrices();

  // Mock TRAPANI balance (in production, fetch from chain)
  const trapaniBalance = 0;

  const solUsdValue = solBalance * solPrice;
  const trapaniUsdValue = trapaniBalance * trapaniPrice;
  const totalUsdValue = solUsdValue + trapaniUsdValue;

  return (
    <Card className="p-6 bg-gradient-card border-border/50">
      <div className="space-y-4">
        {/* Total Value */}
        <div className="text-center pb-4 border-b border-border/50">
          <p className="text-sm text-muted-foreground mb-1">Total Balance</p>
          <p className="text-4xl font-bold">${totalUsdValue.toFixed(2)}</p>
        </div>

        {/* SOL Balance */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-cyan-500 flex items-center justify-center">
              <Coins className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className="font-semibold">Solana</p>
              <p className="text-sm text-muted-foreground">SOL</p>
            </div>
          </div>
          <div className="text-right">
            <p className="font-semibold">{solBalance.toFixed(4)} SOL</p>
            <p className="text-sm text-muted-foreground">${solUsdValue.toFixed(2)}</p>
          </div>
        </div>

        {/* TRAPANI Balance */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full overflow-hidden bg-background">
              <img src={trapaniCoin} alt="TRAPANI" className="w-full h-full object-cover" />
            </div>
            <div>
              <p className="font-semibold">Trapani</p>
              <p className="text-sm text-muted-foreground">TRAPANI</p>
            </div>
          </div>
          <div className="text-right">
            <p className="font-semibold">{trapaniBalance.toLocaleString()} TRAPANI</p>
            <p className="text-sm text-muted-foreground">${trapaniUsdValue.toFixed(2)}</p>
          </div>
        </div>
      </div>
    </Card>
  );
}
