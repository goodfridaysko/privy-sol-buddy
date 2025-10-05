import { PrivyProvider } from '@privy-io/react-auth';
import { ReactNode } from 'react';

interface PrivyClientProps {
  children: ReactNode;
}

/**
 * PrivyClient: Wraps the app with Privy authentication
 * - Enables Solana embedded wallet creation
 * - Supports email, SMS, and passkey login
 * - Auto-provisions wallet on first login
 */
export function PrivyClient({ children }: PrivyClientProps) {
  const appId = import.meta.env.VITE_PRIVY_APP_ID || 'your-privy-app-id';

  return (
    <PrivyProvider
      appId={appId}
      config={{
        // Enable embedded wallet for Solana
        embeddedWallets: {
          solana: {
            createOnLogin: 'users-without-wallets', // Auto-create wallet for new users
          },
        },
        // Login methods - email, SMS, passkey (no seed phrase recovery)
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
