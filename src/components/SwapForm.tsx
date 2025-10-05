import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowDownUp } from 'lucide-react';
import { toast } from 'sonner';
import { getSwapQuote, TOKEN_MINTS } from '@/lib/jupiter';
import { useEmbeddedSolWallet } from '@/hooks/useEmbeddedSolWallet';
import trapaniIcon from '@/assets/trapani-coin.png';
import { VersionedTransaction } from '@solana/web3.js';

export function SwapForm() {
  const { wallet, address } = useEmbeddedSolWallet();
  const [fromToken, setFromToken] = useState(TOKEN_MINTS.SOL);
  const [toToken, setToToken] = useState(TOKEN_MINTS.TRAPANI);
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
      
      // Get swap transaction from Jupiter
      const swapResponse = await fetch('https://lite-api.jup.ag/swap/v1/swap', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          quoteResponse: quote,
          userPublicKey: address,
          wrapAndUnwrapSol: true,
          dynamicComputeUnitLimit: true,
          prioritizationFeeLamports: 'auto',
        }),
      });

      if (!swapResponse.ok) {
        throw new Error(`Failed to get swap transaction: ${swapResponse.status}`);
      }

      const { swapTransaction } = await swapResponse.json();
      
      // Deserialize transaction
      const transactionBuf = Uint8Array.from(atob(swapTransaction), c => c.charCodeAt(0));
      const tx = VersionedTransaction.deserialize(transactionBuf);
      
      console.log('📤 Sending transaction with Privy wallet...');
      
      // Send transaction using Privy wallet directly (same as SendSolForm)
      // @ts-ignore - Privy wallet types
      const signature = await wallet.sendTransaction(tx);

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
                <SelectItem value={TOKEN_MINTS.SOL}>
                  <div className="flex items-center gap-2">
                    <span>◎</span>
                    <span>SOL</span>
                  </div>
                </SelectItem>
                <SelectItem value={TOKEN_MINTS.TRAPANI}>
                  <div className="flex items-center gap-2">
                    <img src={trapaniIcon} alt="TRAPANI" className="w-4 h-4 rounded-full" />
                    <span>TRAPANI</span>
                  </div>
                </SelectItem>
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
              <SelectItem value={TOKEN_MINTS.SOL}>
                <div className="flex items-center gap-2">
                  <span>◎</span>
                  <span>SOL</span>
                </div>
              </SelectItem>
              <SelectItem value={TOKEN_MINTS.TRAPANI}>
                <div className="flex items-center gap-2">
                  <img src={trapaniIcon} alt="TRAPANI" className="w-4 h-4 rounded-full" />
                  <span>TRAPANI</span>
                </div>
              </SelectItem>
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
