'use client';

import { X } from 'lucide-react';

import AlbumImage from '@/components/ui/AlbumImage';

export interface SelectedArtist {
  id: string;
  name: string;
  imageUrl?: string | null;
  cloudflareImageId?: string | null;
  source?: 'local' | 'musicbrainz' | 'discogs' | 'spotify';
  preFilledFromLastfm?: boolean;
  /** MusicBrainz ID — set for non-local Last.fm artists that need creation on save */
  mbid?: string;
}

interface ArtistItemProps {
  artist: SelectedArtist;
  isLarge: boolean;
  onRemoveAction: (id: string) => void;
}

export function ArtistItem({
  artist,
  isLarge,
  onRemoveAction,
}: ArtistItemProps) {
  const sizeClass = isLarge ? 'col-span-2 row-span-2' : 'col-span-1 row-span-1';

  return (
    <div className={sizeClass}>
      <div className='group relative'>
        <div className='relative aspect-square overflow-hidden rounded-lg'>
          <AlbumImage
            src={artist.imageUrl}
            cloudflareImageId={artist.cloudflareImageId}
            alt={artist.name}
            className='w-full h-full object-cover group-hover:scale-105 transition-transform duration-300'
            fill
            sizes={isLarge ? '200px' : '100px'}
          />

          {/* Remove button */}
          <button
            type='button'
            onClick={() => onRemoveAction(artist.id)}
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
