import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowDownUp } from 'lucide-react';
import { toast } from 'sonner';
import { getSwapQuote, executeSwap, TOKEN_MINTS } from '@/lib/jupiter';
import { useEmbeddedSolWallet } from '@/hooks/useEmbeddedSolWallet';
import { VersionedTransaction } from '@solana/web3.js';

export function SwapForm() {
  const { wallet, address } = useEmbeddedSolWallet();
  const [fromToken, setFromToken] = useState(TOKEN_MINTS.SOL);
  const [toToken, setToToken] = useState(TOKEN_MINTS.USDC);
  const [amount, setAmount] = useState('');
  const [swapping, setSwapping] = useState(false);

  const handleSwap = async () => {
    if (!amount || !address || !wallet) return;

    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      toast.error('Invalid amount');
      return;
    }

    setSwapping(true);
    try {
      // Convert to lamports (smallest unit)
      const amountInSmallestUnit = Math.floor(amountNum * 1e9);

      // Get quote
      toast.info('Getting swap quote...');
      const quote = await getSwapQuote({
        inputMint: fromToken,
        outputMint: toToken,
        amount: amountInSmallestUnit,
        slippageBps: 50, // 0.5% slippage
        userPublicKey: address,
      });

      // Execute swap
      toast.info('Executing swap...');
      // @ts-ignore - Privy wallet types
      const signTx = async (tx: VersionedTransaction) => {
        // @ts-ignore
        return await wallet.signTransaction(tx);
      };

      const signature = await executeSwap(quote, address, signTx);

      toast.success('Swap successful!', {
        description: `Transaction: ${signature}`,
      });

      setAmount('');
    } catch (error: any) {
      console.error('Swap error:', error);
      toast.error('Swap failed', {
        description: error?.message || 'Unknown error',
      });
    } finally {
      setSwapping(false);
    }
  };

  const switchTokens = () => {
    const temp = fromToken;
    setFromToken(toToken);
    setToToken(temp);
  };

  return (
    <Card className="bg-gradient-card border-border shadow-card backdrop-blur-sm">
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <ArrowDownUp className="h-5 w-5" />
          Swap (Jupiter)
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="from">From</Label>
          <div className="flex gap-2">
            <Select value={fromToken} onValueChange={setFromToken}>
              <SelectTrigger className="bg-muted border-border">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={TOKEN_MINTS.SOL}>SOL</SelectItem>
                <SelectItem value={TOKEN_MINTS.USDC}>USDC</SelectItem>
                <SelectItem value={TOKEN_MINTS.USDT}>USDT</SelectItem>
              </SelectContent>
            </Select>
            <Input
              id="from"
              type="number"
              step="0.001"
              placeholder="0.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="bg-muted border-border"
            />
          </div>
        </div>

        <div className="flex justify-center">
          <Button
            size="icon"
            variant="outline"
            onClick={switchTokens}
            className="rounded-full"
          >
            <ArrowDownUp className="h-4 w-4" />
          </Button>
        </div>

        <div className="space-y-2">
          <Label htmlFor="to">To</Label>
          <Select value={toToken} onValueChange={setToToken}>
            <SelectTrigger className="bg-muted border-border">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={TOKEN_MINTS.SOL}>SOL</SelectItem>
              <SelectItem value={TOKEN_MINTS.USDC}>USDC</SelectItem>
              <SelectItem value={TOKEN_MINTS.USDT}>USDT</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Button
          onClick={handleSwap}
          disabled={!amount || swapping || fromToken === toToken}
          className="w-full bg-gradient-accent hover:opacity-90 transition-opacity"
        >
          {swapping ? 'Swapping...' : 'Swap'}
        </Button>

        <p className="text-xs text-muted-foreground text-center">
          Powered by Jupiter • 0.5% slippage
        </p>
      </CardContent>
    </Card>
  );
}
