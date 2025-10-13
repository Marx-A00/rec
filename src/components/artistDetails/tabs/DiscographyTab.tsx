'use client';

import { useState } from 'react';
import { Calendar, Disc, ChevronDown, ChevronUp } from 'lucide-react';

import AlbumImage from '@/components/ui/AlbumImage';
import AlbumModal from '@/components/ui/AlbumModal';
import { useAlbumModal } from '@/hooks/useAlbumModal';
import { useGetArtistDiscographyQuery, type GetArtistDiscographyQuery } from '@/generated/graphql';

type ReleaseType = NonNullable<GetArtistDiscographyQuery['artistDiscography']['albums']>[number];

export default function DiscographyTab({
  artistId,
  artistName,
}: {
  artistId: string;
  artistName?: string;
}) {
  const { data, isLoading, error } = useGetArtistDiscographyQuery(
    { id: artistId },
    { enabled: !!artistId }
  );

  const { selectedItem, isExiting, isOpen, openModal, closeModal } =
    useAlbumModal();

  const discography = data?.artistDiscography;

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
        <p className='text-red-400'>Failed to load discography</p>
      </div>
    );
  }

  // Calculate total releases
  const totalReleases =
    (discography?.albums?.length || 0) +
    (discography?.eps?.length || 0) +
    (discography?.singles?.length || 0) +
    (discography?.compilations?.length || 0) +
    (discography?.liveAlbums?.length || 0) +
    (discography?.remixes?.length || 0) +
    (discography?.soundtracks?.length || 0) +
    (discography?.other?.length || 0);

  return (
    <>
      <AlbumModal
        isOpen={isOpen}
        onClose={closeModal}
        data={selectedItem}
        isExiting={isExiting}
      />

      <div className='bg-zinc-900 p-4 rounded-lg space-y-6'>
        <h3 className='text-lg font-semibold text-white'>
          Discography ({totalReleases})
        </h3>

        {totalReleases === 0 ? (
          <p className='text-zinc-400'>No releases found for this artist.</p>
        ) : (
          <div className='space-y-6'>
            {/* Albums Section */}
            {discography?.albums && discography.albums.length > 0 && (
              <ReleaseSection
                title='Albums'
                releases={discography.albums}
                artistName={artistName}
                openModal={openModal}
                defaultExpanded={true}
              />
            )}

            {/* EPs Section */}
            {discography?.eps && discography.eps.length > 0 && (
              <ReleaseSection
                title='EPs'
                releases={discography.eps}
                artistName={artistName}
                openModal={openModal}
              />
            )}

            {/* Singles Section */}
            {discography?.singles && discography.singles.length > 0 && (
              <ReleaseSection
                title='Singles'
                releases={discography.singles}
                artistName={artistName}
                openModal={openModal}
              />
            )}

            {/* Compilations Section */}
            {discography?.compilations && discography.compilations.length > 0 && (
              <ReleaseSection
                title='Compilations'
                releases={discography.compilations}
                artistName={artistName}
                openModal={openModal}
              />
            )}

            {/* Live Albums Section */}
            {discography?.liveAlbums && discography.liveAlbums.length > 0 && (
              <ReleaseSection
                title='Live Albums'
                releases={discography.liveAlbums}
                artistName={artistName}
                openModal={openModal}
              />
            )}

            {/* Remixes Section */}
            {discography?.remixes && discography.remixes.length > 0 && (
              <ReleaseSection
                title='Remixes'
                releases={discography.remixes}
                artistName={artistName}
                openModal={openModal}
              />
            )}

            {/* Soundtracks Section */}
            {discography?.soundtracks && discography.soundtracks.length > 0 && (
              <ReleaseSection
                title='Soundtracks'
                releases={discography.soundtracks}
                artistName={artistName}
                openModal={openModal}
              />
            )}

            {/* Other Section */}
            {discography?.other && discography.other.length > 0 && (
              <ReleaseSection
                title='Other Releases'
                releases={discography.other}
                artistName={artistName}
                openModal={openModal}
              />
            )}
          </div>
        )}
      </div>
    </>
  );
}

function ReleaseSection({
  title,
  releases,
  artistName,
  openModal,
  defaultExpanded = false,
}: {
  title: string;
  releases: ReleaseType[];
  artistName?: string;
  openModal: (data: any) => void;
  defaultExpanded?: boolean;
}) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  return (
    <div className='border-t border-zinc-800 pt-4'>
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className='flex items-center justify-between w-full mb-4 hover:text-emerald-400 transition-colors'
      >
        <h4 className='text-base font-semibold text-white'>
          {title} ({releases.length})
        </h4>
        {isExpanded ? (
          <ChevronUp className='h-5 w-5 text-zinc-400' />
        ) : (
          <ChevronDown className='h-5 w-5 text-zinc-400' />
        )}
      </button>

      {isExpanded && (
        <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'>
          {releases.map(release => (
            <ReleaseCard
              key={release.id}
              release={release}
              onOpen={() =>
                openModal({
                  id: String(release.id),
                  title: release.title,
                  year:
                    release.year ||
                    (release.releaseDate
                      ? new Date(release.releaseDate).getFullYear()
                      : undefined),
                  type: 'master',
                  thumb: release.imageUrl || undefined,
                  artist: release.artistName || artistName || undefined,
                  source: release.source || 'musicbrainz',
                  basic_information: {
                    artists: Array.isArray(release.artistCredits)
                      ? release.artistCredits.map(c => ({
                          id: c?.artist?.id,
                          name: c?.artist?.name,
                        }))
                      : undefined,
                  },
                })
              }
            />
          ))}
        </div>
      )}
    </div>
  );
}

function ReleaseCard({
  release,
  onOpen,
}: {
  release: ReleaseType;
  onOpen: () => void;
}) {
  const credits = Array.isArray(release.artistCredits)
    ? release.artistCredits
    : [];

  return (
    <div
      className='bg-zinc-800 rounded-lg hover:bg-zinc-700 transition-all overflow-hidden cursor-pointer'
      onClick={() => onOpen()}
      tabIndex={0}
      role='button'
      onKeyDown={e => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onOpen();
        }
      }}
    >
      <div className='flex h-24'>
        <div className='relative w-24 h-24 flex-shrink-0'>
          <AlbumImage
            src={release.imageUrl || ''}
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

            {credits.length > 0 && (
              <div className='text-xs text-zinc-400 truncate'>
                {credits
                  .map(c => c?.artist?.name)
                  .filter(Boolean)
                  .slice(0, 3)
                  .join(', ')}
                {credits.length > 3 ? '…' : ''}
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
