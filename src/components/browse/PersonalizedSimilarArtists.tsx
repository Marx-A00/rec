'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { Music } from 'lucide-react';
import { useSession } from 'next-auth/react';

import AlbumImage from '@/components/ui/AlbumImage';
import {
  useGetUserTasteProfileQuery,
  useSimilarArtistsQuery,
  DataSource,
} from '@/generated/graphql';

type SimilarArtist = {
  name: string;
  musicbrainzId?: string | null;
  similarity: number;
  imageUrl?: string | null;
  cloudflareImageId?: string | null;
  localArtistId?: string | null;
  source: string;
};

function getArtistHref(artist: SimilarArtist): string {
  if (artist.localArtistId) {
    return `/artists/${artist.localArtistId}?source=local`;
  }
  if (artist.musicbrainzId) {
    return `/artists/${artist.musicbrainzId}?source=musicbrainz`;
  }
  return '#';
}

function HeroCard({ artist }: { artist: SimilarArtist }) {
  const matchPercent = Math.round(artist.similarity * 100);
  const hasImage = artist.cloudflareImageId || artist.imageUrl;
  const href = getArtistHref(artist);
  const isLinked = href !== '#';

  const content = (
    <div className='w-[340px] shrink-0 bg-[#191919] rounded-2xl p-8 flex flex-col items-center text-center gap-5 group hover:bg-zinc-800/80 transition-colors duration-300'>
      <div className='w-[160px] h-[160px] rounded-full overflow-hidden ring-2 ring-zinc-700/80 group-hover:ring-cosmic-latte/60 transition-all duration-300'>
        {hasImage ? (
          <AlbumImage
            src={artist.imageUrl}
            alt={artist.name}
            cloudflareImageId={artist.cloudflareImageId}
            width={160}
            height={160}
            className='w-full h-full object-cover'
          />
        ) : (
          <div className='w-full h-full bg-gradient-to-br from-zinc-700 to-zinc-800 flex items-center justify-center'>
            <Music className='w-16 h-16 text-zinc-500' />
          </div>
        )}
      </div>

      <div className='space-y-2'>
        <h3 className='text-[24px] font-bold text-white group-hover:text-cosmic-latte transition-colors truncate max-w-[290px]'>
          {artist.name}
        </h3>

        <div className='inline-flex items-center px-3 py-1 rounded-full bg-cosmic-latte/10 border border-cosmic-latte/20'>
          <span className='text-[13px] font-semibold text-cosmic-latte'>
            {matchPercent}% match
          </span>
        </div>
      </div>
    </div>
  );

  if (isLinked) {
    return (
      <Link href={href} className='cursor-pointer'>
        {content}
      </Link>
    );
  }

  return content;
}

function GridCard({ artist }: { artist: SimilarArtist }) {
  const matchPercent = Math.round(artist.similarity * 100);
  const hasImage = artist.cloudflareImageId || artist.imageUrl;
  const href = getArtistHref(artist);
  const isLinked = href !== '#';

  const content = (
    <div className='w-[290px] bg-[#191919] border border-zinc-800/40 rounded-xl px-4 py-3 flex items-center gap-3 group hover:bg-zinc-800/80 hover:border-cosmic-latte/30 transition-all duration-300'>
      <div className='w-[44px] h-[44px] shrink-0 rounded-full overflow-hidden ring-1 ring-zinc-700/60'>
        {hasImage ? (
          <AlbumImage
            src={artist.imageUrl}
            alt={artist.name}
            cloudflareImageId={artist.cloudflareImageId}
            width={44}
            height={44}
            className='w-full h-full object-cover'
          />
        ) : (
          <div className='w-full h-full bg-gradient-to-br from-zinc-700 to-zinc-800 flex items-center justify-center'>
            <Music className='w-5 h-5 text-zinc-500' />
          </div>
        )}
      </div>

      <div className='min-w-0 flex-1'>
        <p className='text-[14px] font-medium text-white truncate group-hover:text-cosmic-latte transition-colors'>
          {artist.name}
        </p>
        <p className='text-[11px] text-zinc-500'>{matchPercent}% match</p>
      </div>
    </div>
  );

  if (isLinked) {
    return (
      <Link href={href} className='cursor-pointer'>
        {content}
      </Link>
    );
  }

  return content;
}

function LoadingSkeleton() {
  return (
    <div className='space-y-6'>
      {/* Header skeleton */}
      <div className='animate-pulse space-y-2'>
        <div className='h-3 bg-zinc-800/60 rounded w-32' />
        <div className='h-8 bg-zinc-700/60 rounded w-48' />
      </div>

      <div className='flex gap-6'>
        {/* Hero card skeleton */}
        <div className='w-[340px] shrink-0 bg-[#191919] rounded-2xl p-8 flex flex-col items-center gap-5'>
          <div className='animate-pulse'>
            <div className='w-[160px] h-[160px] rounded-full bg-zinc-700/60' />
          </div>
          <div className='animate-pulse space-y-3 w-full flex flex-col items-center'>
            <div className='h-6 bg-zinc-700/60 rounded w-3/4' />
            <div className='h-6 bg-zinc-800/60 rounded-full w-24' />
          </div>
        </div>

        {/* Grid skeleton */}
        <div className='flex-1 grid grid-cols-2 gap-3 content-start'>
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className='w-[290px] bg-[#191919] border border-zinc-800/40 rounded-xl px-4 py-3 flex items-center gap-3'
            >
              <div className='animate-pulse flex items-center gap-3 w-full'>
                <div className='w-[44px] h-[44px] shrink-0 rounded-full bg-zinc-700/60' />
                <div className='flex-1 space-y-2'>
                  <div className='h-3.5 bg-zinc-700/60 rounded w-3/4' />
                  <div className='h-2.5 bg-zinc-800/60 rounded w-1/3' />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function PersonalizedSimilarArtists() {
  const { data: session } = useSession();
  const userId = session?.user?.id;

  const {
    data: tasteData,
    isLoading: tasteLoading,
    error: tasteError,
  } = useGetUserTasteProfileQuery(
    { userId: userId ?? '' },
    { enabled: !!userId }
  );

  const favorites = tasteData?.userTasteProfile ?? [];

  // Randomly pick a seed artist, stable for the component's lifecycle
  const seedArtist = useMemo(() => {
    if (!favorites.length) return null;
    return favorites[Math.floor(Math.random() * favorites.length)];
  }, [favorites]);

  const {
    data: similarData,
    isLoading: similarLoading,
    error: similarError,
  } = useSimilarArtistsQuery(
    {
      id: seedArtist?.artist.id ?? '',
      source: DataSource.Local,
      artistName: seedArtist?.artist.name ?? '',
      limit: 7,
    },
    { enabled: !!seedArtist }
  );

  // Loading state
  if (tasteLoading || (similarLoading && !!seedArtist)) {
    return <LoadingSkeleton />;
  }

  // Error or no data: render nothing
  if (tasteError || similarError) return null;
  if (!seedArtist) return null;

  const similarArtists = similarData?.similarArtists ?? [];

  // Quality threshold: need at least 4 similar artists
  if (similarArtists.length < 4) return null;

  const heroArtist = similarArtists[0];
  const gridArtists = similarArtists.slice(1);

  return (
    <div className='space-y-6'>
      {/* Section header */}
      <div className='flex flex-col gap-1'>
        <p className='text-[11px] font-bold tracking-[2px] text-cosmic-latte/70 uppercase'>
          Because you like
        </p>
        <h2 className='text-[32px] font-extrabold text-white'>
          {seedArtist.artist.name}
        </h2>
      </div>

      {/* Layout: hero + grid */}
      <div className='flex gap-6 items-start'>
        <HeroCard artist={heroArtist} />

        <div className='flex-1 flex flex-wrap gap-3 content-start'>
          {gridArtists.map(artist => (
            <GridCard
              key={artist.musicbrainzId ?? artist.name}
              artist={artist}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
