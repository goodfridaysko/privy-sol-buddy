import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { ArrowDown, Loader2 } from 'lucide-react';
import { TRAPANI_MINT, SLIPPAGE_PERCENT, PRIORITY_FEE, MIN_SOL_AMOUNT } from '@/config/swap';
import { useBalance } from '@/hooks/useBalance';
import { usePrices } from '@/hooks/usePrices';
import { buyTokenWithSOL } from '@/lib/pumpPortal';
import { toast } from 'sonner';
import { usePrivy } from '@privy-io/react-auth';
import { useWallets } from '@privy-io/react-auth/solana';
import { Connection, VersionedTransaction } from '@solana/web3.js';

interface SwapPanelProps {
  onSwapResult?: (result: { signature: string; inAmount: number }) => void;
}

export function SwapPanel({ onSwapResult }: SwapPanelProps) {
  const { ready, authenticated } = usePrivy();
  const { wallets } = useWallets();
  
  // Get first Solana wallet (embedded wallet)
  const solanaWallet = wallets[0];
  const address = solanaWallet?.address;
  
  // Create Solana connection
  const connection = new Connection('https://api.mainnet-beta.solana.com', 'confirmed');
  
  const { data: balance = 0, refetch: refetchBalance } = useBalance(address);
  const { sol: solPrice, trapani: trapaniPrice } = usePrices();
  
  const [inputAmount, setInputAmount] = useState('0.01');
  const [isSwapping, setIsSwapping] = useState(false);

  console.log('[SwapPanel] Wallet state:', {
    ready,
    authenticated,
    hasWallet: !!solanaWallet,
    address,
    walletsCount: wallets.length
  });

  const handleSwap = async () => {
    if (!ready || !authenticated) {
      toast.error('Please wait for wallet to be ready');
      console.error('[SwapPanel] Wallet not ready:', { ready, authenticated });
      return;
    }

    if (!address || !solanaWallet || !inputAmount) {
      toast.error('Missing wallet or amount');
      console.error('[SwapPanel] Missing data:', { address, hasWallet: !!solanaWallet, inputAmount });
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

      // Get transaction bytes from PumpPortal
      const txBytes = await buyTokenWithSOL(
        address,
        TRAPANI_MINT,
        amountSOL,
        SLIPPAGE_PERCENT,
        PRIORITY_FEE
      );

      console.log('[SwapPanel] Transaction bytes received:', {
        length: txBytes.length,
        first20Bytes: Array.from(txBytes.slice(0, 20)),
        type: typeof txBytes,
        isUint8Array: txBytes instanceof Uint8Array
      });

      toast.info('Please approve in Privy wallet...');
      console.log('[SwapPanel] Calling Privy signTransaction with raw bytes...');

      // Try signing with raw bytes directly
      try {
        const signResult = await solanaWallet.signTransaction({
          transaction: txBytes
        });

        console.log('[SwapPanel] Sign result:', signResult);
        console.log('[SwapPanel] Signed transaction type:', typeof signResult.signedTransaction);
        console.log('[SwapPanel] Signed transaction length:', signResult.signedTransaction.length);
        
        // Send the signed transaction
        const signature = await connection.sendRawTransaction(
          signResult.signedTransaction,
          {
            skipPreflight: false,
            maxRetries: 3,
          }
        );

        console.log('[SwapPanel] Transaction sent:', signature);
        toast.info('Confirming transaction...');

        // Wait for confirmation
        await connection.confirmTransaction(signature, 'confirmed');

        toast.success('Swap successful!');
        console.log('[SwapPanel] Transaction confirmed:', signature);

        if (onSwapResult) {
          onSwapResult({
            signature,
            inAmount: amountSOL,
          });
        }

        setInputAmount('');
        refetchBalance();
      } catch (signError: any) {
        console.error('[SwapPanel] Privy sign error:', signError);
        console.error('[SwapPanel] Error details:', {
          message: signError.message,
          stack: signError.stack,
          name: signError.name,
          code: signError.code
        });
        throw signError;
      }
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
        disabled={isSwapping || !ready || !authenticated || !address || !inputAmount || parseFloat(inputAmount) <= 0}
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
