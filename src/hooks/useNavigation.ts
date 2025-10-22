'use client';

import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { useCallback, useState } from 'react';
import { z } from 'zod';

interface NavigationOptions {
  replace?: boolean;
  scroll?: boolean;
  validate?: boolean;
  onError?: (error: Error) => void;
  onSuccess?: () => void;
}

interface NavigationState {
  isNavigating: boolean;
  error: Error | null;
  lastNavigatedPath: string | null;
}

// Common route validation schemas
const routeSchemas = {
  album: z.object({ id: z.string().min(1) }),
  artist: z.object({ id: z.string().min(1) }),
  profile: z.object({ userId: z.string().min(1) }),
  label: z.object({ id: z.string().min(1) }),
} as const;

export function useNavigation() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [state, setState] = useState<NavigationState>({
    isNavigating: false,
    error: null,
    lastNavigatedPath: null,
  });

  // Helper to validate route parameters
  const validateRoute = useCallback(
    (path: string, params?: Record<string, unknown>) => {
      try {
        // Extract route type from path
        const routeMatch = path.match(
          /^\/(album|artist|profile|label)s?\/(.+)$/
        );
        if (!routeMatch) return true; // Allow non-validated routes

        const [, routeType, id] = routeMatch;
        const normalizedType = routeType.replace(
          /s$/,
          ''
        ) as keyof typeof routeSchemas;

        if (routeSchemas[normalizedType]) {
          const schema = routeSchemas[normalizedType];
          const result = schema.safeParse({ id, userId: id, ...params });
          if (!result.success) {
            throw new Error(
              `Invalid ${normalizedType} route: ${result.error.message}`
            );
          }
        }
        return true;
      } catch (error) {
        throw error instanceof Error
          ? error
          : new Error('Route validation failed');
      }
    },
    []
  );

  // Enhanced navigation function with validation and error handling
  const navigateTo = useCallback(
    async (path: string, options: NavigationOptions = {}) => {
      const {
        replace = false,
        scroll = true,
        validate = true,
        onError,
        onSuccess,
      } = options;

      try {
        setState(prev => ({ ...prev, isNavigating: true, error: null }));

        // Validate route if requested
        if (validate) {
          validateRoute(path);
        }

        // Perform navigation
        if (replace) {
          router.replace(path, { scroll });
        } else {
          router.push(path, { scroll });
        }

        setState(prev => ({
          ...prev,
          isNavigating: false,
          lastNavigatedPath: path,
        }));

        onSuccess?.();
      } catch (error) {
        const navigationError =
          error instanceof Error ? error : new Error('Navigation failed');
        setState(prev => ({
          ...prev,
          isNavigating: false,
          error: navigationError,
        }));
        onError?.(navigationError);
        throw navigationError;
      }
    },
    [router, validateRoute]
  );

  // Enhanced navigation helpers with validation
  const navigateToAlbum = useCallback(
    (albumId: string, options?: Omit<NavigationOptions, 'validate'>) => {
      console.log(
        '🚀 useNavigation - navigateToAlbum called with ID:',
        albumId
      );
      return navigateTo(`/albums/${albumId}`, { ...options, validate: true });
    },
    [navigateTo]
  );

  const navigateToArtist = useCallback(
    (artistId: string, options?: Omit<NavigationOptions, 'validate'>) => {
      return navigateTo(`/artists/${artistId}`, { ...options, validate: true });
    },
    [navigateTo]
  );

  const navigateToProfile = useCallback(
    (userId: string, options?: Omit<NavigationOptions, 'validate'>) => {
      return navigateTo(`/profile/${userId}`, { ...options, validate: true });
    },
    [navigateTo]
  );

  const navigateToLabel = useCallback(
    (labelId: string, options?: Omit<NavigationOptions, 'validate'>) => {
      return navigateTo(`/labels/${labelId}`, { ...options, validate: true });
    },
    [navigateTo]
  );

  const navigateToTrack = useCallback(
    (
      albumId: string,
      trackId?: string,
      options?: Omit<NavigationOptions, 'validate'>
    ) => {
      const hash = trackId ? `#track-${trackId}` : '';
      return navigateTo(`/albums/${albumId}${hash}`, {
        ...options,
        validate: true,
      });
    },
    [navigateTo]
  );

  // Prefetch utility
  const prefetchRoute = useCallback(
    (path: string) => {
      try {
        router.prefetch(path);
      } catch (error) {
        console.warn('Failed to prefetch route:', path, error);
      }
    },
    [router]
  );

  // Enhanced back navigation with fallback
  const goBack = useCallback(() => {
    try {
      setState(prev => ({ ...prev, isNavigating: true, error: null }));

      // Check if there's history to go back to
      if (typeof window !== 'undefined' && window.history.length > 1) {
        router.back();
      } else {
        // Fallback to home if no history
        router.push('/');
      }

      setState(prev => ({ ...prev, isNavigating: false }));
    } catch (error) {
      const navigationError =
        error instanceof Error ? error : new Error('Back navigation failed');
      setState(prev => ({
        ...prev,
        isNavigating: false,
        error: navigationError,
      }));
      // Fallback to home on error
      router.push('/');
    }
  }, [router]);

  const goToHome = useCallback(() => {
    return navigateTo('/', { validate: false });
  }, [navigateTo]);

  const refresh = useCallback(() => {
    try {
      router.refresh();
    } catch (error) {
      console.warn('Failed to refresh page:', error);
    }
  }, [router]);

  // Helper function to determine if we're on a specific route
  const isRoute = useCallback(
    (route: string) => {
      return pathname === route;
    },
    [pathname]
  );

  // Helper function to check if current route starts with a path
  const isRouteGroup = useCallback(
    (routePrefix: string) => {
      return pathname.startsWith(routePrefix);
    },
    [pathname]
  );

  // Query parameter helpers
  const getQueryParam = useCallback(
    (key: string) => {
      return searchParams.get(key);
    },
    [searchParams]
  );

  const getAllQueryParams = useCallback(() => {
    return Object.fromEntries(searchParams.entries());
  }, [searchParams]);

  // Clear navigation error
  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }));
  }, []);

  return {
    // Enhanced navigation methods
    navigateTo,
    navigateToAlbum,
    navigateToArtist,
    navigateToProfile,
    navigateToLabel,
    navigateToTrack,

    // Utility methods
    goBack,
    goToHome,
    refresh,
    prefetchRoute,

    // Route checking
    isRoute,
    isRouteGroup,

    // Query parameter helpers
    getQueryParam,
    getAllQueryParams,

    // State and error handling
    state,
    clearError,
    isNavigating: state.isNavigating,
    error: state.error,
    lastNavigatedPath: state.lastNavigatedPath,

    // Current route info
    currentPath: pathname,

    // Expose router for advanced usage
    router,
  };
}
