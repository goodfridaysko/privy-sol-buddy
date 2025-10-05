import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { ArrowDown, Loader2 } from 'lucide-react';
import { TRAPANI_MINT, SOL_MINT, SLIPPAGE_BPS } from '@/config/swap';
import { useEmbeddedSolWallet } from '@/hooks/useEmbeddedSolWallet';
import { useBalance } from '@/hooks/useBalance';
import { fetchJupiterQuote, buildJupiterSwap, type JupiterQuoteResponse } from '@/lib/jupiterV6';
import { toast } from 'sonner';

interface SwapPanelProps {
  onSwapResult?: (result: { signature: string; inAmount: number; outAmount: number }) => void;
}

export function SwapPanel({ onSwapResult }: SwapPanelProps) {
  const { address, wallet } = useEmbeddedSolWallet();
  const { data: balance = 0, refetch: refetchBalance } = useBalance(address);
  
  const [inputAmount, setInputAmount] = useState('0.01');
  const [quote, setQuote] = useState<JupiterQuoteResponse | null>(null);
  const [isLoadingQuote, setIsLoadingQuote] = useState(false);
  const [isSwapping, setIsSwapping] = useState(false);

  const handleGetQuote = async () => {
    if (!inputAmount || parseFloat(inputAmount) <= 0) {
      toast.error('Enter a valid amount');
      return;
    }

    const amountSOL = parseFloat(inputAmount);
    if (amountSOL > balance) {
      toast.error('Insufficient SOL balance');
      return;
    }

    setIsLoadingQuote(true);
    setQuote(null);

    try {
      const amountLamports = Math.floor(amountSOL * 1e9);
      const quoteData = await fetchJupiterQuote(
        SOL_MINT,
        TRAPANI_MINT,
        amountLamports,
        SLIPPAGE_BPS
      );
      setQuote(quoteData);
      toast.success('Quote fetched successfully');
    } catch (error) {
      console.error('Quote error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to fetch quote');
    } finally {
      setIsLoadingQuote(false);
    }
  };

  const handleSwap = async () => {
    if (!quote || !address || !wallet) {
      toast.error('Missing quote or wallet');
      return;
    }

    setIsSwapping(true);

    try {
      toast.info('Building swap transaction...');
      const transaction = await buildJupiterSwap(quote, address);

      toast.info('Please sign the transaction...');
      const signature = await wallet.signAndSendTransaction(transaction);

      toast.success('Swap successful!');
      
      if (onSwapResult) {
        onSwapResult({
          signature,
          inAmount: parseInt(quote.inAmount) / 1e9,
          outAmount: parseInt(quote.outAmount),
        });
      }

      setQuote(null);
      setInputAmount('');
      refetchBalance();
    } catch (error: any) {
      console.error('Swap error:', error);
      
      if (error.message?.includes('User rejected')) {
        toast.error('Transaction rejected');
      } else {
        toast.error(error.message || 'Swap failed');
      }
    } finally {
      setIsSwapping(false);
    }
  };

  const estimatedOutput = quote
    ? (parseInt(quote.outAmount) / 1e6).toFixed(2)
    : '0';

  const priceImpact = quote ? quote.priceImpactPct : 0;

  return (
    <Card className="mx-6 mb-4 p-6 space-y-4">
      <div>
        <h2 className="text-xl font-semibold mb-1">Swap SOL → TRAPANI</h2>
        <p className="text-sm text-muted-foreground">
          Balance: {balance.toFixed(4)} SOL
        </p>
      </div>

      {/* Input */}
      <div className="space-y-2">
        <label className="text-sm font-medium">You pay</label>
        <div className="flex gap-2">
          <Input
            type="number"
            value={inputAmount}
            onChange={(e) => setInputAmount(e.target.value)}
            placeholder="0.01"
            step="0.01"
            className="flex-1"
          />
          <Button
            variant="outline"
            onClick={() => setInputAmount(balance.toString())}
            disabled={balance === 0}
          >
            MAX
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">SOL</p>
      </div>

      <div className="flex justify-center">
        <ArrowDown className="h-5 w-5 text-muted-foreground" />
      </div>

      {/* Output */}
      <div className="space-y-2">
        <label className="text-sm font-medium">You receive (estimated)</label>
        <div className="p-3 rounded-lg bg-muted/30">
          <p className="text-2xl font-bold">{estimatedOutput}</p>
          <p className="text-xs text-muted-foreground">TRAPANI</p>
        </div>
      </div>

      {/* Quote details */}
      {quote && (
        <div className="p-3 rounded-lg bg-muted/20 space-y-1 text-xs">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Price Impact</span>
            <span className={priceImpact > 1 ? 'text-destructive' : ''}>
              {priceImpact.toFixed(2)}%
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Slippage</span>
            <span>{(SLIPPAGE_BPS / 100).toFixed(2)}%</span>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="space-y-2">
        {!quote ? (
          <Button
            onClick={handleGetQuote}
            disabled={isLoadingQuote || !address}
            className="w-full"
          >
            {isLoadingQuote ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Getting Quote...
              </>
            ) : (
              'Get Quote'
            )}
          </Button>
        ) : (
          <Button
            onClick={handleSwap}
            disabled={isSwapping}
            className="w-full"
          >
            {isSwapping ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Swapping...
              </>
            ) : (
              'Execute Swap'
            )}
          </Button>
        )}
      </div>
    </Card>
  );
}
