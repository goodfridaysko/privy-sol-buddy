import { PrivyProvider } from '@privy-io/react-auth';
import { ReactNode } from 'react';
import { PrivySetup } from '@/components/PrivySetup';

interface PrivyClientProps {
  children: ReactNode;
}

/**
 * PrivyClient: Wraps the app with Privy authentication
 * - Enables Solana embedded wallet creation
 * - Supports email, SMS, and passkey login
 * - Auto-provisions wallet on first login
 * - Shows setup screen if App ID is not configured
 */
export function PrivyClient({ children }: PrivyClientProps) {
  const appId = import.meta.env.VITE_PRIVY_APP_ID;

  // Show setup instructions if App ID is not configured
  if (!appId || appId === 'your-privy-app-id') {
    return <PrivySetup />;
  }

  return (
    <PrivyProvider
      appId={appId}
      config={{
        embeddedWallets: {
          solana: {
            createOnLogin: 'users-without-wallets',
          },
        },
        loginMethods: ['email', 'sms', 'wallet'],
        appearance: {
          theme: 'dark',
          accentColor: '#9333ea',
          logo: undefined,
        },
      }}
    >
      {children}
    </PrivyProvider>
  );
}
