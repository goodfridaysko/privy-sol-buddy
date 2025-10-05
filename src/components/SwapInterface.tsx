import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ArrowDownUp, Loader2 } from 'lucide-react';
import { useEmbeddedSolWallet } from '@/hooks/useEmbeddedSolWallet';
import { toast } from 'sonner';
import { TRAPANI_MINT, SOL_MINT } from '@/config/swap';
import { Connection, VersionedTransaction } from '@solana/web3.js';
import { supabase } from '@/integrations/supabase/client';

interface SwapInterfaceProps {
  address: string;
}

export function SwapInterface({ address }: SwapInterfaceProps) {
  const [amount, setAmount] = useState('0.01');
  const [isSwapping, setIsSwapping] = useState(false);
  const [isFetchingQuote, setIsFetchingQuote] = useState(false);
  const [quote, setQuote] = useState<any>(null);
  const { wallet } = useEmbeddedSolWallet();

  // Fetch quote when amount changes
  useEffect(() => {
    if (!amount || parseFloat(amount) <= 0) {
      setQuote(null);
      return;
    }

    const fetchQuote = async () => {
      setIsFetchingQuote(true);
      try {
        const lamports = Math.floor(parseFloat(amount) * 1e9);
        
        const { data, error } = await supabase.functions.invoke('jupiter-quote', {
          body: {
            inputMint: SOL_MINT,
            outputMint: TRAPANI_MINT,
            amount: lamports,
            slippageBps: 50,
          },
        });

        if (error) throw error;
        
        console.log('📊 Quote received:', data);
        setQuote(data);
      } catch (error) {
        console.error('Failed to fetch quote:', error);
        setQuote(null);
      } finally {
        setIsFetchingQuote(false);
      }
    };

    const timeoutId = setTimeout(fetchQuote, 500);
    return () => clearTimeout(timeoutId);
  }, [amount]);

  const handleSwap = async () => {
    if (!wallet || !quote) {
      toast.error('Wallet not connected or quote not available');
      return;
    }

    setIsSwapping(true);

    try {
      console.log('🔄 Starting swap...', { amount, quote });

      // Get swap transaction from Jupiter via edge function
      const { data: swapData, error: swapError } = await supabase.functions.invoke('jupiter-swap', {
        body: {
          quoteResponse: quote,
          userPublicKey: address,
        },
      });

      if (swapError) throw swapError;

      const { swapTransaction } = swapData;

      // Deserialize transaction
      const swapTransactionBuf = Buffer.from(swapTransaction, 'base64');
      const transaction = VersionedTransaction.deserialize(swapTransactionBuf);

      console.log('📝 Transaction prepared, signing and sending...');

      // Create connection
      const connection = new Connection('https://api.mainnet-beta.solana.com');

      // Send transaction via Privy wallet
      const signature = await wallet.sendTransaction(transaction, connection);

      console.log('✅ Transaction sent:', signature);

      // Wait for confirmation
      toast.loading('Confirming transaction...', { id: 'swap' });

      const confirmation = await connection.confirmTransaction(signature, 'confirmed');

      if (confirmation.value.err) {
        throw new Error('Transaction failed');
      }

      toast.success('Swap successful!', {
        id: 'swap',
        description: `Swapped ${amount} SOL to $TRAPANI`,
        action: {
          label: 'View',
          onClick: () => window.open(`https://solscan.io/tx/${signature}`, '_blank'),
        },
      });

      // Reset form
      setAmount('0.01');
      setQuote(null);
    } catch (error: any) {
      console.error('❌ Swap failed:', error);
      toast.error('Swap failed', {
        id: 'swap',
        description: error?.message || 'Unknown error occurred',
      });
    } finally {
      setIsSwapping(false);
    }
  };

  const outputAmount = quote 
    ? (parseInt(quote.outAmount) / 1e5).toLocaleString('en-US', { maximumFractionDigits: 0 })
    : '0';

  return (
    <div className="p-6 space-y-4 bg-card rounded-lg border border-border">
      <h3 className="text-lg font-semibold">Swap SOL to $TRAPANI</h3>
      
      <div className="space-y-4">
        {/* Input */}
        <div className="space-y-2">
          <label className="text-sm text-muted-foreground">You pay</label>
          <div className="flex items-center gap-2">
            <Input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              step="0.01"
              min="0"
              className="flex-1"
            />
            <span className="text-sm font-medium">SOL</span>
          </div>
        </div>

        {/* Swap Icon */}
        <div className="flex justify-center">
          <div className="p-2 rounded-full bg-accent">
            {isFetchingQuote ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <ArrowDownUp className="h-4 w-4" />
            )}
          </div>
        </div>

        {/* Output */}
        <div className="space-y-2">
          <label className="text-sm text-muted-foreground">You receive (estimated)</label>
          <div className="flex items-center gap-2">
            <Input
              type="text"
              value={outputAmount}
              readOnly
              placeholder="0"
              className="flex-1"
            />
            <span className="text-sm font-medium">$TRAPANI</span>
          </div>
        </div>

        {/* Swap Button */}
        <Button
          onClick={handleSwap}
          disabled={!wallet || !quote || isSwapping || parseFloat(amount) <= 0 || isFetchingQuote}
          className="w-full h-12"
        >
          {isSwapping ? (
            <>
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              Swapping...
            </>
          ) : (
            'Swap'
          )}
        </Button>

        {quote && (
          <p className="text-xs text-center text-muted-foreground">
            Rate: 1 SOL ≈ {(parseInt(quote.outAmount) / parseInt(quote.inAmount) * 1e4).toLocaleString('en-US', { maximumFractionDigits: 0 })} $TRAPANI
          </p>
        )}
      </div>
    </div>
  );
}
