'use client';

import { Calendar, Disc, ChevronDown } from 'lucide-react';

import AlbumImage from '@/components/ui/AlbumImage';
import AlbumModal from '@/components/ui/AlbumModal';
import { useAlbumModal } from '@/hooks/useAlbumModal';
import { useNavigation } from '@/hooks/useNavigation';
import { useMastersQuery } from '@/hooks/useMastersQuery';
import { Release } from '@/types/album';

export default function DiscographyTab({ artistId }: { artistId: string }) {
  const { selectedItem, isExiting, isOpen, openModal, closeModal } =
    useAlbumModal();
  const { navigateToAlbum } = useNavigation();

  const {
    masters,
    isLoading,
    error,
    isError,
    isLoadingMore,
    hasMorePages,
    totalItems,
    loadedCount,
    loadMoreMasters,
  } = useMastersQuery(artistId);

  if (isLoading) {
    return (
      <div className='bg-zinc-900 p-4 rounded-lg'>
        <h3 className='text-lg font-semibold mb-4 text-white'>Masters</h3>
        <div className='flex items-center justify-center h-32'>
          <div className='animate-spin rounded-full h-6 w-6 border-b-2 border-red-500'></div>
          <span className='ml-3 text-zinc-400'>Loading discography...</span>
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className='bg-zinc-900 p-4 rounded-lg'>
        <h3 className='text-lg font-semibold mb-4'>Masters</h3>
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
        onNavigateToAlbum={navigateToAlbum}
      />

      <div className='bg-zinc-900 p-4 rounded-lg'>
        <h3 className='text-lg font-semibold mb-4 text-white'>
          Masters ({loadedCount}
          {totalItems > loadedCount ? ` of ${totalItems}` : ''})
        </h3>

        {masters.length === 0 ? (
          <p className='text-zinc-400'>
            No master releases found for this artist.
          </p>
        ) : (
          <>
            <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'>
              {masters.map(release => (
                <ReleaseCard
                  key={release.id}
                  release={release}
                  onClick={() => openModal(release)}
                />
              ))}
            </div>

            {hasMorePages && (
              <div className='flex justify-center mt-6'>
                <button
                  onClick={loadMoreMasters}
                  disabled={isLoadingMore}
                  className='flex items-center gap-2 px-6 py-3 bg-red-600 hover:bg-red-700 disabled:bg-red-800 disabled:opacity-50 text-white rounded-lg transition-colors'
                >
                  {isLoadingMore ? (
                    <>
                      <div className='animate-spin rounded-full h-4 w-4 border-b-2 border-white'></div>
                      Loading...
                    </>
                  ) : (
                    <>
                      <ChevronDown className='h-4 w-4' />
                      Load More Masters
                    </>
                  )}
                </button>
              </div>
            )}
          </>
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
      className='bg-zinc-800 rounded-lg p-4 hover:bg-zinc-700 transition-all cursor-pointer transform hover:scale-105 focus:outline-none outline-none'
      onClick={(e) => {
        (e.currentTarget as HTMLElement).blur();
        onClick();
      }}
      tabIndex={-1}
      style={{ outline: 'none' }}
    >
      <div className='flex gap-3'>
        <div className='relative w-16 h-16 flex-shrink-0'>
          <AlbumImage
            src={release.thumb || release.basic_information?.thumb}
            alt={release.title}
            width={64}
            height={64}
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
