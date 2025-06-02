'use client';

import { useRouter, usePathname } from 'next/navigation';
import { useCallback } from 'react';

interface NavigationOptions {
    replace?: boolean;
    scroll?: boolean;
}

export function useNavigation() {
    const router = useRouter();
    const pathname = usePathname();

    const navigateTo = useCallback((
        path: string,
        options: NavigationOptions = {}
    ) => {
        const { replace = false, scroll = true } = options;

        if (replace) {
            router.replace(path, { scroll });
        } else {
            router.push(path, { scroll });
        }
    }, [router]);

    const goBack = useCallback(() => {
        // Check if there's history to go back to
        if (typeof window !== 'undefined' && window.history.length > 1) {
            router.back();
        } else {
            // Fallback to home if no history
            router.push('/');
        }
    }, [router]);

    const goToHome = useCallback(() => {
        router.push('/');
    }, [router]);

    const refresh = useCallback(() => {
        router.refresh();
    }, [router]);

    // Helper function to determine if we're on a specific route
    const isRoute = useCallback((route: string) => {
        return pathname === route;
    }, [pathname]);

    // Helper function to check if current route starts with a path
    const isRouteGroup = useCallback((routePrefix: string) => {
        return pathname.startsWith(routePrefix);
    }, [pathname]);

    return {
        navigateTo,
        goBack,
        goToHome,
        refresh,
        isRoute,
        isRouteGroup,
        currentPath: pathname,
        router, // Expose router for advanced usage
    };
}