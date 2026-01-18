'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowLeft,
  Share2,
  Settings,
  Users,
  Music,
  User,
  ChevronRight,
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
  const [activeTab, setActiveTab] = useState<TabType>('recs');

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
          <div className='w-24 h-24 bg-zinc-800 rounded-full animate-pulse mb-4' />
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
        {/* Avatar */}
        <Avatar className='w-24 h-24 mb-4 border-2 border-zinc-700'>
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

        {/* Bio */}
        {user.bio && (
          <p className='text-sm text-zinc-400 text-center max-w-xs mb-4'>
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
              {user.followersCount}
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
              onFollowChange={() => {}}
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
              <div className='space-y-3'>
                {[...Array(4)].map((_, i) => (
                  <div
                    key={i}
                    className='bg-zinc-900 rounded-lg p-3 animate-pulse'
                  >
                    <div className='flex gap-3'>
                      <div className='w-16 h-16 bg-zinc-800 rounded-md' />
                      <div className='w-6 h-6 bg-zinc-800 rounded self-center' />
                      <div className='w-16 h-16 bg-zinc-800 rounded-md' />
                    </div>
                  </div>
                ))}
              </div>
            ) : recommendations.length === 0 ? (
              <div className='bg-zinc-900 rounded-lg p-6 text-center border border-zinc-800'>
                <Music className='h-8 w-8 text-zinc-600 mx-auto mb-2' />
                <p className='text-sm text-zinc-400'>
                  {isOwnProfile
                    ? "You haven't made any recommendations yet"
                    : 'No recommendations yet'}
                </p>
              </div>
            ) : (
              <div className='space-y-3'>
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
                      className='flex items-center gap-3 bg-zinc-900 rounded-lg p-3 border border-zinc-800 active:scale-[0.98] transition-transform'
                    >
                      {/* Basis Album */}
                      <div className='w-14 h-14 flex-shrink-0 rounded-md overflow-hidden'>
                        <AlbumImage
                          src={rec.basisAlbum.coverArtUrl}
                          alt={rec.basisAlbum.title}
                          width={56}
                          height={56}
                          className='w-full h-full object-cover'
                        />
                      </div>

                      {/* Arrow with Score */}
                      <div className='flex flex-col items-center'>
                        <ChevronRight className='h-4 w-4 text-zinc-500' />
                        <span className='text-xs font-medium text-emeraled-green'>
                          {rec.score}%
                        </span>
                      </div>

                      {/* Recommended Album */}
                      <div className='w-14 h-14 flex-shrink-0 rounded-md overflow-hidden'>
                        <AlbumImage
                          src={rec.recommendedAlbum.coverArtUrl}
                          alt={rec.recommendedAlbum.title}
                          width={56}
                          height={56}
                          className='w-full h-full object-cover'
                        />
                      </div>

                      {/* Album Info */}
                      <div className='flex-1 min-w-0'>
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
              <div className='bg-zinc-900 rounded-lg p-6 text-center border border-zinc-800'>
                <Users className='h-8 w-8 text-zinc-600 mx-auto mb-2' />
                <p className='text-sm text-zinc-400'>
                  {isOwnProfile
                    ? 'Your collection is empty'
                    : 'No albums in collection'}
                </p>
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
