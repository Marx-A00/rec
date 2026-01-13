'use client';

import { useState, useMemo } from 'react';
import { Music, Calendar, ArrowUpDown, Loader2 } from 'lucide-react';
import Link from 'next/link';

import {
  useGetLatestReleasesQuery,
  GetLatestReleasesQuery,
} from '@/generated/graphql';
import AlbumImage from '@/components/ui/AlbumImage';

// Spotify icon component
function SpotifyIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox='0 0 24 24'
      fill='currentColor'
      xmlns='http://www.w3.org/2000/svg'
    >
      <path d='M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z' />
    </svg>
  );
}

type SortOption = {
  value: string;
  label: string;
  key: 'createdAt' | 'releaseDate' | 'title';
  order: 'asc' | 'desc';
};

const SORT_OPTIONS: SortOption[] = [
  {
    value: 'createdAt-desc',
    label: 'Recently Added',
    key: 'createdAt',
    order: 'desc',
  },
  {
    value: 'createdAt-asc',
    label: 'Oldest Added',
    key: 'createdAt',
    order: 'asc',
  },
  {
    value: 'releaseDate-desc',
    label: 'Release Date (Newest)',
    key: 'releaseDate',
    order: 'desc',
  },
  {
    value: 'releaseDate-asc',
    label: 'Release Date (Oldest)',
    key: 'releaseDate',
    order: 'asc',
  },
  { value: 'title-asc', label: 'Title (A-Z)', key: 'title', order: 'asc' },
  { value: 'title-desc', label: 'Title (Z-A)', key: 'title', order: 'desc' },
];

// Use the generated type from GraphQL
type Album = GetLatestReleasesQuery['searchAlbums'][number];

export default function LatestReleasesPage() {
  const [sortValue, setSortValue] = useState('createdAt-desc');

  const { data, isLoading, error } = useGetLatestReleasesQuery({
    source: 'SPOTIFY',
    limit: 200,
  });

  // Memoize albums to prevent unnecessary re-renders
  const albums = useMemo(() => data?.searchAlbums ?? [], [data?.searchAlbums]);

  // Get the current sort option
  const currentSort =
    SORT_OPTIONS.find(opt => opt.value === sortValue) ?? SORT_OPTIONS[0];

  // Sort albums client-side for instant feedback
  const sortedAlbums = useMemo(() => {
    if (!albums.length) return [];

    return [...albums].sort((a, b) => {
      const { key, order } = currentSort;

      let aVal: string | number;
      let bVal: string | number;

      if (key === 'title') {
        aVal = a.title.toLowerCase();
        bVal = b.title.toLowerCase();
      } else if (key === 'releaseDate') {
        aVal = a.releaseDate ? new Date(a.releaseDate).getTime() : 0;
        bVal = b.releaseDate ? new Date(b.releaseDate).getTime() : 0;
      } else {
        aVal = new Date(a.createdAt).getTime();
        bVal = new Date(b.createdAt).getTime();
      }

      if (order === 'asc') {
        return aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
      } else {
        return aVal > bVal ? -1 : aVal < bVal ? 1 : 0;
      }
    });
  }, [albums, currentSort]);

  // Get last sync date from most recently created album
  const lastSyncDate = useMemo(() => {
    if (!albums.length) return null;
    const sorted = [...albums].sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
    return sorted[0]?.createdAt;
  }, [albums]);

  return (
    <div className='container mx-auto px-4 py-8 max-w-7xl'>
      {/* Page Header */}
      <div className='mb-8'>
        <div className='flex items-center gap-3 mb-4'>
          <div className='text-green-500 p-3 bg-green-500/10 rounded-xl border border-green-500/20'>
            <Music className='w-6 h-6' />
          </div>
          <div>
            <h1 className='text-4xl font-bold text-white'>New Releases</h1>
            <p className='text-zinc-400 text-lg mt-1'>
              Latest albums synced from Spotify
            </p>
          </div>
        </div>

        {/* Stats and controls */}
        <div className='flex flex-wrap items-center justify-between gap-4 py-4 border-b border-zinc-800'>
          <div className='flex items-center gap-6 text-sm text-zinc-400'>
            <div className='flex items-center gap-2'>
              <SpotifyIcon className='w-4 h-4 text-green-500' />
              <span>
                {isLoading ? (
                  <span className='inline-block w-8 h-4 bg-zinc-700 animate-pulse rounded' />
                ) : (
                  `${albums.length} albums`
                )}
              </span>
            </div>
            {lastSyncDate && (
              <div className='flex items-center gap-2'>
                <Calendar className='w-4 h-4' />
                <span>
                  Last synced:{' '}
                  {new Date(lastSyncDate).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </span>
              </div>
            )}
          </div>

          {/* Sort controls */}
          <div className='flex items-center gap-2'>
            <ArrowUpDown className='w-4 h-4 text-zinc-500' />
            <select
              className='bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-1.5 text-sm text-zinc-300 focus:outline-none focus:border-green-500 transition-colors'
              value={sortValue}
              onChange={e => setSortValue(e.target.value)}
            >
              {SORT_OPTIONS.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Loading state */}
      {isLoading && (
        <div className='flex flex-col items-center justify-center py-20'>
          <Loader2 className='w-8 h-8 text-green-500 animate-spin mb-4' />
          <p className='text-zinc-400'>Loading releases...</p>
        </div>
      )}

      {/* Error state */}
      {error !== null && error !== undefined && (
        <div className='text-center py-16 bg-red-900/20 rounded-lg border border-red-800'>
          <p className='text-red-400 text-lg'>Failed to load releases</p>
          <p className='text-zinc-500 text-sm mt-2'>
            {error instanceof Error ? error.message : 'An error occurred'}
          </p>
        </div>
      )}

      {/* Empty state */}
      {!isLoading && !error && sortedAlbums.length === 0 && (
        <div className='text-center py-16 bg-zinc-900/50 rounded-lg border border-zinc-800'>
          <Music className='w-12 h-12 text-zinc-600 mx-auto mb-4' />
          <p className='text-zinc-400 text-lg'>No albums found</p>
          <p className='text-zinc-500 text-sm mt-2'>
            Run a Spotify sync job to populate new releases
          </p>
        </div>
      )}

      {/* Albums Grid */}
      {!isLoading && !error && sortedAlbums.length > 0 && (
        <div className='grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 mt-6'>
          {sortedAlbums.map(album => (
            <AlbumCard key={album.id} album={album} />
          ))}
        </div>
      )}
    </div>
  );
}

function AlbumCard({ album }: { album: Album }) {
  const artistNames = [...album.artists]
    .sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
    .map(a => a.artist.name)
    .join(', ');

  const formattedDate = album.releaseDate
    ? new Date(album.releaseDate).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    : 'Unknown date';

  return (
    <Link href={`/albums/${album.id}?source=local`} className='group'>
      <div className='bg-zinc-900/60 backdrop-blur-sm border border-zinc-800/80 rounded-xl p-4 hover:border-green-500/50 hover:bg-zinc-800/60 transition-all duration-300 hover:scale-[1.02] hover:shadow-xl hover:shadow-green-500/5'>
        <div className='relative aspect-square mb-3'>
          <AlbumImage
            src={album.coverArtUrl}
            alt={album.title}
            className='w-full h-full object-cover rounded-lg shadow-lg'
          />
        </div>
        <div className='space-y-1'>
          <h3 className='font-semibold text-white text-sm line-clamp-1 group-hover:text-green-400 transition-colors'>
            {album.title}
          </h3>
          <p className='text-xs text-zinc-400 line-clamp-1'>{artistNames}</p>
          <div className='flex items-center justify-between pt-1'>
            <p className='text-xs text-zinc-500'>{formattedDate}</p>
            <SpotifyIcon className='w-3 h-3 text-green-500/60' />
          </div>
        </div>
      </div>
    </Link>
  );
}
