'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { Folder } from 'lucide-react';

import SignInButton from '@/components/auth/SignInButton';
import RecommendationsList from '@/components/recommendations/RecommendationsList';
import SocialActivityFeed from '@/components/feed/SocialActivityFeed';
import AlbumImage from '@/components/ui/AlbumImage';
import AlbumModal from '@/components/ui/AlbumModal';
import { Button } from '@/components/ui/button';
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from '@/components/ui/resizable';
import { useNavigation } from '@/hooks/useNavigation';
import { CollectionAlbum } from '@/types/collection';
import { TourTestComponent } from '@/components/TourTestComponent';


export default function Home() {
  const { data: session } = useSession();
  const user = session?.user;
  const { navigateToAlbum } = useNavigation();

  // State for user's album collection
  const [userAlbums, setUserAlbums] = useState<CollectionAlbum[]>([]);
  const [isLoadingAlbums, setIsLoadingAlbums] = useState(false);
  const [selectedAlbum, setSelectedAlbum] = useState<CollectionAlbum | null>(
    null
  );
  const [isExiting, setIsExiting] = useState(false);

  // Fetch user's collection albums
  useEffect(() => {
    if (user) {
      const fetchUserCollection = async () => {
        setIsLoadingAlbums(true);
        try {
          const response = await fetch('/api/collections/user/albums');
          if (response.ok) {
            const data = await response.json();
            console.log('API response:', data); // Debug log

            // Transform the simplified format to CollectionAlbum format
            const transformedAlbums = (data.albums || []).map(
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              (album: any, index: number) => ({
                id: album.id || `album-${Date.now()}-${index}`,
                albumId: album.id,
                albumTitle: album.title || 'Unknown Album',
                albumArtist: album.artist || 'Unknown Artist',
                albumImageUrl: album.image?.url || null,
                albumYear: album.releaseDate || null,
                addedAt: new Date().toISOString(), // Fallback since API doesn't return this
                addedBy: user?.id || 'unknown',
                personalRating: null, // API doesn't return this in current format
                personalNotes: null,
                position: index,
              })
            );

            console.log('Transformed albums:', transformedAlbums); // Debug log
            setUserAlbums(transformedAlbums);
          } else {
            console.error(
              'API responded with error:',
              response.status,
              response.statusText
            );
          }
        } catch (error) {
          console.error('Error fetching user collection:', error);
        } finally {
          setIsLoadingAlbums(false);
        }
      };

      fetchUserCollection();
    }
  }, [user]);

  // Album modal handlers
  const handleAlbumClick = async (
    collectionAlbum: CollectionAlbum,
    event: React.MouseEvent
  ) => {
    if (event.ctrlKey || event.metaKey) {
      if (collectionAlbum.albumId) {
        try {
          await navigateToAlbum(collectionAlbum.albumId, {
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

  return (
    <div className='fixed top-16 bottom-0 left-20 right-0 overflow-hidden'>
      {/* Tour Test Component */}
      <TourTestComponent />
      
      {/* Album Modal */}
      <AlbumModal
        isOpen={!!selectedAlbum}
        onClose={handleCloseModal}
        data={selectedAlbum}
        isExiting={isExiting}
        onNavigateToAlbum={navigateToAlbum}
      />

      <ResizablePanelGroup direction='vertical' className='h-full'>
        {/* Top section - Album Collection or Registration CTA */}
        <ResizablePanel defaultSize={35} minSize={25} maxSize={50}>
          <div className='bg-zinc-900/50 rounded-lg p-6 border border-zinc-800 h-full overflow-hidden'>
            {user ? (
              // Show user's album collection
              <div className='h-full flex flex-col'>
                <div className='mb-3 flex-shrink-0'>
                  <h2 className='text-lg font-semibold text-white'>
                    Your Collection
                  </h2>
                </div>

                <div className='flex-1 overflow-y-auto overflow-x-hidden [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]'>
                  {isLoadingAlbums ? (
                    <div className='flex gap-2 overflow-x-auto pb-2 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]'>
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
                    <div className='flex gap-2 overflow-x-auto pb-2 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]'>
                      {userAlbums.map(collectionAlbum => (
                        <div
                          key={collectionAlbum.id}
                          className='relative group cursor-pointer transform transition-all duration-200 hover:scale-105 hover:z-10 flex-shrink-0 w-32'
                          onClick={e => handleAlbumClick(collectionAlbum, e)}
                          title={`${collectionAlbum.albumTitle} by ${collectionAlbum.albumArtist}\nClick to view details • Ctrl/Cmd+Click to navigate to album page`}
                        >
                          <AlbumImage
                            src={collectionAlbum.albumImageUrl}
                            alt={`${collectionAlbum.albumTitle} by ${collectionAlbum.albumArtist}`}
                            width={128}
                            height={128}
                            className='w-full aspect-square rounded object-cover border border-zinc-800 group-hover:border-zinc-600 transition-colors'
                            showSkeleton={true}
                          />
                          <div className='absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-70 transition-all duration-200 rounded flex items-center justify-center'>
                            <div className='opacity-0 group-hover:opacity-100 text-cosmic-latte text-xs text-center p-2 transform translate-y-2 group-hover:translate-y-0 transition-all duration-200'>
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
                                ? new Date(
                                    collectionAlbum.addedAt
                                  ).getFullYear() || '—'
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
                        Start building your record collection by adding albums
                        from recommendations or browsing.
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
                  Register now to create personalized album collections,
                  discover new music, and share your favorites with the
                  community!
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
        </ResizablePanel>

        <ResizableHandle className='h-px bg-zinc-800 hover:bg-zinc-700' />

        {/* Bottom section - Main content with horizontal split */}
        <ResizablePanel defaultSize={65} minSize={50}>
          <ResizablePanelGroup direction='horizontal' className='h-full'>
            {/* Recommendations panel */}
            <ResizablePanel defaultSize={70} minSize={50}>
              <div className='bg-zinc-900/50 rounded-lg p-6 border border-zinc-800 h-full flex flex-col overflow-hidden'>
                <div className='flex justify-between items-center mb-6 flex-shrink-0'>
                  <h2 className='text-lg font-semibold text-white'>
                    Recent Recommendations
                  </h2>
                </div>
                <div className='flex-1 overflow-y-auto overflow-x-hidden [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]'>
                  <Suspense
                    fallback={
                      <div className='text-zinc-400'>
                        Loading recommendations...
                      </div>
                    }
                  >
                    <RecommendationsList title='' />
                  </Suspense>
                </div>
              </div>
            </ResizablePanel>

            <ResizableHandle className='w-px bg-zinc-800 hover:bg-zinc-700' />

            {/* Activity sidebar */}
            <ResizablePanel defaultSize={30} minSize={25} maxSize={50}>
              <div className='bg-zinc-900/50 rounded-lg p-6 border border-zinc-800 h-full flex flex-col overflow-hidden'>
                <h3 className='text-lg font-semibold text-white mb-4 flex-shrink-0'>
                  Recent Activity
                </h3>
                <div className='flex-1 overflow-y-auto overflow-x-hidden [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]'>
                  <Suspense
                    fallback={
                      <div className='text-zinc-400'>Loading activity...</div>
                    }
                  >
                    <SocialActivityFeed />
                  </Suspense>
                </div>
              </div>
            </ResizablePanel>
          </ResizablePanelGroup>
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
}
