import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { ArrowDownUp } from 'lucide-react';
import { useEmbeddedSolWallet } from '@/hooks/useEmbeddedSolWallet';
import { toast } from 'sonner';
import { TRAPANI_MINT, SOL_MINT } from '@/config/swap';
import { createJupiterWalletAdapter } from '@/lib/jupiterWalletAdapter';
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
      console.error('Jupiter Plugin script not loaded');
      return;
    }

    if (!wallet || !address) {
      toast.error('Wallet not connected');
      return;
    }

    console.log('🚀 Opening Jupiter Plugin with address:', address);

    try {
      // Create wallet adapter that bridges Privy wallet with Jupiter
      const walletAdapter = createJupiterWalletAdapter(wallet, address);
      
      console.log('🔗 Using Privy embedded wallet with Jupiter Plugin');
      
      window.Jupiter.init({
        displayMode: 'modal',
        endpoint: 'https://api.mainnet-beta.solana.com',
        enableWalletPassthrough: true,
        passthroughWalletContextState: walletAdapter,
        formProps: {
          initialInputMint: SOL_MINT,
          initialOutputMint: TRAPANI_MINT,
        },
        onSuccess: ({ txid }) => {
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
      console.log('✅ Jupiter Plugin opened');
    } catch (error) {
      console.error('Failed to open Jupiter Plugin:', error);
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
      {isPluginReady ? 'Swap SOL to $TRAPANI' : 'Loading swap...'}
    </Button>
  );
}
