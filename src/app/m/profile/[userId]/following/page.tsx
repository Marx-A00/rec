'use client';

import { useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useQuery, useInfiniteQuery } from '@tanstack/react-query';
import { ArrowLeft, Users } from 'lucide-react';
import Link from 'next/link';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import FollowButton from '@/components/profile/FollowButton';
import { useGetUserProfileQuery } from '@/generated/graphql';

interface MobileFollowingPageProps {
  params: Promise<{ userId: string }>;
}

interface FollowingUser {
  id: string;
  username: string | null;
  email: string | null;
  image: string | null;
  bio: string | null;
  followersCount: number;
  followingCount: number;
  recommendationsCount: number;
  followedAt?: string;
  isFollowing?: boolean;
}

export default function MobileFollowingPage({
  params,
}: MobileFollowingPageProps) {
  const router = useRouter();
  const { data: session } = useSession();

  // Unwrap params (Next.js 15 async params)
  const { data: unwrappedParams } = useQuery({
    queryKey: ['following-params'],
    queryFn: async () => params,
    staleTime: Infinity,
  });

  const userId = unwrappedParams?.userId;

  // Fetch user profile for header
  const { data: userData } = useGetUserProfileQuery(
    { userId: userId || '' },
    { enabled: !!userId }
  );

  const user = userData?.user;

  // Fetch following with infinite scroll
  const fetchFollowing = async ({ pageParam }: { pageParam?: string }) => {
    const queryParams = new URLSearchParams();
    queryParams.append('limit', '20');
    queryParams.append('sort', 'recent');

    if (pageParam) {
      queryParams.append('cursor', pageParam);
    }

    const response = await fetch(
      `/api/users/${userId}/following?${queryParams}`
    );

    if (!response.ok) {
      throw new Error('Failed to fetch following');
    }

    return response.json();
  };

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    error,
    refetch,
  } = useInfiniteQuery({
    queryKey: ['mobile-following', userId],
    queryFn: fetchFollowing,
    getNextPageParam: lastPage => lastPage.nextCursor,
    initialPageParam: undefined,
    enabled: !!userId,
  });

  const following: FollowingUser[] =
    data?.pages.flatMap(page => page.following) || [];

  // Infinite scroll handler
  const handleScroll = useCallback(() => {
    if (
      window.innerHeight + document.documentElement.scrollTop >=
      document.documentElement.offsetHeight - 500
    ) {
      if (hasNextPage && !isFetchingNextPage) {
        fetchNextPage();
      }
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  useEffect(() => {
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [handleScroll]);

  // Loading state
  if (!userId || isLoading) {
    return (
      <div className='min-h-screen bg-black'>
        {/* Header skeleton */}
        <div className='sticky top-0 z-10 bg-black/90 backdrop-blur-sm border-b border-zinc-800 px-4 py-3'>
          <div className='flex items-center gap-3'>
            <div className='h-10 w-10 bg-zinc-800 rounded-full animate-pulse' />
            <div className='h-6 w-32 bg-zinc-800 rounded animate-pulse' />
          </div>
        </div>

        {/* List skeleton */}
        <div className='px-4 py-4 space-y-3'>
          {[...Array(6)].map((_, i) => (
            <div
              key={i}
              className='bg-zinc-900 rounded-lg p-4 border border-zinc-800 animate-pulse'
            >
              <div className='flex items-center gap-3'>
                <div className='h-12 w-12 bg-zinc-800 rounded-full' />
                <div className='flex-1'>
                  <div className='h-4 w-24 bg-zinc-800 rounded mb-2' />
                  <div className='h-3 w-32 bg-zinc-800 rounded' />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
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
          <p className='text-red-400 mb-4'>
            Failed to load following. Please try again.
          </p>
          <button
            onClick={() => refetch()}
            className='bg-emeraled-green text-black px-4 py-2 rounded-lg font-medium'
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className='min-h-screen bg-black pb-4'>
      {/* Sticky Header */}
      <div className='sticky top-0 z-10 bg-black/90 backdrop-blur-sm border-b border-zinc-800 px-4 py-3'>
        <div className='flex items-center gap-3'>
          <button
            onClick={() => router.back()}
            className='flex items-center justify-center text-white min-h-[44px] min-w-[44px]'
            aria-label='Go back'
          >
            <ArrowLeft className='h-5 w-5' />
          </button>
          <div className='flex-1'>
            <h1 className='text-lg font-semibold text-white'>Following</h1>
            {user && (
              <p className='text-sm text-zinc-400'>
                Following {user.followingCount}{' '}
                {user.followingCount === 1 ? 'user' : 'users'}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className='px-4 py-3 border-b border-zinc-800'>
        <div className='flex'>
          <Link
            href={`/m/profile/${userId}/followers`}
            className='flex-1 py-2 text-sm font-medium text-center text-zinc-400'
          >
            Followers
          </Link>
          <Link
            href={`/m/profile/${userId}/following`}
            className='flex-1 py-2 text-sm font-medium text-center text-emeraled-green border-b-2 border-emeraled-green'
          >
            Following
          </Link>
        </div>
      </div>

      {/* Following List */}
      <div className='px-4 py-4'>
        {following.length === 0 ? (
          <div className='flex flex-col items-center justify-center py-12 text-center'>
            <div className='w-16 h-16 rounded-full bg-zinc-900 flex items-center justify-center mb-4'>
              <Users className='h-8 w-8 text-zinc-600' />
            </div>
            <p className='text-white font-medium mb-2'>Not Following Anyone</p>
            <p className='text-sm text-zinc-500 max-w-xs'>
              Users this profile follows will appear here.
            </p>
          </div>
        ) : (
          <div className='space-y-3'>
            {following.map(followedUser => (
              <div
                key={followedUser.id}
                className='bg-zinc-900 rounded-lg p-3 border border-zinc-800'
              >
                <div className='flex items-center gap-3'>
                  {/* Avatar */}
                  <Link
                    href={`/m/profile/${followedUser.id}`}
                    className='flex-shrink-0'
                  >
                    <Avatar className='h-12 w-12'>
                      <AvatarImage
                        src={followedUser.image || undefined}
                        alt={followedUser.username || 'User'}
                      />
                      <AvatarFallback className='bg-zinc-700 text-zinc-200'>
                        {followedUser.username?.charAt(0)?.toUpperCase() || 'A'}
                      </AvatarFallback>
                    </Avatar>
                  </Link>

                  {/* User Info */}
                  <div className='flex-1 min-w-0'>
                    <Link href={`/m/profile/${followedUser.id}`}>
                      <p className='font-medium text-white truncate'>
                        {followedUser.username || 'Anonymous user'}
                      </p>
                    </Link>
                    <div className='flex gap-3 text-xs text-zinc-500'>
                      <span>{followedUser.followersCount} followers</span>
                      <span>{followedUser.recommendationsCount} recs</span>
                    </div>
                  </div>

                  {/* Follow Button */}
                  {session?.user?.id && session.user.id !== followedUser.id && (
                    <FollowButton
                      userId={followedUser.id}
                      initialFollowing={followedUser.isFollowing}
                      onFollowChange={() => refetch()}
                      className='text-sm px-3 py-1.5'
                    />
                  )}
                </div>
              </div>
            ))}

            {/* Loading more indicator */}
            {isFetchingNextPage && (
              <div className='flex justify-center py-4'>
                <div className='h-6 w-6 border-2 border-zinc-600 border-t-emeraled-green rounded-full animate-spin' />
              </div>
            )}

            {/* End of list */}
            {!hasNextPage && following.length > 0 && (
              <p className='text-center text-sm text-zinc-500 py-4'>
                You&apos;ve reached the end
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
