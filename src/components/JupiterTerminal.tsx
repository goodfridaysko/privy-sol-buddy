import { useEffect, useRef, useState } from 'react';
import { useWallets } from '@privy-io/react-auth/solana';
import { TRAPANI_MINT, SOL_MINT } from '@/config/swap';

declare global {
  interface Window {
    Jupiter: {
      init: (config: any) => void;
      resume: () => void;
      close: () => void;
      syncProps: (props: any) => void;
    };
  }
}

interface JupiterTerminalProps {
  onSuccess?: (signature: string) => void;
}

export function JupiterTerminal({ onSuccess }: JupiterTerminalProps) {
  const { wallets } = useWallets();
  const wallet = wallets?.[0];
  const [isLoaded, setIsLoaded] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Load Jupiter Terminal script
    const script = document.createElement('script');
    script.src = 'https://terminal.jup.ag/main-v2.js';
    script.async = true;
    script.onload = () => setIsLoaded(true);
    document.head.appendChild(script);

    return () => {
      document.head.removeChild(script);
    };
  }, []);

  useEffect(() => {
    if (!isLoaded || !containerRef.current || !wallet) return;

    console.log('🚀 Initializing Jupiter Terminal');

    // Initialize Jupiter Terminal
    window.Jupiter.init({
      displayMode: 'integrated',
      integratedTargetId: 'jupiter-terminal',
      endpoint: 'https://api.mainnet-beta.solana.com',
      formProps: {
        initialInputMint: SOL_MINT,
        initialOutputMint: TRAPANI_MINT,
        initialAmount: '0.01',
        fixedOutputMint: true,
      },
      enableWalletPassthrough: true,
      passthroughWalletContextState: {
        publicKey: wallet.address,
        connected: true,
        signTransaction: async (tx: any) => {
          console.log('Signing via Privy...');
          // This will be handled by Privy
          return tx;
        },
        signAllTransactions: async (txs: any[]) => {
          console.log('Signing multiple transactions via Privy...');
          return txs;
        }
      },
      onSuccess: ({ txid }: { txid: string }) => {
        console.log('✅ Swap successful:', txid);
        onSuccess?.(txid);
      },
      onSwapError: ({ error }: { error: any }) => {
        console.error('❌ Swap error:', error);
      },
    });

    return () => {
      if (window.Jupiter) {
        window.Jupiter.close();
      }
    };
  }, [isLoaded, wallet, onSuccess]);

  if (!wallet) {
    return (
      <div className="mx-6 my-4 p-6 text-center bg-card rounded-lg border border-border">
        <p className="text-muted-foreground">Please connect your wallet to swap</p>
      </div>
    );
  }

  return (
    <div className="mx-6 my-4">
      <div 
        id="jupiter-terminal" 
        ref={containerRef}
        className="w-full"
        style={{ minHeight: '400px' }}
      />
      {!isLoaded && (
        <div className="flex items-center justify-center p-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      )}
    </div>
  );
}
