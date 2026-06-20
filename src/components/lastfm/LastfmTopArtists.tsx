'use client';

import Link from 'next/link';
import { Music } from 'lucide-react';

import { LastfmTopArtist } from '@/generated/graphql';

function formatPlaycount(count: number): string {
  if (count >= 1_000_000) {
    return `${(count / 1_000_000).toFixed(1)}M`;
  }
  if (count >= 1_000) {
    return `${(count / 1_000).toFixed(1)}k`;
  }
  return count.toString();
}

interface LastfmTopArtistsProps {
  artists: LastfmTopArtist[];
  limit?: number;
  showPlaycounts?: boolean;
}

export default function LastfmTopArtists({
  artists,
  limit = 5,
  showPlaycounts = true,
}: LastfmTopArtistsProps) {
  const displayed = artists.slice(0, limit);

  if (displayed.length === 0) {
    return (
      <div className='py-4 text-center'>
        <Music className='w-5 h-5 text-zinc-600 mx-auto mb-2' />
        <p className='text-sm text-zinc-500'>No listening data yet</p>
      </div>
    );
  }

  return (
    <div className='space-y-1'>
      {displayed.map((artist, index) => {
        const content = (
          <div className='flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-zinc-800/50 transition-colors group'>
            {/* Rank number */}
            <span className='text-xs font-medium text-zinc-500 w-4 text-right shrink-0'>
              {index + 1}
            </span>

            {/* Artist name */}
            <span className='text-sm font-medium text-white truncate flex-1 group-hover:text-cosmic-latte transition-colors'>
              {artist.name}
            </span>

            {/* Play count */}
            {showPlaycounts && (
              <span className='text-xs text-zinc-400 shrink-0'>
                {formatPlaycount(artist.playcount)} plays
              </span>
            )}
          </div>
        );

        if (artist.artistId) {
          return (
            <Link
              key={`${artist.name}-${index}`}
              href={`/artists/${artist.artistId}`}
            >
              {content}
            </Link>
          );
        }

        return <div key={`${artist.name}-${index}`}>{content}</div>;
      })}
    </div>
  );
}

// Skeleton for loading state
export function LastfmTopArtistsSkeleton({ count = 5 }: { count?: number }) {
  return (
    <div className='space-y-1'>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className='flex items-center gap-3 px-2 py-2'>
          <div className='w-4 h-3 bg-zinc-800 rounded animate-pulse' />
          <div className='flex-1 h-4 bg-zinc-800 rounded animate-pulse' />
          <div className='w-16 h-3 bg-zinc-800 rounded animate-pulse' />
        </div>
      ))}
    </div>
  );
}
