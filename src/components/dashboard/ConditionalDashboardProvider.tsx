// src/components/dashboard/ConditionalDashboardProvider.tsx
'use client';

import React from 'react';
import { useIsDashboardPage } from '@/hooks/useIsDashboardPage';
import { DashboardProvider } from '@/contexts/DashboardContext';

interface ConditionalDashboardProviderProps {
  children: React.ReactNode;
}

export default function ConditionalDashboardProvider({ children }: ConditionalDashboardProviderProps) {
  const isDashboardPage = useIsDashboardPage();

  // Only provide dashboard context on the dashboard page
  if (isDashboardPage) {
    return (
      <DashboardProvider>
        {children}
      </DashboardProvider>
    );
  }

  // On other pages, just render children without dashboard context
  return <>{children}</>;
}
