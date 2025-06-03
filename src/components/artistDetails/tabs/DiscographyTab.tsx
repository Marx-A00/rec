import { useQuery } from '@tanstack/react-query';
import { Calendar, Disc } from 'lucide-react';
import Image from 'next/image';

import AlbumModal from '@/components/ui/AlbumModal';
import { useAlbumModal } from '@/hooks/useAlbumModal';
import { Release, ReleasesResponse } from '@/types/album';

async function fetchArtistReleases(
  artistId: string,
  page: number = 1
): Promise<ReleasesResponse> {
  const response = await fetch(
    `/api/artists/${artistId}/releases?page=${page}&per_page=25&sort=year&sort_order=desc`
  );
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || 'Failed to fetch artist releases');
  }
  return response.json();
}

export default function DiscographyTab({ artistId }: { artistId: string }) {
  const { selectedItem, isExiting, isOpen, openModal, closeModal } =
    useAlbumModal();

  const {
    data: releasesData,
    isLoading,
    error,
    isError,
  } = useQuery({
    queryKey: ['artist-releases', artistId], // Unique cache key
    queryFn: () => fetchArtistReleases(artistId), // Function that returns Promise
    enabled: !!artistId, // Only fetch if artistId exists
    staleTime: 5 * 60 * 1000, // Data fresh for 5 minutes
    gcTime: 10 * 60 * 1000, // Cache for 10 minutes
    retry: 2, // Retry failed requests twice
    refetchOnWindowFocus: false, // Don't refetch on window focus
  });

  if (isLoading) {
    return (
      <div className='bg-zinc-900 p-4 rounded-lg'>
        <h3 className='text-lg font-semibold mb-4'>Albums & Releases</h3>
        <div className='flex items-center justify-center h-32'>
          <div className='animate-spin rounded-full h-6 w-6 border-b-2 border-red-500'></div>
          <span className='ml-3 text-zinc-400'>Loading discography...</span>
        </div>
      </div>
    );
  }

  if (isError || !releasesData) {
    return (
      <div className='bg-zinc-900 p-4 rounded-lg'>
        <h3 className='text-lg font-semibold mb-4'>Albums & Releases</h3>
        <p className='text-red-400'>
          {error?.message || 'Failed to load discography'}
        </p>
      </div>
    );
  }

  return (
    <>
      <AlbumModal
        isOpen={isOpen}
        onClose={closeModal}
        data={selectedItem}
        isExiting={isExiting}
      />

      <div className='bg-zinc-900 p-4 rounded-lg'>
        <h3 className='text-lg font-semibold mb-4'>
          Albums & Releases ({releasesData.releases.length})
        </h3>

        {releasesData.releases.length === 0 ? (
          <p className='text-zinc-400'>No releases found for this artist.</p>
        ) : (
          <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'>
            {releasesData.releases.map(release => (
              <ReleaseCard
                key={release.id}
                release={release}
                onClick={() => openModal(release)}
              />
            ))}
          </div>
        )}
      </div>
    </>
  );
}

function ReleaseCard({
  release,
  onClick,
}: {
  release: Release;
  onClick: () => void;
}) {
  return (
    <div
      className='bg-zinc-800 rounded-lg p-4 hover:bg-zinc-700 transition-all cursor-pointer transform hover:scale-105'
      onClick={onClick}
    >
      <div className='flex gap-3'>
        <div className='relative w-16 h-16 flex-shrink-0'>
          <Image
            src={
              release.thumb ||
              release.basic_information?.thumb ||
              'https://via.placeholder.com/64x64?text=No+Image'
            }
            alt={release.title}
            fill
            className='object-cover rounded'
            sizes='64px'
          />
        </div>

        <div className='flex-1 min-w-0'>
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

            {release.format && (
              <div className='flex items-center gap-1 text-xs text-zinc-400'>
                <Disc className='h-3 w-3' />
                <span>
                  {Array.isArray(release.format)
                    ? release.format.join(', ')
                    : release.format}
                </span>
              </div>
            )}

            {release.role && (
              <div className='text-xs text-zinc-500'>Role: {release.role}</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
