'use client';

import { useState, useEffect, useCallback } from 'react';
import { useInfiniteQuery } from '@tanstack/react-query';

import { useAlbumModal } from '@/hooks/useAlbumModal';

import ActivityItem from './ActivityItem';

interface Activity {
  id: string;
  type: 'follow' | 'recommendation' | 'profile_update' | 'collection_add';
  actorId: string;
  actorName: string;
  actorImage: string | null;
  targetId?: string;
  targetName?: string;
  targetImage?: string | null;
  albumId?: string;
  albumTitle?: string;
  albumArtist?: string;
  albumImage?: string | null;
  createdAt: string;
  metadata?: any;
}

interface SocialActivityFeedProps {
  className?: string;
  activityType?:
    | 'follow'
    | 'recommendation'
    | 'profile_update'
    | 'collection_add';
  refreshInterval?: number; // in milliseconds
}

export default function SocialActivityFeed({
  className = '',
  activityType,
  refreshInterval = 30000, // 30 seconds default
}: SocialActivityFeedProps) {
  const { openModal } = useAlbumModal();

  const fetchActivities = async ({ pageParam }: { pageParam?: string }) => {
    const params = new URLSearchParams();
    params.append('limit', '20');
    if (pageParam) params.append('cursor', pageParam);
    if (activityType) params.append('type', activityType);

    const response = await fetch(`/api/feed/social?${params}`);
    if (!response.ok) {
      throw new Error('Failed to fetch activities');
    }
    return response.json();
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
    staleTime: 30000, // 30 seconds
    refetchInterval: refreshInterval, // Auto-refresh every 30 seconds
    refetchOnWindowFocus: true,
    refetchOnMount: true,
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

  if (isLoading) {
    return (
      <div className={`space-y-4 ${className}`}>
        {[...Array(5)].map((_, i) => (
          <div
            key={i}
            className='bg-zinc-900 rounded-lg p-4 border border-zinc-800 animate-pulse'
          >
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
        <div className='bg-zinc-900 rounded-lg p-6 border border-zinc-800'>
          <p className='text-zinc-400 mb-4'>
            {error instanceof Error
              ? error.message
              : 'Failed to load social feed'}
          </p>
          <button
            onClick={handleRefresh}
            className='px-4 py-2 bg-emeraled-green text-black rounded-lg hover:bg-emeraled-green/90 transition-colors font-medium'
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (activities.length === 0) {
    return (
      <div className={`text-center py-12 ${className}`}>
        <div className='bg-zinc-900 rounded-lg p-8 border border-zinc-800'>
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
            className='px-4 py-2 bg-emeraled-green text-black rounded-lg hover:bg-emeraled-green/90 transition-colors font-medium'
          >
            Refresh Feed
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
          className='px-3 py-1 text-sm bg-zinc-800 text-zinc-300 rounded hover:bg-zinc-700 transition-colors'
          disabled={isLoading}
        >
          {isLoading ? 'Refreshing...' : 'Refresh'}
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
          <div className='bg-zinc-900 rounded-lg p-4 border border-zinc-800'>
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
            You've reached the end of your social feed
          </p>
          <p className='text-xs text-zinc-600 mt-1'>
            Feed updates automatically every {refreshInterval / 1000} seconds
          </p>
        </div>
      )}
    </div>
  );
}
