import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { AlertTriangle, ExternalLink, RefreshCw } from 'lucide-react';
import { TRAPANI_MINT, SOL_MINT } from '@/config/swap';
import { useEmbeddedSolWallet } from '@/hooks/useEmbeddedSolWallet';
import { useBalance } from '@/hooks/useBalance';
import { shortenAddress } from '@/lib/solana';
import { useFund } from '@/hooks/useFund';

interface SwapPanelProps {
  onSwapResult?: (result: { signature: string; inAmount: number; outAmount: number }) => void;
}

export function SwapPanel({ onSwapResult }: SwapPanelProps) {
  const { address } = useEmbeddedSolWallet();
  const { data: balance = 0 } = useBalance(address);
  const { fundWallet } = useFund();
  const [amount, setAmount] = useState('');

  const handleOpenJupiter = () => {
    // Open Jupiter with pre-filled values
    const jupiterUrl = `https://jup.ag/swap/SOL-${TRAPANI_MINT}?amount=${amount || '0.01'}`;
    window.open(jupiterUrl, '_blank');
  };

  return (
    <Card className="mx-6 mb-4 p-6 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Swap SOL → TRAPANI</h2>
      </div>

      {/* Wallet Info */}
      {address && (
        <div className="text-sm space-y-1">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Wallet</span>
            <span className="font-mono">{shortenAddress(address)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Balance</span>
            <span className="font-semibold">{balance.toFixed(4)} SOL</span>
          </div>
        </div>
      )}

      {/* Network Issue Warning */}
      <div className="p-4 rounded-lg bg-yellow-500/10 border border-yellow-500/20 space-y-3">
        <div className="flex items-start gap-2">
          <AlertTriangle className="h-5 w-5 text-yellow-500 mt-0.5 flex-shrink-0" />
          <div className="space-y-2 flex-1">
            <p className="text-sm font-medium text-yellow-700 dark:text-yellow-400">
              Network Connectivity Issue
            </p>
            <p className="text-xs text-yellow-600 dark:text-yellow-500">
              Unable to reach Jupiter API (DNS resolution error). This might be due to:
            </p>
            <ul className="text-xs text-yellow-600 dark:text-yellow-500 list-disc list-inside space-y-1">
              <li>Network firewall or DNS configuration</li>
              <li>Browser extensions blocking requests</li>
              <li>Temporary Jupiter API outage</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Amount Input */}
      <div className="space-y-2">
        <label className="text-sm font-medium">Amount (SOL)</label>
        <Input
          type="number"
          placeholder="0.01"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          min={0.001}
          step={0.001}
        />
      </div>

      {/* Workaround Options */}
      <div className="space-y-2">
        <p className="text-sm font-medium">Swap Options:</p>
        
        {/* Option 1: Open Jupiter directly */}
        <Button
          onClick={handleOpenJupiter}
          className="w-full"
          variant="default"
        >
          <ExternalLink className="mr-2 h-4 w-4" />
          Open Jupiter.ag (Recommended)
        </Button>

        {/* Option 2: Fund wallet */}
        {balance < 0.01 && (
          <Button
            onClick={() => address && fundWallet(address)}
            className="w-full"
            variant="outline"
          >
            Fund Wallet with Card
          </Button>
        )}

        {/* Option 3: Retry */}
        <Button
          onClick={() => window.location.reload()}
          className="w-full"
          variant="outline"
        >
          <RefreshCw className="mr-2 h-4 w-4" />
          Retry / Refresh Page
        </Button>
      </div>

      {/* Instructions */}
      <div className="p-3 rounded-lg bg-muted/50 text-xs space-y-2">
        <p className="font-medium">To swap using Jupiter.ag:</p>
        <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
          <li>Click "Open Jupiter.ag" above</li>
          <li>Connect your wallet (use the same address: {address ? shortenAddress(address) : '...'})</li>
          <li>Enter the amount and complete the swap</li>
          <li>Return here to see your updated balance</li>
        </ol>
      </div>

      {/* Technical Details */}
      <details className="text-xs">
        <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
          Technical Details
        </summary>
        <div className="mt-2 p-2 rounded bg-muted space-y-1 font-mono text-[10px]">
          <p>Input Mint: {SOL_MINT.slice(0, 20)}...</p>
          <p>Output Mint: {TRAPANI_MINT.slice(0, 20)}...</p>
          <p>Error: DNS resolution failed for quote-api.jup.ag</p>
        </div>
      </details>
    </Card>
  );
}
