// src/components/dashboard/MosaicContainer.tsx
'use client';

import React from 'react';
import { useMosaic } from '@/contexts/MosaicContext';
import { panelRegistry } from '@/lib/dashboard/PanelRegistry';
import { panelDefinitions } from '@/lib/dashboard/panelDefinitions';
import Mosaic from '../mosaic/Mosaic';

// Register all panel definitions on import
panelDefinitions.forEach(definition => {
  panelRegistry.register(definition);
});

function MosaicContent() {
  const { state, actions } = useMosaic();
  const { tiles, isEditMode } = state;

  return (
    <div className="relative h-full">
      {/* Main Mosaic Layout */}
      <div className="bg-zinc-900/50 rounded-lg border border-zinc-800 h-full overflow-hidden">
        <Mosaic
          tiles={tiles}
          isEditMode={isEditMode}
          onTilesChange={actions.setTiles}
          onRemoveTile={actions.removeTile}
        />
      </div>

      {/* Edit Mode Overlay */}
      {isEditMode && (
        <div className="absolute top-0 left-0 right-0 bottom-0 bg-black/10 pointer-events-none z-10" />
      )}
    </div>
  );
}

interface MosaicContainerProps {
  className?: string;
}

export default function MosaicContainer({
  className = 'fixed top-16 bottom-0 left-20 right-0 overflow-hidden p-4'
}: MosaicContainerProps) {
  return (
    <div className={className}>
      <MosaicContent />
    </div>
  );
}
