'use client';

import { useMedia } from 'react-use';
import { useMemo } from 'react';

// Layout configuration types
export interface DrawerLayoutConfig {
  // Layout mode
  layout: 'desktop' | 'tablet' | 'mobile';

  // Turntable configuration
  turntableSize: number;
  turntableGap: string;
  turntableArrangement: 'horizontal' | 'vertical';

  // Container styles
  containerPadding: string;
  containerMaxWidth: string;
  containerDirection: 'row' | 'column';

  // Component visibility and sizing
  showFullControls: boolean;
  dialSize: 'sm' | 'md' | 'lg';
  searchBarSize: 'sm' | 'md' | 'lg';

  // Responsive classes
  containerClasses: string;
  turntableClasses: string;
  dialClasses: string;

  // Touch optimizations
  touchOptimized: boolean;
  minTouchTarget: number;
}

// Breakpoint constants
const BREAKPOINTS = {
  mobile: '(max-width: 767px)',
  tablet: '(min-width: 768px) and (max-width: 1023px)',
  desktop: '(min-width: 1024px)',
} as const;

export function useDrawerLayout(): DrawerLayoutConfig {
  // Media queries using react-use
  const isMobile = useMedia(BREAKPOINTS.mobile);
  const isTablet = useMedia(BREAKPOINTS.tablet);
  const isDesktop = useMedia(BREAKPOINTS.desktop);

  const layoutConfig = useMemo((): DrawerLayoutConfig => {
    // Mobile layout (< 768px)
    if (isMobile) {
      return {
        layout: 'mobile',
        turntableSize: 200,
        turntableGap: 'gap-4',
        turntableArrangement: 'vertical',
        containerPadding: 'p-4',
        containerMaxWidth: 'max-w-full',
        containerDirection: 'column',
        showFullControls: false,
        dialSize: 'sm',
        searchBarSize: 'sm',
        containerClasses: 'flex flex-col space-y-6 p-4',
        turntableClasses: 'flex flex-col items-center space-y-4',
        dialClasses: 'w-16 h-16 touch-manipulation',
        touchOptimized: true,
        minTouchTarget: 44, // iOS minimum touch target
      };
    }

    // Tablet layout (768px - 1023px)
    if (isTablet) {
      return {
        layout: 'tablet',
        turntableSize: 240,
        turntableGap: 'gap-6',
        turntableArrangement: 'horizontal',
        containerPadding: 'p-6',
        containerMaxWidth: 'max-w-4xl',
        containerDirection: 'row',
        showFullControls: true,
        dialSize: 'md',
        searchBarSize: 'md',
        containerClasses: 'flex flex-col space-y-6 p-6 max-w-4xl mx-auto',
        turntableClasses: 'flex flex-row items-center justify-center gap-6',
        dialClasses: 'w-20 h-20',
        touchOptimized: true,
        minTouchTarget: 40,
      };
    }

    // Desktop layout (>= 1024px)
    return {
      layout: 'desktop',
      turntableSize: 280,
      turntableGap: 'gap-8',
      turntableArrangement: 'horizontal',
      containerPadding: 'p-8',
      containerMaxWidth: 'max-w-6xl',
      containerDirection: 'row',
      showFullControls: true,
      dialSize: 'lg',
      searchBarSize: 'lg',
      containerClasses: 'flex flex-col space-y-8 p-8 max-w-6xl mx-auto',
      turntableClasses: 'flex flex-row items-center justify-center gap-8',
      dialClasses: 'w-24 h-24',
      touchOptimized: false,
      minTouchTarget: 32,
    };
  }, [isMobile, isTablet, isDesktop]);

  return layoutConfig;
}

// Helper hook for specific layout checks
export function useLayoutBreakpoints() {
  const isMobile = useMedia(BREAKPOINTS.mobile);
  const isTablet = useMedia(BREAKPOINTS.tablet);
  const isDesktop = useMedia(BREAKPOINTS.desktop);

  return {
    isMobile,
    isTablet,
    isDesktop,
    breakpoints: BREAKPOINTS,
  };
}

// Layout-specific CSS classes helper
export function getLayoutClasses(layout: DrawerLayoutConfig['layout']) {
  const baseClasses = {
    mobile: {
      container: 'drawer-mobile',
      turntable: 'turntable-mobile',
      dial: 'dial-mobile',
    },
    tablet: {
      container: 'drawer-tablet',
      turntable: 'turntable-tablet',
      dial: 'dial-tablet',
    },
    desktop: {
      container: 'drawer-desktop',
      turntable: 'turntable-desktop',
      dial: 'dial-desktop',
    },
  };

  return baseClasses[layout];
}
