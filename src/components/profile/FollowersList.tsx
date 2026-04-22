'use client';

import { useState, useEffect, useCallback } from 'react';
import type { InfiniteData } from '@tanstack/react-query';

import {
  useInfiniteGetUserFollowersQuery,
  useInfiniteGetUserFollowingQuery,
  type GetUserFollowersQuery,
  type GetUserFollowingQuery,
} from '@/generated/graphql';
import UserListItem from './UserListItem';

interface FollowersListProps {
  userId: string;
  type: 'followers' | 'following';
  currentUserId?: string;
  className?: string;
}

export default function FollowersList({
  userId,
  type,
  currentUserId,
  className = '',
}: FollowersListProps) {
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<'recent' | 'alphabetical'>('recent');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
    }, 300);

    return () => clearTimeout(timer);
  }, [search]);

  const variables = { userId, limit: 20, search: debouncedSearch || undefined, sort };

  const followersQuery = useInfiniteGetUserFollowersQuery(
    variables,
    {
      initialPageParam: undefined,
      getNextPageParam: (lastPage: GetUserFollowersQuery) =>
        lastPage.userFollowers?.cursor
          ? { cursor: lastPage.userFollowers.cursor }
          : undefined,
      enabled: type === 'followers',
    }
  );

  const followingQuery = useInfiniteGetUserFollowingQuery(
    variables,
    {
      initialPageParam: undefined,
      getNextPageParam: (lastPage: GetUserFollowingQuery) =>
        lastPage.userFollowing?.cursor
          ? { cursor: lastPage.userFollowing.cursor }
          : undefined,
      enabled: type === 'following',
    }
  );

  const query = type === 'followers' ? followersQuery : followingQuery;
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading, error, refetch } = query;

  // Extract users from paginated data
  const users =
    type === 'followers'
      ? (data as InfiniteData<GetUserFollowersQuery> | undefined)?.pages.flatMap(
          page => page.userFollowers.users
        ) || []
      : (data as InfiniteData<GetUserFollowingQuery> | undefined)?.pages.flatMap(
          page => page.userFollowing.users
        ) || [];

  // Handle follow status changes with optimistic updates
  const handleFollowChange = useCallback(
    (
      _targetUserId: string,
      _isFollowing: boolean,
      _newCounts: { followersCount: number; followingCount: number }
    ) => {
      refetch();
    },
    [refetch]
  );

  // Load more when scrolling near bottom
  const handleScroll = useCallback(() => {
    if (
      window.innerHeight + document.documentElement.scrollTop >=
      document.documentElement.offsetHeight - 1000
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

  if (isLoading) {
    return (
      <div className={`space-y-4 ${className}`}>
        {/* Loading skeletons */}
        {[...Array(5)].map((_, i) => (
          <div
            key={i}
            className='bg-zinc-900 rounded-lg p-4 border border-zinc-800 animate-pulse'
          >
            <div className='flex items-start gap-4'>
              <div className='h-12 w-12 bg-zinc-700 rounded-full'></div>
              <div className='flex-1 space-y-2'>
                <div className='h-4 bg-zinc-700 rounded w-1/3'></div>
                <div className='h-3 bg-zinc-700 rounded w-1/2'></div>
                <div className='h-3 bg-zinc-700 rounded w-2/3'></div>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className={`text-center py-8 ${className}`}>
        <p className='text-red-400 mb-4'>
          Failed to load {type}. Please try again.
        </p>
        <button
          onClick={() => refetch()}
          className='bg-emeraled-green text-black px-4 py-2 rounded-lg font-medium hover:bg-opacity-90 transition-colors'
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className={className}>
      {/* Search and Sort Controls */}
      <div className='mb-6 space-y-4'>
        <div className='flex flex-col sm:flex-row gap-4'>
          {/* Search Input */}
          <div className='flex-1'>
            <input
              type='text'
              placeholder={`Search ${type}...`}
              value={search}
              onChange={e => setSearch(e.target.value)}
              className='w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2 text-white placeholder-zinc-400 focus:outline-none focus:border-emeraled-green transition-colors'
            />
          </div>

          {/* Sort Dropdown */}
          <select
            value={sort}
            onChange={e => setSort(e.target.value as 'recent' | 'alphabetical')}
            className='bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-emeraled-green transition-colors'
          >
            <option value='recent'>Most Recent</option>
            <option value='alphabetical'>Alphabetical</option>
          </select>
        </div>

        {/* Results Count */}
        {users.length > 0 && (
          <p className='text-sm text-zinc-400'>
            {debouncedSearch
              ? `Found ${users.length} results`
              : `${users.length} ${type}`}
          </p>
        )}
      </div>

      {/* Users List */}
      {users.length === 0 ? (
        <div className='text-center py-12'>
          <p className='text-zinc-400 text-lg mb-2'>
            {debouncedSearch
              ? `No ${type} found matching "${debouncedSearch}"`
              : `No ${type} yet`}
          </p>
          {!debouncedSearch && (
            <p className='text-zinc-500 text-sm'>
              {type === 'followers'
                ? 'Users who follow this profile will appear here'
                : 'Users this profile follows will appear here'}
            </p>
          )}
        </div>
      ) : (
        <div className='space-y-4'>
          {users.map(user => (
            <UserListItem
              key={user.id}
              user={user}
              currentUserId={currentUserId}
              onFollowChange={handleFollowChange}
            />
          ))}

          {/* Load More Indicator */}
          {isFetchingNextPage && (
            <div className='text-center py-4'>
              <div className='inline-flex items-center gap-2 text-zinc-400'>
                <svg
                  className='animate-spin h-5 w-5'
                  xmlns='http://www.w3.org/2000/svg'
                  fill='none'
                  viewBox='0 0 24 24'
                >
                  <circle
                    className='opacity-25'
                    cx='12'
                    cy='12'
                    r='10'
                    stroke='currentColor'
                    strokeWidth='4'
                  ></circle>
                  <path
                    className='opacity-75'
                    fill='currentColor'
                    d='M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z'
                  ></path>
                </svg>
                Loading more...
              </div>
            </div>
          )}

          {/* No More Results */}
          {!hasNextPage && users.length > 0 && (
            <div className='text-center py-4'>
              <p className='text-zinc-500 text-sm'>
                You&apos;ve reached the end of the list
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
