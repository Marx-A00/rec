'use client';

import { useState } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Album } from '@/types/album';
import { useToast } from '@/components/ui/toast';
import { sanitizeArtistName } from '@/lib/utils';

interface AddToCollectionButtonProps {
  album: Album;
  size?: 'sm' | 'default' | 'lg';
  variant?: 'default' | 'outline' | 'ghost';
}

export default function AddToCollectionButton({
  album,
  size = 'sm',
  variant = 'outline',
}: AddToCollectionButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const { showToast } = useToast();

  const handleAddToCollection = async () => {
    setIsLoading(true);

    try {
      const response = await fetch(
        `/api/albums/${album.id}/add-to-collection`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            albumId: album.id,
            albumTitle: album.title,
            albumArtist: sanitizeArtistName(
              album.artists?.[0]?.name || 'Unknown Artist'
            ),
            albumYear: album.year,
            albumImageUrl: album.image?.url,
          }),
        }
      );

      if (!response.ok) {
        throw new Error('Failed to add to collection');
      }

      showToast('Added to your collection!', 'success');
    } catch (error) {
      console.error('Error adding to collection:', error);
      showToast('Failed to add to collection', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Button
      size={size}
      variant={variant}
      onClick={handleAddToCollection}
      disabled={isLoading}
      className='flex items-center gap-1'
    >
      <Plus className='h-4 w-4' />
      {isLoading ? 'Adding...' : 'Add to Collection'}
    </Button>
  );
}
