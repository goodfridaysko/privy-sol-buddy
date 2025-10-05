import { Button } from '@/components/ui/button';
import { Copy, ExternalLink, Settings, LogOut } from 'lucide-react';
import { toast } from 'sonner';
import { useBalance } from '@/hooks/useBalance';

interface WalletHeaderProps {
  address: string;
  userEmail?: string;
  onLogout: () => void;
}

export function WalletHeader({ address, userEmail, onLogout }: WalletHeaderProps) {
  const { data: balance = 0 } = useBalance(address);

  const copyAddress = () => {
    navigator.clipboard.writeText(address);
    toast.success('Address copied');
  };

  const shortenAddress = (addr: string) => {
    return `${addr.slice(0, 4)}...${addr.slice(-4)}`;
  };

  const openExplorer = () => {
    window.open(`https://solscan.io/account/${address}`, '_blank');
  };

  return (
    <div className="bg-gradient-card border-b border-border">
      <div className="px-6 py-4">
        {/* Top Bar */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-primary shadow-glow flex items-center justify-center">
              <span className="text-lg font-bold text-primary-foreground">
                {userEmail?.[0]?.toUpperCase() || 'W'}
              </span>
            </div>
            <div>
              <p className="text-sm font-medium">Wallet</p>
              {userEmail && (
                <p className="text-xs text-muted-foreground">{userEmail}</p>
              )}
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <Settings className="h-4 w-4" />
            </Button>
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-8 w-8"
              onClick={onLogout}
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Balance Section */}
        <div className="text-center mb-4">
          <div className="flex items-baseline justify-center gap-2 mb-2">
            <span className="text-5xl font-bold bg-gradient-primary bg-clip-text text-transparent">
              {balance.toFixed(4)}
            </span>
            <span className="text-xl text-muted-foreground">SOL</span>
          </div>
          <div className="text-sm text-muted-foreground mb-4">
            ≈ ${(balance * 150).toFixed(2)} USD
          </div>
        </div>

        {/* Address */}
        <div className="flex items-center justify-center gap-2 mb-6">
          <code className="text-sm font-mono text-muted-foreground">
            {shortenAddress(address)}
          </code>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={copyAddress}
          >
            <Copy className="h-3 w-3" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={openExplorer}
          >
            <ExternalLink className="h-3 w-3" />
          </Button>
        </div>
      </div>
    </div>
  );
}
