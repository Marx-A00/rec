// src/components/collections/SortableAlbumGrid.tsx
'use client';

import React, { useState } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragStartEvent,
  DragOverlay,
  UniqueIdentifier,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  rectSortingStrategy,
} from '@dnd-kit/sortable';
import { SortableAlbumItem } from './SortableAlbumItem';
import { CollectionAlbum } from '@/types/collection';

interface SortableAlbumGridProps {
  albums: CollectionAlbum[];
  onReorder?: (albums: CollectionAlbum[]) => void;
  onAlbumClick?: (albumId: string) => void;
  isEditable?: boolean;
  className?: string;
}

// Variable size configuration like the DnD Kit example
const GRID_SIZES = {
  small: 'col-span-1 row-span-1',
  medium: 'col-span-2 row-span-1', 
  large: 'col-span-2 row-span-2',
  wide: 'col-span-3 row-span-1',
  tall: 'col-span-1 row-span-2',
} as const;

type GridSize = keyof typeof GRID_SIZES;

// Assign sizes based on position/rating/preference
function getAlbumGridSize(album: CollectionAlbum, index: number): GridSize {
  // Featured albums (high rating or manually featured)
  if (album.personalRating && album.personalRating >= 9) {
    return 'large';
  }
  
  // Every 8th album gets wide layout
  if (index % 8 === 0 && index > 0) {
    return 'wide';
  }
  
  // Every 12th album gets tall layout  
  if (index % 12 === 0 && index > 0) {
    return 'tall';
  }
  
  // Some albums get medium size
  if (index % 5 === 0) {
    return 'medium';
  }
  
  // Default small size
  return 'small';
}

export default function SortableAlbumGrid({
  albums,
  onReorder,
  onAlbumClick,
  isEditable = false,
  className = '',
}: SortableAlbumGridProps) {
  const [activeId, setActiveId] = useState<UniqueIdentifier | null>(null);
  const [items, setItems] = useState(albums);
  const prevAlbumsRef = React.useRef<string>();

  // Update items when albums prop changes (with stable comparison)
  React.useEffect(() => {
    const albumsHash = JSON.stringify(albums.map(a => ({ id: a.id, albumId: a.albumId })));
    if (prevAlbumsRef.current !== albumsHash) {
      setItems(albums);
      prevAlbumsRef.current = albumsHash;
    }
  }, [albums]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // 8px movement before drag starts
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  function handleDragStart(event: DragStartEvent) {
    const { active } = event;
    setActiveId(active.id);
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = items.findIndex((item) => item.id === active.id);
      const newIndex = items.findIndex((item) => item.id === over.id);

      const reorderedItems = arrayMove(items, oldIndex, newIndex);
      setItems(reorderedItems);
      onReorder?.(reorderedItems);
    }

    setActiveId(null);
  }

  // Find the active album for drag overlay
  const activeAlbum = activeId ? items.find((album) => album.id === activeId) : null;

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <SortableContext items={items.map(album => album.id)} strategy={rectSortingStrategy}>
        <div
          className={`grid grid-cols-6 gap-4 auto-rows-[200px] ${className}`}
          style={{
            gridAutoRows: 'minmax(200px, auto)',
          }}
        >
          {items.map((album, index) => {
            const gridSize = getAlbumGridSize(album, index);
            return (
              <SortableAlbumItem
                key={album.id}
                album={album}
                gridSize={gridSize}
                isDragging={activeId === album.id}
                isEditable={isEditable}
                onAlbumClick={onAlbumClick}
              />
            );
          })}
        </div>
      </SortableContext>

      {/* Drag Overlay */}
      <DragOverlay>
        {activeAlbum ? (
          <div className="opacity-80 transform rotate-6 scale-105">
            <SortableAlbumItem
              album={activeAlbum}
              gridSize={getAlbumGridSize(activeAlbum, items.indexOf(activeAlbum))}
              isDragging={true}
              isEditable={isEditable}
              onAlbumClick={onAlbumClick}
            />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
