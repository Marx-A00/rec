// src/components/dashboard/ConditionalMosaicProvider.tsx
'use client';

import React from 'react';

import { useIsHomePage } from '@/hooks/useIsHomePage';
import { SplitMosaicProvider } from '@/contexts/SplitMosaicContext';

interface ConditionalMosaicProviderProps {
  children: React.ReactNode;
}

export default function ConditionalMosaicProvider({
  children,
}: ConditionalMosaicProviderProps) {
  const isHomePage = useIsHomePage();

  // Only provide mosaic context on the home page
  if (isHomePage) {
    return <SplitMosaicProvider>{children}</SplitMosaicProvider>;
  }

  // On other pages, just render children without mosaic context
  return <>{children}</>;
}
