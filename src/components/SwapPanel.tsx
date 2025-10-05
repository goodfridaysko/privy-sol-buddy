import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ArrowDownUp, Loader2, ExternalLink, AlertCircle, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import { useEmbeddedSolWallet } from '@/hooks/useEmbeddedSolWallet';
import { useBalance } from '@/hooks/useBalance';
import { useFund } from '@/hooks/useFund';
import { getQuote, buildSwapTransaction, calculatePriceImpact, formatRoute, type QuoteResponse } from '@/lib/jupiter';
import { 
  solToLamports, 
  lamportsToSol, 
  deserializeTransaction, 
  sendWithEmbeddedWallet,
  getExplorerUrl,
  shortenAddress
} from '@/lib/solana';
import { TRAPANI_MINT, SOL_MINT, SLIPPAGE_BPS, MIN_SOL_AMOUNT } from '@/config/swap';

interface SwapPanelProps {
  defaultOutMint?: string;
}

export function SwapPanel({ defaultOutMint = TRAPANI_MINT }: SwapPanelProps) {
  const { address, wallet, hasWallet } = useEmbeddedSolWallet();
  const { data: balance, refetch: refetchBalance } = useBalance(address);
  const { fundWallet } = useFund();
  
  const [inputAmount, setInputAmount] = useState('');
  const [loadingQuote, setLoadingQuote] = useState(false);
  const [swapping, setSwapping] = useState(false);
  const [quote, setQuote] = useState<QuoteResponse | null>(null);
  const [signature, setSignature] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Fetch quote when amount changes (debounced)
  useEffect(() => {
    const fetchQuote = async () => {
      if (!inputAmount || !address) {
        setQuote(null);
        return;
      }

      const amount = parseFloat(inputAmount);
      if (isNaN(amount) || amount < MIN_SOL_AMOUNT) {
        setQuote(null);
        return;
      }

      setLoadingQuote(true);
      setError(null);

      try {
        const lamports = solToLamports(amount);
        const quoteResponse = await getQuote({
          inputMint: SOL_MINT,
          outputMint: defaultOutMint,
          amount: lamports,
          slippageBps: SLIPPAGE_BPS,
        });

        setQuote(quoteResponse);
      } catch (err: any) {
        console.error('Quote error:', err);
        setError(err.message || 'Failed to get quote');
        setQuote(null);
      } finally {
        setLoadingQuote(false);
      }
    };

    const timeoutId = setTimeout(fetchQuote, 800);
    return () => clearTimeout(timeoutId);
  }, [inputAmount, address, defaultOutMint]);

  const handleMaxClick = useCallback(() => {
    if (balance && balance > 0) {
      // Reserve 0.01 SOL for transaction fees
      const maxAmount = Math.max(balance - 0.01, 0);
      setInputAmount(maxAmount.toFixed(4));
    }
  }, [balance]);

  const handleSwap = async () => {
    if (!quote || !wallet || !address) {
      toast.error('Unable to proceed with swap');
      return;
    }

    // Validate amount
    const amount = parseFloat(inputAmount);
    if (isNaN(amount) || amount < MIN_SOL_AMOUNT) {
      toast.error(`Minimum swap amount is ${MIN_SOL_AMOUNT} SOL`);
      return;
    }

    // Check balance
    if (!balance || balance < amount) {
      toast.error('Insufficient SOL balance');
      return;
    }

    setSwapping(true);
    setError(null);
    setSignature(null);

    try {
      // Step 1: Build transaction
      toast.info('Building swap transaction...');
      const swapResponse = await buildSwapTransaction({
        quoteResponse: quote,
        userPublicKey: address,
        wrapAndUnwrapSol: true,
        dynamicComputeUnitLimit: true,
      });

      // Step 2: Deserialize transaction
      const transaction = deserializeTransaction(swapResponse.swapTransaction);

      // Step 3: Sign and send with embedded wallet
      toast.info('Please confirm the transaction...');
      const txSignature = await sendWithEmbeddedWallet(wallet, transaction);

      setSignature(txSignature);
      toast.success('Swap successful!', {
        description: `Transaction: ${shortenAddress(txSignature, 8)}`,
        action: {
          label: 'View',
          onClick: () => window.open(getExplorerUrl(txSignature), '_blank'),
        },
      });

      // Reset form and refresh balance
      setInputAmount('');
      setQuote(null);
      setTimeout(() => refetchBalance(), 2000);
    } catch (err: any) {
      console.error('Swap error:', err);
      const errorMessage = err.message || 'Swap failed';
      setError(errorMessage);
      toast.error('Swap failed', {
        description: errorMessage,
      });
    } finally {
      setSwapping(false);
    }
  };

  const handleFund = () => {
    if (!address) return;
    fundWallet(address);
  };

  // Calculate expected output
  const expectedOutput = quote ? lamportsToSol(parseInt(quote.outAmount)).toFixed(6) : '0';
  const priceImpact = quote ? calculatePriceImpact(quote) : 0;
  const route = quote ? formatRoute(quote) : 'Direct';

  // Check if user needs to fund wallet
  const needsFunding = balance === 0;

  if (!hasWallet) {
    return (
      <Card className="w-full max-w-lg mx-auto">
        <CardHeader>
          <CardTitle>Connect Wallet</CardTitle>
          <CardDescription>Please connect your wallet to swap</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-lg mx-auto bg-gradient-card border-border">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ArrowDownUp className="h-5 w-5" />
          Swap SOL → TRAPANI
        </CardTitle>
        <CardDescription>
          <div className="flex items-center justify-between">
            <span>Wallet: {shortenAddress(address || '', 6)}</span>
            <span className="font-semibold">{balance?.toFixed(4) || '0.0000'} SOL</span>
          </div>
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Zero balance warning */}
        {needsFunding && (
          <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4 space-y-3">
            <div className="flex items-start gap-2">
              <AlertCircle className="h-5 w-5 text-yellow-500 flex-shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="text-sm font-medium">No SOL balance</p>
                <p className="text-xs text-muted-foreground">
                  You need SOL to swap. Fund your wallet to continue.
                </p>
              </div>
            </div>
            <Button onClick={handleFund} className="w-full" variant="outline">
              Fund with Card (MoonPay)
            </Button>
          </div>
        )}

        {/* Input Section */}
        <div className="space-y-2">
          <Label htmlFor="amount">Amount (SOL)</Label>
          <div className="relative">
            <Input
              id="amount"
              type="number"
              step="0.001"
              min={MIN_SOL_AMOUNT}
              placeholder={`Min ${MIN_SOL_AMOUNT} SOL`}
              value={inputAmount}
              onChange={(e) => setInputAmount(e.target.value)}
              className="pr-16 bg-muted border-border"
              disabled={swapping || needsFunding}
            />
            <Button
              size="sm"
              variant="ghost"
              onClick={handleMaxClick}
              className="absolute right-2 top-1/2 -translate-y-1/2 h-7 text-xs"
              disabled={swapping || needsFunding || !balance || balance === 0}
            >
              MAX
            </Button>
          </div>
        </div>

        {/* Quote Display */}
        {loadingQuote && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Fetching best route...
          </div>
        )}

        {quote && !loadingQuote && (
          <div className="bg-muted rounded-lg p-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Expected output:</span>
              <span className="font-semibold">{expectedOutput} TRAPANI</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Route:</span>
              <span className="text-xs">{route}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Price impact:</span>
              <span className={priceImpact > 1 ? 'text-yellow-500' : 'text-green-500'}>
                {priceImpact.toFixed(2)}%
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Slippage:</span>
              <span>{SLIPPAGE_BPS / 100}%</span>
            </div>
          </div>
        )}

        {/* Error Display */}
        {error && (
          <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-3 flex items-start gap-2">
            <AlertCircle className="h-4 w-4 text-destructive flex-shrink-0 mt-0.5" />
            <p className="text-sm text-destructive">{error}</p>
          </div>
        )}

        {/* Success Display */}
        {signature && (
          <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-3 space-y-2">
            <div className="flex items-start gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-500 flex-shrink-0 mt-0.5" />
              <p className="text-sm font-medium text-green-600 dark:text-green-400">Swap completed!</p>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={() => window.open(getExplorerUrl(signature), '_blank')}
              className="w-full"
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              View on Explorer
            </Button>
          </div>
        )}

        {/* Swap Button */}
        <Button
          onClick={handleSwap}
          disabled={!quote || swapping || loadingQuote || needsFunding || !inputAmount}
          className="w-full bg-gradient-accent hover:opacity-90 transition-opacity"
          size="lg"
        >
          {swapping ? (
            <>
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              Swapping...
            </>
          ) : loadingQuote ? (
            <>
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              Getting quote...
            </>
          ) : (
            'Swap Now'
          )}
        </Button>

        <p className="text-xs text-center text-muted-foreground">
          Powered by Jupiter • Non-custodial • Client-side only
        </p>
      </CardContent>
    </Card>
  );
}
