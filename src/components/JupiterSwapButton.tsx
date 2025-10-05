import { useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { useWallets } from '@privy-io/react-auth/solana';
import { TRAPANI_MINT, SOL_MINT } from '@/config/swap';

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

  const handleSwap = () => {
    if (!window.Jupiter || !solanaWallet) {
      console.error('[Jupiter Terminal] Not ready');
      return;
    }

    console.log('[Jupiter Terminal] Opening swap widget for wallet:', solanaWallet.address);

    window.Jupiter.init({
      displayMode: 'modal',
      integratedTargetId: 'integrated-terminal',
      endpoint: 'https://api.mainnet-beta.solana.com',
      platformFeeAndAccounts: undefined,
      strictTokenList: false,
      defaultExplorer: 'Solscan',
      formProps: {
        initialInputMint: SOL_MINT,
        initialOutputMint: TRAPANI_MINT,
        initialAmount: '10000000', // 0.01 SOL in lamports
      },
      onSuccess: ({ txid }: { txid: string }) => {
        console.log('[Jupiter Terminal] Swap successful:', txid);
      },
      onSwapError: ({ error }: { error: any }) => {
        console.error('[Jupiter Terminal] Swap error:', error);
      },
    });

    // Trigger the wallet connection with Privy wallet
    window.Jupiter.resume();
  };

  return (
    <div className="mx-6 mb-4">
      <Button 
        onClick={handleSwap}
        disabled={!solanaWallet || !scriptLoaded.current}
        className="w-full"
        size="lg"
      >
        Swap SOL → TRAPANI
      </Button>
      <div id="integrated-terminal"></div>
    </div>
  );
}
