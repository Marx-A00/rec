// src/hooks/useIsHomePage.ts
'use client';

import { usePathname } from 'next/navigation';

export function useIsHomePage() {
  const pathname = usePathname();

  // Return true if we're on the home page (mosaic/widget view)
  return pathname === '/';
}
