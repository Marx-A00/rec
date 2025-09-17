// src/components/dashboard/ConditionalMosaicProvider.tsx
'use client';

import React from 'react';
import { useIsDashboardPage } from '@/hooks/useIsDashboardPage';
import { MosaicProvider } from '@/contexts/MosaicContext';

interface ConditionalMosaicProviderProps {
  children: React.ReactNode;
}

export default function ConditionalMosaicProvider({ children }: ConditionalMosaicProviderProps) {
  const isDashboardPage = useIsDashboardPage();

  // Only provide mosaic context on the dashboard page
  if (isDashboardPage) {
    return (
      <MosaicProvider>
        {children}
      </MosaicProvider>
    );
  }

  // On other pages, just render children without mosaic context
  return <>{children}</>;
}
