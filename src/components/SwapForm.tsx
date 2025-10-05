import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ArrowDownUp } from 'lucide-react';
import { toast } from 'sonner';
import { useEmbeddedSolWallet } from '@/hooks/useEmbeddedSolWallet';
import { useBalance } from '@/hooks/useBalance';
import { executeSwap } from '@/lib/jupiter';
import { SOL_MINT, TRAPANI_MINT } from '@/config/swap';

export function SwapForm() {
  const { wallet, address } = useEmbeddedSolWallet();
  const { data: balance, refetch } = useBalance(address);
  const [amount, setAmount] = useState('');
  const [isSwapping, setIsSwapping] = useState(false);

  const handleSwap = async () => {
    if (!wallet || !address) {
      toast.error('Wallet not connected');
      return;
    }

    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    if (balance && amountNum > balance) {
      toast.error('Insufficient SOL balance');
      return;
    }

    setIsSwapping(true);
    try {
      const signature = await executeSwap(
        wallet,
        address,
        amountNum,
        SOL_MINT,
        TRAPANI_MINT
      );

      toast.success('Swap successful!', {
        description: `Swapped ${amount} SOL to TRAPANI`,
        action: {
          label: 'View',
          onClick: () => window.open(`https://solscan.io/tx/${signature}`, '_blank'),
        },
      });

      setAmount('');
      refetch();
    } catch (error: any) {
      console.error('Swap failed:', error);
      toast.error('Swap failed', {
        description: error?.message || 'Unknown error',
      });
    } finally {
      setIsSwapping(false);
    }
  };

  const setMaxAmount = () => {
    if (balance) {
      // Leave 0.01 SOL for fees
      const maxAmount = Math.max(0, balance - 0.01);
      setAmount(maxAmount.toFixed(4));
    }
  };

  return (
    <div className="space-y-4 p-6 bg-card rounded-lg border border-border">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">Swap</h3>
        {balance !== undefined && (
          <span className="text-sm text-muted-foreground">
            Balance: {balance.toFixed(4)} SOL
          </span>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="amount">You Pay</Label>
        <div className="flex gap-2">
          <Input
            id="amount"
            type="number"
            step="0.001"
            placeholder="0.00"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="bg-muted border-border"
          />
          <Button
            variant="outline"
            onClick={setMaxAmount}
            disabled={!balance}
          >
            MAX
          </Button>
        </div>
        <div className="text-xs text-muted-foreground">SOL</div>
      </div>

      <div className="flex justify-center py-2">
        <div className="p-2 rounded-full bg-muted">
          <ArrowDownUp className="h-4 w-4" />
        </div>
      </div>

      <div className="space-y-2">
        <Label>You Receive</Label>
        <div className="p-3 bg-muted rounded-md">
          <div className="text-sm text-muted-foreground">$TRAPANI</div>
        </div>
      </div>

      <Button
        onClick={handleSwap}
        disabled={!amount || isSwapping}
        className="w-full bg-gradient-primary hover:opacity-90 transition-opacity"
        size="lg"
      >
        {isSwapping ? 'Swapping...' : 'Swap'}
      </Button>

      <p className="text-xs text-center text-muted-foreground">
        Powered by Jupiter • Best price across all DEXs
      </p>
    </div>
  );
}
