import { useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { useWallets } from '@privy-io/react-auth/solana';
import { TRAPANI_MINT, SOL_MINT } from '@/config/swap';
import { toast } from 'sonner';
import { PublicKey } from '@solana/web3.js';

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

  useEffect(() => {
    if (scriptLoaded.current) return;

    // Load Jupiter Terminal script
    const script = document.createElement('script');
    script.src = 'https://terminal.jup.ag/main-v2.js';
    script.async = true;
    script.onload = () => {
      console.log('[Jupiter Terminal] Script loaded');
      scriptLoaded.current = true;
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
      toast.error('Please wait, loading swap interface...');
      return;
    }

    console.log('[Jupiter Terminal] Opening swap widget');
    console.log('[Jupiter Terminal] Using Privy wallet:', solanaWallet.address);

    try {
      // Create a wallet adapter compatible object from Privy wallet
      const walletAdapter = {
        publicKey: new PublicKey(solanaWallet.address),
        signTransaction: async (transaction: any) => {
          const result = await solanaWallet.signTransaction({ transaction });
          return result.signedTransaction;
        },
        signAllTransactions: async (transactions: any[]) => {
          const results = await Promise.all(
            transactions.map(tx => solanaWallet.signTransaction({ transaction: tx }))
          );
          return results.map(r => r.signedTransaction);
        },
        signMessage: async (message: Uint8Array) => {
          const result = await solanaWallet.signMessage({ message });
          return result.signature;
        },
      };

      // Initialize Jupiter Terminal with the wallet adapter
      window.Jupiter.init({
        displayMode: 'modal',
        integratedTargetId: 'integrated-terminal',
        endpoint: 'https://api.mainnet-beta.solana.com',
        
        // Pre-configure the swap
        formProps: {
          initialInputMint: SOL_MINT,
          initialOutputMint: TRAPANI_MINT,
          initialAmount: '10000000', // 0.01 SOL
        },
        
        // Pass the wallet adapter
        wallet: walletAdapter,
        
        // Callbacks
        onSuccess: ({ txid }: { txid: string }) => {
          console.log('[Jupiter Terminal] Swap successful:', txid);
          toast.success('Swap successful!', {
            description: `Transaction: ${txid.slice(0, 8)}...`
          });
        },
        onSwapError: ({ error }: { error: any }) => {
          console.error('[Jupiter Terminal] Swap error:', error);
          toast.error('Swap failed', {
            description: error?.message || 'Please try again'
          });
        },
      });
    } catch (error) {
      console.error('[Jupiter Terminal] Init error:', error);
      toast.error('Failed to open swap interface');
    }
  };

  return (
    <div className="mx-6 mb-4">
      <Button 
        onClick={handleSwap}
        disabled={!solanaWallet || !scriptLoaded.current}
        className="w-full"
        size="lg"
      >
        {!scriptLoaded.current ? 'Loading...' : 'Swap SOL → TRAPANI'}
      </Button>
      <div id="integrated-terminal"></div>
    </div>
  );
}
