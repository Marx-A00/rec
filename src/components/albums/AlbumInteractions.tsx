'use client';

import { useRouter } from 'next/navigation';
import { Heart, Share2, MoreHorizontal, User } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { useSession } from 'next-auth/react';

import { Button } from '@/components/ui/button';
import Toast, { useToast } from '@/components/ui/toast';
import CollectionPopover from '@/components/collections/CollectionPopover';
import { useNavigation } from '@/hooks/useNavigation';
import { useRecommendationDrawerContext } from '@/contexts/RecommendationDrawerContext';
import { useAlbumState } from '@/hooks/useAlbumState';
import { Album } from '@/types/album';
import { sanitizeArtistName } from '@/lib/utils';
import { graphqlClient } from '@/lib/graphql-client';
import {
  GetArtistByMusicBrainzIdDocument,
  type GetArtistByMusicBrainzIdQuery,
} from '@/generated/graphql';

interface AlbumInteractionsProps {
  album: Album;
}

export default function AlbumInteractions({ album }: AlbumInteractionsProps) {
  const {} = useNavigation();
  const { toast, showToast, hideToast } = useToast();
  const router = useRouter();
  const { openDrawer } = useRecommendationDrawerContext();
  const queryClient = useQueryClient();
  const { data: session } = useSession();

  // Get unified album state to check collections
  const albumState = useAlbumState(album);

  const handleArtistClick = async (artistId: string, artistName: string) => {
    if (!artistId) {
      showToast(`Artist ID not available for ${artistName}`, 'error');
      return;
    }

    try {
      let finalArtistId = artistId;
      let artistSource: string;

      // If album is from local DB, artists are definitely local
      if (album.source === 'local') {
        artistSource = 'local';
      } else {
        // Album is from external source (MusicBrainz/Discogs)
        // Try to find artist in local DB by MusicBrainz ID first
        try {
          const result =
            await queryClient.fetchQuery<GetArtistByMusicBrainzIdQuery>({
              queryKey: ['artistByMusicBrainzId', artistId],
              queryFn: () =>
                graphqlClient.request(GetArtistByMusicBrainzIdDocument, {
                  musicbrainzId: artistId,
                }),
              staleTime: 5 * 60 * 1000, // Cache for 5 minutes
            });

          if (result?.artistByMusicBrainzId?.id) {
            // Found in local DB! Use local ID
            finalArtistId = result.artistByMusicBrainzId.id;
            artistSource = 'local';
            console.log(
              `[AlbumInteractions] Found artist locally: ${artistName}`,
              {
                mbid: artistId,
                localId: finalArtistId,
              }
            );
          } else {
            // Not in local DB, use external source
            artistSource = album.source?.toLowerCase() || 'musicbrainz';
            console.log(
              `[AlbumInteractions] Artist not in local DB, using ${artistSource}: ${artistName}`
            );
          }
        } catch (error) {
          // Query failed, fall back to external source
          artistSource = album.source?.toLowerCase() || 'musicbrainz';
          console.warn(
            '[AlbumInteractions] Failed to check local DB for artist:',
            error
          );
        }
      }

      // Navigate to artist page with appropriate source
      router.push(`/artists/${finalArtistId}?source=${artistSource}`);
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
      <div
        data-tour-step='album-interactions'
        className='flex flex-wrap gap-4 mb-8 justify-center lg:justify-start'
      >
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

        <CollectionPopover album={album} size='lg' variant='default' />

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
