'use client';

import React, { useState, useCallback } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { ResizableBox, ResizeCallbackData } from 'react-resizable';
import { GripVertical, X } from 'lucide-react';
import { FlatPanel } from '@/types/mosaic';
import { panelRegistry } from '@/lib/dashboard/PanelRegistry';
import 'react-resizable/css/styles.css';

interface ResizableMosaicTileProps {
  tile: FlatPanel;
  isEditMode: boolean;
  onResize: (id: string, width: number, height: number) => void;
  onRemove: (id: string) => void;
  gridUnit: number; // Size of one grid unit in pixels
}

export default function ResizableMosaicTile({
  tile,
  isEditMode,
  onResize,
  onRemove,
  gridUnit = 50,
}: ResizableMosaicTileProps) {
  const [isResizing, setIsResizing] = useState(false);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: tile.id,
    disabled: isResizing || !isEditMode, // Disable drag when resizing or not in edit mode
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition: isDragging || isResizing ? undefined : transition,
    opacity: isDragging ? 0.5 : 1,
    gridColumn: `${tile.x} / span ${tile.width}`,
    gridRow: `${tile.y} / span ${tile.height}`,
    zIndex: isDragging ? 50 : isResizing ? 40 : 'auto',
  };

  const handleResizeStart = useCallback(() => {
    setIsResizing(true);
  }, []);

  const handleResizeStop = useCallback(
    (e: React.SyntheticEvent, data: ResizeCallbackData) => {
      setIsResizing(false);
      // Convert pixel dimensions back to grid units
      const newWidth = Math.round(data.size.width / gridUnit);
      const newHeight = Math.round(data.size.height / gridUnit);
      onResize(tile.id, newWidth, newHeight);
    },
    [tile.id, onResize, gridUnit]
  );

  // Get the panel component from registry
  const panelDef = panelRegistry.get(tile.type);
  if (!panelDef) {
    return (
      <div
        ref={setNodeRef}
        style={style}
        className="bg-zinc-900/50 rounded-lg border border-zinc-800 p-4"
      >
        <p className="text-zinc-400">Unknown tile type: {tile.type}</p>
      </div>
    );
  }

  const PanelComponent = panelDef.component;

  // Only render ResizableBox in edit mode
  if (isEditMode) {
    return (
      <div ref={setNodeRef} style={style}>
        <ResizableBox
          width={tile.width * gridUnit}
          height={tile.height * gridUnit}
          minConstraints={[
            (tile.minWidth || 2) * gridUnit,
            (tile.minHeight || 2) * gridUnit,
          ]}
          maxConstraints={[
            (tile.maxWidth || 12) * gridUnit,
            (tile.maxHeight || 12) * gridUnit,
          ]}
          onResizeStart={handleResizeStart}
          onResizeStop={handleResizeStop}
          resizeHandles={['se', 'sw', 'ne', 'nw', 'n', 's', 'e', 'w']}
          handle={
            <span className="absolute bottom-2 right-2 w-5 h-5 cursor-se-resize">
              <svg className="w-full h-full text-zinc-600">
                <path
                  d="M 0 12 L 12 0 M 4 12 L 12 4 M 8 12 L 12 8"
                  stroke="currentColor"
                  strokeWidth="1.5"
                />
              </svg>
            </span>
          }
          className="h-full"
        >
          <div className="h-full bg-zinc-900/50 rounded-lg border border-zinc-800 relative group overflow-hidden">
            {/* Drag Handle */}
            <div
              {...attributes}
              {...listeners}
              className="absolute top-2 left-2 p-1.5 rounded bg-zinc-800/80 cursor-move hover:bg-zinc-700/80 transition-colors z-10"
              style={{ touchAction: 'none' }}
            >
              <GripVertical className="w-4 h-4 text-zinc-400" />
            </div>

            {/* Remove Button */}
            <button
              onClick={() => onRemove(tile.id)}
              className="absolute top-2 right-2 p-1.5 rounded bg-zinc-800/80 hover:bg-red-900/80 transition-colors z-10"
            >
              <X className="w-4 h-4 text-zinc-400 hover:text-red-400" />
            </button>

            {/* Tile Content */}
            <div className="h-full p-4 pt-12">
              <PanelComponent
                panelId={tile.id}
                config={tile.config}
                isEditMode={isEditMode}
              />
            </div>

            {/* Visual feedback during operations */}
            {(isDragging || isResizing) && (
              <div className="absolute inset-0 bg-blue-500/10 border-2 border-blue-500 rounded-lg pointer-events-none" />
            )}
          </div>
        </ResizableBox>
      </div>
    );
  }

  // Non-edit mode: just render the tile without resize/drag capabilities
  return (
    <div ref={setNodeRef} style={style}>
      <div className="h-full bg-zinc-900/50 rounded-lg border border-zinc-800 overflow-hidden">
        <PanelComponent
          panelId={tile.id}
          config={tile.config}
          isEditMode={false}
        />
      </div>
    </div>
  );
}