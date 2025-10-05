import { useEffect, useRef } from 'react';
import { useEmbeddedSolWallet } from '@/hooks/useEmbeddedSolWallet';

declare global {
  interface Window {
    Jupiter: any;
  }
}

interface JupiterTerminalProps {
  onClose?: () => void;
}

export function JupiterTerminal({ onClose }: JupiterTerminalProps) {
  const { address } = useEmbeddedSolWallet();
  const containerRef = useRef<HTMLDivElement>(null);
  const instanceRef = useRef<any>(null);

  useEffect(() => {
    if (!address || !containerRef.current) return;

    // Load Jupiter Terminal script
    const script = document.createElement('script');
    script.src = 'https://terminal.jup.ag/main-v3.js';
    script.async = true;
    
    script.onload = () => {
      if (window.Jupiter && containerRef.current) {
        // Initialize Jupiter Terminal
        instanceRef.current = window.Jupiter.init({
          displayMode: 'integrated',
          integratedTargetId: 'jupiter-terminal',
          endpoint: 'https://api.mainnet-beta.solana.com',
          defaultExplorer: 'Solscan',
          strictTokenList: false,
          formProps: {
            initialInputMint: 'So11111111111111111111111111111111111111112', // SOL
            initialOutputMint: 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263', // TRAPANI
          },
          containerStyles: {
            maxHeight: '90vh',
          },
        });
      }
    };

    document.head.appendChild(script);

    return () => {
      // Cleanup
      if (instanceRef.current?.close) {
        instanceRef.current.close();
      }
      if (script.parentNode) {
        script.parentNode.removeChild(script);
      }
    };
  }, [address]);

  return (
    <div className="w-full h-full min-h-[600px]">
      <div id="jupiter-terminal" ref={containerRef} />
    </div>
  );
}
