import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowDownUp, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useEmbeddedSolWallet } from '@/hooks/useEmbeddedSolWallet';
import { VersionedTransaction } from '@solana/web3.js';
import trapaniIcon from '@/assets/trapani-coin.png';

const TOKEN_MINTS = {
  SOL: 'So11111111111111111111111111111111111111112',
  USDC: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
  USDT: 'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB',
  TRAPANI: 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263',
};

interface JupiterSwapFormProps {
  address: string;
  onSuccess?: () => void;
}

interface QuoteResponse {
  inputMint: string;
  inAmount: string;
  outputMint: string;
  outAmount: string;
  otherAmountThreshold: string;
  swapMode: string;
  slippageBps: number;
  priceImpactPct: string;
  routePlan: any[];
}

export function JupiterSwapForm({ address, onSuccess }: JupiterSwapFormProps) {
  const { wallet } = useEmbeddedSolWallet();
  const [fromToken, setFromToken] = useState(TOKEN_MINTS.SOL);
  const [toToken, setToToken] = useState(TOKEN_MINTS.TRAPANI);
  const [amount, setAmount] = useState('');
  const [swapping, setSwapping] = useState(false);
  const [quote, setQuote] = useState<QuoteResponse | null>(null);
  const [loadingQuote, setLoadingQuote] = useState(false);

  // Fetch quote when amount or tokens change
  useEffect(() => {
    const fetchQuote = async () => {
      if (!amount || fromToken === toToken) {
        setQuote(null);
        return;
      }

      const amountNum = parseFloat(amount);
      if (isNaN(amountNum) || amountNum <= 0) {
        setQuote(null);
        return;
      }

      setLoadingQuote(true);
      try {
        const amountInSmallestUnit = Math.floor(amountNum * 1e9);
        const response = await fetch(
          `https://quote-api.jup.ag/v6/quote?inputMint=${fromToken}&outputMint=${toToken}&amount=${amountInSmallestUnit}&slippageBps=50`
        );
        const data = await response.json();
        setQuote(data);
      } catch (error) {
        console.error('Quote fetch error:', error);
        setQuote(null);
      } finally {
        setLoadingQuote(false);
      }
    };

    const timeoutId = setTimeout(fetchQuote, 500);
    return () => clearTimeout(timeoutId);
  }, [amount, fromToken, toToken]);

  const handleSwap = async () => {
    if (!amount || !wallet || !quote) {
      toast.error('No swap route available');
      return;
    }

    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      toast.error('Invalid amount');
      return;
    }

    setSwapping(true);
    try {
      toast.info('Preparing swap transaction...');
      
      // Get swap transaction from Jupiter
      const swapResult = await fetch('https://quote-api.jup.ag/v6/swap', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          quoteResponse: quote,
          userPublicKey: address,
          wrapAndUnwrapSol: true,
        }),
      });

      const { swapTransaction } = await swapResult.json();
      
      // Deserialize transaction
      const swapTransactionBuf = Buffer.from(swapTransaction, 'base64');
      const transaction = VersionedTransaction.deserialize(swapTransactionBuf);

      toast.info('Please confirm transaction...');
      
      // Sign and send with Privy wallet
      const signature = await wallet.sendTransaction(transaction);

      toast.success('Swap completed!', {
        description: `Transaction: ${signature.slice(0, 8)}...${signature.slice(-8)}`,
      });

      setAmount('');
      onSuccess?.();
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

  const expectedOutput = quote
    ? (parseInt(quote.outAmount) / 1e9).toFixed(6)
    : '0';

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="from">From</Label>
        <div className="flex gap-2">
          <Select value={fromToken} onValueChange={setFromToken}>
            <SelectTrigger className="bg-muted border-border w-[140px]">
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
            className="bg-muted border-border flex-1"
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
        <Label htmlFor="to">To (estimated)</Label>
        <div className="flex gap-2">
          <Select value={toToken} onValueChange={setToToken}>
            <SelectTrigger className="bg-muted border-border w-[140px]">
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
            value={loadingQuote ? 'Loading...' : expectedOutput}
            readOnly
            className="bg-muted border-border flex-1"
          />
        </div>
      </div>

      <Button
        onClick={handleSwap}
        disabled={!amount || swapping || fromToken === toToken || loadingQuote || !quote}
        className="w-full bg-gradient-accent hover:opacity-90 transition-opacity"
      >
        {swapping ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Swapping...
          </>
        ) : loadingQuote ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Getting quote...
          </>
        ) : (
          'Swap'
        )}
      </Button>

      <p className="text-xs text-muted-foreground text-center">
        Powered by Jupiter • 0.5% slippage
      </p>
    </div>
  );
}
