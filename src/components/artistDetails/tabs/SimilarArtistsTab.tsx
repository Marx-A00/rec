'use client';

import { useState } from 'react';
import { ChevronDown, ChevronUp, Users } from 'lucide-react';
import Link from 'next/link';

import AlbumImage from '@/components/ui/AlbumImage';
import { useSimilarArtistsQuery, DataSource } from '@/generated/graphql';

const INITIAL_COUNT = 4;

export default function SimilarArtistsTab({
  artistId,
  artistName,
  source,
}: {
  artistId: string;
  artistName?: string;
  source: 'local' | 'musicbrainz' | 'discogs';
}) {
  const sourceEnum =
    source === 'local'
      ? DataSource.Local
      : source === 'musicbrainz'
        ? DataSource.Musicbrainz
        : DataSource.Discogs;

  const isExternal = source !== 'local';

  const { data, isLoading, error } = useSimilarArtistsQuery(
    {
      id: artistId,
      source: sourceEnum,
      artistName: isExternal ? artistName : undefined,
      limit: 15,
    },
    {
      enabled: !!artistId,
      refetchInterval: (query) => {
        const results = query.state.data?.similarArtists;
        // Poll every 3s for external sources until results arrive
        return isExternal && (!results || results.length === 0) ? 3000 : false;
      },
    }
  );

  const [showAll, setShowAll] = useState(false);
  const similarArtists = data?.similarArtists || [];
  const isFetching = isExternal && similarArtists.length === 0 && !error;
  const hasMore = similarArtists.length > INITIAL_COUNT;
  const displayedArtists = showAll ? similarArtists : similarArtists.slice(0, INITIAL_COUNT);

  if (isLoading) {
    return (
      <div className='bg-zinc-900 p-4 rounded-lg'>
        <h3 className='text-lg font-semibold mb-4 text-white flex items-center gap-2'>
          <Users className='w-5 h-5' />
          Similar Artists
        </h3>
        <div className='flex items-center justify-center h-32'>
          <div className='animate-spin rounded-full h-6 w-6 border-b-2 border-emerald-green'></div>
          <span className='ml-3 text-zinc-400'>Loading similar artists...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className='bg-zinc-900 p-4 rounded-lg'>
        <h3 className='text-lg font-semibold mb-4 text-white flex items-center gap-2'>
          <Users className='w-5 h-5' />
          Similar Artists
        </h3>
        <p className='text-red-400'>Failed to load similar artists</p>
      </div>
    );
  }

  if (similarArtists.length === 0) {
    return (
      <div className='bg-zinc-900 p-4 rounded-lg'>
        <h3 className='text-lg font-semibold mb-4 text-white flex items-center gap-2'>
          <Users className='w-5 h-5' />
          Similar Artists
        </h3>
        {isFetching ? (
          <div className='flex items-center justify-center h-32'>
            <div className='animate-spin rounded-full h-6 w-6 border-b-2 border-emerald-green'></div>
            <span className='ml-3 text-zinc-400'>Fetching similar artists...</span>
          </div>
        ) : (
          <p className='text-zinc-400'>No similar artists found</p>
        )}
      </div>
    );
  }

  return (
    <div className='bg-zinc-900 p-4 rounded-lg'>
      <h3 className='text-lg font-semibold mb-4 text-white flex items-center gap-2'>
        <Users className='w-5 h-5' />
        Similar Artists ({similarArtists.length})
      </h3>

      <div className='flex gap-4 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-zinc-700 scrollbar-track-zinc-900'>
        {displayedArtists.map(artist => {
          const href = artist.localArtistId
            ? `/artists/${artist.localArtistId}?source=local`
            : `/artists/${artist.musicbrainzId}?source=musicbrainz`;

          return (
            <Link
              key={artist.musicbrainzId}
              href={href}
              className='flex-shrink-0 w-32 group cursor-pointer'
            >
              <div className='w-32 h-32 rounded-lg overflow-hidden mb-2 bg-zinc-800'>
                {artist.cloudflareImageId || artist.imageUrl ? (
                  <AlbumImage
                    src={artist.imageUrl || ''}
                    alt={artist.name}
                    cloudflareImageId={artist.cloudflareImageId}
                    width={128}
                    height={128}
                    className='w-full h-full object-cover group-hover:scale-105 transition-transform duration-200'
                  />
                ) : (
                  <div className='w-full h-full flex items-center justify-center'>
                    <Users className='w-12 h-12 text-zinc-600' />
                  </div>
                )}
              </div>
              <p className='text-sm font-medium text-white truncate group-hover:text-emerald-green transition-colors'>
                {artist.name}
              </p>
              <p className='text-xs text-zinc-500'>
                {Math.round(artist.similarity * 100)}% similar
              </p>
            </Link>
          );
        })}
      </div>

      {hasMore && (
        <button
          onClick={() => setShowAll(!showAll)}
          className='mt-3 flex items-center gap-1 text-sm text-zinc-400 hover:text-emerald-green transition-colors'
        >
          {showAll ? (
            <>
              <ChevronUp className='w-4 h-4' />
              Show Less
            </>
          ) : (
            <>
              <ChevronDown className='w-4 h-4' />
              Show All ({similarArtists.length})
            </>
          )}
        </button>
      )}
    </div>
  );
}
