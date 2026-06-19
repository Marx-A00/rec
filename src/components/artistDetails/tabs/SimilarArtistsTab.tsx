'use client';

import { Users } from 'lucide-react';
import Link from 'next/link';

import AlbumImage from '@/components/ui/AlbumImage';
import { useSimilarArtistsQuery, DataSource } from '@/generated/graphql';

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

  const { data, isLoading, error } = useSimilarArtistsQuery(
    {
      id: artistId,
      source: sourceEnum,
      artistName: source !== 'local' ? artistName : undefined,
      limit: 15,
    },
    { enabled: !!artistId }
  );

  const similarArtists = data?.similarArtists || [];

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
        <p className='text-zinc-400'>No similar artists found</p>
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
        {similarArtists.map(artist => {
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
    </div>
  );
}
