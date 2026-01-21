import { useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { signIn } from 'next-auth/react';

/**
 * Dev-only hook that listens for Ctrl+C Ctrl+C to trigger auto-login.
 * Only active in development mode.
 *
 * Requires DEV_LOGIN_EMAIL and DEV_LOGIN_PASSWORD in .env.local
 *
 * @param redirectTo - Where to redirect after successful login (default: '/browse')
 */
export function useDevLogin(redirectTo: string = '/browse') {
  const router = useRouter();
  const lastCtrlC = useRef<number>(0);
  const isLoggingIn = useRef(false);

  const handleDevLogin = useCallback(async () => {
    if (isLoggingIn.current) return;
    isLoggingIn.current = true;

    try {
      console.log('[dev-login] Fetching dev credentials...');
      const response = await fetch('/api/auth/dev-login', {
        method: 'POST',
      });

      if (!response.ok) {
        const error = await response.json();
        console.error('[dev-login] Failed to get credentials:', error.error);
        return;
      }

      const data = await response.json();
      console.log('[dev-login] Got credentials, signing in...');

      // Use NextAuth's signIn with the credentials
      const result = await signIn('credentials', {
        identifier: data.credentials.identifier,
        password: data.credentials.password,
        redirect: false,
      });

      if (result?.error) {
        console.error('[dev-login] Sign in failed:', result.error);
      } else if (result?.ok) {
        console.log('[dev-login] Success!');
        router.push(redirectTo);
        router.refresh();
      }
    } catch (error) {
      console.error('[dev-login] Error:', error);
    } finally {
      isLoggingIn.current = false;
    }
  }, [router, redirectTo]);

  useEffect(() => {
    // Only enable in development
    if (process.env.NODE_ENV !== 'development') return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Check for Ctrl+C (but not in an input field to avoid conflicts)
      if (e.ctrlKey && e.key === 'c') {
        const now = Date.now();
        const timeSinceLastCtrlC = now - lastCtrlC.current;

        // If second Ctrl+C within 500ms, trigger dev login
        if (timeSinceLastCtrlC < 500 && timeSinceLastCtrlC > 50) {
          e.preventDefault();
          handleDevLogin();
          lastCtrlC.current = 0; // Reset
        } else {
          lastCtrlC.current = now;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleDevLogin]);
}
