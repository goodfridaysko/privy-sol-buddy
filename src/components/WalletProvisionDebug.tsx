import { useEffect, useState } from "react";
import { usePrivy } from "@privy-io/react-auth";
import { useWallets } from "@privy-io/react-auth";

export function WalletProvisionDebug() {
  const { authenticated, user, ready } = usePrivy();
  const { wallets, ready: walletsReady } = useWallets();
  const [log, setLog] = useState<string[]>([]);

  function add(msg: string) { 
    setLog((l) => [...l, `[${new Date().toISOString().split('T')[1].split('.')[0]}] ${msg}`]); 
  }

  useEffect(() => {
    (async () => {
      try {
        add(`🌐 location=${location.origin}`);
        add(`🔒 protocol=${location.protocol}`);
        
        if (location.protocol !== "https:" && location.hostname !== "localhost") {
          add("⚠️  WARNING: not HTTPS (WebCrypto may fail)");
        }

        add(`✓ Privy ready=${ready}`);
        add(`✓ Wallets ready=${walletsReady}`);
        add(`👤 authenticated=${authenticated}`);
        add(`📧 user exists=${!!user}`);
        
        if (user?.email) {
          add(`📬 user email=${user.email.address}`);
        }

        if (!authenticated || !user) {
          add("⏳ Waiting for authentication...");
          return;
        }

        add(`💼 Total wallets: ${wallets?.length || 0}`);
        
        wallets.forEach((wallet, idx) => {
          add(`  [${idx}] type=${wallet.walletClientType}, address=${wallet.address?.slice(0, 8)}...`);
        });

        const solanaWallet = wallets.find(
          (w) => w.walletClientType === 'privy'
        );

        if (solanaWallet) {
          add(`✅ Solana wallet found: ${solanaWallet.address}`);
        } else {
          add("❌ No embedded Solana wallet found");
          add("💡 Wallet should auto-create on login");
        }

      } catch (e: any) {
        add(`❌ ERROR: ${e?.message || String(e)}`);
        console.error("WalletProvisionDebug error:", e);
      }
    })();
  }, [authenticated, user, ready, walletsReady, wallets]);

  if (log.length === 0) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 w-96 max-h-60 overflow-auto bg-black/90 text-green-400 p-3 rounded-lg font-mono text-xs border border-green-500/30 shadow-lg z-50">
      <div className="flex items-center justify-between mb-2">
        <span className="font-bold text-green-300">Wallet Debug Log</span>
        <button
          onClick={() => setLog([])}
          className="text-red-400 hover:text-red-300 text-xs"
        >
          Clear
        </button>
      </div>
      <pre className="whitespace-pre-wrap">
        {log.join("\n")}
      </pre>
    </div>
  );
}
