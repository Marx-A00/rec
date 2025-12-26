import { useSession } from 'next-auth/react';
import { useMemo } from 'react';

import { isAdmin } from '@/lib/permissions';

/**
 * Hook to determine if admin overlay features should be shown
 *
 * Returns true only if:
 * 1. User has admin role (ADMIN, MODERATOR, or OWNER)
 * 2. NEXT_PUBLIC_ADMIN_OVERLAY environment variable is set to "true"
 *
 * This allows admins to toggle off admin UI features to see the app
 * as regular users would see it, without changing their role.
 *
 * @returns Object with adminOverlayEnabled boolean and isUserAdmin boolean
 */
export function useAdminOverlay() {
  const { data: session } = useSession();

  const result = useMemo(() => {
    // Check if user has admin role
    const userIsAdmin = session?.user?.role ? isAdmin(session.user.role) : false;

    // Check if admin overlay is enabled via environment variable
    const overlayEnabled = process.env.NEXT_PUBLIC_ADMIN_OVERLAY === 'true';

    return {
      // Admin features are shown only if user is admin AND overlay is enabled
      adminOverlayEnabled: userIsAdmin && overlayEnabled,
      // Also expose whether user is admin (regardless of overlay state)
      isUserAdmin: userIsAdmin,
    };
  }, [session?.user?.role]);

  return result;
}
