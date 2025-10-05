import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { ArrowDownUp } from 'lucide-react';
import { useEmbeddedSolWallet } from '@/hooks/useEmbeddedSolWallet';
import { toast } from 'sonner';
import { TRAPANI_MINT, SOL_MINT } from '@/config/swap';
import { PublicKey } from '@solana/web3.js';
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
      // Create PublicKey with proper Wallet Adapter interface
      const publicKey = new PublicKey(address);
      
      // Create Solana Wallet Adapter compatible wallet object
      const walletAdapter = {
        publicKey,
        signTransaction: async (transaction: any) => {
          console.log('🖊️ Jupiter requesting transaction signature');
          try {
            const serialized = transaction.serialize({ requireAllSignatures: false });
            console.log('📝 Signing with Privy wallet:', wallet);
            await wallet.sendTransaction(serialized);
            return transaction;
          } catch (error) {
            console.error('❌ Sign error:', error);
            throw error;
          }
        },
        signAllTransactions: async (transactions: any[]) => {
          console.log('🖊️ Signing multiple transactions');
          return Promise.all(transactions.map(tx => walletAdapter.signTransaction(tx)));
        },
      };
      
      // Initialize Jupiter Plugin with proper wallet context
      window.Jupiter.init({
        displayMode: 'modal',
        endpoint: 'https://api.mainnet-beta.solana.com',
        formProps: {
          initialInputMint: SOL_MINT,
          initialOutputMint: TRAPANI_MINT,
          fixedInputMint: false,
          fixedOutputMint: false,
        },
        enableWalletPassthrough: true,
        passthroughWalletContextState: {
          wallet: {
            adapter: walletAdapter,
            publicKey: publicKey,
          },
          publicKey: publicKey,
          connected: true,
          connecting: false,
          disconnecting: false,
          select: () => {},
          connect: async () => {},
          disconnect: async () => {},
          signTransaction: walletAdapter.signTransaction,
          signAllTransactions: walletAdapter.signAllTransactions,
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
      {isPluginReady ? 'Swap SOL to $TRAPANI' : 'Loading swap...'}
    </Button>
  );
}
