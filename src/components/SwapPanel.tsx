import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { ArrowDown, Loader2, RefreshCw } from 'lucide-react';
import { TRAPANI_MINT, SOL_MINT, SLIPPAGE_BPS } from '@/config/swap';
import { useBalance } from '@/hooks/useBalance';
import { usePrices } from '@/hooks/usePrices';
import { fetchJupiterQuote, buildJupiterSwap, type JupiterQuoteResponse } from '@/lib/jupiterV6';
import { toast } from 'sonner';
import { useWallets } from '@privy-io/react-auth/solana';
import { Connection, VersionedTransaction } from '@solana/web3.js';

interface SwapPanelProps {
  onSwapResult?: (result: { signature: string; inAmount: number; outAmount: number }) => void;
}

export function SwapPanel({ onSwapResult }: SwapPanelProps) {
  const { wallets } = useWallets();
  
  // Get first Solana wallet
  const solanaWallet = wallets[0];
  const address = solanaWallet?.address;
  
  // Create Solana connection
  const connection = new Connection('https://api.mainnet-beta.solana.com', 'confirmed');
  
  const { data: balance = 0, refetch: refetchBalance } = useBalance(address);
  const { sol: solPrice, trapani: trapaniPrice, loading: pricesLoading } = usePrices();
  
  const [inputAmount, setInputAmount] = useState('0.01');
  const [quote, setQuote] = useState<JupiterQuoteResponse | null>(null);
  const [isLoadingQuote, setIsLoadingQuote] = useState(false);
  const [isSwapping, setIsSwapping] = useState(false);
  const [countdown, setCountdown] = useState(15);

  const AUTO_REFRESH_INTERVAL = 15000; // 15 seconds

  const handleGetQuote = async (isAutoRefresh = false) => {
    if (!inputAmount || parseFloat(inputAmount) <= 0) {
      if (!isAutoRefresh) toast.error('Enter a valid amount');
      return;
    }

    const amountSOL = parseFloat(inputAmount);
    if (amountSOL > balance) {
      if (!isAutoRefresh) toast.error('Insufficient SOL balance');
      return;
    }

    setIsLoadingQuote(true);

    try {
      console.log('[SwapPanel] Getting quote for', amountSOL, 'SOL');
      const amountLamports = Math.floor(amountSOL * 1e9);
      const quoteData = await fetchJupiterQuote(
        SOL_MINT,
        TRAPANI_MINT,
        amountLamports,
        SLIPPAGE_BPS
      );
      console.log('[SwapPanel] Quote received:', quoteData);
      setQuote(quoteData);
      setCountdown(15); // Reset countdown
      if (!isAutoRefresh) toast.success('Quote updated');
    } catch (error) {
      console.error('[SwapPanel] Quote error:', error);
      if (!isAutoRefresh) {
        toast.error(error instanceof Error ? error.message : 'Failed to fetch quote');
      }
    } finally {
      setIsLoadingQuote(false);
    }
  };

  // Auto-refresh quote every 15 seconds
  useEffect(() => {
    if (!quote) return;

    const interval = setInterval(() => {
      handleGetQuote(true);
    }, AUTO_REFRESH_INTERVAL);

    return () => clearInterval(interval);
  }, [quote, inputAmount]);

  // Countdown timer
  useEffect(() => {
    if (!quote) return;

    const interval = setInterval(() => {
      setCountdown((prev) => (prev > 0 ? prev - 1 : 15));
    }, 1000);

    return () => clearInterval(interval);
  }, [quote]);

  const handleSwap = async () => {
    if (!address || !solanaWallet || !inputAmount) {
      toast.error('Missing wallet or amount');
      return;
    }

    setIsSwapping(true);

    try {
      // Fetch fresh quote right before swap
      console.log('[SwapPanel] Starting swap process...');
      toast.info('Fetching fresh quote...');
      const amountLamports = Math.floor(parseFloat(inputAmount) * 1e9);
      
      console.log('[SwapPanel] Fetching quote for', amountLamports, 'lamports');
      const freshQuote = await fetchJupiterQuote(
        SOL_MINT,
        TRAPANI_MINT,
        amountLamports,
        SLIPPAGE_BPS
      );
      console.log('[SwapPanel] Fresh quote received:', freshQuote);

      toast.info('Building swap transaction...');
      console.log('[SwapPanel] Building transaction for wallet:', address);
      const swapTransactionBase64 = await buildJupiterSwap(freshQuote, address);

      // Deserialize to VersionedTransaction (DO NOT mutate after this)
      const vtx = VersionedTransaction.deserialize(Buffer.from(swapTransactionBase64, 'base64'));
      console.log('[SwapPanel] Transaction deserialized:', {
        version: vtx.version,
        isVersioned: vtx instanceof VersionedTransaction,
        signatures: vtx.signatures.length
      });

      toast.info('Please approve in Privy wallet...');
      console.log('[SwapPanel] Calling signAndSendTransaction...');
      
      // Privy signAndSendTransaction expects chain ID and serialized transaction
      const txResult = await solanaWallet.signAndSendTransaction({
        chain: 'solana:mainnet',
        transaction: vtx.serialize()
      });
      
      // Extract signature - Privy returns { signature: Uint8Array }
      const signatureBytes = txResult.signature;
      const signature = typeof signatureBytes === 'string' 
        ? signatureBytes 
        : Buffer.from(signatureBytes).toString('base64');
      console.log('[SwapPanel] Transaction sent:', signature);
      toast.info('Confirming transaction...');
      
      // Wait for confirmation
      await connection.confirmTransaction(signature, 'confirmed');
      
      toast.success('Swap successful!');
      console.log('[SwapPanel] Transaction confirmed:', signature);
      
      if (onSwapResult) {
        onSwapResult({
          signature,
          inAmount: parseInt(freshQuote.inAmount) / 1e9,
          outAmount: parseInt(freshQuote.outAmount),
        });
      }

      setQuote(null);
      setInputAmount('');
      refetchBalance();
    } catch (error: any) {
      console.error('[SwapPanel] Swap error:', error);
      console.error('[SwapPanel] Error details:', {
        message: error.message,
        stack: error.stack,
        name: error.name,
      });
      
      if (error.message?.includes('User rejected')) {
        toast.error('Transaction rejected');
      } else if (error.message?.includes('insufficient funds')) {
        toast.error('Insufficient SOL for swap + ATA creation (~0.002 SOL needed)');
      } else if (error.message?.includes('account')) {
        toast.error('Token account error - please try again');
      } else {
        toast.error(error.message || 'Swap failed - check console for details');
      }
    } finally {
      setIsSwapping(false);
    }
  };

  const estimatedOutput = quote
    ? (parseInt(quote.outAmount) / 1e6).toFixed(2)
    : '0';

  const priceImpact = quote ? parseFloat(quote.priceImpactPct) : 0;

  // Calculate USD values
  const inputUsdValue = parseFloat(inputAmount || '0') * solPrice;
  const outputUsdValue = parseFloat(estimatedOutput) * trapaniPrice;

  return (
    <Card className="mx-6 mb-4 p-6 space-y-4">
      <div>
        <h2 className="text-xl font-semibold mb-1">Swap SOL → TRAPANI</h2>
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Balance: {balance.toFixed(4)} SOL
          </p>
          <div className="text-xs text-muted-foreground flex gap-3">
            <span>SOL: ${solPrice.toFixed(2)}</span>
            <span>TRAPANI: ${trapaniPrice.toFixed(6)}</span>
          </div>
        </div>
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
        <div className="flex justify-between text-xs">
          <span className="text-muted-foreground">SOL</span>
          {!pricesLoading && inputAmount && (
            <span className="text-muted-foreground">≈ ${inputUsdValue.toFixed(2)}</span>
          )}
        </div>
      </div>

      <div className="flex justify-center">
        <ArrowDown className="h-5 w-5 text-muted-foreground" />
      </div>

      {/* Output */}
      <div className="space-y-2">
        <label className="text-sm font-medium">You receive (estimated)</label>
        <div className="p-3 rounded-lg bg-muted/30">
          <p className="text-2xl font-bold">{estimatedOutput}</p>
          <div className="flex justify-between items-center mt-1">
            <p className="text-xs text-muted-foreground">TRAPANI</p>
            {!pricesLoading && quote && (
              <p className="text-xs text-muted-foreground">≈ ${outputUsdValue.toFixed(2)}</p>
            )}
          </div>
        </div>
      </div>

      {/* Quote details */}
      {quote && (
        <div className="p-3 rounded-lg bg-muted/20 space-y-1 text-xs">
          <div className="flex justify-between items-center mb-2">
            <span className="text-muted-foreground flex items-center gap-1">
              <RefreshCw className={`h-3 w-3 ${isLoadingQuote ? 'animate-spin' : ''}`} />
              Auto-refresh in {countdown}s
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleGetQuote(false)}
              disabled={isLoadingQuote}
              className="h-6 px-2"
            >
              <RefreshCw className="h-3 w-3" />
            </Button>
          </div>
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
          <div className="flex justify-between text-muted-foreground text-[10px] mt-2 pt-2 border-t border-border/50">
            <span>First swap includes ~0.002 SOL for token account creation</span>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="space-y-2">
        {!quote ? (
          <Button
            onClick={() => handleGetQuote(false)}
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
