'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useInfiniteQuery, type InfiniteData } from '@tanstack/react-query';
import { ArrowLeft, Search, X } from 'lucide-react';
import Link from 'next/link';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import FollowButton from '@/components/profile/FollowButton';
import { cn } from '@/lib/utils';

interface UserItem {
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

interface MobileFollowListClientProps {
  userId: string;
  username: string | null;
  userImage: string | null;
  count: number;
  type: 'followers' | 'following';
}

export default function MobileFollowListClient({
  userId,
  username,
  userImage,
  count,
  type,
}: MobileFollowListClientProps) {
  const router = useRouter();
  const { data: session } = useSession();
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  // Focus search input when opened
  useEffect(() => {
    if (showSearch && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [showSearch]);

  interface FollowPage {
    followers?: UserItem[];
    following?: UserItem[];
    hasMore: boolean;
    nextCursor: string | null;
    total: number;
  }

  const fetchUsers = async ({
    pageParam,
  }: {
    pageParam: string | undefined;
  }): Promise<FollowPage> => {
    const params = new URLSearchParams();
    params.append('limit', '20');
    params.append('sort', 'recent');

    if (debouncedSearch) {
      params.append('search', debouncedSearch);
    }
    if (pageParam) {
      params.append('cursor', pageParam);
    }

    const response = await fetch(`/api/users/${userId}/${type}?${params}`);
    if (!response.ok) {
      throw new Error(`Failed to fetch ${type}`);
    }
    return response.json() as Promise<FollowPage>;
  };

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    error,
    refetch,
  } = useInfiniteQuery<
    FollowPage,
    Error,
    InfiniteData<FollowPage>,
    string[],
    string | undefined
  >({
    queryKey: ['users', userId, type, debouncedSearch],
    queryFn: fetchUsers,
    getNextPageParam: lastPage => lastPage.nextCursor ?? undefined,
    initialPageParam: undefined,
  });

  const users: UserItem[] = data?.pages.flatMap(page => page[type] ?? []) || [];

  // Infinite scroll handler — listens on the mobile scroll container, not window
  const handleScroll = useCallback(() => {
    const container = document.getElementById('mobile-scroll-container');
    if (!container) return;
    if (
      container.clientHeight + container.scrollTop >=
      container.scrollHeight - 800
    ) {
      if (hasNextPage && !isFetchingNextPage) {
        fetchNextPage();
      }
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  useEffect(() => {
    const container = document.getElementById('mobile-scroll-container');
    if (!container) return;
    container.addEventListener('scroll', handleScroll);
    return () => container.removeEventListener('scroll', handleScroll);
  }, [handleScroll]);

  const handleFollowChange = useCallback(() => {
    refetch();
  }, [refetch]);

  const title = type === 'followers' ? 'Followers' : 'Following';

  return (
    <div className='min-h-screen bg-black pb-4'>
      {/* Sticky Header */}
      <div className='sticky top-0 z-10 bg-black/90 backdrop-blur-sm border-b border-zinc-800'>
        <div className='flex items-center justify-between px-4 py-3'>
          <button
            onClick={() => router.back()}
            className='flex items-center text-white min-h-[44px] min-w-[44px]'
            aria-label='Go back'
          >
            <ArrowLeft className='h-5 w-5' />
          </button>
          <div className='flex flex-col items-center'>
            <h1 className='text-lg font-semibold text-white'>{title}</h1>
            <p className='text-xs text-zinc-500'>{username || 'User'}</p>
          </div>
          <button
            onClick={() => setShowSearch(!showSearch)}
            className='min-h-[44px] min-w-[44px] flex items-center justify-center text-zinc-400'
            aria-label={showSearch ? 'Close search' : 'Search'}
          >
            {showSearch ? (
              <X className='h-5 w-5' />
            ) : (
              <Search className='h-5 w-5' />
            )}
          </button>
        </div>

        {/* Tab Navigation */}
        <div className='flex border-b border-zinc-800'>
          <Link
            href={`/m/profile/${userId}/followers`}
            className={cn(
              'flex-1 py-3 text-sm font-medium text-center min-h-[44px] flex items-center justify-center transition-colors',
              type === 'followers'
                ? 'text-white border-b-2 border-white'
                : 'text-zinc-500'
            )}
          >
            Followers
          </Link>
          <Link
            href={`/m/profile/${userId}/following`}
            className={cn(
              'flex-1 py-3 text-sm font-medium text-center min-h-[44px] flex items-center justify-center transition-colors',
              type === 'following'
                ? 'text-white border-b-2 border-white'
                : 'text-zinc-500'
            )}
          >
            Following
          </Link>
        </div>

        {/* Search Bar (collapsible) */}
        {showSearch && (
          <div className='px-4 py-3 border-b border-zinc-800'>
            <input
              ref={searchInputRef}
              type='text'
              placeholder={`Search ${type}...`}
              value={search}
              onChange={e => setSearch(e.target.value)}
              className='w-full bg-zinc-900 border border-zinc-700 rounded-lg px-4 py-2.5 text-white text-sm placeholder-zinc-500 focus:outline-none focus:border-zinc-500 transition-colors'
            />
          </div>
        )}
      </div>

      {/* Content */}
      <div className='px-4 pt-3'>
        {/* Loading State */}
        {isLoading && (
          <div className='space-y-3'>
            {Array.from({ length: 8 }).map((_, i) => (
              <div
                key={i}
                className='flex items-center gap-3 p-3 rounded-lg animate-pulse'
              >
                <div className='h-10 w-10 bg-zinc-800 rounded-full flex-shrink-0' />
                <div className='flex-1 space-y-2'>
                  <div className='h-4 bg-zinc-800 rounded w-1/3' />
                  <div className='h-3 bg-zinc-800 rounded w-1/2' />
                </div>
                <div className='h-8 w-20 bg-zinc-800 rounded-md' />
              </div>
            ))}
          </div>
        )}

        {/* Error State */}
        {error && !isLoading && (
          <div className='flex flex-col items-center justify-center py-16 text-center'>
            <p className='text-zinc-400 mb-4'>
              Failed to load {type}. Please try again.
            </p>
            <button
              onClick={() => refetch()}
              className='bg-zinc-800 text-white px-5 py-2.5 rounded-lg text-sm font-medium active:scale-[0.95] transition-transform'
            >
              Retry
            </button>
          </div>
        )}

        {/* Empty State */}
        {!isLoading && !error && users.length === 0 && (
          <div className='flex flex-col items-center justify-center py-16 text-center'>
            <p className='text-white font-medium mb-2'>
              {debouncedSearch
                ? `No results for "${debouncedSearch}"`
                : `No ${type} yet`}
            </p>
            <p className='text-sm text-zinc-500 max-w-xs'>
              {debouncedSearch
                ? 'Try a different search term.'
                : type === 'followers'
                  ? 'Users who follow this profile will appear here.'
                  : 'Users this profile follows will appear here.'}
            </p>
          </div>
        )}

        {/* User List */}
        {!isLoading && !error && users.length > 0 && (
          <div className='space-y-1'>
            {users.map(user => (
              <MobileUserRow
                key={user.id}
                user={user}
                currentUserId={session?.user?.id}
                onFollowChange={handleFollowChange}
              />
            ))}

            {/* Loading more */}
            {isFetchingNextPage && (
              <div className='flex justify-center py-4'>
                <div className='h-6 w-6 border-2 border-zinc-600 border-t-white rounded-full animate-spin' />
              </div>
            )}

            {/* End of list */}
            {!hasNextPage && users.length >= 20 && (
              <p className='text-center text-xs text-zinc-600 py-4'>
                End of list
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// --- Mobile User Row Component ---

interface MobileUserRowProps {
  user: UserItem;
  currentUserId?: string;
  onFollowChange: () => void;
}

function MobileUserRow({
  user,
  currentUserId,
  onFollowChange,
}: MobileUserRowProps) {
  const isOwnProfile = currentUserId === user.id;

  return (
    <div className='flex items-center gap-3 p-3 rounded-lg active:bg-zinc-900/50 transition-colors'>
      {/* Avatar + Name (tappable link) */}
      <Link
        href={`/m/profile/${user.id}`}
        className='flex items-center gap-3 flex-1 min-w-0'
      >
        <Avatar className='h-10 w-10 flex-shrink-0'>
          <AvatarImage
            src={user.image || undefined}
            alt={user.username || 'User'}
          />
          <AvatarFallback className='bg-zinc-800 text-sm'>
            {(user.username || 'U')[0].toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <div className='flex-1 min-w-0'>
          <p className='text-sm font-medium text-white truncate'>
            {user.username || 'Anonymous'}
          </p>
          {user.bio && (
            <p className='text-xs text-zinc-500 truncate'>{user.bio}</p>
          )}
        </div>
      </Link>

      {/* Follow Button */}
      {!isOwnProfile && currentUserId && (
        <FollowButton
          userId={user.id}
          isFollowing={user.isFollowing}
          onFollowChange={() => onFollowChange()}
          className='text-xs px-3 py-1.5 h-8 flex-shrink-0'
        />
      )}
    </div>
  );
}
