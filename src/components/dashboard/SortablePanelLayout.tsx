// src/components/dashboard/SortablePanelLayout.tsx
'use client';

import React from 'react';
import {
  DndContext,
  DragOverlay,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragEndEvent,
  DragOverEvent,
  useDroppable,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  horizontalListSortingStrategy,
} from '@dnd-kit/sortable';
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from '@/components/ui/resizable';
import { PanelLayout, Panel } from '@/types/dashboard';
import { useDashboard } from '@/contexts/DashboardContext';
import SortablePanelWrapper from './SortablePanelWrapper';
import PanelWrapper from './PanelWrapper';
// import DropZone from './DropZone'; // No longer needed
import LayoutDirectionToggle from './LayoutDirectionToggle';

interface SortablePanelLayoutProps {
  layout: PanelLayout;
  className?: string;
}

export default function SortablePanelLayout({ 
  layout, 
  className = 'h-full' 
}: SortablePanelLayoutProps) {
  const { state, actions } = useDashboard();
  const { isEditMode } = state;
  const [activePanel, setActivePanel] = React.useState<Panel | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // 8px of movement before drag starts
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Recursive function to render panel layouts with drag and drop
  const renderPanelGroup = (panelLayout: PanelLayout, layoutPath: string[] = []): React.ReactNode => {
    if (!panelLayout.panels || panelLayout.panels.length === 0) {
      return (
        <div className="bg-zinc-900/50 p-6 h-full flex items-center justify-center">
          <p className="text-zinc-400">No panels configured</p>
        </div>
      );
    }

    const panelIds = panelLayout.panels.map(panel => panel.id);
    const sortingStrategy = panelLayout.direction === 'vertical' 
      ? verticalListSortingStrategy 
      : horizontalListSortingStrategy;

    return (
      <div className="h-full flex flex-col">
        {/* Layout Controls - Show in edit mode for nested layouts */}
        {isEditMode && layoutPath.length > 0 && (
          <div className="flex items-center justify-between p-2 bg-zinc-800/50 border-b border-zinc-700">
            <div className="flex items-center gap-2">
              <span className="text-xs text-zinc-400">Group Layout:</span>
            </div>
            <LayoutDirectionToggle 
              layoutPath={layoutPath}
              currentDirection={panelLayout.direction}
            />
          </div>
        )}

        {/* Group creation is now handled by buttons on selected panels */}

        {/* Main Panel Group */}
        <div className="flex-1">
          <SortableContext items={panelIds} strategy={sortingStrategy}>
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
                      renderPanelGroup(panel.layout, [...layoutPath, panel.id])
                    ) : (
                      // Otherwise, render the sortable panel component
                      isEditMode ? (
                        <SortablePanelWrapper 
                          panel={panel} 
                          isDragActive={!!activePanel}
                        />
                      ) : (
                        <PanelWrapper panel={panel} />
                      )
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
          </SortableContext>
        </div>
      </div>
    );
  };

  const handleDragStart = (event: DragStartEvent) => {
    const activeId = event.active.id as string;
    
    // Find the active panel recursively
    const findPanel = (layout: PanelLayout): Panel | null => {
      for (const panel of layout.panels) {
        if (panel.id === activeId) {
          return panel;
        }
        if (panel.layout) {
          const found = findPanel(panel.layout);
          if (found) return found;
        }
      }
      return null;
    };

    const active = findPanel(layout);
    setActivePanel(active);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (!over) {
      setActivePanel(null);
      return;
    }

    const activeId = active.id as string;
    const overId = over.id as string;
    const dropData = over.data.current;

    // Check if this is a smart drop onto a zone
    if (dropData?.type === 'panel-drop-zone') {
      const { zoneType, panelId } = dropData;
      actions.smartDrop(activeId, panelId, zoneType);
    } else if (activeId !== overId) {
      // Regular reordering
      actions.reorderPanels(activeId, overId);
    }
    
    setActivePanel(null);
  };

  // If not in edit mode, use the regular non-sortable layout
  if (!isEditMode) {
    return (
      <div className={className}>
        {renderPanelGroup(layout)}
      </div>
    );
  }

  return (
    <div className={className}>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        {renderPanelGroup(layout)}
        
        <DragOverlay>
          {activePanel ? (
            <div className="bg-zinc-800 border-2 border-emerald-500 rounded-lg p-3 shadow-xl">
              <span className="text-white font-medium">
                {activePanel.config.headerTitle || activePanel.type}
              </span>
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
}
