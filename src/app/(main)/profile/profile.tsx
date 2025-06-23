'use client';

import Link from 'next/link';
import { useEffect, useState, useRef } from 'react';
import { Settings, Pencil } from 'lucide-react';

import AlbumImage from '@/components/ui/AlbumImage';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { useNavigation } from '@/hooks/useNavigation';
import { CollectionAlbum } from '@/types/collection';
import { Recommendation } from '@/types/recommendation';
import ProfileEditForm from '@/components/profile/ProfileEditForm';
import FollowButton from '@/components/profile/FollowButton';
import RecommendationCard from '@/components/recommendations/RecommendationCard';

interface ProfileClientProps {
  user: {
    id?: string;
    name: string;
    email: string | null;
    image: string;
    username: string;
    bio: string;
    followersCount: number;
    followingCount: number;
    recommendationsCount: number;
  };
  collection: CollectionAlbum[];
  recommendations: Recommendation[];
  isOwnProfile: boolean;
}

export default function ProfileClient({
  user,
  collection,
  recommendations,
  isOwnProfile,
}: ProfileClientProps) {
  const { prefetchRoute, navigateToAlbum, goBack } = useNavigation();

  // Flatten collections to get all albums
  const allAlbums = collection;

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

  // Profile editing handlers
  const handleEditProfile = () => {
    setIsEditingProfile(true);
    setShowSettings(false);
  };

  const handleCancelEdit = () => {
    setIsEditingProfile(false);
  };

  const handleSaveProfile = (updatedUser: { name: string; bio: string }) => {
    setCurrentUser(prev => ({
      ...prev,
      name: updatedUser.name,
      bio: updatedUser.bio,
    }));
    setIsEditingProfile(false);
  };

  // Handle follow status changes with optimistic updates
  const handleFollowChange = (
    isFollowing: boolean,
    newCounts: { followersCount: number; followingCount: number }
  ) => {
    // Update the follower count optimistically
    setFollowersCount(prev => prev + newCounts.followersCount);
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
      {/* Album Modal/Overlay */}
      {selectedAlbum && (
        <div
          className={`fixed inset-0 bg-black flex items-center justify-center z-50 p-4 transition-all duration-300 ${
            isExiting ? 'bg-opacity-0' : 'bg-opacity-90'
          }`}
          onClick={handleClose}
        >
          <div
            className={`flex flex-col lg:flex-row items-center lg:items-start gap-8 max-w-4xl w-full transition-all duration-300 relative ${
              isExiting
                ? 'opacity-0 scale-95 translate-y-4'
                : 'opacity-100 scale-100 translate-y-0'
            }`}
            onClick={e => e.stopPropagation()}
          >
            {/* Close X button */}
            <button
              onClick={handleClose}
              className='absolute -top-2 -right-2 z-60 text-cosmic-latte hover:text-white transition-all duration-200 hover:scale-110'
            >
              <svg
                className='w-6 h-6'
                fill='none'
                stroke='currentColor'
                viewBox='0 0 24 24'
              >
                <path
                  strokeLinecap='round'
                  strokeLinejoin='round'
                  strokeWidth={2}
                  d='M6 18L18 6M6 6l12 12'
                />
              </svg>
            </button>

            {/* Zoomed Album Cover */}
            <div className='flex-shrink-0'>
              <AlbumImage
                src={selectedAlbum.albumImageUrl}
                alt={`${selectedAlbum.albumTitle} by ${selectedAlbum.albumArtist}`}
                width={400}
                height={400}
                priority
                className='w-80 h-80 lg:w-96 lg:h-96 rounded-lg object-cover border-2 border-zinc-700 shadow-2xl'
              />
            </div>

            {/* Album Details */}
            <div className='flex-1 text-center lg:text-left'>
              <h2 className='text-3xl lg:text-4xl font-bold text-cosmic-latte mb-2'>
                {selectedAlbum.albumTitle}
              </h2>
              <p className='text-xl text-zinc-300 mb-4'>
                {selectedAlbum.albumArtist}
              </p>

              <div className='space-y-3 mb-6'>
                {selectedAlbum.albumYear && (
                  <p className='text-zinc-400'>
                    <span className='text-cosmic-latte font-medium'>
                      Released:
                    </span>{' '}
                    {selectedAlbum.albumYear}
                  </p>
                )}
                <p className='text-zinc-400'>
                  <span className='text-cosmic-latte font-medium'>Added:</span>{' '}
                  {new Date(selectedAlbum.addedAt).toLocaleDateString()}
                </p>
                {selectedAlbum.personalRating && (
                  <p className='text-zinc-400'>
                    <span className='text-cosmic-latte font-medium'>
                      Personal Rating:
                    </span>
                    <span className='text-emeraled-green ml-2'>
                      ★ {selectedAlbum.personalRating}/10
                    </span>
                  </p>
                )}
              </div>

              {/* Enhanced navigation options in modal */}
              {selectedAlbum.albumId && (
                <div className='flex flex-col sm:flex-row gap-3 justify-center lg:justify-start'>
                  <button
                    onClick={async () => {
                      try {
                        await navigateToAlbum(selectedAlbum.albumId!, {
                          onError: () => {
                            console.error(
                              'Failed to navigate to album:',
                              selectedAlbum.albumId
                            );
                          },
                        });
                      } catch (error) {
                        console.error('Navigation from modal failed:', error);
                      }
                    }}
                    className='bg-emeraled-green text-black px-6 py-2 rounded-lg font-medium hover:bg-opacity-90 transition-colors'
                  >
                    View Album Details
                  </button>
                  <button
                    onClick={handleClose}
                    className='bg-zinc-700 text-white px-6 py-2 rounded-lg font-medium hover:bg-zinc-600 transition-colors'
                  >
                    Close
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

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
                  <h1 className='text-4xl font-bold mb-2 text-cosmic-latte'>
                    {currentUser.name}
                  </h1>
                  <p className='text-zinc-400 mb-4 text-lg'>
                    {currentUser.username}
                  </p>
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
                        }}
                        className='p-2 h-9 w-9 hover:bg-zinc-800 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 focus:ring-offset-black border border-zinc-600'
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

                {/* Album Grid */}
                <div className='grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4'>
                  {allAlbums.map(collectionAlbum => (
                    <div
                      key={collectionAlbum.id}
                      className='relative group cursor-pointer transform transition-all duration-200 hover:scale-105 hover:z-10'
                      onClick={e => handleAlbumClick(collectionAlbum, e)}
                      title={`${collectionAlbum.albumTitle} by ${collectionAlbum.albumArtist}\nClick to view details • Ctrl/Cmd+Click to navigate to album page`}
                    >
                      <AlbumImage
                        src={collectionAlbum.albumImageUrl}
                        alt={`${collectionAlbum.albumTitle} by ${collectionAlbum.albumArtist}`}
                        width={128}
                        height={128}
                        className='w-full aspect-square rounded object-cover border border-zinc-800 group-hover:border-zinc-600 transition-colors'
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
                              ★ {collectionAlbum.personalRating}/10
                            </p>
                          )}
                          <p className='text-zinc-400 text-xs mt-1'>
                            Click to view
                          </p>
                        </div>
                      </div>
                      {/* Added date indicator */}
                      <div className='absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity'>
                        <span className='text-xs bg-black bg-opacity-75 text-zinc-300 px-1 py-0.5 rounded'>
                          {new Date(collectionAlbum.addedAt).getFullYear()}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
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
                    onEdit={() => {}}
                    onDetail={() => {}}
                    onAlbumClick={albumId => navigateToAlbum(albumId)}
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
          }}
          onCancel={handleCancelEdit}
          onSave={handleSaveProfile}
        />
      )}
    </div>
  );
}
