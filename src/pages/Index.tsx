import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useEmbeddedSolWallet } from '@/hooks/useEmbeddedSolWallet';
import { useFund } from '@/hooks/useFund';
import { useBalance } from '@/hooks/useBalance';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { WalletHeader } from '@/components/wallet/WalletHeader';
import { WalletFooter } from '@/components/wallet/WalletFooter';
import { SendSolForm } from '@/components/SendSolForm';
import { JupiterSwapButton } from '@/components/JupiterSwapButton';
import { ReceiveModal } from '@/components/wallet/ReceiveModal';
import { MoonPayModal } from '@/components/MoonPayModal';
import { TrapaniChart } from '@/components/TrapaniChart';
import { TrapaniBalances } from '@/components/TrapaniBalances';
import { PrimaryCTAStack } from '@/components/PrimaryCTAStack';
import { StatusBar } from '@/components/StatusBar';
import { ActivityTab } from '@/components/wallet/ActivityTab';
import { Wallet, Loader2, Send, QrCode, Settings } from 'lucide-react';
import { toast } from 'sonner';
import trapaniCoin from '@/assets/trapani-coin.png';
import { MIN_SOL_AMOUNT } from '@/config/swap';

const Index = () => {
  const { login, logout, ready, authenticated, user } = useAuth();
  const { address, hasWallet, isLoading } = useEmbeddedSolWallet();
  const { fundWallet, showMoonPay, fundingAddress, closeFundingFlow } = useFund();
  const { data: balance = 0, refetch: refetchBalance } = useBalance(address);
  
  console.log('🎯 Index state:', {
    ready,
    authenticated,
    hasWallet,
    address,
    isLoading,
    user: user?.email?.address
  });
  
  const [sendOpen, setSendOpen] = useState(false);
  const [receiveOpen, setReceiveOpen] = useState(false);
  const [swapOpen, setSwapOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [walletCreated, setWalletCreated] = useState(false);

  // Detect when wallet is first created and show success message
  useEffect(() => {
    if (hasWallet && address && !walletCreated) {
      console.log('🎉 Wallet created successfully!');
      setWalletCreated(true);
      toast.success('Wallet created successfully!', {
        description: `Address: ${address.slice(0, 4)}...${address.slice(-4)}`
      });
    }
  }, [hasWallet, address, walletCreated]);

  const handleFund = () => {
    if (!address) return;
    fundWallet(address);
  };

  const handleRestart = async () => {
    try {
      // Clear all storage
      localStorage.clear();
      sessionStorage.clear();
      
      // Logout from Privy
      await logout();
      
      // Force reload to clear all cache
      window.location.reload();
    } catch (error) {
      console.error('Restart error:', error);
      window.location.reload();
    }
  };

  // Loading state
  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Not authenticated - show login
  if (!authenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <div className="w-full max-w-md space-y-8 text-center">
          <div className="space-y-4">
            <div className="flex justify-center">
              <div className="rounded-full bg-gradient-primary p-6 shadow-glow">
                <img src={trapaniCoin} alt="TRAPANI" className="h-16 w-16" />
              </div>
            </div>
            <h1 className="text-5xl font-bold">
              Buy and hold <span className="bg-gradient-primary bg-clip-text text-transparent">$TRAPANI</span>
            </h1>
            <p className="text-lg text-muted-foreground">
              Non-custodial wallet • You control your keys
            </p>
          </div>

          <Button
            onClick={login}
            size="lg"
            className="w-full h-14 text-base bg-gradient-primary hover:opacity-90 transition-opacity shadow-glow font-semibold"
          >
            Get Started
          </Button>

          <div className="space-y-3 text-sm text-muted-foreground pt-4">
            <p className="flex items-center justify-center gap-2">
              <span className="text-primary">✓</span> Email or SMS login - no passwords
            </p>
            <p className="flex items-center justify-center gap-2">
              <span className="text-primary">✓</span> Buy SOL with card via MoonPay
            </p>
            <p className="flex items-center justify-center gap-2">
              <span className="text-primary">✓</span> Swap SOL → $TRAPANI instantly
            </p>
          </div>

          <p className="text-xs text-muted-foreground pt-4">
            Powered by Privy • Not investment advice
          </p>
        </div>
      </div>
    );
  }

  // Authenticated but wallet still loading or not created
  if (authenticated && (isLoading || !hasWallet || !address)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <div className="text-center space-y-4">
          <div className="flex justify-center">
            <div className="rounded-full bg-gradient-primary p-4 shadow-glow">
              <Loader2 className="h-8 w-8 animate-spin text-primary-foreground" />
            </div>
          </div>
          <h2 className="text-xl font-semibold">
            {isLoading ? 'Loading wallet...' : 'Setting up your wallet...'}
          </h2>
          <p className="text-sm text-muted-foreground">
            Your Solana wallet is being created securely
          </p>
          <p className="text-xs text-muted-foreground mt-2">
            This may take a few moments...
          </p>
          <div className="pt-4 space-y-2 text-xs text-muted-foreground">
            <p>✓ Encrypted on your device</p>
            <p>✓ No seed phrases needed</p>
            <p>✓ Non-custodial & secure</p>
          </div>
        </div>
      </div>
    );
  }

  // Authenticated with wallet - TRAPANI redesigned UI
  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-lg pb-20">
        {/* Wallet Header */}
        <WalletHeader 
          address={address} 
          userEmail={user?.email?.address}
          onLogout={logout}
        />

        {/* Main Content */}
        <div className="px-4 space-y-4 mt-4">
          {/* TRAPANI Chart */}
          <TrapaniChart />

          {/* Primary CTA Stack */}
          <PrimaryCTAStack
            address={address}
            onBuySOL={handleFund}
            onSwap={() => setSwapOpen(true)}
          />

          {/* Balances Card */}
          <TrapaniBalances address={address} />

          {/* Status/Risk Bar */}
          <StatusBar />

          {/* Quick Actions */}
          <div className="grid grid-cols-3 gap-3 pt-2">
            <Button
              variant="outline"
              className="flex flex-col items-center gap-2 h-auto py-4"
              onClick={() => setSendOpen(true)}
            >
              <Send className="h-5 w-5" />
              <span className="text-xs">Send</span>
            </Button>
            <Button
              variant="outline"
              className="flex flex-col items-center gap-2 h-auto py-4"
              onClick={() => setReceiveOpen(true)}
            >
              <QrCode className="h-5 w-5" />
              <span className="text-xs">Receive</span>
            </Button>
            <Button
              variant="outline"
              className="flex flex-col items-center gap-2 h-auto py-4"
              onClick={() => setSettingsOpen(true)}
            >
              <Settings className="h-5 w-5" />
              <span className="text-xs">Settings</span>
            </Button>
          </div>

          {/* Activity Tab */}
          <div className="pt-4">
            <h3 className="text-lg font-semibold mb-3 px-2">Recent Activity</h3>
            <ActivityTab />
          </div>
        </div>

        {/* Swap Modal - Using Jupiter Terminal Widget */}
        <Dialog open={swapOpen} onOpenChange={setSwapOpen}>
          <DialogContent className="sm:max-w-md bg-gradient-card border-border">
            <DialogHeader>
              <DialogTitle>Swap SOL → $TRAPANI</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Using Jupiter DEX aggregator for best prices
              </p>
              <JupiterSwapButton />
              <p className="text-xs text-muted-foreground text-center">
                Jupiter automatically finds the best swap route
              </p>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={sendOpen} onOpenChange={setSendOpen}>
          <DialogContent className="sm:max-w-md bg-gradient-card border-border">
            <DialogHeader>
              <DialogTitle>Send SOL</DialogTitle>
            </DialogHeader>
            <SendSolForm onSuccess={() => setSendOpen(false)} />
          </DialogContent>
        </Dialog>

        <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
          <DialogContent className="sm:max-w-md bg-gradient-card border-border">
            <DialogHeader>
              <DialogTitle>Settings</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Logged in as</p>
                <p className="font-medium">{user?.email?.address || 'Unknown'}</p>
              </div>
              <div className="pt-4 border-t border-border">
                <p className="text-sm text-muted-foreground mb-1">Network</p>
                <p className="font-medium">Solana Mainnet</p>
              </div>
              <div className="pt-4 border-t border-border space-y-2">
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => {
                    setSettingsOpen(false);
                    logout();
                  }}
                >
                  Sign Out
                </Button>
                <Button
                  variant="outline"
                  className="w-full text-destructive hover:text-destructive"
                  onClick={handleRestart}
                >
                  Reset Wallet
                </Button>
              </div>
              <div className="pt-4 border-t border-border text-xs text-muted-foreground space-y-1">
                <p>• Non-custodial wallet</p>
                <p>• You control your private keys</p>
                <p>• Not investment advice</p>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        <ReceiveModal
          open={receiveOpen} 
          onOpenChange={setReceiveOpen}
          address={address}
        />

        <MoonPayModal
          open={showMoonPay}
          onOpenChange={(open) => {
            closeFundingFlow();
            // Prompt swap after successful MoonPay purchase
            if (!open && balance >= MIN_SOL_AMOUNT) {
              setTimeout(() => {
                toast.success('SOL received!', {
                  description: 'Ready to swap to $TRAPANI?',
                  action: {
                    label: 'Swap Now',
                    onClick: () => setSwapOpen(true)
                  },
                  duration: 10000
                });
              }, 1000);
            }
          }}
          walletAddress={fundingAddress}
          onDepositComplete={() => {
            console.log('💰 Deposit completed, refreshing balance...');
            refetchBalance();
          }}
        />

        {/* Footer */}
        <WalletFooter onRestart={handleRestart} />
      </div>
    </div>
  );
};

export default Index;
