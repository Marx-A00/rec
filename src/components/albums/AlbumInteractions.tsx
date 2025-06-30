'use client';

import { useRouter } from 'next/navigation';
import { Heart, Share2, MoreHorizontal, User } from 'lucide-react';

import { Button } from '@/components/ui/button';
import Toast, { useToast } from '@/components/ui/toast';
import AddToCollectionButton from '@/components/collections/AddToCollectionButton';
import { useNavigation } from '@/hooks/useNavigation';
import { useRecommendationDrawerContext } from '@/contexts/RecommendationDrawerContext';
import { Album } from '@/types/album';
import { sanitizeArtistName } from '@/lib/utils';

interface AlbumInteractionsProps {
  album: Album;
}

export default function AlbumInteractions({ album }: AlbumInteractionsProps) {
  const {} = useNavigation();
  const { toast, showToast, hideToast } = useToast();
  const router = useRouter();
  const { openDrawer } = useRecommendationDrawerContext();

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

  const handleMakeRecommendation = () => {
    try {
      // Open recommendation drawer with current album pre-filled
      openDrawer(album);
      showToast('Recommendation form opened', 'success');
    } catch (error) {
      console.error('Failed to open recommendation form:', error);
      showToast('Failed to open recommendation form', 'error');
    }
  };

  const handleShare = async () => {
    try {
      if (navigator.share) {
        await navigator.share({
          title: `${album.title} by ${album.artists?.map(a => a.name).join(', ')}`,
          text: `Check out this album: ${album.title}`,
          url: window.location.href,
        });
        showToast('Album shared successfully', 'success');
      } else {
        // Fallback to clipboard
        await navigator.clipboard.writeText(window.location.href);
        showToast('Album link copied to clipboard', 'success');
      }
    } catch (error) {
      console.error('Share failed:', error);
      showToast('Failed to share album', 'error');
    }
  };

  const handleMoreActions = () => {
    showToast('More actions coming soon!', 'success');
  };

  return (
    <>
      {/* Artist buttons */}
      {album.artists && album.artists.length > 0 && (
        <div className='space-y-2 mb-8'>
          <h3 className='text-sm font-medium text-zinc-400'>Artists</h3>
          <div className='flex flex-wrap gap-2'>
            {album.artists.map(artist => (
              <Button
                key={artist.id}
                variant='secondary'
                size='sm'
                onClick={() => handleArtistClick(artist.id, artist.name)}
                className='gap-2'
                aria-label={`View artist ${sanitizeArtistName(artist.name)}`}
              >
                <User className='h-3 w-3' />
                {sanitizeArtistName(artist.name)}
              </Button>
            ))}
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className='flex flex-wrap gap-4 mb-8 justify-center lg:justify-start'>
        <Button
          variant='primary'
          size='lg'
          onClick={handleMakeRecommendation}
          className='gap-2'
          aria-label='Create a recommendation for this album'
        >
          <Heart className='h-4 w-4' />
          Make Rec
        </Button>

        <AddToCollectionButton album={album} size='lg' variant='default' />

        <Button
          variant='outline'
          size='lg'
          onClick={handleShare}
          className='gap-2'
          aria-label='Share this album'
        >
          <Share2 className='h-4 w-4' />
          Share
        </Button>

        <Button
          variant='ghost'
          size='lg'
          onClick={handleMoreActions}
          className='gap-2'
          aria-label='More actions for this album'
        >
          <MoreHorizontal className='h-4 w-4' />
          More
        </Button>
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
