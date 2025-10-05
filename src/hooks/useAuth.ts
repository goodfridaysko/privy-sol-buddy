import { usePrivy } from '@privy-io/react-auth';

/**
 * useAuth: Authentication hook for login/logout
 * - Supports email, SMS, and passkey authentication
 * - No seed phrases required
 * - Returns user info and authentication state
 */
export function useAuth() {
  const { 
    login, 
    logout, 
    ready, 
    authenticated, 
    user 
  } = usePrivy();

  return {
    // Trigger Privy login modal (email/SMS/passkey)
    login,
    // Logout current user
    logout,
    // Is Privy SDK ready?
    ready,
    // Is user authenticated?
    authenticated,
    // Current user object (includes email, wallet info, etc)
    user,
  };
}
