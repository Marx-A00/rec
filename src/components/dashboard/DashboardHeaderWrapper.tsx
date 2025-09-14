// src/components/dashboard/DashboardHeaderWrapper.tsx
'use client';

import React from 'react';
import { createPortal } from 'react-dom';
import { useIsDashboardPage } from '@/hooks/useIsDashboardPage';
import { useDashboard } from '@/contexts/DashboardContext';
import DashboardHeaderControls from './DashboardHeaderControls';
import WidgetLibrary from './WidgetLibrary';

interface DashboardHeaderWrapperProps {
  children: React.ReactNode;
}

export default function DashboardHeaderWrapper({ children }: DashboardHeaderWrapperProps) {
  const isDashboardPage = useIsDashboardPage();
  const [showWidgetLibrary, setShowWidgetLibrary] = React.useState(false);
  const [isMounted, setIsMounted] = React.useState(false);

  // Ensure we're mounted before using portals
  React.useEffect(() => {
    setIsMounted(true);
  }, []);

  // If not on dashboard page, just render children without any dashboard controls
  if (!isDashboardPage) {
    return <>{children}</>;
  }

  // Hook to access dashboard context (will be available due to ConditionalDashboardProvider)
  const { state, actions } = useDashboard();
  const { isEditMode } = state;

  const handleToggleEditMode = () => {
    actions.toggleEditMode();
  };

  const handleShowWidgetLibrary = () => {
    setShowWidgetLibrary(true);
  };

  const handleCloseWidgetLibrary = () => {
    setShowWidgetLibrary(false);
  };

  return (
    <>
      {/* Render children with header controls */}
      {React.cloneElement(children as React.ReactElement, {
        // @ts-expect-error - headerControls prop injection pattern
        headerControls: (
          <DashboardHeaderControls
            isEditMode={isEditMode}
            onToggleEditMode={handleToggleEditMode}
            onShowWidgetLibrary={handleShowWidgetLibrary}
          />
        ),
      })}

      {/* Widget Library Modal - Render using portal to avoid positioning issues */}
      {isMounted && showWidgetLibrary && createPortal(
        <WidgetLibrary 
          isOpen={showWidgetLibrary}
          onClose={handleCloseWidgetLibrary}
        />,
        document.body
      )}
    </>
  );
}
