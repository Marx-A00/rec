import { useEffect, useRef, useCallback, type RefObject } from 'react';
import { useRouter } from 'next/navigation';
import { signIn } from 'next-auth/react';

/**
 * Dev-only hook that listens for 5 rapid taps on a target element to trigger auto-login.
 * Mobile equivalent of the desktop Ctrl+C Ctrl+C bypass.
 * Only active in development mode.
 *
 * Requires DEV_LOGIN_EMAIL and DEV_LOGIN_PASSWORD in .env.local
 *
 * @param targetRef - Ref to the element that should receive the taps (e.g. the logo)
 * @param redirectTo - Where to redirect after successful login (default: '/m')
 */
export function useDevLoginMobile(
  targetRef: RefObject<HTMLElement | null>,
  redirectTo: string = '/m'
) {
  const router = useRouter();
  const tapTimestamps = useRef<number[]>([]);
  const isLoggingIn = useRef(false);

  const handleDevLogin = useCallback(async () => {
    if (isLoggingIn.current) return;
    isLoggingIn.current = true;

    try {
      console.log('[dev-login-mobile] Fetching dev credentials...');
      const response = await fetch('/api/auth/dev-login', {
        method: 'POST',
      });

      if (!response.ok) {
        const error = await response.json();
        console.error(
          '[dev-login-mobile] Failed to get credentials:',
          error.error
        );
        return;
      }

      const data = await response.json();
      console.log('[dev-login-mobile] Got credentials, signing in...');

      const result = await signIn('credentials', {
        identifier: data.credentials.identifier,
        password: data.credentials.password,
        redirect: false,
      });

      if (result?.error) {
        console.error('[dev-login-mobile] Sign in failed:', result.error);
      } else if (result?.ok) {
        console.log('[dev-login-mobile] Success!');
        router.push(redirectTo);
        router.refresh();
      }
    } catch (error) {
      console.error('[dev-login-mobile] Error:', error);
    } finally {
      isLoggingIn.current = false;
    }
  }, [router, redirectTo]);

  useEffect(() => {
    if (process.env.NODE_ENV !== 'development') return;

    const element = targetRef.current;
    if (!element) return;

    const TAP_COUNT = 5;
    const TIME_WINDOW_MS = 2000;

    const handleTap = () => {
      const now = Date.now();

      // Remove taps outside the time window
      tapTimestamps.current = tapTimestamps.current.filter(
        t => now - t < TIME_WINDOW_MS
      );

      tapTimestamps.current.push(now);

      if (tapTimestamps.current.length >= TAP_COUNT) {
        tapTimestamps.current = [];
        handleDevLogin();
      }
    };

    element.addEventListener('click', handleTap);
    return () => element.removeEventListener('click', handleTap);
  }, [targetRef, handleDevLogin]);
}
