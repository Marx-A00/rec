// src/components/dashboard/DynamicPanelLayout.tsx
'use client';

import React from 'react';
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from '@/components/ui/resizable';
import { PanelLayout } from '@/types/dashboard';
import PanelWrapper from './PanelWrapper';

interface DynamicPanelLayoutProps {
  layout: PanelLayout;
  className?: string;
}

export default function DynamicPanelLayout({ 
  layout, 
  className = 'h-full' 
}: DynamicPanelLayoutProps) {
  
  // Recursive function to render panel layouts
  const renderPanelGroup = (panelLayout: PanelLayout): React.ReactNode => {
    if (!panelLayout.panels || panelLayout.panels.length === 0) {
      return (
        <div className="bg-zinc-900/50 rounded-lg p-6 border border-zinc-800 h-full flex items-center justify-center">
          <p className="text-zinc-400">No panels configured</p>
        </div>
      );
    }

    return (
      <ResizablePanelGroup direction={panelLayout.direction} className="h-full">
        {panelLayout.panels.map((panel, index) => (
          <React.Fragment key={panel.id}>
            <ResizablePanel 
              defaultSize={panel.size}
              minSize={panel.minSize}
              maxSize={panel.maxSize}
            >
              {panel.layout ? (
                // If this panel has a nested layout, render it recursively
                renderPanelGroup(panel.layout)
              ) : (
                // Otherwise, render the panel component
                <PanelWrapper panel={panel} />
              )}
            </ResizablePanel>
            
            {/* Add resize handle between panels (but not after the last one) */}
            {index < panelLayout.panels.length - 1 && (
              <ResizableHandle 
                withHandle
                className={
                  panelLayout.direction === 'vertical' 
                    ? 'h-px bg-zinc-800 hover:bg-zinc-700'
                    : 'w-px bg-zinc-800 hover:bg-zinc-700'
                }
              />
            )}
          </React.Fragment>
        ))}
      </ResizablePanelGroup>
    );
  };

  return (
    <div className={className}>
      {renderPanelGroup(layout)}
    </div>
  );
}
