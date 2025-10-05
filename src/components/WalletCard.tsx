import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Copy, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';
import { useBalance } from '@/hooks/useBalance';

interface WalletCardProps {
  address: string;
  onFund: () => void;
}

export function WalletCard({ address, onFund }: WalletCardProps) {
  const { data: balance = 0, isLoading } = useBalance(address);

  const copyAddress = () => {
    navigator.clipboard.writeText(address);
    toast.success('Address copied to clipboard');
  };

  const shortenAddress = (addr: string) => {
    return `${addr.slice(0, 4)}...${addr.slice(-4)}`;
  };

  const openExplorer = () => {
    window.open(`https://solscan.io/account/${address}`, '_blank');
  };

  return (
    <Card className="bg-gradient-card border-border shadow-card backdrop-blur-sm">
      <CardHeader>
        <CardTitle className="text-lg">Your Wallet</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">Address</p>
          <div className="flex items-center gap-2">
            <code className="flex-1 rounded bg-muted px-3 py-2 text-sm font-mono">
              {shortenAddress(address)}
            </code>
            <Button
              size="icon"
              variant="outline"
              onClick={copyAddress}
            >
              <Copy className="h-4 w-4" />
            </Button>
            <Button
              size="icon"
              variant="outline"
              onClick={openExplorer}
            >
              <ExternalLink className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">Balance</p>
          <div className="flex items-baseline gap-2">
            <p className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent">
              {isLoading ? '...' : balance.toFixed(4)}
            </p>
            <span className="text-muted-foreground">SOL</span>
          </div>
        </div>

        <Button 
          onClick={onFund} 
          className="w-full bg-gradient-primary hover:opacity-90 transition-opacity"
        >
          Fund with Card (MoonPay)
        </Button>
      </CardContent>
    </Card>
  );
}
