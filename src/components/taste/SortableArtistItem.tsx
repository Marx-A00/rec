'use client';

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, X } from 'lucide-react';

import AlbumImage from '@/components/ui/AlbumImage';

export interface SelectedArtist {
  id: string;
  name: string;
  imageUrl?: string | null;
  cloudflareImageId?: string | null;
  source?: 'local' | 'musicbrainz' | 'discogs' | 'spotify';
  preFilledFromLastfm?: boolean;
}

interface SortableArtistItemProps {
  artist: SelectedArtist;
  isLarge: boolean;
  onRemoveAction: (id: string) => void;
}

export function SortableArtistItem({
  artist,
  isLarge,
  onRemoveAction,
}: SortableArtistItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: artist.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const sizeClass = isLarge ? 'col-span-2 row-span-2' : 'col-span-1 row-span-1';

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`
        ${sizeClass}
        ${isDragging ? 'opacity-50 z-50' : 'opacity-100'}
        cursor-grab active:cursor-grabbing
        transition-opacity duration-200
      `}
      {...attributes}
      {...listeners}
    >
      <div className='group relative'>
        <div
          className={`relative ${isLarge ? 'aspect-square' : 'aspect-square'} overflow-hidden rounded-lg`}
        >
          <AlbumImage
            src={artist.imageUrl}
            cloudflareImageId={artist.cloudflareImageId}
            alt={artist.name}
            className='w-full h-full object-cover group-hover:scale-105 transition-transform duration-300'
            fill
            sizes={isLarge ? '200px' : '100px'}
          />

          {/* Grip handle */}
          <div className='absolute top-1.5 left-1.5 z-10 opacity-0 group-hover:opacity-100 transition-opacity bg-black/50 rounded p-1'>
            <GripVertical className='w-3.5 h-3.5 text-white' />
          </div>

          {/* Remove button */}
          <button
            type='button'
            onClick={e => {
              e.stopPropagation();
              onRemoveAction(artist.id);
            }}
            className='absolute top-1.5 right-1.5 z-10 opacity-0 group-hover:opacity-100 transition-opacity bg-black/60 hover:bg-black/80 rounded-full p-1'
          >
            <X className='w-3 h-3 text-white' />
          </button>

          {/* Last.fm badge */}
          {artist.preFilledFromLastfm && (
            <div className='absolute bottom-1.5 left-1.5 z-10 bg-[#D51007] rounded px-1.5 py-0.5'>
              <span className='text-white text-[7px] font-bold leading-none'>
                last.fm
              </span>
            </div>
          )}
        </div>

        <p className='mt-1.5 text-white font-medium text-xs truncate'>
          {artist.name}
        </p>
      </div>
    </div>
  );
}
