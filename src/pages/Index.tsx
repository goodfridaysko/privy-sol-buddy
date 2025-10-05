import { useAuth } from '@/hooks/useAuth';
import { useEmbeddedSolWallet } from '@/hooks/useEmbeddedSolWallet';
import { useFund } from '@/hooks/useFund';
import { Button } from '@/components/ui/button';
import { WalletCard } from '@/components/WalletCard';
import { SendSolForm } from '@/components/SendSolForm';
import { SwapForm } from '@/components/SwapForm';
import { Wallet, LogOut, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

const Index = () => {
  const { login, logout, ready, authenticated, user } = useAuth();
  const { address, hasWallet } = useEmbeddedSolWallet();
  const { fundWallet } = useFund();

  const handleFund = async () => {
    if (!address) return;
    try {
      await fundWallet(address);
    } catch (error) {
      toast.error('Failed to open funding flow');
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

  // Authenticated but no wallet yet
  if (!hasWallet || !address) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
          <p className="text-muted-foreground">Creating your wallet...</p>
        </div>
      </div>
    );
  }

  // Authenticated with wallet - show main UI
  return (
    <div className="min-h-screen bg-background p-4">
      <div className="mx-auto max-w-6xl space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-gradient-primary p-2 shadow-glow">
              <Wallet className="h-6 w-6 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Solana Wallet</h1>
              <p className="text-sm text-muted-foreground">{user?.email?.address}</p>
            </div>
          </div>
          <Button
            onClick={logout}
            variant="outline"
            className="gap-2"
          >
            <LogOut className="h-4 w-4" />
            Logout
          </Button>
        </div>

        {/* Main Grid */}
        <div className="grid gap-6 md:grid-cols-2">
          {/* Left Column */}
          <div className="space-y-6">
            <WalletCard address={address} onFund={handleFund} />
            <SendSolForm />
          </div>

          {/* Right Column */}
          <div className="space-y-6">
            <SwapForm />
          </div>
        </div>

        {/* Footer Info */}
        <div className="rounded-lg border border-border bg-card/50 p-4 backdrop-blur-sm">
          <p className="text-sm text-muted-foreground text-center">
            Your wallet is self-custodial and encrypted locally. Privy does not have access to your private keys.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Index;
