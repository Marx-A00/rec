'use client';

import Link from 'next/link';
import { Music } from 'lucide-react';

import { useGetTopRecommendedArtistsQuery } from '@/generated/graphql';

interface TopRecommendedArtistsProps {
  limit?: number;
  className?: string;
  showStats?: boolean;
}

export function TopRecommendedArtists({
  limit = 12,
  className = '',
  showStats = true,
}: TopRecommendedArtistsProps) {
  const { data, isLoading, error } = useGetTopRecommendedArtistsQuery({
    limit,
  });

  if (isLoading) {
    return <LoadingSkeleton count={Math.min(limit, 8)} />;
  }

  if (error) {
    return (
      <div className='text-center py-12 bg-zinc-900/50 rounded-lg border border-zinc-800'>
        <p className='text-zinc-400'>Failed to load top recommended artists.</p>
      </div>
    );
  }

  const artists = data?.topRecommendedArtists ?? [];

  if (artists.length === 0) {
    return (
      <div className='text-center py-12 bg-zinc-900/50 rounded-lg border border-zinc-800'>
        <p className='text-zinc-400'>
          No recommended artists yet. Start recommending albums to see artists
          here!
        </p>
      </div>
    );
  }

  return (
    <div
      className={`flex gap-6 overflow-x-auto pb-6 scrollbar-hide ${className}`}
    >
      {artists.map(item => (
        <TopArtistCard
          key={item.artist.id}
          artist={item.artist}
          recommendationCount={item.recommendationCount}
          albumsInRecommendations={item.albumsInRecommendations}
          averageScore={item.averageScore}
          showStats={showStats}
        />
      ))}
    </div>
  );
}

interface TopArtistCardProps {
  artist: {
    id: string;
    name: string;
    imageUrl?: string | null;
    cloudflareImageId?: string | null;
  };
  recommendationCount: number;
  albumsInRecommendations: number;
  averageScore: number;
  showStats: boolean;
}

function TopArtistCard({
  artist,
  recommendationCount,
  albumsInRecommendations,
  averageScore,
  showStats,
}: TopArtistCardProps) {
  return (
    <Link href={`/artists/${artist.id}?source=local`}>
      <div className='flex-shrink-0 w-[200px] bg-zinc-900/60 backdrop-blur-sm border border-zinc-800/80 rounded-xl p-6 hover:border-cosmic-latte/50 hover:bg-zinc-800/60 transition-all duration-300 group cursor-pointer hover:scale-105 hover:shadow-2xl hover:shadow-cosmic-latte/10'>
        <div className='text-center space-y-4'>
          <div className='relative w-20 h-20 mx-auto'>
            {artist.imageUrl ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={artist.imageUrl}
                alt={artist.name}
                className='w-full h-full rounded-full object-cover ring-2 ring-zinc-700/80 group-hover:ring-cosmic-latte/80 transition-all duration-300'
              />
            ) : (
              <div className='w-full h-full bg-gradient-to-br from-zinc-700 to-zinc-800 rounded-full flex items-center justify-center ring-2 ring-zinc-700/80 group-hover:ring-cosmic-latte/80 transition-all duration-300'>
                <Music className='w-8 h-8 text-zinc-400' />
              </div>
            )}
          </div>

          <div className='space-y-2'>
            <h3 className='font-semibold text-white text-base truncate group-hover:text-cosmic-latte transition-colors'>
              {artist.name}
            </h3>
            <div className='space-y-1'>
              <p className='text-sm text-zinc-400'>
                {recommendationCount} recs
              </p>
              {showStats && (
                <p className='text-xs text-zinc-500'>
                  {albumsInRecommendations} albums
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}

function LoadingSkeleton({ count }: { count: number }) {
  return (
    <div className='flex gap-6 overflow-hidden'>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className='flex-shrink-0 w-[200px] bg-zinc-900/60 border border-zinc-800/80 rounded-xl p-6'
        >
          <div className='animate-pulse'>
            <div className='w-20 h-20 mx-auto bg-zinc-700/60 rounded-full mb-5' />
            <div className='space-y-3'>
              <div className='h-4 bg-zinc-700/60 rounded mx-auto w-3/4' />
              <div className='h-3 bg-zinc-800/60 rounded mx-auto w-1/2' />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export default TopRecommendedArtists;
