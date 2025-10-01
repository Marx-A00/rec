// src/components/dashboard/MosaicContainer.tsx
'use client';

import React, { Suspense } from 'react';

import { useSplitMosaic } from '@/contexts/SplitMosaicContext';
import { panelRegistry } from '@/lib/dashboard/PanelRegistry';
import { panelDefinitions } from '@/lib/dashboard/panelDefinitions';

import SplitMosaic from '../mosaic/SplitMosaic';
import MosaicErrorBoundary from '../mosaic/MosaicErrorBoundary';
import MosaicLoadingState from '../mosaic/MosaicLoadingState';

// Register all panel definitions on import
panelDefinitions.forEach(definition => {
  panelRegistry.register(definition);
});

// TODO: remove random padding on elements
// TODO: remove panels like recently played...

const MosaicContent = React.memo(function MosaicContent() {
  const { state, actions } = useSplitMosaic();
  const { root, isEditMode } = state;

  return (
    <div className='relative h-full'>
      {/* Main Mosaic Layout */}
      <div className='h-full'>
        <SplitMosaic
          root={root}
          isEditMode={isEditMode}
          onLayoutChange={actions.setLayout}
          onSplitPanel={actions.splitPanel}
          onRemovePanel={actions.removePanel}
        />
      </div>

      {/* Edit Mode Overlay with smooth transition */}
      {isEditMode && (
        <div className='absolute top-0 left-0 right-0 bottom-0 bg-black/5 pointer-events-none z-10 transition-opacity duration-200' />
      )}
    </div>
  );
});

interface MosaicContainerProps {
  className?: string;
}

export default function MosaicContainer({
  className = 'fixed top-16 bottom-0 left-20 right-0 overflow-hidden p-4',
}: MosaicContainerProps) {
  return (
    <div className={className}>
      <MosaicErrorBoundary
        onError={error => {
          console.error('Mosaic container error:', error);
        }}
      >
        <Suspense fallback={<MosaicLoadingState />}>
          <MosaicContent />
        </Suspense>
      </MosaicErrorBoundary>
    </div>
  );
}
