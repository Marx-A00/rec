// src/components/dashboard/panels/CollectionAlbumsPanel.tsx
'use client';

import { Suspense, useEffect, useState, useRef, useMemo } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { Folder, ArrowLeftRight, ArrowUpDown } from 'lucide-react';

import { PanelComponentProps } from '@/types/mosaic';
import { CollectionAlbum } from '@/types/collection';
import { useGetMyCollectionAlbumsQuery } from '@/generated/graphql';
import { useNavigation } from '@/hooks/useNavigation';
import SignInButton from '@/components/auth/SignInButton';
import AlbumImage from '@/components/ui/AlbumImage';
import AlbumModal from '@/components/ui/AlbumModal';
import { Button } from '@/components/ui/button';

export default function CollectionAlbumsPanel({
  panelId,
  config,
  isEditMode,
}: PanelComponentProps) {
  const { data: session } = useSession();
  const user = session?.user;
  const { navigateTo, navigateToAlbum } = useNavigation();

  // Use GraphQL hook with proper caching
  const { data, isLoading } = useGetMyCollectionAlbumsQuery(
    {},
    {
      enabled: !!user?.id && !isEditMode,
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 30 * 60 * 1000, // 30 minutes
      refetchOnWindowFocus: false,
    }
  );

  // Transform GraphQL data to CollectionAlbum format
  const userAlbums = useMemo(() => {
    if (!data?.myCollectionAlbums) return [];

    return data.myCollectionAlbums.map((collectionAlbum, index) => ({
      id: collectionAlbum.id,
      albumId: collectionAlbum.album.id,
      albumTitle: collectionAlbum.album.title,
      albumArtist:
        collectionAlbum.album.artists?.[0]?.artist?.name || 'Unknown Artist',
      albumImageUrl: collectionAlbum.album.coverArtUrl || null,
      albumYear: collectionAlbum.album.releaseDate
        ? new Date(collectionAlbum.album.releaseDate).getFullYear().toString()
        : null,
      addedAt:
        typeof collectionAlbum.addedAt === 'string'
          ? collectionAlbum.addedAt
          : collectionAlbum.addedAt.toISOString(),
      addedBy: user?.id || 'unknown',
      personalRating: collectionAlbum.personalRating || null,
      personalNotes: collectionAlbum.personalNotes || null,
      position: collectionAlbum.position || index,
    }));
  }, [data, user?.id]);

  const [selectedAlbum, setSelectedAlbum] = useState<CollectionAlbum | null>(
    null
  );
  const [isExiting, setIsExiting] = useState(false);
  const [layoutMode, setLayoutMode] = useState<'horizontal' | 'vertical'>(
    'horizontal'
  );
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Add smooth horizontal scroll with mouse wheel (only in horizontal mode)
  useEffect(() => {
    const handleWheel = (e: WheelEvent) => {
      // Only hijack wheel events in horizontal mode
      if (
        layoutMode === 'horizontal' &&
        scrollContainerRef.current &&
        scrollContainerRef.current.contains(e.target as Node)
      ) {
        e.preventDefault();

        // Simply scroll horizontally by the vertical delta
        // The scroll-smooth CSS class will handle the smoothing
        scrollContainerRef.current.scrollBy({
          left: e.deltaY * 0.5, // Adjust multiplier for scroll speed
          behavior: 'smooth',
        });
      }
    };

    const container = scrollContainerRef.current;
    if (container) {
      container.addEventListener('wheel', handleWheel, { passive: false });
      return () => container.removeEventListener('wheel', handleWheel);
    }
  }, [userAlbums, layoutMode]); // Re-attach when albums or layout changes

  // Album modal handlers
  const handleAlbumClick = async (
    collectionAlbum: CollectionAlbum,
    event: React.MouseEvent
  ) => {
    if (isEditMode) return; // Disable interactions in edit mode

    if (event.ctrlKey || event.metaKey) {
      if (collectionAlbum.albumId) {
        try {
          // Navigate to local album with source parameter
          const albumPath = `/albums/${collectionAlbum.albumId}?source=local`;
          await navigateTo(albumPath, {
            validate: false,
            onError: () => {
              setSelectedAlbum(collectionAlbum);
            },
          });
        } catch {
          setSelectedAlbum(collectionAlbum);
        }
        return;
      }
    }
    setSelectedAlbum(collectionAlbum);
  };

  const handleCloseModal = () => {
    setIsExiting(true);
    setTimeout(() => {
      setSelectedAlbum(null);
      setIsExiting(false);
    }, 300);
  };

  // Custom navigation handler that adds source=local
  const handleNavigateToAlbum = (albumId: string) => {
    const albumPath = `/albums/${albumId}?source=local`;
    navigateTo(albumPath, { validate: false });
  };

  // Show preview content in edit mode
  if (isEditMode) {
    return (
      <div className='bg-zinc-900/50 p-6 h-full overflow-hidden'>
        <div className='h-full flex flex-col'>
          <div className='mb-3 flex-shrink-0'>
            <p className='text-sm text-zinc-400 mb-2'>Panel Preview</p>
            <h2 className='text-lg font-semibold text-white'>
              Your Collection
            </h2>
          </div>

          <div className='flex-1 overflow-hidden'>
            <div className='flex gap-2 overflow-x-auto pb-2 h-full'>
              {Array.from({ length: 8 }).map((_, i) => (
                <div
                  key={i}
                  className='relative group cursor-pointer transform transition-all duration-200 flex-shrink-0 w-32'
                >
                  <AlbumImage
                    src={null}
                    alt='Preview album'
                    width={128}
                    height={128}
                    className='w-full aspect-square rounded object-cover border border-zinc-800'
                    showSkeleton={true}
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Album Modal */}
      <AlbumModal
        isOpen={!!selectedAlbum}
        onClose={handleCloseModal}
        data={selectedAlbum}
        isExiting={isExiting}
        onNavigateToAlbum={handleNavigateToAlbum}
      />

      <div className='bg-zinc-900/50 p-6 h-full overflow-hidden'>
        {user ? (
          // Show user's album collection
          <div className='h-full flex flex-col'>
            {/* Layout Toggle */}
            <div className='flex justify-end mb-3'>
              <button
                onClick={() =>
                  setLayoutMode(
                    layoutMode === 'horizontal' ? 'vertical' : 'horizontal'
                  )
                }
                className='p-2 rounded hover:bg-zinc-800 transition-colors text-zinc-400 hover:text-cosmic-latte'
                title={
                  layoutMode === 'horizontal'
                    ? 'Switch to vertical layout'
                    : 'Switch to horizontal layout'
                }
              >
                {layoutMode === 'horizontal' ? (
                  <ArrowUpDown className='w-4 h-4' />
                ) : (
                  <ArrowLeftRight className='w-4 h-4' />
                )}
              </button>
            </div>

            <div className='flex-1 h-0 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]'>
              {isLoading ? (
                <div className='h-full flex gap-2 overflow-x-auto pb-2 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]'>
                  {Array.from({ length: 10 }).map((_, i) => (
                    <div
                      key={i}
                      className='relative group cursor-pointer transform transition-all duration-200 flex-shrink-0 w-32'
                    >
                      <AlbumImage
                        src={null}
                        alt='Loading...'
                        width={128}
                        height={128}
                        className='w-full aspect-square rounded object-cover border border-zinc-800'
                        showSkeleton={true}
                      />
                    </div>
                  ))}
                </div>
              ) : userAlbums?.length > 0 ? (
                <div
                  ref={scrollContainerRef}
                  className={
                    layoutMode === 'horizontal'
                      ? 'h-full flex gap-2 overflow-x-auto pb-2 scroll-smooth [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]'
                      : 'h-full flex flex-col gap-2 overflow-y-auto pb-2 scroll-smooth [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]'
                  }
                >
                  {userAlbums.map(collectionAlbum => (
                    <div
                      key={collectionAlbum.id}
                      className={`relative group/album cursor-pointer transform transition-all duration-200 hover:scale-105 hover:z-10 flex-shrink-0 ${
                        layoutMode === 'horizontal'
                          ? 'w-[clamp(8rem,15vw,12rem)] h-[clamp(8rem,15vw,12rem)]'
                          : 'w-[clamp(8rem,15vw,12rem)] h-[clamp(8rem,15vw,12rem)]'
                      }`}
                      onClick={e => handleAlbumClick(collectionAlbum, e)}
                      title={`${collectionAlbum.albumTitle} by ${collectionAlbum.albumArtist}\nClick to view details • Ctrl/Cmd+Click to navigate to album page`}
                    >
                      <AlbumImage
                        src={collectionAlbum.albumImageUrl}
                        alt={`${collectionAlbum.albumTitle} by ${collectionAlbum.albumArtist}`}
                        width={256}
                        height={256}
                        className='w-full h-full rounded object-cover border border-zinc-800 group-hover/album:border-zinc-600 transition-colors'
                        showSkeleton={true}
                      />
                      <div className='absolute inset-0 bg-black bg-opacity-0 group-hover/album:bg-opacity-70 transition-all duration-200 rounded flex items-center justify-center'>
                        <div className='opacity-0 group-hover/album:opacity-100 text-cosmic-latte text-xs text-center p-2 transform translate-y-2 group-hover/album:translate-y-0 transition-all duration-200'>
                          <p className='font-medium truncate mb-1'>
                            {collectionAlbum.albumTitle}
                          </p>
                          <p className='text-zinc-300 truncate mb-1'>
                            {collectionAlbum.albumArtist}
                          </p>
                          {collectionAlbum.personalRating && (
                            <p className='text-emeraled-green text-xs'>
                              ★ {collectionAlbum.personalRating || 0}/10
                            </p>
                          )}
                          <p className='text-zinc-400 text-xs mt-1'>
                            Click to view
                          </p>
                        </div>
                      </div>
                      <div className='absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity'>
                        <span className='text-xs bg-black bg-opacity-75 text-zinc-300 px-1 py-0.5 rounded'>
                          {collectionAlbum.addedAt
                            ? new Date(collectionAlbum.addedAt).getFullYear() ||
                              '—'
                            : '—'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className='text-center py-8'>
                  <p className='text-zinc-400 mb-4'>
                    No albums in your collection yet.
                  </p>
                  <p className='text-sm text-zinc-500 mb-4'>
                    Start building your record collection by adding albums from
                    recommendations or browsing.
                  </p>
                  <Link href='/browse'>
                    <Button>Browse Albums</Button>
                  </Link>
                </div>
              )}
            </div>
          </div>
        ) : (
          // Show registration CTA for non-signed-in users
          <div className='h-full flex flex-col items-center justify-center text-center'>
            <Folder className='h-16 w-16 text-zinc-600 mb-4' />
            <h2 className='text-3xl font-bold text-white mb-4'>
              Start Your Music Collection
            </h2>
            <p className='text-zinc-300 mb-6 max-w-md'>
              Register now to create personalized album collections, discover
              new music, and share your favorites with the community!
            </p>
            <div className='flex gap-4'>
              <Link href='/register'>
                <Button size='lg' className='px-8'>
                  Create Account
                </Button>
              </Link>
              <SignInButton />
            </div>
          </div>
        )}
      </div>
    </>
  );
}
