'use client';

import { Loader2 } from 'lucide-react';
import { useState } from 'react';

import { Album } from '@/types/album';

interface AddToCollectionButtonProps {
  album: Album;
  onSuccess?: (message: string) => void;
  onError?: (message: string) => void;
}

export default function AddToCollectionButton({
  album,
  onSuccess,
  onError: _onError,
}: AddToCollectionButtonProps) {
  const [isLoading, setIsLoading] = useState(false);

  const handleAddToCollection = async () => {
    setIsLoading(true);

    try {
      const addResponse = await fetch(
        `/api/albums/${album.id}/add-to-collection`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            createNew: false,
            albumTitle: album.title,
            albumArtist: album.artist,
            albumImageUrl: album.image.url,
            albumYear:
              album.year?.toString() ||
              album.releaseDate?.substring(0, 4) ||
              null,
          }),
        }
      );

      const data = await addResponse.json();

      if (!addResponse.ok) {
        throw new Error(data.error || 'Failed to add album to collection');
      }

      onSuccess?.(data.message || `"${album.title}" added to your collection!`);
    } catch (error) {
      console.error('Error adding to collection:', error);
      const errorMessage =
        error instanceof Error ? error.message : 'Failed to add album';
      _onError?.(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <button
      onClick={handleAddToCollection}
      disabled={isLoading}
      className='flex items-center justify-center px-4 py-2 bg-emeraled-green hover:bg-emeraled-green/80 text-white rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed'
    >
      {isLoading ? (
        <>
          <Loader2 className='h-4 w-4 mr-2 animate-spin' />
          Adding...
        </>
      ) : (
        'Add to Collection'
      )}
    </button>
  );
}
