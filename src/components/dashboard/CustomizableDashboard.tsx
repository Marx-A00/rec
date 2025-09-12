// src/components/dashboard/CustomizableDashboard.tsx
'use client';

import React, { useEffect } from 'react';
import { Settings, Layout } from 'lucide-react';
import { DashboardProvider, useDashboard } from '@/contexts/DashboardContext';
import { panelRegistry } from '@/lib/dashboard/PanelRegistry';
import { panelDefinitions } from '@/lib/dashboard/panelDefinitions';
import DynamicPanelLayout from './DynamicPanelLayout';
import { Button } from '@/components/ui/button';

// Register all panel definitions on import
panelDefinitions.forEach(definition => {
  panelRegistry.register(definition);
});

function DashboardContent() {
  const { state, actions } = useDashboard();
  const { layout, isEditMode } = state;

  return (
    <div className="relative h-full">
      {/* Edit Mode Controls */}
      {isEditMode && (
        <div className="absolute top-4 right-4 z-50 flex gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => actions.toggleEditMode()}
            className="bg-zinc-800 hover:bg-zinc-700"
          >
            <Layout className="w-4 h-4 mr-2" />
            Exit Edit Mode
          </Button>
        </div>
      )}

      {/* Normal Mode Controls */}
      {!isEditMode && (
        <div className="absolute top-4 right-4 z-50">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => actions.toggleEditMode()}
            className="bg-zinc-800/80 hover:bg-zinc-700"
          >
            <Settings className="w-4 h-4" />
          </Button>
        </div>
      )}

      {/* Main Dashboard Layout */}
      <div className="bg-zinc-900/50 rounded-lg border border-zinc-800 h-full overflow-hidden">
        <DynamicPanelLayout layout={layout} />
      </div>

      {/* Edit Mode Overlay */}
      {isEditMode && (
        <div className="absolute top-0 left-0 right-0 bottom-0 bg-black/10 pointer-events-none z-10" />
      )}
    </div>
  );
}

interface CustomizableDashboardProps {
  className?: string;
}

export default function CustomizableDashboard({ 
  className = 'fixed top-16 bottom-0 left-20 right-0 overflow-hidden' 
}: CustomizableDashboardProps) {
  return (
    <div className={className}>
      <DashboardProvider>
        <DashboardContent />
      </DashboardProvider>
    </div>
  );
}
