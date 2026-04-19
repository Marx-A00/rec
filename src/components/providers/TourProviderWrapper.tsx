'use client';

import { usePathname } from 'next/navigation';

import { TourProvider } from '@/contexts/TourContext';
/**
 * Conditionally wraps children with TourProvider.
 * Skips tour functionality for mobile routes (/m/*) to avoid hydration issues.
 */
export function TourProviderWrapper({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isMobileRoute = pathname?.startsWith('/m');

  // Skip tour provider for mobile routes
  if (isMobileRoute) {
    return <>{children}</>;
  }

  return (
    <TourProvider>
      {children}
    </TourProvider>
  );
}
