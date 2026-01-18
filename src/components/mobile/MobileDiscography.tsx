'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Music, Disc } from 'lucide-react';

import AlbumImage from '@/components/ui/AlbumImage';
import {
  useGetArtistDiscographyQuery,
  type GetArtistDiscographyQuery,
  DataSource,
} from '@/generated/graphql';
import { cn } from '@/lib/utils';

type ReleaseType = NonNullable<
  GetArtistDiscographyQuery['artistDiscography']['albums']
>[number];

interface MobileDiscographyProps {
  artistId: string;
  artistName: string;
  source: 'local' | 'musicbrainz' | 'discogs';
}

type FilterOption = 'all' | 'albums' | 'singles' | 'eps';

export default function MobileDiscography({
  artistId,
  artistName: _artistName,
  source,
}: MobileDiscographyProps) {
  const [filter, setFilter] = useState<FilterOption>('all');

  // Map source string to DataSource enum
  const sourceEnum =
    source === 'local'
      ? DataSource.Local
      : source === 'musicbrainz'
        ? DataSource.Musicbrainz
        : DataSource.Discogs;

  const { data, isLoading, error } = useGetArtistDiscographyQuery(
    { id: artistId, source: sourceEnum },
    { enabled: !!artistId }
  );

  const discography = data?.artistDiscography;

  if (isLoading) {
    return (
      <div className='space-y-4'>
        {/* Filter pills skeleton */}
        <div className='flex gap-2 overflow-x-auto pb-2'>
          {[...Array(4)].map((_, i) => (
            <div
              key={i}
              className='h-8 w-20 bg-zinc-800 rounded-full animate-pulse flex-shrink-0'
            />
          ))}
        </div>
        {/* Grid skeleton */}
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
    );
  }

  if (error) {
    return (
      <div className='bg-zinc-900 rounded-lg p-4 border border-zinc-800 text-center'>
        <Disc className='h-8 w-8 text-zinc-600 mx-auto mb-2' />
        <p className='text-sm text-zinc-500'>Failed to load discography</p>
      </div>
    );
  }

  // Combine releases based on filter
  const albums = discography?.albums || [];
  const eps = discography?.eps || [];
  const singles = discography?.singles || [];
  const compilations = discography?.compilations || [];
  const liveAlbums = discography?.liveAlbums || [];
  const other = discography?.other || [];

  const getFilteredReleases = (): ReleaseType[] => {
    switch (filter) {
      case 'albums':
        return [...albums, ...compilations, ...liveAlbums];
      case 'singles':
        return singles;
      case 'eps':
        return eps;
      case 'all':
      default:
        return [
          ...albums,
          ...eps,
          ...singles,
          ...compilations,
          ...liveAlbums,
          ...other,
        ];
    }
  };

  const filteredReleases = getFilteredReleases().sort((a, b) => {
    // Sort by year descending (newest first)
    const yearA = a.year || 0;
    const yearB = b.year || 0;
    return yearB - yearA;
  });

  const filterOptions: { value: FilterOption; label: string; count: number }[] =
    [
      {
        value: 'all',
        label: 'All',
        count:
          albums.length +
          eps.length +
          singles.length +
          compilations.length +
          liveAlbums.length +
          other.length,
      },
      {
        value: 'albums',
        label: 'Albums',
        count: albums.length + compilations.length + liveAlbums.length,
      },
      { value: 'singles', label: 'Singles', count: singles.length },
      { value: 'eps', label: 'EPs', count: eps.length },
    ];

  if (filteredReleases.length === 0 && filter === 'all') {
    return (
      <div className='bg-zinc-900 rounded-lg p-6 border border-zinc-800 text-center'>
        <Disc className='h-8 w-8 text-zinc-600 mx-auto mb-2' />
        <p className='text-sm text-zinc-400 mb-1'>No releases found</p>
        <p className='text-xs text-zinc-500'>
          This artist has no releases in our database yet.
        </p>
      </div>
    );
  }

  return (
    <div className='space-y-4'>
      {/* Filter Pills */}
      <div className='flex gap-2 overflow-x-auto pb-2 -mx-4 px-4'>
        {filterOptions
          .filter(opt => opt.count > 0 || opt.value === 'all')
          .map(option => (
            <button
              key={option.value}
              onClick={() => setFilter(option.value)}
              className={cn(
                'flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-colors min-h-[36px]',
                filter === option.value
                  ? 'bg-cosmic-latte text-black'
                  : 'bg-zinc-800 text-zinc-300'
              )}
            >
              {option.label}
              {option.count > 0 && (
                <span
                  className={cn(
                    'ml-1',
                    filter === option.value ? 'text-black/60' : 'text-zinc-500'
                  )}
                >
                  ({option.count})
                </span>
              )}
            </button>
          ))}
      </div>

      {/* 2-Column Grid */}
      {filteredReleases.length > 0 ? (
        <div className='grid grid-cols-2 gap-3'>
          {filteredReleases.map(release => (
            <Link
              key={release.id}
              href={`/m/albums/${release.id}`}
              className='bg-zinc-900 rounded-lg p-2 border border-zinc-800 active:scale-[0.98] transition-transform'
            >
              {/* Album Cover */}
              <div className='aspect-square relative mb-2'>
                <AlbumImage
                  src={release.imageUrl || undefined}
                  alt={release.title}
                  width={160}
                  height={160}
                  className='w-full h-full object-cover rounded-md'
                  fallbackIcon={<Music className='h-8 w-8 text-zinc-600' />}
                />
                {/* Type badge */}
                {release.primaryType && release.primaryType !== 'Album' && (
                  <span className='absolute top-1 left-1 bg-black/70 text-[10px] text-zinc-300 px-1.5 py-0.5 rounded'>
                    {release.primaryType}
                  </span>
                )}
              </div>

              {/* Release Info */}
              <p className='text-sm font-medium text-white truncate'>
                {release.title}
              </p>
              <p className='text-xs text-zinc-500'>
                {release.year || 'Unknown Year'}
              </p>
            </Link>
          ))}
        </div>
      ) : (
        <div className='bg-zinc-900 rounded-lg p-4 border border-zinc-800 text-center'>
          <p className='text-sm text-zinc-500'>
            No {filter === 'all' ? 'releases' : filter} found
          </p>
        </div>
      )}
    </div>
  );
}
