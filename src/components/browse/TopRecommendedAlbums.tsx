'use client';

import Link from 'next/link';

import { useGetTopRecommendedAlbumsQuery } from '@/generated/graphql';
import AlbumImage from '@/components/ui/AlbumImage';

interface TopRecommendedAlbumsProps {
  limit?: number;
  className?: string;
  showStats?: boolean;
}

export function TopRecommendedAlbums({
  limit = 12,
  className = '',
  showStats = true,
}: TopRecommendedAlbumsProps) {
  const { data, isLoading, error } = useGetTopRecommendedAlbumsQuery({
    limit,
  });

  if (isLoading) {
    return <LoadingSkeleton count={Math.min(limit, 8)} />;
  }

  if (error) {
    return (
      <div className='text-center py-12 bg-zinc-900/50 rounded-lg border border-zinc-800'>
        <p className='text-zinc-400'>Failed to load top recommended albums.</p>
      </div>
    );
  }

  const albums = data?.topRecommendedAlbums ?? [];

  if (albums.length === 0) {
    return (
      <div className='text-center py-12 bg-zinc-900/50 rounded-lg border border-zinc-800'>
        <p className='text-zinc-400'>
          No recommended albums yet. Be the first to recommend some!
        </p>
      </div>
    );
  }

  return (
    <div
      className={`flex gap-6 overflow-x-auto pt-4 pb-4 px-1 -mx-1 custom-scrollbar ${className}`}
    >
      {albums.map(item => (
        <TopAlbumCard
          key={item.album.id}
          album={item.album}
          recommendationCount={item.recommendationCount}
          asBasisCount={item.asBasisCount}
          asTargetCount={item.asTargetCount}
          averageScore={item.averageScore}
          showStats={showStats}
        />
      ))}
    </div>
  );
}

interface TopAlbumCardProps {
  album: {
    id: string;
    title: string;
    coverArtUrl?: string | null;
    cloudflareImageId?: string | null;
    releaseDate?: Date | null;
    artists: Array<{
      artist: {
        id: string;
        name: string;
      };
    }>;
  };
  recommendationCount: number;
  asBasisCount: number;
  asTargetCount: number;
  averageScore: number;
  showStats: boolean;
}

function TopAlbumCard({
  album,
  recommendationCount,
  averageScore,
  showStats,
}: TopAlbumCardProps) {
  const artistName = album.artists?.[0]?.artist?.name || 'Unknown Artist';

  return (
    <Link href={`/albums/${album.id}?source=local`}>
      <div className='flex-shrink-0 w-[200px] bg-zinc-900/60 backdrop-blur-sm border border-zinc-800/80 rounded-xl p-5 hover:border-emeraled-green/50 hover:bg-zinc-800/60 transition-all duration-300 group cursor-pointer hover:scale-105 hover:shadow-2xl hover:shadow-emeraled-green/10'>
        <div className='relative aspect-square mb-4'>
          <AlbumImage
            src={album.coverArtUrl}
            alt={album.title}
            className='w-full h-full object-cover rounded-lg shadow-xl'
          />
        </div>

        <div className='space-y-2'>
          <h3 className='font-semibold text-white text-sm line-clamp-1 group-hover:text-cosmic-latte transition-colors'>
            {album.title}
          </h3>
          <p className='text-xs text-zinc-400 line-clamp-1'>{artistName}</p>
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
          className='flex-shrink-0 w-[200px] bg-zinc-900/60 border border-zinc-800/80 rounded-xl p-5'
        >
          <div className='animate-pulse'>
            <div className='aspect-square bg-zinc-700/60 rounded-lg mb-4' />
            <div className='space-y-2'>
              <div className='h-4 bg-zinc-700/60 rounded w-3/4' />
              <div className='h-3 bg-zinc-800/60 rounded w-1/2' />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export default TopRecommendedAlbums;
