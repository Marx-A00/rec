// src/components/dashboard/CustomizableDashboard.tsx
'use client';

import React from 'react';
import { useDashboard } from '@/contexts/DashboardContext';
import { panelRegistry } from '@/lib/dashboard/PanelRegistry';
import { panelDefinitions } from '@/lib/dashboard/panelDefinitions';
import SortablePanelLayout from './SortablePanelLayout';

// Register all panel definitions on import
panelDefinitions.forEach(definition => {
  panelRegistry.register(definition);
});

// TODO: experiment with dnd kit

// TODO: Define a few different templates

function DashboardContent() {
  const { state } = useDashboard();
  const { layout, isEditMode } = state;

  return (
    <div className="relative h-full">
      {/* Main Dashboard Layout */}
      <div className="bg-zinc-900/50 rounded-lg border border-zinc-800 h-full overflow-hidden">
        <SortablePanelLayout layout={layout} />
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
      <DashboardContent />
    </div>
  );
}
