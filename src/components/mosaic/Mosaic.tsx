'use client';

import React, { useState, useCallback } from 'react';
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
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  rectSortingStrategy,
} from '@dnd-kit/sortable';
import { FlatPanel } from '@/types/mosaic';
import ResizableMosaicTile from './ResizableMosaicTile';
import { panelRegistry } from '@/lib/dashboard/PanelRegistry';

interface MosaicProps {
  tiles: FlatPanel[];
  isEditMode: boolean;
  onTilesChange: (tiles: FlatPanel[]) => void;
  onRemoveTile: (id: string) => void;
}

export default function Mosaic({
  tiles,
  isEditMode,
  onTilesChange,
  onRemoveTile,
}: MosaicProps) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const gridUnit = 80; // pixels per grid unit
  const gridColumns = 12;
  const gridRows = 12;

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveId(String(event.active.id));
  }, []);

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      setActiveId(null);
      const { active, over } = event;

      if (over && active.id !== over.id) {
        const activeIndex = tiles.findIndex(t => t.id === active.id);
        const overIndex = tiles.findIndex(t => t.id === over.id);

        if (activeIndex !== -1 && overIndex !== -1) {
          const newTiles = [...tiles];
          // Swap positions
          const activeTile = newTiles[activeIndex];
          const overTile = newTiles[overIndex];

          // Swap grid positions
          const tempX = activeTile.x;
          const tempY = activeTile.y;
          activeTile.x = overTile.x;
          activeTile.y = overTile.y;
          overTile.x = tempX;
          overTile.y = tempY;

          onTilesChange(newTiles);
        }
      }
    },
    [tiles, onTilesChange]
  );

  const handleResize = useCallback(
    (id: string, width: number, height: number) => {
      const newTiles = tiles.map(tile =>
        tile.id === id
          ? { ...tile, width: Math.min(width, gridColumns - tile.x + 1), height: Math.min(height, gridRows - tile.y + 1) }
          : tile
      );
      onTilesChange(newTiles);
    },
    [tiles, onTilesChange, gridColumns, gridRows]
  );

  const activeTile = tiles.find(t => t.id === activeId);

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <SortableContext items={tiles.map(t => t.id)} strategy={rectSortingStrategy}>
        <div
          className="relative h-full p-4"
          style={{
            display: 'grid',
            gridTemplateColumns: `repeat(${gridColumns}, ${gridUnit}px)`,
            gridTemplateRows: `repeat(${gridRows}, ${gridUnit}px)`,
            gap: '12px',
            overflow: 'auto',
          }}
        >
          {/* Grid background for edit mode */}
          {isEditMode && (
            <div
              className="absolute inset-4 pointer-events-none opacity-10"
              style={{
                backgroundImage: `
                  linear-gradient(to right, #3f3f46 1px, transparent 1px),
                  linear-gradient(to bottom, #3f3f46 1px, transparent 1px)
                `,
                backgroundSize: `${gridUnit}px ${gridUnit}px`,
              }}
            />
          )}

          {tiles.map(tile => (
            <ResizableMosaicTile
              key={tile.id}
              tile={tile}
              isEditMode={isEditMode}
              onResize={handleResize}
              onRemove={onRemoveTile}
              gridUnit={gridUnit}
            />
          ))}
        </div>
      </SortableContext>

      {/* Drag Overlay */}
      <DragOverlay>
        {activeId && activeTile ? (
          <div
            className="bg-zinc-900/90 rounded-lg border-2 border-blue-500 shadow-2xl"
            style={{
              width: activeTile.width * gridUnit,
              height: activeTile.height * gridUnit,
            }}
          >
            <div className="p-4 text-zinc-300">
              {panelRegistry.get(activeTile.type)?.displayName || 'Tile'}
            </div>
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}