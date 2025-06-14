'use client';

import Image from 'next/image';

import { Button } from '@/components/ui/button';
import { Album } from '@/types/album';

interface CollageGridProps {
  selectedAlbums: (Album | null)[];
  onRemoveAlbum: (index: number) => void;
}

export default function CollageGrid({
  selectedAlbums,
  onRemoveAlbum,
}: CollageGridProps) {
  const handleImageError = (
    e: React.SyntheticEvent<HTMLImageElement, Event>
  ) => {
    const target = e.target as HTMLImageElement;

    // If the image has crossOrigin set, try removing it and reloading
    if (target.crossOrigin) {
      target.crossOrigin = '';
      target.src = target.src; // Force reload without CORS
    } else {
      // If still failing, use placeholder
      target.src = '/placeholder.svg?height=400&width=400';
    }
  };

  return (
    <div className='bg-zinc-900 rounded-lg p-6'>
      <h3 className='text-xl font-semibold text-cosmic-latte mb-4'>
        5×5 Album Grid
      </h3>

      {/* Grid for download generation */}
      <div
        id='collage-grid'
        className='grid grid-cols-5 gap-1 bg-black p-4 rounded-lg'
        style={{ width: '500px', height: '500px' }} // Fixed size for consistent export
      >
        {selectedAlbums.map((album, index) => (
          <div
            key={index}
            className='relative aspect-square bg-zinc-800 rounded border-2 border-zinc-700 overflow-hidden group'
          >
            {album ? (
              <>
                <Image
                  src={album.image.url}
                  alt={`${album.artists?.[0]?.name} - ${album.title}`}
                  width={96}
                  height={96}
                  className='w-full h-full object-cover'
                  onError={handleImageError}
                />
                <div className='absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-70 transition-all duration-200 flex items-center justify-center'>
                  <Button
                    variant='ghost'
                    size='sm'
                    onClick={() => onRemoveAlbum(index)}
                    className='opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-300 bg-black bg-opacity-75 rounded-full w-8 h-8 p-0'
                  >
                    ×
                  </Button>
                </div>
              </>
            ) : (
              <div className='w-full h-full flex items-center justify-center border-2 border-dashed border-zinc-600'>
                <span className='text-zinc-500 text-xs font-medium'>
                  {index + 1}
                </span>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
