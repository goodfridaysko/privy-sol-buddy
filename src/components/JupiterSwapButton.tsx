import { useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { useWallets } from '@privy-io/react-auth/solana';
import { TRAPANI_MINT, SOL_MINT } from '@/config/swap';
import { toast } from 'sonner';
import { PublicKey } from '@solana/web3.js';
import { Loader2 } from 'lucide-react';

declare global {
  interface Window {
    Jupiter: {
      init: (config: any) => void;
      resume: () => void;
      close: () => void;
    };
  }
}

export function JupiterSwapButton() {
  const { wallets } = useWallets();
  const solanaWallet = wallets[0];
  const scriptLoaded = useRef(false);
  const jupiterInitialized = useRef(false);

  useEffect(() => {
    if (scriptLoaded.current) return;

    const script = document.createElement('script');
    script.src = 'https://terminal.jup.ag/main-v2.js';
    script.async = true;
    script.onload = () => {
      console.log('[Jupiter Terminal] Script loaded successfully');
      scriptLoaded.current = true;
    };
    script.onerror = () => {
      console.error('[Jupiter Terminal] Failed to load script');
      toast.error('Failed to load swap interface');
    };
    document.head.appendChild(script);

    return () => {
      if (script.parentNode) {
        script.parentNode.removeChild(script);
      }
    };
  }, []);

  const handleSwap = async () => {
    if (!window.Jupiter || !solanaWallet) {
      toast.error('Swap interface not ready');
      return;
    }

    if (jupiterInitialized.current) {
      window.Jupiter.resume();
      return;
    }

    console.log('[Jupiter Terminal] Initializing...');

    try {
      // Create Privy-compatible wallet adapter
      const walletAdapter = {
        publicKey: new PublicKey(solanaWallet.address),
        signTransaction: async (transaction: any) => {
          console.log('[Jupiter Terminal] Signing transaction...');
          try {
            const result = await solanaWallet.signTransaction(transaction);
            console.log('[Jupiter Terminal] Transaction signed');
            return result;
          } catch (error) {
            console.error('[Jupiter Terminal] Signing failed:', error);
            throw error;
          }
        },
        signAllTransactions: async (transactions: any[]) => {
          console.log('[Jupiter Terminal] Signing multiple transactions...');
          try {
            const results = await Promise.all(
              transactions.map(tx => solanaWallet.signTransaction(tx))
            );
            console.log('[Jupiter Terminal] All transactions signed');
            return results;
          } catch (error) {
            console.error('[Jupiter Terminal] Multi-sign failed:', error);
            throw error;
          }
        },
      };

      window.Jupiter.init({
        displayMode: 'integrated',
        integratedTargetId: 'jupiter-terminal',
        endpoint: 'https://api.mainnet-beta.solana.com',
        
        formProps: {
          initialInputMint: SOL_MINT,
          initialOutputMint: TRAPANI_MINT,
          initialAmount: '10000000', // 0.01 SOL in lamports
        },
        
        passThroughWallet: walletAdapter,
        
        onSuccess: ({ txid }: { txid: string }) => {
          console.log('[Jupiter Terminal] Swap successful:', txid);
          toast.success('Swap completed!', {
            description: `Transaction: ${txid.slice(0, 8)}...`,
          });
        },
        
        onSwapError: ({ error }: { error: any }) => {
          console.error('[Jupiter Terminal] Swap error:', error);
          toast.error('Swap failed', {
            description: error?.message || 'Please try again',
          });
        },
      });

      jupiterInitialized.current = true;
      console.log('[Jupiter Terminal] Initialized successfully');
      
    } catch (error) {
      console.error('[Jupiter Terminal] Init error:', error);
      toast.error('Failed to initialize swap');
    }
  };

  return (
    <div className="space-y-3">
      <Button 
        onClick={handleSwap}
        disabled={!solanaWallet || !scriptLoaded.current}
        className="w-full"
        size="lg"
      >
        {!scriptLoaded.current ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Loading...
          </>
        ) : (
          'Open Jupiter Swap'
        )}
      </Button>
      <div id="jupiter-terminal" className="w-full min-h-[400px]" />
    </div>
  );
}
