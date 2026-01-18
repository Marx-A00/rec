'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowLeft,
  Calendar,
  Share2,
  Heart,
  Bookmark,
  ChevronRight,
  Music,
  Check,
} from 'lucide-react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';

import AlbumImage from '@/components/ui/AlbumImage';
import { MobileButton } from '@/components/mobile/MobileButton';
import MobileAlbumRecommendations from '@/components/mobile/MobileAlbumRecommendations';
import CollectionSelectionSheet from '@/components/mobile/CollectionSelectionSheet';
import { useAlbumState } from '@/hooks/useAlbumState';
import { cn, sanitizeArtistName } from '@/lib/utils';
import type { Album, Track } from '@/types/album';

interface MobileAlbumPageProps {
  params: Promise<{ id: string }>;
}

// Format duration from seconds to mm:ss
function formatDuration(seconds: number): string {
  if (!seconds || seconds <= 0 || !isFinite(seconds)) {
    return '--:--';
  }
  const actualSeconds = seconds > 10000 ? Math.floor(seconds / 1000) : seconds;
  const minutes = Math.floor(actualSeconds / 60);
  const remainingSeconds = Math.floor(actualSeconds % 60);
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
}

export default function MobileAlbumPage({ params }: MobileAlbumPageProps) {
  const router = useRouter();
  const { data: session } = useSession();
  const [isCollectionSheetOpen, setIsCollectionSheetOpen] = useState(false);

  // Unwrap params (Next.js 15 async params)
  const { data: unwrappedParams } = useQuery({
    queryKey: ['album-params'],
    queryFn: async () => params,
    staleTime: Infinity,
  });

  const albumId = unwrappedParams?.id;

  // Fetch album details
  const {
    data: album,
    isLoading,
    isError,
    error,
  } = useQuery<Album>({
    queryKey: ['mobile-album', albumId],
    queryFn: async () => {
      const response = await fetch(`/api/albums/${albumId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch album');
      }
      return response.json();
    },
    enabled: !!albumId,
    staleTime: 5 * 60 * 1000,
  });

  // Get album state for collection status
  const albumState = useAlbumState(album || null);

  // Handle share
  const handleShare = async () => {
    if (!album) return;
    try {
      if (navigator.share) {
        await navigator.share({
          title: `${album.title} by ${album.artists?.map(a => a.name).join(', ')}`,
          text: `Check out this album: ${album.title}`,
          url: window.location.href,
        });
      } else {
        await navigator.clipboard.writeText(window.location.href);
      }
    } catch {
      // User cancelled or share failed
    }
  };

  // Handle save button click
  const handleSaveClick = () => {
    if (!session?.user) {
      // Redirect to sign in
      router.push('/m/auth/signin');
      return;
    }
    setIsCollectionSheetOpen(true);
  };

  // Loading state
  if (isLoading || !albumId) {
    return (
      <div className='min-h-screen bg-black'>
        {/* Header skeleton */}
        <div className='sticky top-0 z-10 bg-black/90 backdrop-blur-sm border-b border-zinc-800 px-4 py-3'>
          <div className='flex items-center gap-4'>
            <div className='h-10 w-10 bg-zinc-800 rounded-full animate-pulse' />
            <div className='h-6 w-32 bg-zinc-800 rounded animate-pulse' />
          </div>
        </div>

        {/* Hero skeleton */}
        <div className='px-4 py-6'>
          <div className='flex gap-4'>
            <div className='w-32 h-32 bg-zinc-800 rounded-lg animate-pulse flex-shrink-0' />
            <div className='flex-1 space-y-2'>
              <div className='h-6 w-3/4 bg-zinc-800 rounded animate-pulse' />
              <div className='h-4 w-1/2 bg-zinc-800 rounded animate-pulse' />
              <div className='h-4 w-1/3 bg-zinc-800 rounded animate-pulse' />
            </div>
          </div>

          {/* Action buttons skeleton */}
          <div className='flex gap-3 mt-6'>
            <div className='h-11 flex-1 bg-zinc-800 rounded-lg animate-pulse' />
            <div className='h-11 w-11 bg-zinc-800 rounded-lg animate-pulse' />
            <div className='h-11 w-11 bg-zinc-800 rounded-lg animate-pulse' />
          </div>
        </div>

        {/* Tracklist skeleton */}
        <div className='px-4'>
          <div className='h-6 w-24 bg-zinc-800 rounded animate-pulse mb-4' />
          {[...Array(6)].map((_, i) => (
            <div
              key={i}
              className='flex items-center gap-3 py-3 border-b border-zinc-800/50'
            >
              <div className='h-4 w-6 bg-zinc-800 rounded animate-pulse' />
              <div className='h-4 flex-1 bg-zinc-800 rounded animate-pulse' />
              <div className='h-4 w-10 bg-zinc-800 rounded animate-pulse' />
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Error state
  if (isError || !album) {
    return (
      <div className='min-h-screen bg-black'>
        <div className='sticky top-0 z-10 bg-black/90 backdrop-blur-sm border-b border-zinc-800 px-4 py-3'>
          <button
            onClick={() => router.back()}
            className='flex items-center gap-2 text-white min-h-[44px] min-w-[44px]'
          >
            <ArrowLeft className='h-5 w-5' />
            <span>Back</span>
          </button>
        </div>
        <div className='flex flex-col items-center justify-center min-h-[60vh] px-6 text-center'>
          <div className='text-5xl mb-4'>😔</div>
          <h2 className='text-xl font-bold text-white mb-2'>Album Not Found</h2>
          <p className='text-zinc-400 mb-6'>
            {error instanceof Error
              ? error.message
              : 'Could not load album details'}
          </p>
          <MobileButton onClick={() => router.back()}>Go Back</MobileButton>
        </div>
      </div>
    );
  }

  const primaryArtist = album.artists?.[0];
  const artistName = primaryArtist
    ? sanitizeArtistName(primaryArtist.name)
    : 'Unknown Artist';

  const isInAnyCollection = albumState.isInCollection;
  const saveButtonLabel = isInAnyCollection
    ? 'In collection'
    : 'Save to collection';

  return (
    <div className='min-h-screen bg-black pb-4'>
      {/* Sticky Header */}
      <div className='sticky top-0 z-10 bg-black/90 backdrop-blur-sm border-b border-zinc-800 px-4 py-3'>
        <div className='flex items-center justify-between'>
          <button
            onClick={() => router.back()}
            className='flex items-center gap-2 text-white min-h-[44px] min-w-[44px]'
            aria-label='Go back'
          >
            <ArrowLeft className='h-5 w-5' />
          </button>
          <h1 className='text-lg font-semibold text-white truncate max-w-[200px]'>
            {album.title}
          </h1>
          <button
            onClick={handleShare}
            className='min-h-[44px] min-w-[44px] flex items-center justify-center text-zinc-400'
            aria-label='Share album'
          >
            <Share2 className='h-5 w-5' />
          </button>
        </div>
      </div>

      {/* Album Hero */}
      <section className='px-4 py-6'>
        <div className='flex gap-4'>
          {/* Album Cover */}
          <div className='w-32 h-32 flex-shrink-0 relative'>
            <AlbumImage
              src={album.image?.url}
              alt={album.title}
              width={128}
              height={128}
              className='w-full h-full object-cover rounded-lg shadow-xl'
              priority
              fallbackIcon={<Music className='h-10 w-10 text-zinc-600' />}
            />
          </div>

          {/* Album Info */}
          <div className='flex-1 min-w-0 py-1'>
            <h2 className='text-xl font-bold text-white line-clamp-2'>
              {album.title}
            </h2>

            {/* Artist Link */}
            {primaryArtist && (
              <Link
                href={`/m/artists/${primaryArtist.id}`}
                className='text-emeraled-green font-medium text-sm mt-1 block'
              >
                {artistName}
              </Link>
            )}

            {/* Year and Format */}
            <div className='flex items-center gap-2 mt-2 text-sm text-zinc-400'>
              {album.year && (
                <span className='flex items-center gap-1'>
                  <Calendar className='h-3.5 w-3.5' />
                  {album.year}
                </span>
              )}
              {album.metadata?.format && (
                <>
                  <span className='text-zinc-600'>•</span>
                  <span>{album.metadata.format}</span>
                </>
              )}
            </div>

            {/* Genres */}
            {album.genre && album.genre.length > 0 && (
              <div className='flex flex-wrap gap-1 mt-2'>
                {album.genre.slice(0, 3).map((g, i) => (
                  <span
                    key={i}
                    className='text-xs bg-zinc-800 text-zinc-300 px-2 py-0.5 rounded-full'
                  >
                    {g}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className='flex gap-3 mt-6'>
          <MobileButton
            variant='primary'
            className='flex-1'
            leftIcon={<Heart className='h-4 w-4' />}
          >
            Make Rec
          </MobileButton>
          <MobileButton
            variant={isInAnyCollection ? 'success' : 'outline'}
            size='md'
            className='aspect-square !p-0 w-11'
            aria-label={saveButtonLabel}
            onClick={handleSaveClick}
          >
            {isInAnyCollection ? (
              <Check className='h-5 w-5' />
            ) : (
              <Bookmark className='h-5 w-5' />
            )}
          </MobileButton>
          <MobileButton
            variant='outline'
            size='md'
            className='aspect-square !p-0 w-11'
            onClick={handleShare}
            aria-label='Share'
          >
            <Share2 className='h-5 w-5' />
          </MobileButton>
        </div>
      </section>

      {/* Tracklist Section */}
      {album.tracks && album.tracks.length > 0 && (
        <section className='px-4 mb-6'>
          <h3 className='text-lg font-semibold text-white mb-3'>Tracklist</h3>
          <div className='bg-zinc-900 rounded-lg overflow-hidden border border-zinc-800'>
            {album.tracks.map((track: Track, index: number) => (
              <div
                key={track.id}
                className={cn(
                  'flex items-center py-3 px-4',
                  index !== album.tracks!.length - 1 &&
                    'border-b border-zinc-800/50'
                )}
              >
                <span className='text-zinc-500 text-sm w-7 flex-shrink-0'>
                  {track.trackNumber}
                </span>
                <span className='text-white flex-1 truncate text-sm'>
                  {track.title}
                </span>
                {track.duration > 0 && (
                  <span className='text-zinc-500 text-sm ml-2'>
                    {formatDuration(track.duration)}
                  </span>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Recommendations Section */}
      <section className='px-4 mb-6'>
        <div className='flex items-center justify-between mb-3'>
          <h3 className='text-lg font-semibold text-white'>Recommendations</h3>
          <Link
            href={`/m/albums/${albumId}/recommendations`}
            className='text-sm text-emeraled-green flex items-center gap-1'
          >
            See all
            <ChevronRight className='h-4 w-4' />
          </Link>
        </div>
        <MobileAlbumRecommendations
          albumId={albumId}
          albumTitle={album.title}
          albumArtist={artistName}
          albumImageUrl={album.image?.url || null}
        />
      </section>

      {/* Additional Artists (if multiple) */}
      {album.artists && album.artists.length > 1 && (
        <section className='px-4 mb-6'>
          <h3 className='text-lg font-semibold text-white mb-3'>Artists</h3>
          <div className='space-y-2'>
            {album.artists.map(artist => (
              <Link
                key={artist.id}
                href={`/m/artists/${artist.id}`}
                className='flex items-center justify-between bg-zinc-900 rounded-lg p-3 border border-zinc-800 active:scale-[0.98] transition-transform'
              >
                <span className='text-white'>
                  {sanitizeArtistName(artist.name)}
                </span>
                <ChevronRight className='h-5 w-5 text-zinc-500' />
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Album Details */}
      {album.label && (
        <section className='px-4 mb-6'>
          <h3 className='text-lg font-semibold text-white mb-3'>Details</h3>
          <div className='bg-zinc-900 rounded-lg p-4 border border-zinc-800'>
            <div className='flex justify-between py-2'>
              <span className='text-zinc-400'>Label</span>
              <span className='text-white'>{album.label}</span>
            </div>
            {album.releaseDate && (
              <div className='flex justify-between py-2 border-t border-zinc-800'>
                <span className='text-zinc-400'>Released</span>
                <span className='text-white'>
                  {new Date(album.releaseDate).toLocaleDateString()}
                </span>
              </div>
            )}
            {album.metadata?.numberOfTracks && (
              <div className='flex justify-between py-2 border-t border-zinc-800'>
                <span className='text-zinc-400'>Tracks</span>
                <span className='text-white'>
                  {album.metadata.numberOfTracks}
                </span>
              </div>
            )}
          </div>
        </section>
      )}

      {/* Collection Selection Bottom Sheet */}
      <CollectionSelectionSheet
        album={album}
        open={isCollectionSheetOpen}
        onOpenChange={setIsCollectionSheetOpen}
      />
    </div>
  );
}
