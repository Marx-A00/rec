import { useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';

/**
 * Dev-only hook that listens for Ctrl+C Ctrl+C to trigger auto-login.
 * Only active in development mode.
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
      console.log('[dev-login] Triggering dev login...');
      const response = await fetch('/api/auth/dev-login', {
        method: 'POST',
      });

      if (response.ok) {
        const data = await response.json();
        console.log('[dev-login] Success!', data.user);
        router.push(redirectTo);
        router.refresh();
      } else {
        const error = await response.json();
        console.error('[dev-login] Failed:', error.error);
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
