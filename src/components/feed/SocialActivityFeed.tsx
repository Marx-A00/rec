'use client';

import { useEffect, useCallback } from 'react';
import { useInfiniteQuery } from '@tanstack/react-query';
import { useSession } from 'next-auth/react';
import type { Session } from 'next-auth';

import SignInButton from '@/components/auth/SignInButton';

import ActivityItem from './ActivityItem';

interface SocialActivityFeedProps {
  className?: string;
  activityType?:
    | 'follow'
    | 'recommendation'
    | 'profile_update'
    | 'collection_add';
  refreshInterval?: number; // in milliseconds
  session?: Session | null; // Optional prop for server-side session
}

export default function SocialActivityFeed({
  className = '',
  activityType,
  refreshInterval = 30000, // 30 seconds default - DISABLED TEMPORARILY
  session: sessionProp,
}: SocialActivityFeedProps) {
  const { data: clientSession } = useSession();

  // Use prop session if provided (server-side), otherwise fall back to client session
  const session = sessionProp ?? clientSession;

  // TODO: See if there is way that we can abstract this query or make it prettier

  const fetchActivities = async ({ pageParam }: { pageParam?: string }) => {
    // GraphQL query for social feed
    const query = `
      query GetSocialFeed($type: ActivityType, $cursor: String, $limit: Int) {
        socialFeed(type: $type, cursor: $cursor, limit: $limit) {
          activities {
            id
            type
            createdAt
            actor {
              id
              name
              image
            }
            targetUser {
              id
              name
              image
            }
            album {
              id
              title
              coverArtUrl
              artists {
                artist {
                  name
                }
              }
            }
            recommendation {
              id
              score
            }
            collection {
              id
              name
            }
            metadata {
              score
              basisAlbum {
                id
                title
                coverArtUrl
                artists {
                  artist {
                    name
                  }
                }
              }
              collectionName
              personalRating
              position
            }
          }
          cursor
          hasMore
        }
      }
    `;

    // Map activity type to GraphQL enum
    const typeMap: Record<string, string> = {
      'follow': 'FOLLOW',
      'recommendation': 'RECOMMENDATION',
      'collection_add': 'COLLECTION_ADD',
      'profile_update': 'PROFILE_UPDATE'
    };

    const response = await fetch('/api/graphql', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({
        query,
        variables: {
          type: activityType ? typeMap[activityType] : null,
          cursor: pageParam,
          limit: 20
        }
      })
    });

    if (!response.ok) {
      throw new Error('Failed to fetch activities');
    }

    const { data, errors } = await response.json();

    if (errors) {
      throw new Error(errors[0].message);
    }

    // Transform GraphQL response to match existing format
    const activities = data.socialFeed.activities.map((activity: any) => ({
      id: activity.id,
      type: activity.type.toLowerCase().replace('_', '_'),
      actorId: activity.actor.id,
      actorName: activity.actor.name,
      actorImage: activity.actor.image,
      targetId: activity.targetUser?.id,
      targetName: activity.targetUser?.name,
      targetImage: activity.targetUser?.image,
      albumId: activity.album?.id,
      albumTitle: activity.album?.title,
      albumArtist: activity.album?.artists?.[0]?.artist?.name,
      albumImage: activity.album?.coverArtUrl,
      createdAt: activity.createdAt,
      metadata: activity.metadata ? {
        score: activity.metadata.score,
        basisAlbum: activity.metadata.basisAlbum,
        collectionName: activity.metadata.collectionName,
        personalRating: activity.metadata.personalRating
      } : undefined
    }));

    return {
      activities,
      nextCursor: data.socialFeed.cursor,
      hasMore: data.socialFeed.hasMore
    };
  };

  const {
    data,
    error,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    isError,
    refetch,
    isFetching,
  } = useInfiniteQuery({
    queryKey: ['social-feed', activityType],
    queryFn: fetchActivities,
    initialPageParam: undefined,
    getNextPageParam: lastPage => lastPage.nextCursor,
    staleTime: 5 * 60 * 1000, // 5 minutes (increased from 30 seconds)
    refetchInterval: false, // DISABLED: was refreshInterval - causing performance issues
    refetchOnWindowFocus: false, // DISABLED: prevent refetch on tab switch
    refetchOnMount: 'always', // Only fetch on mount
    enabled: !!session, // Only fetch if user is signed in
  });

  // Flatten activities from all pages
  const activities = data?.pages?.flatMap(page => page.activities || []) || [];

  // Infinite scroll handler
  const handleScroll = useCallback(() => {
    if (
      window.innerHeight + document.documentElement.scrollTop >=
        document.documentElement.offsetHeight - 1000 &&
      hasNextPage &&
      !isFetchingNextPage
    ) {
      fetchNextPage();
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  useEffect(() => {
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [handleScroll]);

  const handleAlbumClick = (albumId: string) => {
    // TODO: Implement album modal functionality
    // Need to convert albumId to Release/CollectionAlbum object for openModal
    console.log('Album clicked:', albumId);
  };

  const handleRefresh = () => {
    refetch();
  };

  // Show sign-in message if user is not authenticated
  if (!session) {
    return (
      <div className={`text-center py-12 ${className}`}>
        <div className='rounded-lg p-8'>
          <div className='text-6xl mb-4'>🔒</div>
          <h3 className='text-xl font-semibold text-cosmic-latte mb-2'>
            Sign In Required
          </h3>
          <p className='text-zinc-400 mb-6 max-w-md mx-auto'>
            Please sign in to view your social activity feed and see what your
            friends are recommending and adding to their collections.
          </p>
          <div className='flex justify-center'>
            <SignInButton />
          </div>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className={`space-y-4 ${className}`}>
        {[...Array(5)].map((_, i) => (
          <div key={i} className='rounded-lg p-4 animate-pulse'>
            <div className='flex items-start gap-3'>
              <div className='w-10 h-10 bg-zinc-700 rounded-full flex-shrink-0' />
              <div className='flex-1 space-y-2'>
                <div className='h-4 bg-zinc-700 rounded w-3/4' />
                <div className='h-3 bg-zinc-700 rounded w-1/2' />
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <div className={`text-center py-8 ${className}`}>
        <div className='rounded-lg p-6'>
          <p className='text-zinc-400 mb-4'>
            {error instanceof Error
              ? error.message
              : 'Failed to load social feed'}
          </p>
          <button
            onClick={handleRefresh}
            className='p-3 text-zinc-300 rounded-lg hover:bg-zinc-800 hover:text-cosmic-latte transition-colors group'
            aria-label='Try again'
          >
            <svg
              className='w-5 h-5 transition-transform group-hover:rotate-180'
              fill='none'
              stroke='currentColor'
              viewBox='0 0 24 24'
              xmlns='http://www.w3.org/2000/svg'
            >
              <path
                strokeLinecap='round'
                strokeLinejoin='round'
                strokeWidth={2}
                d='M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15'
              />
            </svg>
          </button>
        </div>
      </div>
    );
  }

  if (activities.length === 0) {
    return (
      <div className={`text-center py-12 ${className}`}>
        <div className='rounded-lg p-8'>
          <div className='text-6xl mb-4'>🎵</div>
          <h3 className='text-xl font-semibold text-cosmic-latte mb-2'>
            No Activity Yet
          </h3>
          <p className='text-zinc-400 mb-6 max-w-md mx-auto'>
            Follow some users to see their music recommendations, new follows,
            and collection updates in your social feed.
          </p>
          <button
            onClick={handleRefresh}
            className='p-3 text-zinc-300 rounded-lg hover:bg-zinc-800 hover:text-cosmic-latte transition-colors group'
            aria-label='Refresh feed'
          >
            <svg
              className='w-5 h-5 transition-transform group-hover:rotate-180'
              fill='none'
              stroke='currentColor'
              viewBox='0 0 24 24'
              xmlns='http://www.w3.org/2000/svg'
            >
              <path
                strokeLinecap='round'
                strokeLinejoin='round'
                strokeWidth={2}
                d='M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15'
              />
            </svg>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Header with refresh status */}
      <div className='flex justify-between items-center mb-6'>
        <div className='flex items-center gap-3'>
          <h2 className='text-xl font-semibold text-cosmic-latte'>
            Social Activity
            {activityType && (
              <span className='text-sm text-zinc-400 ml-2 font-normal'>
                ({activityType.replace('_', ' ')})
              </span>
            )}
          </h2>

          {/* Auto-refresh indicator */}
          {isFetching && !isLoading && (
            <div className='flex items-center gap-2'>
              <div className='w-2 h-2 bg-emeraled-green rounded-full animate-pulse' />
              <span className='text-xs text-zinc-500'>Updating...</span>
            </div>
          )}
        </div>

        <button
          onClick={handleRefresh}
          className='p-2 text-zinc-300 rounded hover:bg-zinc-800 hover:text-cosmic-latte transition-colors group'
          disabled={isLoading}
          aria-label={isLoading ? 'Refreshing...' : 'Refresh feed'}
        >
          <svg
            className={`w-4 h-4 transition-transform ${
              isLoading ? 'animate-spin' : 'group-hover:rotate-180'
            }`}
            fill='none'
            stroke='currentColor'
            viewBox='0 0 24 24'
            xmlns='http://www.w3.org/2000/svg'
          >
            <path
              strokeLinecap='round'
              strokeLinejoin='round'
              strokeWidth={2}
              d='M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15'
            />
          </svg>
        </button>
      </div>

      {/* Activities List */}
      <div className='space-y-4'>
        {activities.map(activity => (
          <ActivityItem
            key={activity.id}
            activity={activity}
            onAlbumClick={handleAlbumClick}
          />
        ))}
      </div>

      {/* Loading More Indicator */}
      {isFetchingNextPage && (
        <div className='text-center py-4'>
          <div className='rounded-lg p-4'>
            <div className='flex items-center justify-center gap-2'>
              <div className='w-4 h-4 border-2 border-emeraled-green border-t-transparent rounded-full animate-spin' />
              <span className='text-zinc-400'>Loading more activities...</span>
            </div>
          </div>
        </div>
      )}

      {/* End of Feed */}
      {!hasNextPage && activities.length > 0 && (
        <div className='text-center py-8'>
          <p className='text-zinc-500 text-sm'>
            You&apos;ve reached the end of your social feed
          </p>
          <p className='text-xs text-zinc-600 mt-1'>
            Feed updates automatically every {refreshInterval / 1000} seconds
          </p>
        </div>
      )}
    </div>
  );
}
