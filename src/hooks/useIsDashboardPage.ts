// src/hooks/useIsDashboardPage.ts
'use client';

import { usePathname } from 'next/navigation';

export function useIsDashboardPage() {
  const pathname = usePathname();
  
  // Return true if we're on the home page (dashboard)
  return pathname === '/';
}
