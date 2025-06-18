'use client';

import AddToCollectionButton from '@/components/collections/AddToCollectionButton';
import Toast, { useToast } from '@/components/ui/toast';
import { useNavigation } from '@/hooks/useNavigation';
import { Album } from '@/types/album';

interface AlbumInteractionsProps {
  album: Album;
}

export default function AlbumInteractions({ album }: AlbumInteractionsProps) {
  const { navigateToArtist } = useNavigation();
  const { toast, showToast, hideToast } = useToast();

  const handleArtistClick = async (artistId: string, artistName: string) => {
    if (!artistId) {
      showToast(`Artist ID not available for ${artistName}`, 'error');
      return;
    }

    try {
      await navigateToArtist(artistId, {
        onSuccess: () => {
          // Optionally show success feedback or handle side effects
        },
        onError: error => {
          showToast(
            `Failed to navigate to ${artistName}: ${error.message}`,
            'error'
          );
        },
      });
    } catch (error) {
      // Error is already handled by the onError callback
      console.error('Navigation error:', error);
    }
  };

  return (
    <>
      {/* Artist Links */}
      <div className='flex flex-wrap items-center gap-2'>
        {album.artists?.map((artist, index) => (
          <span key={artist.id || index}>
            <button
              onClick={() => handleArtistClick(artist.id, artist.name)}
              className='text-2xl text-zinc-300 hover:text-white hover:underline transition-colors cursor-pointer'
            >
              {artist.name}
            </button>
            {index < (album.artists?.length || 0) - 1 && (
              <span className='text-zinc-500 mx-1'>,</span>
            )}
          </span>
        )) || <span className='text-2xl text-zinc-300'>Unknown Artist</span>}
      </div>

      {/* Action Buttons */}
      <div className='flex flex-wrap gap-4 mb-8 justify-center lg:justify-start'>
        <button className='bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-lg font-medium transition-colors'>
          Make Rec
        </button>
        <AddToCollectionButton
          album={album}
          onSuccess={(message: string) => showToast(message, 'success')}
          onError={(message: string) => showToast(message, 'error')}
        />
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
