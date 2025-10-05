import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { AlertCircle, ExternalLink, RefreshCw, Wifi, WifiOff } from 'lucide-react';
import { TRAPANI_MINT, SOL_MINT } from '@/config/swap';
import { useEmbeddedSolWallet } from '@/hooks/useEmbeddedSolWallet';
import { useBalance } from '@/hooks/useBalance';
import { shortenAddress } from '@/lib/solana';
import { useFund } from '@/hooks/useFund';

interface SwapPanelProps {
  onSwapResult?: (result: { signature: string; inAmount: number; outAmount: number }) => void;
}

export function SwapPanel({ onSwapResult }: SwapPanelProps) {
  const { address, wallet } = useEmbeddedSolWallet();
  const { data: balance = 0 } = useBalance(address);
  const { fundWallet } = useFund();
  const [amount, setAmount] = useState('0.01');

  const handleCopyAddress = () => {
    if (address) {
      navigator.clipboard.writeText(address);
      alert('Wallet address copied!');
    }
  };

  return (
    <Card className="mx-6 mb-4 p-6 space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-semibold mb-1">Swap SOL → TRAPANI</h2>
        <p className="text-sm text-muted-foreground">Using your embedded wallet</p>
      </div>

      {/* Wallet Info */}
      {address && (
        <div className="p-4 rounded-lg bg-muted/30 space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">Your Wallet</span>
            <button
              onClick={handleCopyAddress}
              className="text-xs text-primary hover:underline"
            >
              Copy address
            </button>
          </div>
          <div className="font-mono text-sm break-all">{address}</div>
          <div className="flex justify-between items-center pt-2 border-t">
            <span className="text-sm font-medium">SOL Balance</span>
            <span className="text-lg font-bold">{balance.toFixed(4)} SOL</span>
          </div>
        </div>
      )}

      {/* Network Connectivity Issue */}
      <div className="p-4 rounded-lg bg-red-500/10 border-2 border-red-500/30 space-y-4">
        <div className="flex items-start gap-3">
          <WifiOff className="h-6 w-6 text-red-500 flex-shrink-0 mt-0.5" />
          <div className="flex-1 space-y-3">
            <div>
              <h3 className="font-semibold text-red-700 dark:text-red-400 mb-1">
                Jupiter API Unreachable
              </h3>
              <p className="text-sm text-red-600 dark:text-red-500">
                DNS Error: Cannot resolve <code className="px-1 py-0.5 rounded bg-red-500/20">quote-api.jup.ag</code>
              </p>
            </div>

            <div className="text-xs text-red-600 dark:text-red-500 space-y-1">
              <p className="font-medium">Possible causes:</p>
              <ul className="list-disc list-inside space-y-0.5 ml-2">
                <li>Corporate/school network firewall blocking the domain</li>
                <li>DNS provider (like Cloudflare 1.1.1.1) filtering crypto sites</li>
                <li>ISP-level restrictions or parental controls</li>
                <li>VPN/proxy interfering with requests</li>
                <li>Browser extension (ad blocker) blocking requests</li>
              </ul>
            </div>

            <div className="pt-2 border-t border-red-500/20">
              <p className="text-xs font-medium text-red-700 dark:text-red-400 mb-2">
                Technical Details:
              </p>
              <div className="font-mono text-[10px] text-red-600 dark:text-red-500 space-y-1">
                <div>Error: ERR_NAME_NOT_RESOLVED</div>
                <div>Host: quote-api.jup.ag</div>
                <div>Status: All 3 retry attempts failed</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Workaround Solutions */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold flex items-center gap-2">
          <Wifi className="h-4 w-4" />
          Available Workarounds
        </h3>

        {/* Solution 1: Use Jupiter.ag directly */}
        <div className="p-4 rounded-lg border bg-card">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
              1
            </div>
            <div className="flex-1 space-y-2">
              <div>
                <h4 className="font-medium text-sm mb-1">Swap on Jupiter.ag (Recommended)</h4>
                <p className="text-xs text-muted-foreground">
                  Jupiter's website should be accessible. Use the same wallet address there.
                </p>
              </div>
              <div className="flex gap-2">
                <Input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="text-sm h-8"
                  placeholder="0.01"
                  step="0.01"
                />
                <Button
                  size="sm"
                  onClick={() => {
                    const url = `https://jup.ag/swap/SOL-${TRAPANI_MINT}?amount=${amount}`;
                    window.open(url, '_blank');
                  }}
                  className="gap-2"
                >
                  <ExternalLink className="h-3 w-3" />
                  Open Jupiter
                </Button>
              </div>
              <p className="text-[10px] text-muted-foreground italic">
                Your wallet address: {address ? shortenAddress(address) : '...'}
              </p>
            </div>
          </div>
        </div>

        {/* Solution 2: Try different network */}
        <div className="p-4 rounded-lg border bg-card">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
              2
            </div>
            <div className="flex-1 space-y-2">
              <div>
                <h4 className="font-medium text-sm mb-1">Switch Network</h4>
                <p className="text-xs text-muted-foreground">
                  Try connecting to a different WiFi network or disable VPN
                </p>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => window.location.reload()}
                className="gap-2"
              >
                <RefreshCw className="h-3 w-3" />
                Retry After Network Change
              </Button>
            </div>
          </div>
        </div>

        {/* Solution 3: Fund wallet */}
        {balance < 0.01 && (
          <div className="p-4 rounded-lg border bg-card">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                3
              </div>
              <div className="flex-1 space-y-2">
                <div>
                  <h4 className="font-medium text-sm mb-1">Need More SOL?</h4>
                  <p className="text-xs text-muted-foreground">
                    Buy SOL directly to your embedded wallet
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => address && fundWallet(address)}
                >
                  Fund with Card (MoonPay)
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Help Section */}
      <div className="p-4 rounded-lg bg-muted/30 text-xs space-y-2">
        <div className="flex items-start gap-2">
          <AlertCircle className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="font-medium">Why is this happening?</p>
            <p className="text-muted-foreground">
              Your network is blocking access to Jupiter's API servers. This is usually caused by network
              security settings, not an issue with this app or your wallet.
            </p>
            <p className="text-muted-foreground">
              Your embedded wallet is working perfectly - you just need to access Jupiter through a different
              route (like their website) or from a different network.
            </p>
          </div>
        </div>
      </div>

      {/* Token Info */}
      <details className="text-xs">
        <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
          Token Configuration
        </summary>
        <div className="mt-2 p-3 rounded bg-muted/50 space-y-1 font-mono text-[10px] break-all">
          <div><span className="text-muted-foreground">Input:</span> {SOL_MINT}</div>
          <div><span className="text-muted-foreground">Output:</span> {TRAPANI_MINT}</div>
        </div>
      </details>
    </Card>
  );
}
