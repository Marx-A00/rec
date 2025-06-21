'use client';

import React from 'react';
import AlbumImage from '@/components/ui/AlbumImage';
import { Button } from '@/components/ui/button';
import { Album } from '@/types/album';
import { sanitizeArtistName } from '@/lib/utils';

interface CollageGridProps {
  selectedAlbums: Album[];
  gridSize: number;
  onAlbumClick?: (index: number) => void;
  onRemoveAlbum: (index: number) => void;
}

export default function CollageGrid({
  selectedAlbums,
  gridSize,
  onAlbumClick,
  onRemoveAlbum,
}: CollageGridProps) {
  // Create a grid array with proper size
  const gridItems = Array.from({ length: gridSize * gridSize }, (_, index) => {
    const album = selectedAlbums[index];
    return album || null;
  });

  return (
    <div className='bg-zinc-900 rounded-lg p-4'>
      <h3 className='text-lg font-semibold text-white mb-4'>
        Collage Preview ({gridSize}×{gridSize})
      </h3>

      <div
        className={`grid gap-1 w-full max-w-md mx-auto`}
        style={{
          gridTemplateColumns: `repeat(${gridSize}, 1fr)`,
          aspectRatio: '1',
        }}
      >
        {gridItems.map((album, index) => (
          <div
            key={index}
            className='aspect-square bg-zinc-800 rounded cursor-pointer hover:opacity-80 transition-opacity'
            onClick={() => onAlbumClick?.(index)}
          >
            {album ? (
              <>
                <AlbumImage
                  src={album.image?.url}
                  alt={`${sanitizeArtistName(album.artists?.[0]?.name || 'Unknown Artist')} - ${album.title}`}
                  width={120}
                  height={120}
                  className='w-full h-full object-cover rounded'
                  sizes='120px'
                />
                <div className='absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-70 transition-all duration-200 flex items-center justify-center'>
                  <Button
                    variant='ghost'
                    size='sm'
                    onClick={e => {
                      e.stopPropagation();
                      onRemoveAlbum(index);
                    }}
                    className='opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-300 bg-black bg-opacity-75 rounded-full w-8 h-8 p-0'
                  >
                    ×
                  </Button>
                </div>
              </>
            ) : (
              <div className='w-full h-full flex items-center justify-center text-zinc-600'>
                <span className='text-xs'>+</span>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
