// src/components/collections/SortableAlbumItem.tsx
'use client';

import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { CollectionAlbum } from '@/types/collection';
import AlbumImage from '@/components/ui/AlbumImage';
import { Star, GripVertical } from 'lucide-react';

// Grid size configurations
const GRID_SIZES = {
  small: 'col-span-1 row-span-1',
  medium: 'col-span-2 row-span-1', 
  large: 'col-span-2 row-span-2',
  wide: 'col-span-3 row-span-1',
  tall: 'col-span-1 row-span-2',
} as const;

type GridSize = keyof typeof GRID_SIZES;

interface SortableAlbumItemProps {
  album: CollectionAlbum;
  gridSize: GridSize;
  isDragging?: boolean;
  isEditable?: boolean;
  onAlbumClick?: (albumId: string) => void;
}

export function SortableAlbumItem({
  album,
  gridSize,
  isDragging = false,
  isEditable = false,
  onAlbumClick,
}: SortableAlbumItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging: isSortableDragging,
  } = useSortable({ id: album.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  // Different content layouts based on grid size
  const renderContent = () => {
    const isLarge = gridSize === 'large';
    const isWide = gridSize === 'wide';
    
    return (
      <div className="group relative">
        {/* Drag indicator - only show if editable */}
        {isEditable && (
          <div className="absolute top-2 right-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity bg-black/50 rounded p-1 pointer-events-none">
            <GripVertical className="w-4 h-4 text-white" />
          </div>
        )}

        {/* Album Cover */}
        <button type="button" onClick={() => onAlbumClick?.(album.albumId)} className="block w-full text-left">
          <div className={`relative ${isLarge || isWide ? 'h-full' : 'aspect-square'} overflow-hidden rounded-lg`}>
            <AlbumImage
              src={album.albumImageUrl}
              alt={album.albumTitle}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            />
            {(isLarge || isWide) && album.personalRating && (
              <div className="absolute top-2 left-2 bg-black/70 rounded px-2 py-1 flex items-center gap-1">
                <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" />
                <span className="text-white text-xs font-medium">{album.personalRating}</span>
              </div>
            )}
          </div>
          <div className="mt-2">
            <h3 className="text-white font-medium text-sm line-clamp-1">{album.albumTitle}</h3>
            <p className="text-zinc-300 text-xs line-clamp-1">{album.albumArtist}</p>
          </div>
        </button>
      </div>
    );
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`
        ${GRID_SIZES[gridSize]}
        ${isDragging || isSortableDragging ? 'opacity-50 z-50' : 'opacity-100'}
        ${isEditable ? 'cursor-grab active:cursor-grabbing' : ''}
        transition-opacity duration-200
      `}
      {...(isEditable ? { ...attributes, ...listeners } : {})}
    >
      {renderContent()}
    </div>
  );
}
