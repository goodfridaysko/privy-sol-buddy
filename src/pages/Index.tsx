import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useEmbeddedSolWallet } from '@/hooks/useEmbeddedSolWallet';
import { useFund } from '@/hooks/useFund';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { WalletHeader } from '@/components/wallet/WalletHeader';
import { WalletFooter } from '@/components/wallet/WalletFooter';
import { ActionButtons } from '@/components/wallet/ActionButtons';
import { TokenList } from '@/components/wallet/TokenList';
import { ActivityTab } from '@/components/wallet/ActivityTab';
import { SendSolForm } from '@/components/SendSolForm';
import { SwapForm } from '@/components/SwapForm';
import { ReceiveModal } from '@/components/wallet/ReceiveModal';
import { Wallet, Loader2, Image } from 'lucide-react';
import { toast } from 'sonner';

const Index = () => {
  const { login, logout, ready, authenticated, user } = useAuth();
  const { address, hasWallet, isLoading } = useEmbeddedSolWallet();
  const { fundWallet } = useFund();
  
  const [sendOpen, setSendOpen] = useState(false);
  const [swapOpen, setSwapOpen] = useState(false);
  const [receiveOpen, setReceiveOpen] = useState(false);

  const handleFund = async () => {
    if (!address) return;
    try {
      await fundWallet(address);
    } catch (error) {
      toast.error('Failed to open funding flow');
    }
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
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
          <p className="text-muted-foreground">
            {isLoading ? 'Loading wallet...' : 'Creating your wallet...'}
          </p>
          <p className="text-xs text-muted-foreground">This may take a few moments</p>
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

        {/* Action Buttons */}
        <ActionButtons
          onBuy={handleFund}
          onSend={() => setSendOpen(true)}
          onReceive={() => setReceiveOpen(true)}
          onSwap={() => setSwapOpen(true)}
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

        <Dialog open={swapOpen} onOpenChange={setSwapOpen}>
          <DialogContent className="sm:max-w-md bg-gradient-card border-border">
            <DialogHeader>
              <DialogTitle>Swap Tokens</DialogTitle>
            </DialogHeader>
            <SwapForm />
          </DialogContent>
        </Dialog>

        <ReceiveModal 
          open={receiveOpen} 
          onOpenChange={setReceiveOpen}
          address={address}
        />

        {/* Footer */}
        <WalletFooter onRestart={handleRestart} />
      </div>
    </div>
  );
};

export default Index;
