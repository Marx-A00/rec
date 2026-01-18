'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowLeft,
  Share2,
  ChevronDown,
  ChevronUp,
  User,
  ExternalLink,
  Calendar,
  MapPin,
} from 'lucide-react';

import AlbumImage from '@/components/ui/AlbumImage';
import { MobileButton } from '@/components/mobile/MobileButton';
import MobileDiscography from '@/components/mobile/MobileDiscography';
import { sanitizeArtistName } from '@/lib/utils';

interface MobileArtistPageProps {
  params: Promise<{ id: string }>;
}

interface ArtistDetails {
  id: string;
  name: string;
  imageUrl?: string;
  realName?: string;
  profile?: string;
  country?: string;
  disambiguation?: string;
  lifeSpan?: {
    begin?: string;
    end?: string;
    ended?: boolean;
  };
  urls?: string[];
  aliases?: Array<{ name: string }>;
  source: 'local' | 'musicbrainz' | 'discogs';
  musicbrainzId?: string;
}

export default function MobileArtistPage({ params }: MobileArtistPageProps) {
  const router = useRouter();
  const [bioExpanded, setBioExpanded] = useState(false);

  // Unwrap params (Next.js 15 async params)
  const { data: unwrappedParams } = useQuery({
    queryKey: ['artist-params'],
    queryFn: async () => params,
    staleTime: Infinity,
  });

  const artistId = unwrappedParams?.id;

  // Fetch artist details
  const {
    data: artist,
    isLoading,
    isError,
    error,
  } = useQuery<ArtistDetails>({
    queryKey: ['mobile-artist', artistId],
    queryFn: async () => {
      // First try the unified API with local source
      const response = await fetch('/api/graphql', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: `
            query GetArtistDetails($id: ID!, $source: DataSource!) {
              artistDetails(id: $id, source: $source) {
                id
                name
                imageUrl
                realName
                profile
                country
                disambiguation
                lifeSpan {
                  begin
                  end
                  ended
                }
                urls
                aliases {
                  name
                }
                source
                musicbrainzId
              }
            }
          `,
          variables: {
            id: artistId,
            source: 'LOCAL',
          },
        }),
      });

      const result = await response.json();
      if (result.errors) {
        throw new Error(result.errors[0]?.message || 'Failed to fetch artist');
      }
      return result.data.artistDetails;
    },
    enabled: !!artistId,
    staleTime: 5 * 60 * 1000,
  });

  // Handle share
  const handleShare = async () => {
    if (!artist) return;
    try {
      if (navigator.share) {
        await navigator.share({
          title: sanitizeArtistName(artist.name),
          text: `Check out ${sanitizeArtistName(artist.name)} on Rec`,
          url: window.location.href,
        });
      } else {
        await navigator.clipboard.writeText(window.location.href);
      }
    } catch {
      // User cancelled or share failed
    }
  };

  // Loading state
  if (isLoading || !artistId) {
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
        <div className='px-4 py-6 flex flex-col items-center'>
          <div className='w-[120px] h-[120px] bg-zinc-800 rounded-full animate-pulse mb-4' />
          <div className='h-7 w-48 bg-zinc-800 rounded animate-pulse mb-2' />
          <div className='h-4 w-32 bg-zinc-800 rounded animate-pulse' />
        </div>

        {/* Discography skeleton */}
        <div className='px-4'>
          <div className='h-6 w-28 bg-zinc-800 rounded animate-pulse mb-4' />
          <div className='grid grid-cols-2 gap-3'>
            {[...Array(4)].map((_, i) => (
              <div key={i} className='bg-zinc-900 rounded-lg p-2 animate-pulse'>
                <div className='aspect-square bg-zinc-800 rounded-md mb-2' />
                <div className='h-4 w-3/4 bg-zinc-800 rounded mb-1' />
                <div className='h-3 w-1/2 bg-zinc-800 rounded' />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (isError || !artist) {
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
          <User className='h-16 w-16 text-zinc-600 mb-4' />
          <h2 className='text-xl font-bold text-white mb-2'>
            Artist Not Found
          </h2>
          <p className='text-zinc-400 mb-6'>
            {error instanceof Error
              ? error.message
              : 'Could not load artist details'}
          </p>
          <MobileButton onClick={() => router.back()}>Go Back</MobileButton>
        </div>
      </div>
    );
  }

  // Bio preview (first 2 sentences)
  const bioPreview = artist.profile
    ? artist.profile
        .split(/[.!?]+/)
        .slice(0, 2)
        .join('. ') + '.'
    : null;
  const showBioExpand = artist.profile && artist.profile.length > 150;

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
            {sanitizeArtistName(artist.name)}
          </h1>
          <button
            onClick={handleShare}
            className='min-h-[44px] min-w-[44px] flex items-center justify-center text-zinc-400'
            aria-label='Share artist'
          >
            <Share2 className='h-5 w-5' />
          </button>
        </div>
      </div>

      {/* Artist Hero - Circular Photo */}
      <section className='px-4 py-6 flex flex-col items-center'>
        <div className='w-[120px] h-[120px] rounded-full overflow-hidden mb-4 border-2 border-zinc-800'>
          <AlbumImage
            src={artist.imageUrl}
            alt={sanitizeArtistName(artist.name)}
            width={120}
            height={120}
            className='w-full h-full object-cover'
            priority
            fallbackIcon={<User className='h-12 w-12 text-zinc-600' />}
          />
        </div>

        <h2 className='text-2xl font-bold text-white text-center'>
          {sanitizeArtistName(artist.name)}
        </h2>

        {artist.disambiguation && (
          <p className='text-sm text-zinc-500 mt-1'>{artist.disambiguation}</p>
        )}

        {/* Meta info row */}
        <div className='flex items-center gap-4 mt-3 text-sm text-zinc-400'>
          {artist.country && (
            <span className='flex items-center gap-1'>
              <MapPin className='h-3.5 w-3.5' />
              {artist.country}
            </span>
          )}
          {artist.lifeSpan?.begin && (
            <span className='flex items-center gap-1'>
              <Calendar className='h-3.5 w-3.5' />
              {artist.lifeSpan.begin}
              {artist.lifeSpan.ended
                ? ` - ${artist.lifeSpan.end || '?'}`
                : ' - Present'}
            </span>
          )}
        </div>

        {/* External Link */}
        {artist.urls && artist.urls.length > 0 && (
          <a
            href={artist.urls[0]}
            target='_blank'
            rel='noopener noreferrer'
            className='flex items-center gap-1 mt-3 text-sm text-emeraled-green'
          >
            <ExternalLink className='h-3.5 w-3.5' />
            Official Website
          </a>
        )}
      </section>

      {/* Collapsible Bio Section */}
      {artist.profile && (
        <section className='px-4 mb-6'>
          <h3 className='text-lg font-semibold text-white mb-2'>Biography</h3>
          <div className='bg-zinc-900 rounded-lg p-4 border border-zinc-800'>
            <p className='text-sm text-zinc-300 leading-relaxed'>
              {bioExpanded ? artist.profile : bioPreview}
              {!bioExpanded && showBioExpand && (
                <span className='text-zinc-500'>...</span>
              )}
            </p>
            {showBioExpand && (
              <button
                onClick={() => setBioExpanded(!bioExpanded)}
                className='flex items-center gap-1 mt-3 text-xs font-medium text-zinc-400 min-h-[44px]'
              >
                {bioExpanded ? (
                  <>
                    Show less <ChevronUp className='h-4 w-4' />
                  </>
                ) : (
                  <>
                    Show more <ChevronDown className='h-4 w-4' />
                  </>
                )}
              </button>
            )}
          </div>
        </section>
      )}

      {/* Aliases Section */}
      {artist.aliases && artist.aliases.length > 0 && (
        <section className='px-4 mb-6'>
          <h3 className='text-lg font-semibold text-white mb-2'>
            Also Known As
          </h3>
          <div className='flex flex-wrap gap-2'>
            {artist.aliases.map((alias, index) => (
              <span
                key={index}
                className='bg-zinc-800 text-zinc-300 px-3 py-1.5 rounded-full text-sm'
              >
                {sanitizeArtistName(alias.name)}
              </span>
            ))}
          </div>
        </section>
      )}

      {/* Discography Section */}
      <section className='px-4 mb-6'>
        <h3 className='text-lg font-semibold text-white mb-3'>Discography</h3>
        <MobileDiscography
          artistId={artistId}
          artistName={sanitizeArtistName(artist.name)}
          source={artist.source}
        />
      </section>
    </div>
  );
}
