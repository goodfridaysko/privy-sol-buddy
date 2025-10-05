import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ArrowDownUp, Loader2, RefreshCw, AlertTriangle, ExternalLink } from 'lucide-react';
import { useSignAndSendTransaction, useWallets } from '@privy-io/react-auth/solana';
import { toast } from 'sonner';
import { TRAPANI_MINT, SOL_MINT } from '@/config/swap';
import { VersionedTransaction } from '@solana/web3.js';
import { usePrices } from '@/hooks/usePrices';
import { supabase } from '@/integrations/supabase/client';

interface SwapInterfaceProps {
  address: string;
}

export function SwapInterface({ address }: SwapInterfaceProps) {
  const [amount, setAmount] = useState('0.01');
  const [isSwapping, setIsSwapping] = useState(false);
  const [isFetchingQuote, setIsFetchingQuote] = useState(false);
  const [quote, setQuote] = useState<any>(null);
  const [quoteTimestamp, setQuoteTimestamp] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);
  const { signAndSendTransaction } = useSignAndSendTransaction();
  const { wallets } = useWallets();
  const prices = usePrices();
  
  // Get the embedded wallet
  const wallet = wallets?.[0];

  console.log('💼 Wallet state:', {
    hasWallet: !!wallet,
    address,
    walletsCount: wallets?.length
  });

  // Fetch quote from Jupiter via edge function
  const fetchQuote = useCallback(async () => {
    const amountNum = parseFloat(amount);
    
    if (!amount || amountNum <= 0) {
      setQuote(null);
      setError(null);
      return;
    }

    if (amountNum < 0.001) {
      setError('Minimum swap amount is 0.001 SOL');
      setQuote(null);
      return;
    }

    setIsFetchingQuote(true);
    setError(null);
    
    try {
      const lamports = Math.floor(amountNum * 1e9);
      
      console.log('📊 Fetching quote...', {
        amount: amountNum,
        lamports,
        inputMint: SOL_MINT,
        outputMint: TRAPANI_MINT
      });

      const { data, error: fetchError } = await supabase.functions.invoke('jupiter-quote', {
        body: {
          inputMint: SOL_MINT,
          outputMint: TRAPANI_MINT,
          amount: lamports,
          slippageBps: 50
        }
      });

      if (fetchError) {
        console.error('❌ Quote fetch error:', fetchError);
        throw new Error(fetchError.message || 'Failed to fetch quote');
      }

      if (data?.error) {
        console.error('❌ Quote API error:', data.error);
        throw new Error(data.error);
      }

      if (!data || !data.inAmount || !data.outAmount) {
        console.error('❌ Invalid quote data:', data);
        throw new Error('Invalid quote response');
      }
      
      console.log('✅ Quote received:', {
        inAmount: data.inAmount,
        outAmount: data.outAmount,
        priceImpact: data.priceImpactPct
      });

      setQuote(data);
      setQuoteTimestamp(Date.now());
      setError(null);
    } catch (err: any) {
      console.error('💥 Quote error:', err);
      const errorMsg = err?.message || 'Failed to fetch quote';
      setError(errorMsg);
      setQuote(null);
      toast.error(errorMsg);
    } finally {
      setIsFetchingQuote(false);
    }
  }, [amount]);

  // Auto-fetch quote when amount changes
  useEffect(() => {
    const timeoutId = setTimeout(fetchQuote, 500);
    return () => clearTimeout(timeoutId);
  }, [fetchQuote]);

  // Auto-refresh quote every 20 seconds
  useEffect(() => {
    if (!quote) return;
    
    const interval = setInterval(() => {
      console.log('🔄 Auto-refreshing quote...');
      fetchQuote();
    }, 20000);

    return () => clearInterval(interval);
  }, [quote, fetchQuote]);

  const handleSwap = async () => {
    if (!wallet) {
      toast.error('Wallet not connected');
      return;
    }

    if (!quote) {
      toast.error('Please wait for quote');
      return;
    }

    // Check if quote is stale (older than 30 seconds)
    const quoteAge = Date.now() - quoteTimestamp;
    if (quoteAge > 30000) {
      toast.error('Quote expired, refreshing...');
      fetchQuote();
      return;
    }

    setIsSwapping(true);
    const toastId = toast.loading('Preparing swap...');

    try {
      console.log('🔄 Building swap transaction...');
      
      // Get swap transaction from Jupiter via edge function
      const { data, error: swapError } = await supabase.functions.invoke('jupiter-swap', {
        body: {
          quoteResponse: quote,
          userPublicKey: address
        }
      });

      if (swapError) {
        console.error('❌ Swap error:', swapError);
        throw new Error(swapError.message || 'Failed to build swap transaction');
      }

      if (data?.error) {
        console.error('❌ Swap API error:', data.error);
        throw new Error(data.error);
      }

      const { swapTransaction } = data;
      
      if (!swapTransaction) {
        throw new Error('No transaction returned from Jupiter');
      }

      console.log('📝 Transaction received, deserializing...');
      
      // Decode base64 transaction
      const transactionBuf = Uint8Array.from(atob(swapTransaction), c => c.charCodeAt(0));
      const transaction = VersionedTransaction.deserialize(transactionBuf);

      console.log('✍️ Signing and sending transaction...');
      toast.loading('Signing transaction...', { id: toastId });

      const receipt = await signAndSendTransaction({
        transaction: transaction.serialize(),
        wallet: wallet,
      });

      console.log('✅ Swap successful!', receipt.signature);

      toast.success('Swap successful!', {
        id: toastId,
        description: `Swapped ${amount} SOL for $TRAPANI`,
        action: {
          label: 'View',
          onClick: () => window.open(`https://solscan.io/tx/${receipt.signature}`, '_blank'),
        },
      });

      setAmount('0.01');
      setQuote(null);
      setError(null);
    } catch (err: any) {
      console.error('💥 Swap failed:', err);
      const errorMsg = err?.message || 'Swap failed';
      toast.error(errorMsg, { id: toastId });
    } finally {
      setIsSwapping(false);
    }
  };

  // Calculate display values (Jupiter format)
  const outputAmount = quote?.outAmount
    ? (parseInt(quote.outAmount) / 1e5).toLocaleString('en-US', { maximumFractionDigits: 0 })
    : '0';

  const exchangeRate = quote?.outAmount && quote?.inAmount
    ? (parseInt(quote.outAmount) / parseInt(quote.inAmount) * 1e4).toLocaleString('en-US', { maximumFractionDigits: 0 })
    : '0';

  const priceImpact = quote?.priceImpactPct
    ? parseFloat(quote.priceImpactPct)
    : null;

  const inputUSD = prices.sol * parseFloat(amount || '0');
  const outputUSD = quote?.outAmount 
    ? prices.trapani * (parseInt(quote.outAmount) / 1e5)
    : 0;

  const quoteAge = Date.now() - quoteTimestamp;
  const isQuoteStale = quoteAge > 30000;

  return (
    <div className="mx-6 my-4 p-6 space-y-4 bg-card rounded-lg border border-border shadow-sm">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Swap</h3>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={fetchQuote}
            disabled={isFetchingQuote || !amount || parseFloat(amount) <= 0}
          >
            <RefreshCw className={`h-4 w-4 ${isFetchingQuote ? 'animate-spin' : ''}`} />
          </Button>
          <a
            href="https://jup.ag"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
          >
            Powered by Jupiter
            <ExternalLink className="h-3 w-3" />
          </a>
        </div>
      </div>

      {/* Live Prices */}
      <div className="flex items-center justify-between text-xs text-muted-foreground bg-muted/50 rounded-lg p-3">
        <div>
          <span className="font-medium">SOL:</span> ${prices.sol.toFixed(2)}
        </div>
        <div>
          <span className="font-medium">$TRAPANI:</span> ${prices.trapani.toFixed(6)}
        </div>
        {prices.loading && <Loader2 className="h-3 w-3 animate-spin" />}
      </div>

      <div className="space-y-3">
        {/* Input */}
        <div className="space-y-2 bg-muted/30 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <label className="text-sm text-muted-foreground">You pay</label>
            <span className="text-xs text-muted-foreground">
              ≈ ${inputUSD.toFixed(2)}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              step="0.001"
              min="0.001"
              className="flex-1 text-2xl font-semibold border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0"
            />
            <div className="flex items-center gap-2 bg-background px-3 py-2 rounded-lg">
              <span className="text-sm font-bold">SOL</span>
            </div>
          </div>
        </div>

        {/* Swap Icon */}
        <div className="flex justify-center -my-2">
          <div className="p-2 rounded-full bg-accent border-2 border-background">
            {isFetchingQuote ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <ArrowDownUp className="h-5 w-5" />
            )}
          </div>
        </div>

        {/* Output */}
        <div className="space-y-2 bg-muted/30 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <label className="text-sm text-muted-foreground">You receive</label>
            <span className="text-xs text-muted-foreground">
              ≈ ${outputUSD.toFixed(2)}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Input
              type="text"
              value={outputAmount}
              readOnly
              placeholder="0"
              className="flex-1 text-2xl font-semibold border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0"
            />
            <div className="flex items-center gap-2 bg-background px-3 py-2 rounded-lg">
              <span className="text-sm font-bold">$TRAPANI</span>
            </div>
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="flex items-start gap-2 text-xs text-destructive bg-destructive/10 rounded-lg p-3">
            <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-medium">Error</p>
              <p className="text-muted-foreground">{error}</p>
            </div>
          </div>
        )}

        {/* Quote Details */}
        {quote && !isFetchingQuote && !error && (
          <div className="space-y-2 text-xs">
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Rate</span>
              <span className="font-medium">1 SOL ≈ {exchangeRate} $TRAPANI</span>
            </div>
            {priceImpact !== null && (
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Price Impact</span>
                <span className={`font-medium ${
                  priceImpact > 5 ? 'text-destructive' : 
                  priceImpact > 1 ? 'text-yellow-500' : 
                  'text-green-500'
                }`}>
                  {priceImpact.toFixed(2)}%
                </span>
              </div>
            )}
            {isQuoteStale && (
              <div className="flex items-center gap-2 text-yellow-500 bg-yellow-500/10 rounded-lg p-2">
                <AlertTriangle className="h-3 w-3" />
                <span>Quote expired - click refresh</span>
              </div>
            )}
          </div>
        )}

        {/* High Price Impact Warning */}
        {priceImpact !== null && priceImpact > 5 && (
          <div className="flex items-start gap-2 text-xs text-destructive bg-destructive/10 rounded-lg p-3">
            <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-medium">High Price Impact</p>
              <p className="text-muted-foreground">This trade will significantly move the market price.</p>
            </div>
          </div>
        )}

        {/* Swap Button */}
        <Button
          onClick={handleSwap}
          disabled={
            !wallet || 
            !quote || 
            isSwapping || 
            isFetchingQuote ||
            parseFloat(amount) <= 0 ||
            isQuoteStale ||
            !!error
          }
          className="w-full h-14 text-lg font-semibold"
          size="lg"
        >
          {isSwapping ? (
            <>
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              Swapping...
            </>
          ) : !wallet ? (
            'Connect Wallet'
          ) : error ? (
            'Error - Try Again'
          ) : isFetchingQuote ? (
            'Fetching Quote...'
          ) : isQuoteStale ? (
            'Refresh Quote'
          ) : !quote ? (
            'Enter Amount'
          ) : (
            'Swap'
          )}
        </Button>
      </div>
    </div>
  );
}
