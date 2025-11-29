'use client';

import Link from 'next/link';
import { useEffect, useRef, useState, useMemo } from 'react';
import { Pencil, Settings } from 'lucide-react';
import { UserRole } from '@prisma/client';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import AlbumModal from '@/components/ui/AlbumModal';
import RecommendationCard from '@/components/recommendations/RecommendationCard';
import FollowButton from '@/components/profile/FollowButton';
import ProfileEditForm from '@/components/profile/ProfileEditForm';
import SortableAlbumGrid from '@/components/collections/SortableAlbumGrid';
import AdminBadge from '@/components/ui/AdminBadge';
import { useNavigation } from '@/hooks/useNavigation';
import { CollectionAlbum } from '@/types/collection';
import { RecommendationFieldsFragment } from '@/generated/graphql';

// TODO: fix the whole client and server components shit

interface User {
  id: string;
  name: string;
  email: string | null;
  image: string;
  username: string;
  bio: string;
  followersCount: number;
  followingCount: number;
  recommendationsCount: number;
  role: UserRole;
}

interface ProfileClientProps {
  user: User;
  collection: CollectionAlbum[];
  listenLater: CollectionAlbum[];
  recommendations: RecommendationFieldsFragment[];
  isOwnProfile: boolean;
}

export default function ProfileClient({
  user,
  collection,
  listenLater,
  recommendations,
  isOwnProfile,
}: ProfileClientProps) {
  // Feature flag check for collection editor
  const isCollectionEditorEnabled =
    process.env.NEXT_PUBLIC_ENABLE_COLLECTION_EDITOR === 'true';

  const { prefetchRoute, navigateTo, navigateToAlbum, goBack } =
    useNavigation();

  // Use the collection data passed from server component
  const allAlbums = useMemo(() => {
    // Already deduplicated and formatted from server
    return collection;
  }, [collection]);

  // Add state for the selected album and exit animation
  const [selectedAlbum, setSelectedAlbum] = useState<CollectionAlbum | null>(
    null
  );
  const [isExiting, setIsExiting] = useState(false);

  // Add state for profile editing
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [currentUser, setCurrentUser] = useState(user);

  // State for optimistic follow count updates
  const [followersCount, setFollowersCount] = useState(user.followersCount);

  // Settings dropdown state
  const [showSettings, setShowSettings] = useState(false);
  const settingsMenuRef = useRef<HTMLDivElement>(null);

  // Collection reordering state
  const [sortedAlbums, setSortedAlbums] =
    useState<CollectionAlbum[]>(allAlbums);

  // Collection expansion state (for non-editable mode)
  const [isCollectionExpanded, setIsCollectionExpanded] = useState(false);

  // Update sorted albums when collection changes
  useEffect(() => {
    setSortedAlbums(allAlbums);
  }, [allAlbums]);

  // Determine which albums to display (truncate to top row when not editable)
  const displayedAlbums = useMemo(() => {
    // If editable mode OR expanded, show all
    if (isCollectionEditorEnabled || isCollectionExpanded) {
      return sortedAlbums;
    }

    // Otherwise, show only top row (first 6 albums)
    return sortedAlbums.slice(0, 6);
  }, [sortedAlbums, isCollectionEditorEnabled, isCollectionExpanded]);

  // Strategic prefetching for likely navigation targets
  useEffect(() => {
    // Prefetch browse page since there's a back button
    prefetchRoute('/browse');

    // Prefetch collage page for own profile
    if (isOwnProfile) {
      prefetchRoute('/profile/collage');
    }

    // Prefetch album pages for the first few albums in collection
    allAlbums.slice(0, 3).forEach(album => {
      if (album.albumId) {
        prefetchRoute(`/albums/${album.albumId}`);
      }
    });
  }, [prefetchRoute, isOwnProfile, allAlbums]);

  const handleClose = () => {
    setIsExiting(true);
    setTimeout(() => {
      setSelectedAlbum(null);
      setIsExiting(false);
    }, 300); // Match the animation duration
  };

  // Custom navigation handler that adds source=local for collection albums
  const handleNavigateToAlbum = (albumId: string) => {
    const albumPath = `/albums/${albumId}?source=local`;
    navigateTo(albumPath, { validate: false });
  };

  // Enhanced album click handler with navigation option
  const handleAlbumClick = async (
    collectionAlbum: CollectionAlbum,
    event: React.MouseEvent
  ) => {
    // Check for modifier keys to determine navigation behavior
    if (event.ctrlKey || event.metaKey) {
      // Navigate to album page in new tab/window if Ctrl/Cmd is held
      if (collectionAlbum.albumId) {
        try {
          await navigateToAlbum(collectionAlbum.albumId, {
            onError: () => {
              console.error(
                `Failed to navigate to album: ${collectionAlbum.albumId}`
              );
              // Fallback to modal
              setSelectedAlbum(collectionAlbum);
            },
          });
        } catch (error) {
          console.error(
            `Navigation to album ${collectionAlbum.albumId} failed:`,
            error
          );
          // Fallback to modal on error
          setSelectedAlbum(collectionAlbum);
        }
        return;
      }
    }

    // Default behavior: show modal
    setSelectedAlbum(collectionAlbum);
  };

  // Handle album reordering
  const handleAlbumReorder = async (reorderedAlbums: CollectionAlbum[]) => {
    setSortedAlbums(reorderedAlbums);

    // TODO: Need collectionId from server to enable reordering persistence
    // For now, just update local state
    if (!isOwnProfile) return;

    // Temporarily disabled until we pass collection metadata from server
    console.log(
      'Album reorder disabled - need collection metadata from server'
    );
  };

  // Profile editing handlers
  const handleEditProfile = () => {
    setIsEditingProfile(true);
    setShowSettings(false);
  };

  const handleCancelEdit = () => {
    setIsEditingProfile(false);
  };

  const handleSaveProfile = (updatedUser: { name: string; bio: string }) => {
    setCurrentUser((prev: User) => ({
      ...prev,
      name: updatedUser.name,
      bio: updatedUser.bio,
    }));
    setIsEditingProfile(false);
  };

  // Handle follow status changes with optimistic updates
  const handleFollowChange = (
    isFollowing: boolean,
    newCounts?: { followersCount: number; followingCount: number }
  ) => {
    if (newCounts) {
      setFollowersCount((prev: number) => prev + newCounts.followersCount);
    }
  };

  // Close settings menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        settingsMenuRef.current &&
        !settingsMenuRef.current.contains(event.target as Node)
      ) {
        setShowSettings(false);
      }
    };

    if (showSettings) {
      document.addEventListener('mousedown', handleClickOutside);
      return () =>
        document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showSettings]);

  // Add escape key listener
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && selectedAlbum) {
        handleClose();
      }
      if (event.key === 'Escape' && isEditingProfile) {
        handleCancelEdit();
      }
      if (event.key === 'Escape' && showSettings) {
        setShowSettings(false);
      }
    };

    if (selectedAlbum || isEditingProfile || showSettings) {
      document.addEventListener('keydown', handleEscape);
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, [selectedAlbum, isEditingProfile, showSettings]);

  return (
    <div className='min-h-screen bg-black text-white'>
      {/* Album Modal using the dedicated AlbumModal component */}
      <AlbumModal
        isOpen={!!selectedAlbum}
        onClose={handleClose}
        data={selectedAlbum}
        isExiting={isExiting}
        onNavigateToAlbum={handleNavigateToAlbum}
      />

      <div className='container mx-auto px-4 py-8'>
        {/* Header with intelligent back navigation */}
        <div className='mb-8'>
          <button
            onClick={() => goBack()}
            className='inline-flex items-center text-cosmic-latte hover:text-emeraled-green transition-colors mb-4'
          >
            ← Back
          </button>
        </div>

        {/* Profile Header */}
        <div className='max-w-4xl mx-auto'>
          <div className='flex flex-col md:flex-row items-center md:items-start gap-8 mb-12'>
            <Avatar className='w-32 h-32 border-2 border-zinc-800'>
              <AvatarImage src={currentUser.image} alt={currentUser.name} />
              <AvatarFallback className='bg-zinc-800 text-cosmic-latte text-2xl'>
                {currentUser.name.charAt(0)}
              </AvatarFallback>
            </Avatar>
            <div className='text-center md:text-left flex-1'>
              <div className='flex flex-col md:flex-row md:items-start md:justify-between gap-4'>
                <div>
                  <div className='flex items-center gap-3 mb-2'>
                    <h1 data-tour-step="profile-header" className='text-4xl font-bold text-cosmic-latte'>
                      {currentUser.name}
                    </h1>
                    <AdminBadge role={currentUser.role} />
                  </div>
                </div>
                <div className='flex-shrink-0 flex gap-3'>
                  {isOwnProfile ? (
                    <div className='relative' ref={settingsMenuRef}>
                      <Button
                        variant='ghost'
                        size='sm'
                        onClick={e => {
                          e.stopPropagation();
                          setShowSettings(!showSettings);
                          (e.currentTarget as HTMLElement).blur();
                        }}
                        className='p-2 h-9 w-9 hover:bg-zinc-800 rounded-lg transition-colors focus:outline-none border border-zinc-600'
                        aria-label='Profile settings menu'
                        aria-expanded={showSettings}
                        aria-haspopup='menu'
                      >
                        <Settings
                          className='h-4 w-4 text-zinc-400'
                          aria-hidden='true'
                        />
                      </Button>
                      {showSettings && (
                        <div
                          className='absolute right-0 top-10 bg-zinc-900 border border-zinc-700 rounded-lg shadow-xl z-20 py-2 min-w-[140px] backdrop-blur-sm'
                          role='menu'
                          aria-label='Profile settings'
                        >
                          <button
                            onClick={e => {
                              e.stopPropagation();
                              handleEditProfile();
                            }}
                            className='flex items-center space-x-3 px-4 py-2.5 text-sm hover:bg-zinc-800 w-full text-left transition-colors focus:outline-none focus:bg-zinc-800'
                            role='menuitem'
                            tabIndex={0}
                            aria-label='Edit your profile'
                          >
                            <Pencil
                              className='h-4 w-4 text-zinc-400'
                              aria-hidden='true'
                            />
                            <span className='text-zinc-200'>Edit Profile</span>
                          </button>
                        </div>
                      )}
                    </div>
                  ) : (
                    currentUser.id && (
                      <FollowButton
                        userId={currentUser.id}
                        onFollowChange={handleFollowChange}
                      />
                    )
                  )}
                </div>
              </div>

              <p className='mb-6 max-w-md text-zinc-300'>
                {currentUser.bio || 'No bio yet.'}
              </p>
              <div className='flex justify-center md:justify-start gap-6 text-sm'>
                <Link
                  href={`/profile/${currentUser.id}/followers`}
                  className='text-zinc-300 hover:text-cosmic-latte transition-colors cursor-pointer'
                >
                  <strong className='text-cosmic-latte'>
                    {followersCount}
                  </strong>{' '}
                  Followers
                </Link>
                <Link
                  href={`/profile/${currentUser.id}/following`}
                  className='text-zinc-300 hover:text-cosmic-latte transition-colors cursor-pointer'
                >
                  <strong className='text-cosmic-latte'>
                    {user.followingCount}
                  </strong>{' '}
                  Following
                </Link>
                <span className='text-zinc-300'>
                  <strong className='text-cosmic-latte'>
                    {user.recommendationsCount}
                  </strong>{' '}
                  Recommendations
                </span>
              </div>

              {/* Action Buttons */}
              <div className='mt-6 flex flex-col sm:flex-row gap-3'>
                <Link href='/profile/collage'>
                  <button
                    disabled
                    className='bg-gray-500 text-black font-semibold py-2 px-4 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2'
                  >
                    🎵 Create Album Collage
                  </button>
                </Link>
              </div>
              <p className='text-xs text-zinc-500 mt-1'>
                * Album collage feature coming soon!
              </p>
            </div>
          </div>

          {/* Collection Section */}
          {/* TODO: add in DnD grid with varying sizes or whatever */}

          {/* Listen Later Section */}
          {listenLater.length > 0 && (
            <section className='border-t border-zinc-800 pt-8'>
              <h2 className='text-2xl font-semibold mb-6 text-cosmic-latte flex items-center gap-2'>
                <span>Listen Later</span>
                <span className='text-sm font-normal text-zinc-400'>
                  ({listenLater.length})
                </span>
              </h2>
              <SortableAlbumGrid
                albums={listenLater.slice(0, 6)}
                onAlbumClick={albumId => {
                  const album = listenLater.find(a => a.albumId === albumId);
                  if (album) {
                    setSelectedAlbum(album);
                  }
                }}
                isEditable={false}
                className='mb-8'
              />
              {listenLater.length > 6 && (
                <div className='text-center text-sm text-zinc-400 mb-8'>
                  +{listenLater.length - 6} more albums
                </div>
              )}
            </section>
          )}

          <section className='border-t border-zinc-800 pt-8'>
            <h2 className='text-2xl font-semibold mb-6 text-cosmic-latte'>
              Record Collection
            </h2>
            {allAlbums.length > 0 ? (
              <div>
                {/* Collection Stats */}
                <div className='mb-6 text-sm text-zinc-400'>
                  <p>{allAlbums.length} albums in collection</p>
                </div>

                {/* Sortable Album Grid */}
                <SortableAlbumGrid
                  albums={displayedAlbums}
                  onReorder={handleAlbumReorder}
                  onAlbumClick={albumId => {
                    const album = sortedAlbums.find(a => a.albumId === albumId);
                    if (album) {
                      setSelectedAlbum(album);
                    }
                  }}
                  isEditable={isOwnProfile && isCollectionEditorEnabled}
                  className='mb-2'
                />

                {/* Show expand/collapse link when not in editable mode and collection is truncated */}
                {!isCollectionEditorEnabled && sortedAlbums.length > 6 && (
                  <div className='flex justify-center mb-8 mt-8'>
                    <button
                      onClick={() =>
                        setIsCollectionExpanded(!isCollectionExpanded)
                      }
                      className='flex items-center gap-1.5 text-sm text-zinc-400 hover:text-zinc-300 transition-colors'
                    >
                      {isCollectionExpanded ? (
                        <>
                          <span>Show Less</span>
                          <svg
                            className='w-3.5 h-3.5'
                            fill='none'
                            stroke='currentColor'
                            viewBox='0 0 24 24'
                          >
                            <path
                              strokeLinecap='round'
                              strokeLinejoin='round'
                              strokeWidth={2}
                              d='M5 15l7-7 7 7'
                            />
                          </svg>
                        </>
                      ) : (
                        <>
                          <span>See All {sortedAlbums.length} Albums</span>
                          <svg
                            className='w-3.5 h-3.5'
                            fill='none'
                            stroke='currentColor'
                            viewBox='0 0 24 24'
                          >
                            <path
                              strokeLinecap='round'
                              strokeLinejoin='round'
                              strokeWidth={2}
                              d='M19 9l-7 7-7-7'
                            />
                          </svg>
                        </>
                      )}
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className='text-center py-12'>
                <p className='text-zinc-400 mb-4'>
                  No albums in collection yet.
                </p>
                <p className='text-sm text-zinc-500'>
                  This user hasn&apos;t added any albums to their record
                  collection.
                </p>
              </div>
            )}
          </section>

          {/* Recommendations Section */}
          <section className='border-t border-zinc-800 pt-8 mt-8'>
            <h2 className='text-2xl font-semibold mb-6 text-cosmic-latte'>
              Music Recommendations
            </h2>
            {recommendations.length > 0 ? (
              <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'>
                {recommendations.map(recommendation => (
                  <RecommendationCard
                    key={recommendation.id}
                    recommendation={recommendation}
                    currentUserId={user.id}
                    onAlbumClick={(albumId, _albumType) =>
                      navigateToAlbum(albumId)
                    }
                  />
                ))}
              </div>
            ) : (
              <div className='text-center py-12'>
                <p className='text-zinc-400 mb-4'>
                  No recommendations created yet.
                </p>
                <p className='text-sm text-zinc-500'>
                  This user hasn&apos;t shared any music recommendations.
                </p>
              </div>
            )}
          </section>
        </div>
      </div>

      {/* Profile Edit Modal */}
      {isEditingProfile && currentUser.id && (
        <ProfileEditForm
          user={{
            id: currentUser.id,
            name: currentUser.name,
            bio: currentUser.bio,
            image: currentUser.image,
          }}
          onCancel={handleCancelEdit}
          onSave={handleSaveProfile}
        />
      )}
    </div>
  );
}
