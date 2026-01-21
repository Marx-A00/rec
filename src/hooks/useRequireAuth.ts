'use client';

import { useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter, usePathname } from 'next/navigation';

/**
 * Hook that redirects to signin if user is not authenticated.
 * Use this on protected mobile pages since middleware can't use Prisma in Edge runtime.
 *
 * @param redirectTo - The path to redirect to if not authenticated (default: /m/auth/signin)
 * @returns { session, status, isLoading, isAuthenticated }
 */
export function useRequireAuth(redirectTo = '/m/auth/signin') {
  const { data: session, status } = useSession();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (status === 'loading') return; // Still loading, wait

    if (!session) {
      // Include current path as callback so user returns after signin
      const callbackUrl = encodeURIComponent(pathname || '/m');
      router.replace(`${redirectTo}?callbackUrl=${callbackUrl}`);
    }
  }, [session, status, router, redirectTo, pathname]);

  return {
    session,
    status,
    isLoading: status === 'loading',
    isAuthenticated: !!session,
  };
}
