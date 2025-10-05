import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { ArrowDownUp } from 'lucide-react';
import { useEmbeddedSolWallet } from '@/hooks/useEmbeddedSolWallet';
import { toast } from 'sonner';
import { TRAPANI_MINT, SOL_MINT } from '@/config/swap';
import '@/types/jupiter-plugin.d';

interface JupiterSwapButtonProps {
  address: string;
}

export function JupiterSwapButton({ address }: JupiterSwapButtonProps) {
  const [isPluginReady, setIsPluginReady] = useState(false);
  const { wallet } = useEmbeddedSolWallet();
  const pluginInitialized = useRef(false);

  useEffect(() => {
    // Wait for Jupiter plugin to load
    const checkPlugin = setInterval(() => {
      if (window.Jupiter && !pluginInitialized.current) {
        setIsPluginReady(true);
        clearInterval(checkPlugin);
      }
    }, 100);

    return () => clearInterval(checkPlugin);
  }, []);

  const openSwap = () => {
    if (!window.Jupiter) {
      toast.error('Jupiter Plugin not loaded');
      console.error('Jupiter Plugin script not loaded. Make sure the script tag is in index.html');
      return;
    }

    if (!wallet || !address) {
      toast.error('Wallet not connected');
      return;
    }

    console.log('🚀 Initializing Jupiter Plugin with wallet:', address);

    try {
      // Initialize Jupiter Plugin with Privy wallet passthrough
      window.Jupiter.init({
        displayMode: 'modal',
        endpoint: 'https://api.mainnet-beta.solana.com',
        formProps: {
          initialInputMint: SOL_MINT,
          initialOutputMint: TRAPANI_MINT,
        },
        enableWalletPassthrough: true,
        passthroughWalletContextState: {
          wallet: {
            adapter: {
              publicKey: { toBase58: () => address },
              signTransaction: async (tx: any) => {
                console.log('🖊️ Signing transaction via Privy wallet');
                return wallet.sendTransaction(tx);
              },
              signAllTransactions: async (txs: any[]) => {
                console.log('🖊️ Signing multiple transactions via Privy wallet');
                return Promise.all(txs.map(tx => wallet.sendTransaction(tx)));
              },
            },
            publicKey: { toBase58: () => address },
          },
          connected: true,
          connecting: false,
          disconnecting: false,
          select: () => {},
          connect: async () => {},
          disconnect: async () => {},
        },
        onSuccess: ({ txid, swapResult }) => {
          console.log('✅ Swap successful:', txid);
          toast.success('Swap successful!', {
            description: `Transaction: ${txid.slice(0, 8)}...${txid.slice(-8)}`,
            action: {
              label: 'View',
              onClick: () => window.open(`https://solscan.io/tx/${txid}`, '_blank'),
            },
          });
        },
        onSwapError: ({ error }) => {
          console.error('❌ Swap error:', error);
          toast.error('Swap failed', {
            description: error?.message || 'Unknown error',
          });
        },
      });

      pluginInitialized.current = true;
      console.log('✅ Jupiter Plugin initialized');
    } catch (error) {
      console.error('Failed to initialize Jupiter Plugin:', error);
      toast.error('Failed to open swap interface');
    }
  };

  return (
    <Button
      onClick={openSwap}
      disabled={!isPluginReady}
      variant="outline"
      className="w-full h-12 border-border bg-card hover:bg-accent"
    >
      <ArrowDownUp className="mr-2 h-5 w-5" />
      {isPluginReady ? 'Swap Solana do $TRAPANI' : 'Loading swap...'}
    </Button>
  );
}
