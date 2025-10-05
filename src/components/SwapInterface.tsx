import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ArrowDownUp, Loader2, RefreshCw, AlertTriangle } from 'lucide-react';
import { useSignAndSendTransaction, useWallets } from '@privy-io/react-auth/solana';
import { toast } from 'sonner';
import { TRAPANI_MINT, SOL_MINT } from '@/config/swap';
import { VersionedTransaction } from '@solana/web3.js';
import { usePrices } from '@/hooks/usePrices';

interface SwapInterfaceProps {
  address: string;
}

export function SwapInterface({ address }: SwapInterfaceProps) {
  const [amount, setAmount] = useState('0.01');
  const [isSwapping, setIsSwapping] = useState(false);
  const [isFetchingQuote, setIsFetchingQuote] = useState(false);
  const [quote, setQuote] = useState<any>(null);
  const [quoteTimestamp, setQuoteTimestamp] = useState<number>(0);
  const { signAndSendTransaction } = useSignAndSendTransaction();
  const { wallets } = useWallets();
  const prices = usePrices();
  
  // Get the embedded wallet (first wallet is the Privy embedded wallet)
  const wallet = wallets?.[0];

  // Fetch quote function
  const fetchQuote = useCallback(async () => {
    if (!amount || parseFloat(amount) <= 0) {
      setQuote(null);
      return;
    }

    setIsFetchingQuote(true);
    try {
      const lamports = Math.floor(parseFloat(amount) * 1e9);
      
      const response = await fetch(
        `https://transaction-v1.raydium.io/compute/swap-base-in?inputMint=${SOL_MINT}&outputMint=${TRAPANI_MINT}&amount=${lamports}&slippageBps=50&txVersion=V0`
      );
      
      if (!response.ok) {
        throw new Error('Failed to fetch quote');
      }
      
      const data = await response.json();
      console.log('📊 Quote:', data);
      setQuote(data);
      setQuoteTimestamp(Date.now());
    } catch (error) {
      console.error('Quote error:', error);
      toast.error('Failed to fetch quote');
      setQuote(null);
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
    if (!wallet || !quote) {
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
    toast.loading('Preparing swap...', { id: 'swap' });

    try {
      const priorityFee = '10000';

      const swapResponse = await fetch('https://transaction-v1.raydium.io/transaction/swap-base-in', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          computeUnitPriceMicroLamports: priorityFee,
          swapResponse: quote,
          txVersion: 'V0',
          wallet: address,
          wrapSol: true,
          unwrapSol: false,
        }),
      });

      if (!swapResponse.ok) {
        throw new Error('Failed to build transaction');
      }

      const swapData = await swapResponse.json();
      
      if (!swapData.success || !swapData.data?.[0]?.transaction) {
        throw new Error('Invalid transaction response');
      }

      const transactionBuf = Uint8Array.from(atob(swapData.data[0].transaction), c => c.charCodeAt(0));
      const transaction = VersionedTransaction.deserialize(transactionBuf);

      toast.loading('Signing transaction...', { id: 'swap' });

      const receipt = await signAndSendTransaction({
        transaction: transaction.serialize(),
        wallet: wallet,
      });

      toast.success('Swap successful!', {
        id: 'swap',
        description: `Swapped ${amount} SOL for $TRAPANI`,
        action: {
          label: 'View',
          onClick: () => window.open(`https://solscan.io/tx/${receipt.signature}`, '_blank'),
        },
      });

      setAmount('0.01');
      setQuote(null);
    } catch (error: any) {
      console.error('Swap error:', error);
      toast.error('Swap failed', {
        id: 'swap',
        description: error?.message || 'Please try again',
      });
    } finally {
      setIsSwapping(false);
    }
  };

  // Calculate display values
  const outputAmount = quote?.data
    ? (parseInt(quote.data.outputAmount) / 1e5).toLocaleString('en-US', { maximumFractionDigits: 0 })
    : '0';

  const exchangeRate = quote?.data
    ? (parseInt(quote.data.outputAmount) / parseInt(quote.data.inputAmount) * 1e4).toLocaleString('en-US', { maximumFractionDigits: 0 })
    : '0';

  const priceImpact = quote?.data?.priceImpactPct
    ? parseFloat(quote.data.priceImpactPct)
    : null;

  const inputUSD = prices.sol * parseFloat(amount || '0');
  const outputUSD = quote?.data 
    ? prices.trapani * (parseInt(quote.data.outputAmount) / 1e5)
    : 0;

  const quoteAge = Date.now() - quoteTimestamp;
  const isQuoteStale = quoteAge > 30000;

  return (
    <div className="mx-6 my-4 p-6 space-y-4 bg-card rounded-lg border border-border shadow-sm">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Swap</h3>
        <Button
          variant="ghost"
          size="sm"
          onClick={fetchQuote}
          disabled={isFetchingQuote || !amount || parseFloat(amount) <= 0}
        >
          <RefreshCw className={`h-4 w-4 ${isFetchingQuote ? 'animate-spin' : ''}`} />
        </Button>
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
              step="0.01"
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

        {/* Quote Details */}
        {quote && !isFetchingQuote && (
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
            isQuoteStale
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
