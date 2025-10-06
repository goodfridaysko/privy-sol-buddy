import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { ArrowDown, Loader2 } from 'lucide-react';
import { TRAPANI_MINT, SLIPPAGE_PERCENT, PRIORITY_FEE, MIN_SOL_AMOUNT } from '@/config/swap';
import { useBalance } from '@/hooks/useBalance';
import { usePrices } from '@/hooks/usePrices';
import { toast } from 'sonner';
import { usePrivy } from '@privy-io/react-auth';
import { VersionedTransaction } from '@solana/web3.js';
import { useEmbeddedSolWallet } from '@/hooks/useEmbeddedSolWallet';
import { supabase } from '@/integrations/supabase/client';
import bs58 from 'bs58';

interface SwapPanelProps {
  onSwapResult?: (result: { signature: string; inAmount: number }) => void;
}

export function SwapPanel({ onSwapResult }: SwapPanelProps) {
  const { user } = usePrivy();
  const { address, ready: walletReady } = useEmbeddedSolWallet();
  
  const { data: balance = 0, refetch: refetchBalance } = useBalance(address);
  const { sol: solPrice, trapani: trapaniPrice } = usePrices();
  
  const [inputAmount, setInputAmount] = useState('0.01');
  const [isSwapping, setIsSwapping] = useState(false);

  // Get embedded Solana wallet for signing - it's in linkedAccounts as solana_wallet type
  const embeddedWallet = user?.linkedAccounts?.find(
    (account: any) => account.type === 'wallet' && account.walletClientType === 'privy' && account.chainType === 'solana'
  );

  console.log('[SwapPanel] Wallet state:', {
    walletReady,
    hasAddress: !!address,
    address,
    hasEmbeddedWallet: !!embeddedWallet,
    linkedAccounts: user?.linkedAccounts?.map((a: any) => ({ type: a.type, chainType: a.chainType, walletClientType: a.walletClientType }))
  });

  const handleSwap = async () => {
    if (!walletReady || !address) {
      toast.error('Wallet not ready');
      console.error('[SwapPanel] Wallet not ready:', { walletReady, address });
      return;
    }

    if (!embeddedWallet) {
      toast.error('Embedded wallet not found');
      console.error('[SwapPanel] No embedded wallet for signing');
      return;
    }

    if (!inputAmount) {
      toast.error('Please enter an amount');
      return;
    }

    const amountSOL = parseFloat(inputAmount);
    
    if (amountSOL < MIN_SOL_AMOUNT) {
      toast.error(`Minimum swap amount is ${MIN_SOL_AMOUNT} SOL`);
      return;
    }

    if (amountSOL > balance) {
      toast.error('Insufficient SOL balance');
      return;
    }

    setIsSwapping(true);

    try {
      console.log('[SwapPanel] Starting PumpPortal swap...');
      console.log('[SwapPanel] Request params:', {
        publicKey: address,
        action: 'buy',
        mint: TRAPANI_MINT,
        amount: amountSOL,
        denominatedInSol: 'true',
        slippage: SLIPPAGE_PERCENT,
        priorityFee: PRIORITY_FEE,
        pool: 'auto'
      });
      
      toast.info('Building swap transaction...');

      // Get serialized transaction from PumpPortal
      const response = await fetch('https://pumpportal.fun/api/trade-local', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          publicKey: address,
          action: 'buy',
          mint: TRAPANI_MINT,
          amount: amountSOL,
          denominatedInSol: 'true',
          slippage: SLIPPAGE_PERCENT,
          priorityFee: PRIORITY_FEE,
          pool: 'auto'
        }),
      });

      if (!response.ok) {
        throw new Error(`PumpPortal API failed: ${response.status}`);
      }

      const txData = await response.arrayBuffer();
      const transaction = VersionedTransaction.deserialize(new Uint8Array(txData));
      
      console.log('[SwapPanel] Transaction received:', {
        version: transaction.version,
      });

      toast.info('Please sign transaction...');
      
      // Sign the transaction using Privy's embedded wallet
      // @ts-ignore - Privy wallet has signTransaction method
      const signedTx = await embeddedWallet.signTransaction(transaction);
      
      console.log('[SwapPanel] Transaction signed, sending via backend...');
      toast.info('Sending transaction...');
      
      // Send the fully signed transaction via backend
      const { data: result, error: sendError } = await supabase.functions.invoke(
        'send-solana-transaction',
        {
          body: {
            signedTransaction: bs58.encode(signedTx.serialize())
          }
        }
      );

      if (sendError) {
        throw new Error(sendError.message || 'Failed to send transaction');
      }

      const signature = result.signature;
      console.log('[SwapPanel] Transaction sent:', signature);

      toast.success('Swap successful!');
      console.log('[SwapPanel] Transaction completed:', signature);

      if (onSwapResult) {
        onSwapResult({
          signature,
          inAmount: amountSOL,
        });
      }

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
        toast.error('Insufficient SOL for swap + fees');
      } else {
        toast.error(error.message || 'Swap failed - check console for details');
      }
    } finally {
      setIsSwapping(false);
    }
  };

  // Calculate USD values
  const inputUsdValue = parseFloat(inputAmount || '0') * solPrice;

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
            onClick={() => setInputAmount((balance - 0.005).toString())}
            disabled={balance === 0}
          >
            MAX
          </Button>
        </div>
        <div className="flex justify-between text-xs">
          <span className="text-muted-foreground">SOL</span>
          {inputAmount && (
            <span className="text-muted-foreground">≈ ${inputUsdValue.toFixed(2)}</span>
          )}
        </div>
      </div>

      <div className="flex justify-center">
        <ArrowDown className="h-5 w-5 text-muted-foreground" />
      </div>

      {/* Output */}
      <div className="space-y-2">
        <label className="text-sm font-medium">You receive</label>
        <div className="p-3 rounded-lg bg-muted/30">
          <p className="text-lg font-semibold text-muted-foreground">TRAPANI</p>
          <p className="text-xs text-muted-foreground mt-1">Amount determined by market price</p>
        </div>
      </div>

      {/* Swap details */}
      <div className="p-3 rounded-lg bg-muted/20 space-y-1 text-xs">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Slippage</span>
          <span>{SLIPPAGE_PERCENT}%</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Priority Fee</span>
          <span>{PRIORITY_FEE} SOL</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Router</span>
          <span>PumpPortal (Auto)</span>
        </div>
      </div>

      {/* Swap button */}
      <Button
        onClick={handleSwap}
        disabled={isSwapping || !walletReady || !embeddedWallet || !inputAmount || parseFloat(inputAmount) <= 0}
        className="w-full"
      >
        {isSwapping ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Swapping...
          </>
        ) : (
          'Swap Now'
        )}
      </Button>
    </Card>
  );
}
