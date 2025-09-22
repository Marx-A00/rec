'use client';

import { Calendar, Disc } from 'lucide-react';

import AlbumImage from '@/components/ui/AlbumImage';
import { useGetArtistDiscographyQuery } from '@/generated/graphql';

export default function DiscographyTab({ artistId }: { artistId: string }) {
  const { data, isLoading, error } = useGetArtistDiscographyQuery(
    { id: artistId },
    { enabled: !!artistId }
  );

  const releases = data?.artistDiscography || [];

  if (isLoading) {
    return (
      <div className='bg-zinc-900 p-4 rounded-lg'>
        <h3 className='text-lg font-semibold mb-4 text-white'>Discography</h3>
        <div className='flex items-center justify-center h-32'>
          <div className='animate-spin rounded-full h-6 w-6 border-b-2 border-emeraled-green'></div>
          <span className='ml-3 text-zinc-400'>Loading discography...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className='bg-zinc-900 p-4 rounded-lg'>
        <h3 className='text-lg font-semibold mb-4'>Discography</h3>
        <p className='text-red-400'>
          Failed to load discography
        </p>
      </div>
    );
  }

  return (
    <div className='bg-zinc-900 p-4 rounded-lg'>
      <h3 className='text-lg font-semibold mb-4 text-white'>
        Discography ({releases.length})
      </h3>

      {releases.length === 0 ? (
        <p className='text-zinc-400'>
          No releases found for this artist.
        </p>
      ) : (
        <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'>
          {releases.map(release => (
            <ReleaseCard key={release.id} release={release} />
          ))}
        </div>
      )}
    </div>
  );
}

function ReleaseCard({ release }: { release: any }) {
  return (
    <div className='bg-zinc-800 rounded-lg hover:bg-zinc-700 transition-all overflow-hidden'>
      <div className='flex h-24'>
        <div className='relative w-24 h-24 flex-shrink-0'>
          <AlbumImage
            src={release.imageUrl}
            alt={release.title}
            width={96}
            height={96}
            className='object-cover w-full h-full'
            sizes='96px'
          />
        </div>

        <div className='flex-1 min-w-0 p-4'>
          <h4 className='font-medium text-white truncate mb-1'>
            {release.title}
          </h4>

          <div className='space-y-1'>
            {release.year && (
              <div className='flex items-center gap-1 text-xs text-zinc-400'>
                <Calendar className='h-3 w-3' />
                <span>{release.year}</span>
              </div>
            )}

            {release.primaryType && (
              <div className='flex items-center gap-1 text-xs text-zinc-400'>
                <Disc className='h-3 w-3' />
                <span>{release.primaryType}</span>
              </div>
            )}

            <div className='text-xs text-zinc-500'>
              Source: {release.source?.toLowerCase() || 'unknown'}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
