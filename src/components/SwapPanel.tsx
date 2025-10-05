import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { ArrowDownUp, Loader2, RefreshCw, AlertTriangle, ExternalLink, TrendingDown } from 'lucide-react';
import { toast } from 'sonner';
import { TRAPANI_MINT, SLIPPAGE_BPS, MIN_SOL_AMOUNT, MIN_SOL_RESERVE, SOL_MINT } from '@/config/swap';
import { useEmbeddedSolWallet } from '@/hooks/useEmbeddedSolWallet';
import { useBalance } from '@/hooks/useBalance';
import { fetchJupiterQuote, buildJupiterSwap, type JupiterQuoteResponse } from '@/lib/jupiterV6';
import { toSOL, toLamports, shortenAddress, getExplorerUrl } from '@/lib/solana';
import { useFund } from '@/hooks/useFund';

type SwapState = 'idle' | 'quoting' | 'readyToSwap' | 'swapping' | 'success' | 'error';

interface SwapPanelProps {
  onSwapResult?: (result: { signature: string; inAmount: number; outAmount: number; routeInfo?: any }) => void;
}

export function SwapPanel({ onSwapResult }: SwapPanelProps) {
  const { wallet, address, ready } = useEmbeddedSolWallet();
  const { data: balance = 0, refetch: refetchBalance } = useBalance(address);
  const { fundWallet } = useFund();
  
  const [inputAmount, setInputAmount] = useState('');
  const [quote, setQuote] = useState<JupiterQuoteResponse | null>(null);
  const [quoteTimestamp, setQuoteTimestamp] = useState(0);
  const [state, setState] = useState<SwapState>('idle');
  const [error, setError] = useState<string | null>(null);
  const [signature, setSignature] = useState<string | null>(null);
  const [debounceTimer, setDebounceTimer] = useState<NodeJS.Timeout | null>(null);

  // Clear debounce timer on unmount
  useEffect(() => {
    return () => {
      if (debounceTimer) clearTimeout(debounceTimer);
    };
  }, [debounceTimer]);

  // Auto-fetch quote when amount changes (debounced)
  useEffect(() => {
    if (debounceTimer) clearTimeout(debounceTimer);

    const amount = parseFloat(inputAmount);
    if (!amount || amount < MIN_SOL_AMOUNT || !address) {
      setQuote(null);
      return;
    }

    const timer = setTimeout(() => {
      fetchQuote();
    }, 500);

    setDebounceTimer(timer);
  }, [inputAmount, address]);

  const fetchQuote = async () => {
    const amount = parseFloat(inputAmount);
    
    if (!amount || amount < MIN_SOL_AMOUNT) {
      setError(`Minimum swap amount is ${MIN_SOL_AMOUNT} SOL`);
      return;
    }

    if (amount > balance - MIN_SOL_RESERVE) {
      setError(`Cannot swap more than ${(balance - MIN_SOL_RESERVE).toFixed(4)} SOL (keeping ${MIN_SOL_RESERVE} for rent)`);
      return;
    }

    setState('quoting');
    setError(null);

    try {
      const amountLamports = Number(toLamports(amount));
      
      const quoteResponse = await fetchJupiterQuote(
        SOL_MINT,
        TRAPANI_MINT,
        amountLamports,
        SLIPPAGE_BPS
      );

      setQuote(quoteResponse);
      setQuoteTimestamp(Date.now());
      setState('readyToSwap');
      
      // Check price impact
      const priceImpact = quoteResponse.priceImpactPct || 0;
      if (priceImpact > 5) {
        toast.warning(`High price impact: ${priceImpact.toFixed(2)}%`, {
          description: 'Consider reducing swap amount',
        });
      }
    } catch (err: any) {
      console.error('[Swap] Quote error:', err);
      const errorMsg = err.message || 'Failed to get quote';
      setError(errorMsg);
      setState('error');
      
      // Show user-friendly error
      toast.error('Quote failed', {
        description: errorMsg.includes('fetch') 
          ? 'Network error. Please check your connection and try again.'
          : errorMsg,
      });
    }
  };

  const handleSwap = async () => {
    if (!wallet || !address || !quote) return;

    // Check if quote is stale (older than 20 seconds)
    const quoteAge = Date.now() - quoteTimestamp;
    if (quoteAge > 20000) {
      toast.info('Quote expired, fetching new quote...');
      await fetchQuote();
      return;
    }

    setState('swapping');
    setError(null);

    const toastId = toast.loading('Preparing swap transaction...');

    try {
      // Build the swap transaction
      console.log('[Swap] Building transaction...');
      const tx = await buildJupiterSwap(quote, address);

      toast.loading('Sign the transaction in your wallet...', { id: toastId });

      // Sign and send with embedded wallet
      console.log('[Swap] Signing with embedded wallet...');
      // @ts-ignore - Privy wallet types
      const sig = await wallet.sendTransaction(tx);
      
      console.log('[Swap] Transaction sent:', sig);
      setSignature(sig);
      setState('success');

      const inAmount = parseFloat(inputAmount);
      const outAmount = toSOL(BigInt(quote.outAmount));

      toast.success('Swap successful!', {
        id: toastId,
        description: `Swapped ${inAmount} SOL for ${outAmount.toFixed(4)} TRAPANI`,
        action: {
          label: 'View on Solscan',
          onClick: () => window.open(getExplorerUrl(sig), '_blank'),
        },
        duration: 10000,
      });

      // Callback with results
      if (onSwapResult) {
        onSwapResult({
          signature: sig,
          inAmount,
          outAmount,
          routeInfo: quote.routePlan,
        });
      }

      // Refetch balance
      setTimeout(() => refetchBalance(), 3000);

      // Reset form after delay
      setTimeout(() => {
        setInputAmount('');
        setQuote(null);
        setState('idle');
      }, 5000);

    } catch (err: any) {
      console.error('[Swap] Transaction error:', err);
      const errorMsg = err.message || 'Transaction failed';
      setError(errorMsg);
      setState('error');
      
      toast.error('Swap failed', {
        id: toastId,
        description: errorMsg.includes('User rejected') 
          ? 'Transaction was rejected'
          : errorMsg.includes('insufficient') 
          ? 'Insufficient SOL balance'
          : errorMsg,
        duration: 8000,
      });
    }
  };

  const handleMaxAmount = () => {
    const maxSwappable = Math.max(0, balance - MIN_SOL_RESERVE);
    setInputAmount(maxSwappable.toFixed(6));
  };

  const isQuoteStale = quote && (Date.now() - quoteTimestamp) > 20000;
  const canSwap = state === 'readyToSwap' && quote && !isQuoteStale;
  const needsFunding = balance < MIN_SOL_AMOUNT + MIN_SOL_RESERVE;

  if (!ready || !address) {
    return (
      <Card className="mx-6 mb-4 p-6">
        <div className="flex items-center justify-center gap-2 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>Loading wallet...</span>
        </div>
      </Card>
    );
  }

  return (
    <Card className="mx-6 mb-4 p-6 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Swap SOL → TRAPANI</h2>
        <div className="text-xs text-muted-foreground">
          Slippage: {(SLIPPAGE_BPS / 100).toFixed(2)}%
        </div>
      </div>

      {/* Wallet Info */}
      <div className="text-sm space-y-1">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Wallet</span>
          <span className="font-mono">{shortenAddress(address)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Balance</span>
          <span className="font-semibold">{balance.toFixed(4)} SOL</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Network</span>
          <span className="text-green-500">Mainnet</span>
        </div>
      </div>

      {/* Need Funding Warning */}
      {needsFunding && (
        <div className="flex items-start gap-2 p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
          <AlertTriangle className="h-5 w-5 text-yellow-500 mt-0.5" />
          <div className="flex-1 space-y-2">
            <p className="text-sm text-yellow-700 dark:text-yellow-400">
              Insufficient SOL for swap. Add funds to continue.
            </p>
            <Button
              onClick={() => address && fundWallet(address)}
              size="sm"
              variant="outline"
              className="mt-2"
            >
              Fund with Card
            </Button>
          </div>
        </div>
      )}

      {/* Input Amount */}
      <div className="space-y-2">
        <label className="text-sm font-medium">Amount (SOL)</label>
        <div className="flex gap-2">
          <Input
            type="number"
            placeholder="0.00"
            value={inputAmount}
            onChange={(e) => setInputAmount(e.target.value)}
            disabled={state === 'swapping' || needsFunding}
            min={MIN_SOL_AMOUNT}
            step={0.001}
            className="flex-1"
          />
          <Button
            variant="outline"
            onClick={handleMaxAmount}
            disabled={state === 'swapping' || needsFunding}
          >
            MAX
          </Button>
        </div>
          <p className="text-xs text-muted-foreground">
            Max swappable: {(balance - MIN_SOL_RESERVE).toFixed(4)} SOL
          </p>
      </div>

      {/* Quote Display */}
      {quote && !isQuoteStale && (
        <div className="p-4 rounded-lg bg-muted/50 space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">You receive (min)</span>
            <span className="font-semibold">
              {toSOL(BigInt(quote.otherAmountThreshold)).toFixed(4)} TRAPANI
            </span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Price impact</span>
            <span className={(quote.priceImpactPct || 0) > 5 ? 'text-red-500' : 'text-green-500'}>
              {quote.priceImpactPct ? `${quote.priceImpactPct.toFixed(3)}%` : 'N/A'}
            </span>
          </div>
          {isQuoteStale && (
            <div className="flex items-center gap-1 text-xs text-yellow-600">
              <AlertTriangle className="h-3 w-3" />
              Quote expired - will refresh on swap
            </div>
          )}
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="flex items-start gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/20">
          <AlertTriangle className="h-5 w-5 text-red-500 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
            {state === 'error' && (
              <Button
                variant="link"
                size="sm"
                onClick={fetchQuote}
                className="h-auto p-0 text-red-600 hover:text-red-700"
              >
                Retry
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex gap-2">
        {state === 'idle' || state === 'error' ? (
          <Button
            onClick={fetchQuote}
            disabled={!inputAmount || parseFloat(inputAmount) < MIN_SOL_AMOUNT || needsFunding}
            className="flex-1"
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            Get Quote
          </Button>
        ) : state === 'quoting' ? (
          <Button disabled className="flex-1">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Fetching Quote...
          </Button>
        ) : canSwap ? (
          <Button
            onClick={handleSwap}
            className="flex-1 bg-gradient-primary hover:opacity-90"
          >
            <ArrowDownUp className="mr-2 h-4 w-4" />
            Swap Now
          </Button>
        ) : state === 'swapping' ? (
          <Button disabled className="flex-1">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Swapping...
          </Button>
        ) : state === 'success' && signature ? (
          <Button
            variant="outline"
            onClick={() => window.open(getExplorerUrl(signature), '_blank')}
            className="flex-1"
          >
            <ExternalLink className="mr-2 h-4 w-4" />
            View Transaction
          </Button>
        ) : null}
      </div>

      {/* Success Message */}
      {state === 'success' && signature && (
        <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/20">
          <p className="text-sm text-green-700 dark:text-green-400">
            ✅ Swap completed successfully!
          </p>
          <p className="text-xs text-muted-foreground mt-1 font-mono break-all">
            {signature.slice(0, 20)}...{signature.slice(-20)}
          </p>
        </div>
      )}
    </Card>
  );
}
