'use client';

import { useRouter } from 'next/navigation';

import { Button } from '@/components/ui/button';
import Toast, { useToast } from '@/components/ui/toast';
import AddToCollectionButton from '@/components/collections/AddToCollectionButton';
import { useNavigation } from '@/hooks/useNavigation';
import { Album } from '@/types/album';
import { sanitizeArtistName } from '@/lib/utils';

interface AlbumInteractionsProps {
  album: Album;
}

export default function AlbumInteractions({ album }: AlbumInteractionsProps) {
  const {} = useNavigation();
  const { toast, showToast, hideToast } = useToast();
  const router = useRouter();

  const handleArtistClick = async (artistId: string, artistName: string) => {
    if (!artistId) {
      showToast(`Artist ID not available for ${artistName}`, 'error');
      return;
    }

    try {
      // Navigate to artist page
      router.push(`/artists/${artistId}`);
    } catch (error) {
      console.error('Navigation error:', error);
      showToast(
        `Failed to navigate to ${artistName}: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'error'
      );
    }
  };

  return (
    <>
      {/* Artist buttons */}
      {album.artists && album.artists.length > 0 && (
        <div className='space-y-2'>
          <h3 className='text-sm font-medium text-zinc-400'>Artists</h3>
          <div className='flex flex-wrap gap-2'>
            {album.artists.map(artist => (
              <Button
                key={artist.id}
                variant='outline'
                size='sm'
                onClick={() => handleArtistClick(artist.id, artist.name)}
                className='bg-zinc-800 border-zinc-600 hover:bg-zinc-700 text-white'
              >
                {sanitizeArtistName(artist.name)}
              </Button>
            ))}
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className='flex flex-wrap gap-4 mb-8 justify-center lg:justify-start'>
        <button className='bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-lg font-medium transition-colors'>
          Make Rec
        </button>
        <AddToCollectionButton album={album} />
        <button className='bg-zinc-700 hover:bg-zinc-600 text-white px-6 py-3 rounded-lg font-medium transition-colors'>
          Other
        </button>
      </div>

      {/* Toast Notification */}
      <Toast
        message={toast.message}
        type={toast.type}
        isVisible={toast.isVisible}
        onClose={hideToast}
      />
    </>
  );
}
