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
import { ActionButtons } from '@/components/wallet/ActionButtons';
import { TokenList } from '@/components/wallet/TokenList';
import { ActivityTab } from '@/components/wallet/ActivityTab';
import { SendSolForm } from '@/components/SendSolForm';
import { JupiterSwapButton } from '@/components/JupiterSwapButton';
import { ReceiveModal } from '@/components/wallet/ReceiveModal';
import { MoonPayModal } from '@/components/MoonPayModal';
import { Wallet, Loader2, Image, CreditCard } from 'lucide-react';
import { toast } from 'sonner';

const Index = () => {
  const { login, logout, ready, authenticated, user } = useAuth();
  const { address, hasWallet, isLoading } = useEmbeddedSolWallet();
  const { fundWallet, showMoonPay, fundingAddress, closeFundingFlow } = useFund();
  const { refetch: refetchBalance } = useBalance(address);
  
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
              <div className="rounded-full bg-gradient-primary p-4 shadow-glow">
                <Wallet className="h-12 w-12 text-primary-foreground" />
              </div>
            </div>
            <h1 className="text-4xl font-bold bg-gradient-primary bg-clip-text text-transparent">
              Solana Wallet
            </h1>
            <p className="text-muted-foreground">
              Secure, self-custodial wallet powered by Privy
            </p>
          </div>

          <Button
            onClick={login}
            size="lg"
            className="w-full bg-gradient-primary hover:opacity-90 transition-opacity shadow-glow"
          >
            Login / Sign Up
          </Button>

          <div className="space-y-2 text-sm text-muted-foreground">
            <p>✓ Email, SMS, or passkey login</p>
            <p>✓ No seed phrases to manage</p>
            <p>✓ Auto-generated embedded wallet</p>
          </div>
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

  // Authenticated with wallet - Phantom-like UI
  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-lg">
        {/* Wallet Header */}
        <WalletHeader 
          address={address} 
          userEmail={user?.email?.address}
          onLogout={logout}
        />

        {/* Prominent Buy Button */}
        <div className="px-6 py-4 space-y-3">
          <Button 
            onClick={handleFund}
            size="lg"
            className="w-full bg-gradient-primary hover:opacity-90 transition-opacity shadow-glow text-lg font-semibold h-14"
          >
            <CreditCard className="mr-2 h-6 w-6" />
            Buy Crypto with Card
          </Button>
          <JupiterSwapButton address={address} />
          <p className="text-xs text-center text-muted-foreground">
            Powered by MoonPay & Jupiter • Test Mode Active
          </p>
        </div>

        {/* Action Buttons */}
        <ActionButtons
          onBuy={handleFund}
          onSend={() => setSendOpen(true)}
          onReceive={() => setReceiveOpen(true)}
          onSwap={() => {}}
        />

        {/* Tabs */}
        <Tabs defaultValue="tokens" className="mt-4">
          <TabsList className="w-full grid grid-cols-3 mx-6" style={{ width: 'calc(100% - 3rem)' }}>
            <TabsTrigger value="tokens">Tokens</TabsTrigger>
            <TabsTrigger value="nfts">NFTs</TabsTrigger>
            <TabsTrigger value="activity">Activity</TabsTrigger>
          </TabsList>
          
          <TabsContent value="tokens" className="mt-4">
            <TokenList address={address} />
          </TabsContent>
          
          <TabsContent value="nfts" className="mt-4">
            <div className="px-6 py-12 text-center">
              <Image className="h-12 w-12 mx-auto mb-3 text-muted-foreground" />
              <p className="text-muted-foreground mb-1">No NFTs yet</p>
              <p className="text-sm text-muted-foreground">
                Your collectibles will appear here
              </p>
            </div>
          </TabsContent>
          
          <TabsContent value="activity" className="mt-4">
            <ActivityTab />
          </TabsContent>
        </Tabs>

        {/* Modals */}
        <Dialog open={sendOpen} onOpenChange={setSendOpen}>
          <DialogContent className="sm:max-w-md bg-gradient-card border-border">
            <DialogHeader>
              <DialogTitle>Send SOL</DialogTitle>
            </DialogHeader>
            <SendSolForm onSuccess={() => setSendOpen(false)} />
          </DialogContent>
        </Dialog>

        <ReceiveModal
          open={receiveOpen} 
          onOpenChange={setReceiveOpen}
          address={address}
        />

        <MoonPayModal
          open={showMoonPay}
          onOpenChange={closeFundingFlow}
          walletAddress={fundingAddress}
          onDepositComplete={() => {
            console.log('💰 Deposit completed, refreshing balance...');
            refetchBalance();
            toast.success('Checking for deposit...', {
              description: 'Balance will update shortly'
            });
          }}
        />

        {/* Footer */}
        <WalletFooter onRestart={handleRestart} />
      </div>
    </div>
  );
};

export default Index;
