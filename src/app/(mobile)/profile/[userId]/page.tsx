'use client';

import React, { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  Share2,
  Settings,
  Music,
  User,
  ChevronRight,
  Lock,
} from 'lucide-react';
import Link from 'next/link';

import AlbumImage from '@/components/ui/AlbumImage';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { MobileButton } from '@/components/mobile/MobileButton';
import FollowButton from '@/components/profile/FollowButton';
import {
  useGetUserProfileQuery,
  useGetUserCollectionsQuery,
} from '@/generated/graphql';
import { cn } from '@/lib/utils';

interface MobileProfilePageProps {
  params: Promise<{ userId: string }>;
}

type TabType = 'recs' | 'collection';

export default function MobileProfilePage({ params }: MobileProfilePageProps) {
  const router = useRouter();
  const { data: session } = useSession();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<TabType>('recs');
  // Local state for optimistic follower count updates
  const [followerCountDelta, setFollowerCountDelta] = useState(0);

  // Unwrap params (Next.js 15 async params)
  const { data: unwrappedParams } = useQuery({
    queryKey: ['profile-params'],
    queryFn: async () => params,
    staleTime: Infinity,
  });

  const userId = unwrappedParams?.userId;
  const isOwnProfile = session?.user?.id === userId;

  // Fetch user profile
  const {
    data: userData,
    isLoading: userLoading,
    error: userError,
  } = useGetUserProfileQuery({ userId: userId || '' }, { enabled: !!userId });

  const user = userData?.user;

  // Handle follow/unfollow with optimistic count update
  const handleFollowChange = useCallback(
    (isFollowing: boolean) => {
      // Optimistically update follower count
      setFollowerCountDelta(prev => (isFollowing ? prev + 1 : prev - 1));
      // Invalidate query to refetch updated data
      queryClient.invalidateQueries({ queryKey: ['GetUserProfile'] });
    },
    [queryClient]
  );

  // Calculate displayed follower count with optimistic delta
  const displayedFollowersCount =
    (user?.followersCount ?? 0) + followerCountDelta;

  // Fetch user collections
  const { data: collectionsData, isLoading: collectionsLoading } =
    useGetUserCollectionsQuery(
      { userId: userId || '' },
      { enabled: !!userId && activeTab === 'collection' }
    );

  // Fetch user recommendations (using direct API call for now)
  const { data: recsData, isLoading: recsLoading } = useQuery({
    queryKey: ['mobile-user-recs', userId],
    queryFn: async () => {
      const response = await fetch('/api/graphql', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: `
            query GetUserRecommendations($userId: String!, $limit: Int) {
              myRecommendations(userId: $userId, limit: $limit) {
                id
                score
                createdAt
                basisAlbum {
                  id
                  title
                  coverArtUrl
                  artists {
                    artist {
                      id
                      name
                    }
                  }
                }
                recommendedAlbum {
                  id
                  title
                  coverArtUrl
                  artists {
                    artist {
                      id
                      name
                    }
                  }
                }
              }
            }
          `,
          variables: { userId, limit: 20 },
        }),
      });
      const result = await response.json();
      return result.data?.myRecommendations || [];
    },
    enabled: !!userId && activeTab === 'recs',
    staleTime: 5 * 60 * 1000,
  });

  const recommendations = recsData || [];
  const collections = collectionsData?.user?.collections || [];

  // Handle share
  const handleShare = async () => {
    if (!user) return;
    try {
      if (navigator.share) {
        await navigator.share({
          title: user.username || 'User Profile',
          text: `Check out ${user.username || 'this user'}'s profile on Rec`,
          url: window.location.href,
        });
      } else {
        await navigator.clipboard.writeText(window.location.href);
      }
    } catch {
      // User cancelled or share failed
    }
  };

  // Loading state
  if (userLoading || !userId) {
    return (
      <div className='min-h-screen bg-black'>
        {/* Header skeleton */}
        <div className='sticky top-0 z-10 bg-black/90 backdrop-blur-sm border-b border-zinc-800 px-4 py-3'>
          <div className='flex items-center justify-between'>
            <div className='h-10 w-10 bg-zinc-800 rounded-full animate-pulse' />
            <div className='h-6 w-32 bg-zinc-800 rounded animate-pulse' />
            <div className='h-10 w-10 bg-zinc-800 rounded-full animate-pulse' />
          </div>
        </div>

        {/* Profile hero skeleton */}
        <div className='px-4 py-6 flex flex-col items-center'>
          <div className='w-20 h-20 bg-zinc-800 rounded-full animate-pulse mb-4' />
          <div className='h-6 w-40 bg-zinc-800 rounded animate-pulse mb-2' />
          <div className='h-4 w-32 bg-zinc-800 rounded animate-pulse mb-4' />

          {/* Stats skeleton */}
          <div className='flex gap-8 mb-4'>
            {[...Array(3)].map((_, i) => (
              <div key={i} className='flex flex-col items-center'>
                <div className='h-5 w-12 bg-zinc-800 rounded animate-pulse mb-1' />
                <div className='h-3 w-16 bg-zinc-800 rounded animate-pulse' />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Error or not found state
  if (userError || !user) {
    return (
      <div className='min-h-screen bg-black'>
        <div className='sticky top-0 z-10 bg-black/90 backdrop-blur-sm border-b border-zinc-800 px-4 py-3'>
          <button
            onClick={() => router.back()}
            className='flex items-center gap-2 text-white min-h-[44px] min-w-[44px]'
          >
            <ArrowLeft className='h-5 w-5' />
            <span>Back</span>
          </button>
        </div>
        <div className='flex flex-col items-center justify-center min-h-[60vh] px-6 text-center'>
          <User className='h-16 w-16 text-zinc-600 mb-4' />
          <h2 className='text-xl font-bold text-white mb-2'>User Not Found</h2>
          <p className='text-zinc-400 mb-6'>
            This user does not exist or their profile is private.
          </p>
          <MobileButton onClick={() => router.back()}>Go Back</MobileButton>
        </div>
      </div>
    );
  }

  // Check if profile is private (only block for non-owners)
  const isPrivateProfile =
    !isOwnProfile && user.settings?.profileVisibility === 'private';

  if (isPrivateProfile) {
    return (
      <div className='min-h-screen bg-black'>
        {/* Header with back button */}
        <div className='sticky top-0 z-10 bg-black/90 backdrop-blur-sm border-b border-zinc-800 px-4 py-3'>
          <div className='flex items-center justify-between'>
            <button
              onClick={() => router.back()}
              className='flex items-center gap-2 text-white min-h-[44px] min-w-[44px]'
              aria-label='Go back'
            >
              <ArrowLeft className='h-5 w-5' />
            </button>
            <h1 className='text-lg font-semibold text-white'>
              {user.username || 'Profile'}
            </h1>
            <div className='min-h-[44px] min-w-[44px]' />
          </div>
        </div>

        {/* Private profile message */}
        <div className='flex flex-col items-center justify-center min-h-[60vh] px-6 text-center'>
          <div className='w-16 h-16 rounded-full bg-zinc-900 flex items-center justify-center mb-4'>
            <Lock className='h-8 w-8 text-zinc-500' />
          </div>
          <h2 className='text-xl font-bold text-white mb-2'>
            This Profile is Private
          </h2>
          <p className='text-zinc-400 max-w-xs'>
            {user.username || 'This user'} has chosen to keep their profile
            private.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className='min-h-screen bg-black pb-4'>
      {/* Sticky Header */}
      <div className='sticky top-0 z-10 bg-black/90 backdrop-blur-sm border-b border-zinc-800 px-4 py-3'>
        <div className='flex items-center justify-between'>
          <button
            onClick={() => router.back()}
            className='flex items-center gap-2 text-white min-h-[44px] min-w-[44px]'
            aria-label='Go back'
          >
            <ArrowLeft className='h-5 w-5' />
          </button>
          <h1 className='text-lg font-semibold text-white'>
            {user.username || 'Profile'}
          </h1>
          <div className='flex items-center gap-2'>
            <button
              onClick={handleShare}
              className='min-h-[44px] min-w-[44px] flex items-center justify-center text-zinc-400'
              aria-label='Share profile'
            >
              <Share2 className='h-5 w-5' />
            </button>
            {isOwnProfile && (
              <Link
                href='/m/settings'
                className='min-h-[44px] min-w-[44px] flex items-center justify-center text-zinc-400'
                aria-label='Settings'
              >
                <Settings className='h-5 w-5' />
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Profile Hero */}
      <section className='px-4 py-6 flex flex-col items-center'>
        {/* Avatar - 80x80px centered */}
        <Avatar className='w-20 h-20 mb-4 border-2 border-zinc-700'>
          <AvatarImage
            src={user.image || undefined}
            alt={user.username || 'User'}
          />
          <AvatarFallback className='bg-zinc-800 text-2xl'>
            {(user.username || 'U')[0].toUpperCase()}
          </AvatarFallback>
        </Avatar>

        {/* Username */}
        <h2 className='text-xl font-bold text-white mb-1'>
          {user.username || 'Anonymous User'}
        </h2>

        {/* Bio - 14px, max 3 lines with truncation */}
        {user.bio && (
          <p className='text-sm text-zinc-400 text-center max-w-xs mb-4 line-clamp-3'>
            {user.bio}
          </p>
        )}

        {/* Stats Row */}
        <div className='flex gap-8 mb-4'>
          <Link
            href={`/m/profile/${userId}/followers`}
            className='flex flex-col items-center min-h-[44px] justify-center'
          >
            <span className='text-lg font-semibold text-white'>
              {displayedFollowersCount}
            </span>
            <span className='text-xs text-zinc-500'>Followers</span>
          </Link>
          <Link
            href={`/m/profile/${userId}/following`}
            className='flex flex-col items-center min-h-[44px] justify-center'
          >
            <span className='text-lg font-semibold text-white'>
              {user.followingCount}
            </span>
            <span className='text-xs text-zinc-500'>Following</span>
          </Link>
          <div className='flex flex-col items-center'>
            <span className='text-lg font-semibold text-white'>
              {user.recommendationsCount}
            </span>
            <span className='text-xs text-zinc-500'>Recs</span>
          </div>
        </div>

        {/* Action Buttons */}
        {!isOwnProfile && session?.user?.id && (
          <div className='flex gap-3'>
            <FollowButton
              userId={userId}
              initialFollowing={user.isFollowing ?? false}
              onFollowChange={handleFollowChange}
              className='px-6'
            />
          </div>
        )}

        {isOwnProfile && (
          <Link href='/m/profile/edit'>
            <MobileButton variant='secondary' size='sm'>
              Edit Profile
            </MobileButton>
          </Link>
        )}
      </section>

      {/* Tab Navigation */}
      <div className='px-4 mb-4'>
        <div className='flex bg-zinc-900 rounded-lg p-1'>
          <button
            onClick={() => setActiveTab('recs')}
            className={cn(
              'flex-1 py-2.5 text-sm font-medium rounded-md transition-colors min-h-[44px]',
              activeTab === 'recs'
                ? 'bg-cosmic-latte text-black'
                : 'text-zinc-400'
            )}
          >
            Recommendations
          </button>
          <button
            onClick={() => setActiveTab('collection')}
            className={cn(
              'flex-1 py-2.5 text-sm font-medium rounded-md transition-colors min-h-[44px]',
              activeTab === 'collection'
                ? 'bg-cosmic-latte text-black'
                : 'text-zinc-400'
            )}
          >
            Collection
          </button>
        </div>
      </div>

      {/* Tab Content */}
      <div className='px-4'>
        {/* Recommendations Tab */}
        {activeTab === 'recs' && (
          <section>
            {recsLoading ? (
              <div className='grid grid-cols-2 gap-3'>
                {[...Array(4)].map((_, i) => (
                  <div
                    key={i}
                    className='bg-zinc-900 rounded-lg p-3 animate-pulse'
                  >
                    <div className='flex items-center justify-center gap-2 mb-2'>
                      <div className='w-12 h-12 bg-zinc-800 rounded-md' />
                      <div className='w-4 h-4 bg-zinc-800 rounded' />
                      <div className='w-12 h-12 bg-zinc-800 rounded-md' />
                    </div>
                    <div className='flex justify-center mb-2'>
                      <div className='w-16 h-5 bg-zinc-800 rounded-full' />
                    </div>
                    <div className='space-y-1'>
                      <div className='h-4 bg-zinc-800 rounded mx-auto w-3/4' />
                      <div className='h-3 bg-zinc-800 rounded mx-auto w-1/2' />
                    </div>
                  </div>
                ))}
              </div>
            ) : recommendations.length === 0 ? (
              <div className='flex flex-col items-center justify-center py-12 text-center'>
                <div className='w-16 h-16 rounded-full bg-zinc-900 flex items-center justify-center mb-4'>
                  <Music className='h-8 w-8 text-zinc-600' />
                </div>
                <p className='text-white font-medium mb-2'>
                  {isOwnProfile
                    ? 'No Recommendations Yet'
                    : 'No Recommendations'}
                </p>
                <p className='text-sm text-zinc-500 max-w-xs mb-4'>
                  {isOwnProfile
                    ? 'Start recommending albums you love to share your music taste with others.'
                    : `${user.username || 'This user'} hasn't made any recommendations yet.`}
                </p>
                {isOwnProfile && (
                  <MobileButton
                    variant='outline'
                    size='sm'
                    onClick={() => router.push('/m/search')}
                  >
                    Find Albums to Recommend
                  </MobileButton>
                )}
              </div>
            ) : (
              <div className='grid grid-cols-2 gap-3'>
                {recommendations.map(
                  (rec: {
                    id: string;
                    score: number;
                    basisAlbum: {
                      id: string;
                      title: string;
                      coverArtUrl?: string;
                      artists: Array<{ artist: { name: string } }>;
                    };
                    recommendedAlbum: {
                      id: string;
                      title: string;
                      coverArtUrl?: string;
                      artists: Array<{ artist: { name: string } }>;
                    };
                  }) => (
                    <Link
                      key={rec.id}
                      href={`/m/albums/${rec.recommendedAlbum.id}`}
                      className='bg-zinc-900 rounded-lg p-3 border border-zinc-800 active:scale-[0.98] transition-transform'
                    >
                      {/* Album Covers Row */}
                      <div className='flex items-center justify-center gap-2 mb-2'>
                        {/* Basis Album */}
                        <div className='w-12 h-12 flex-shrink-0 rounded-md overflow-hidden'>
                          <AlbumImage
                            src={rec.basisAlbum.coverArtUrl}
                            alt={rec.basisAlbum.title}
                            width={48}
                            height={48}
                            className='w-full h-full object-cover'
                          />
                        </div>

                        {/* Arrow */}
                        <ChevronRight className='h-4 w-4 text-zinc-500 flex-shrink-0' />

                        {/* Recommended Album */}
                        <div className='w-12 h-12 flex-shrink-0 rounded-md overflow-hidden'>
                          <AlbumImage
                            src={rec.recommendedAlbum.coverArtUrl}
                            alt={rec.recommendedAlbum.title}
                            width={48}
                            height={48}
                            className='w-full h-full object-cover'
                          />
                        </div>
                      </div>

                      {/* Score Badge */}
                      <div className='flex justify-center mb-2'>
                        <span className='text-xs font-medium text-emerald-400 bg-emerald-400/10 px-2 py-0.5 rounded-full'>
                          {rec.score}% match
                        </span>
                      </div>

                      {/* Album Info */}
                      <div className='text-center'>
                        <p className='text-sm font-medium text-white truncate'>
                          {rec.recommendedAlbum.title}
                        </p>
                        <p className='text-xs text-zinc-500 truncate'>
                          {rec.recommendedAlbum.artists
                            .map(
                              (a: { artist: { name: string } }) => a.artist.name
                            )
                            .join(', ')}
                        </p>
                      </div>
                    </Link>
                  )
                )}
              </div>
            )}
          </section>
        )}

        {/* Collection Tab */}
        {activeTab === 'collection' && (
          <section>
            {collectionsLoading ? (
              <div className='grid grid-cols-3 gap-2'>
                {[...Array(9)].map((_, i) => (
                  <div
                    key={i}
                    className='aspect-square bg-zinc-800 rounded-md animate-pulse'
                  />
                ))}
              </div>
            ) : collections.length === 0 ? (
              <div className='flex flex-col items-center justify-center py-12 text-center'>
                <div className='w-16 h-16 rounded-full bg-zinc-900 flex items-center justify-center mb-4'>
                  <Music className='h-8 w-8 text-zinc-600' />
                </div>
                <p className='text-white font-medium mb-2'>
                  {isOwnProfile ? 'Collection Empty' : 'No Albums Collected'}
                </p>
                <p className='text-sm text-zinc-500 max-w-xs mb-4'>
                  {isOwnProfile
                    ? 'Add albums to your collection to keep track of your favorite music.'
                    : `${user.username || 'This user'} hasn't added any albums to their collection yet.`}
                </p>
                {isOwnProfile && (
                  <MobileButton
                    variant='outline'
                    size='sm'
                    onClick={() => router.push('/m/search')}
                  >
                    Browse Albums
                  </MobileButton>
                )}
              </div>
            ) : (
              <div className='grid grid-cols-3 gap-2'>
                {collections.flatMap(
                  (collection: {
                    id: string;
                    name: string;
                    albums: Array<{
                      id: string;
                      albumId?: string;
                      album: {
                        id: string;
                        title: string;
                        coverArtUrl?: string | null;
                      };
                    }>;
                  }) =>
                    collection.albums.map(
                      (albumEntry: {
                        id: string;
                        albumId?: string;
                        album: {
                          id: string;
                          title: string;
                          coverArtUrl?: string | null;
                        };
                      }) => (
                        <Link
                          key={albumEntry.id}
                          href={`/m/albums/${albumEntry.album.id}`}
                          className='aspect-square rounded-md overflow-hidden active:scale-[0.95] transition-transform'
                        >
                          <AlbumImage
                            src={albumEntry.album.coverArtUrl || undefined}
                            alt={albumEntry.album.title}
                            width={120}
                            height={120}
                            className='w-full h-full object-cover'
                          />
                        </Link>
                      )
                    )
                )}
              </div>
            )}
          </section>
        )}
      </div>
    </div>
  );
}
