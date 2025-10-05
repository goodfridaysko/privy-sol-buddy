import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ExternalLink, Key, AlertCircle } from 'lucide-react';

/**
 * PrivySetup: Setup instructions screen for configuring Privy
 * Shows when VITE_PRIVY_APP_ID is not set
 */
export function PrivySetup() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-2xl bg-gradient-card border-border shadow-card">
        <CardHeader className="text-center space-y-4">
          <div className="flex justify-center">
            <div className="rounded-full bg-gradient-primary p-4 shadow-glow">
              <Key className="h-12 w-12 text-primary-foreground" />
            </div>
          </div>
          <CardTitle className="text-3xl">Privy Setup Required</CardTitle>
          <p className="text-muted-foreground">
            Configure your Privy App ID to enable wallet authentication
          </p>
        </CardHeader>

        <CardContent className="space-y-6">
          <div className="space-y-4">
            <div className="flex items-start gap-3 p-4 rounded-lg bg-muted/50">
              <div className="rounded-full bg-primary text-primary-foreground w-6 h-6 flex items-center justify-center text-sm font-bold shrink-0">
                1
              </div>
              <div className="space-y-2">
                <h3 className="font-semibold">Create a Privy Account</h3>
                <p className="text-sm text-muted-foreground">
                  Sign up for a free Privy account at dashboard.privy.io
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2"
                  onClick={() => window.open('https://dashboard.privy.io', '_blank')}
                >
                  Open Privy Dashboard
                  <ExternalLink className="h-3 w-3" />
                </Button>
              </div>
            </div>

            <div className="flex items-start gap-3 p-4 rounded-lg bg-muted/50">
              <div className="rounded-full bg-primary text-primary-foreground w-6 h-6 flex items-center justify-center text-sm font-bold shrink-0">
                2
              </div>
              <div className="space-y-2">
                <h3 className="font-semibold">Enable Solana Support</h3>
                <p className="text-sm text-muted-foreground">
                  In your Privy app settings, navigate to "Chains" and enable Solana
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-4 rounded-lg bg-muted/50">
              <div className="rounded-full bg-primary text-primary-foreground w-6 h-6 flex items-center justify-center text-sm font-bold shrink-0">
                3
              </div>
              <div className="space-y-2">
                <h3 className="font-semibold">Copy Your App ID</h3>
                <p className="text-sm text-muted-foreground">
                  Find your App ID in the Privy dashboard settings
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-4 rounded-lg bg-muted/50">
              <div className="rounded-full bg-primary text-primary-foreground w-6 h-6 flex items-center justify-center text-sm font-bold shrink-0">
                4
              </div>
              <div className="space-y-2">
                <h3 className="font-semibold">Configure Environment Variable</h3>
                <p className="text-sm text-muted-foreground">
                  Create a <code className="bg-background px-2 py-1 rounded">.env</code> file in your project root:
                </p>
                <div className="bg-background p-3 rounded font-mono text-sm">
                  VITE_PRIVY_APP_ID=your_app_id_here
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-start gap-3 p-4 rounded-lg bg-destructive/10 border border-destructive/20">
            <AlertCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
            <div className="space-y-1">
              <h3 className="font-semibold text-destructive">Important</h3>
              <p className="text-sm text-muted-foreground">
                After adding the environment variable, restart your development server for the changes to take effect.
              </p>
            </div>
          </div>

          <div className="text-center pt-4">
            <Button
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={() => window.open('https://docs.privy.io/guide/quickstart', '_blank')}
            >
              View Privy Documentation
              <ExternalLink className="h-3 w-3" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
