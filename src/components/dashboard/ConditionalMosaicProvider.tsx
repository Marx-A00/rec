// src/components/dashboard/ConditionalMosaicProvider.tsx
'use client';

import React from 'react';
import { useIsHomePage } from '@/hooks/useIsHomePage';
import { MosaicProvider } from '@/contexts/MosaicContext';

interface ConditionalMosaicProviderProps {
  children: React.ReactNode;
}

export default function ConditionalMosaicProvider({ children }: ConditionalMosaicProviderProps) {
  const isHomePage = useIsHomePage();

  // Only provide mosaic context on the home page
  if (isHomePage) {
    return (
      <MosaicProvider>
        {children}
      </MosaicProvider>
    );
  }

  // On other pages, just render children without mosaic context
  return <>{children}</>;
}
