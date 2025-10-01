'use client';

import React, { useState, useEffect } from 'react';
import { useIsMobile, useIsTablet, useIsDesktop } from '@/hooks/useMediaQuery';
import DesktopNavigation from './DesktopNavigation';
import TabletNavigation from './TabletNavigation';
import MobileNavigation from './MobileNavigation';
import { cn } from '@/lib/utils';

interface ResponsiveNavigationProps {
  children: React.ReactNode;
  className?: string;
}

export default function ResponsiveNavigation({
  children,
  className
}: ResponsiveNavigationProps) {
  const [mounted, setMounted] = useState(false);

  const isMobile = useIsMobile();
  const isTablet = useIsTablet();
  const isDesktop = useIsDesktop();

  // Ensure client-side only rendering for media queries
  useEffect(() => {
    setMounted(true);
  }, []);

  // Avoid hydration mismatch by rendering nothing until mounted
  if (!mounted) {
    return (
      <div className={cn('min-h-screen bg-zinc-950', className)}>
        <div className="flex items-center justify-center h-screen">
          <div className="animate-pulse text-zinc-500">Loading...</div>
        </div>
      </div>
    );
  }

  // Render appropriate navigation based on screen size
  if (isMobile) {
    return (
      <MobileNavigation className={className}>
        {children}
      </MobileNavigation>
    );
  }

  if (isTablet) {
    return (
      <TabletNavigation className={className}>
        {children}
      </TabletNavigation>
    );
  }

  if (isDesktop) {
    return (
      <DesktopNavigation className={className}>
        {children}
      </DesktopNavigation>
    );
  }

  // Default fallback to desktop view
  return (
    <DesktopNavigation className={className}>
      {children}
    </DesktopNavigation>
  );
}