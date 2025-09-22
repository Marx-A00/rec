'use client';

import { useState, useEffect } from 'react';
import { useFollowUserMutation, useUnfollowUserMutation, useCheckFollowStatusQuery } from '@/generated/graphql';

interface FollowButtonProps {
  userId: string;
  initialIsFollowing?: boolean;
  onFollowChange?: (
    isFollowing: boolean,
    newCounts: { followersCount: number; followingCount: number }
  ) => void;
  className?: string;
}

export default function FollowButton({
  userId,
  initialIsFollowing = false,
  onFollowChange,
  className = '',
}: FollowButtonProps) {
  const [isFollowing, setIsFollowing] = useState(initialIsFollowing);
  const [canFollow, setCanFollow] = useState(true);

  // GraphQL hooks
  const followUserMutation = useFollowUserMutation();
  const unfollowUserMutation = useUnfollowUserMutation();
  const { data: followStatusData } = useCheckFollowStatusQuery({
    userId,
    enabled: !!userId,
  });

  const isLoading = followUserMutation.isLoading || unfollowUserMutation.isLoading;

  // Update follow status from query
  useEffect(() => {
    if (followStatusData?.user) {
      setIsFollowing(followStatusData.user.isFollowing || false);
      // TODO: Add canFollow logic based on whether it's the current user
    }
  }, [followStatusData]);

  const handleFollowToggle = async (
    e?: React.MouseEvent<HTMLButtonElement>
  ) => {
    if (isLoading || !canFollow) return;

    // Blur the button to remove focus state
    if (e) {
      e.currentTarget.blur();
    }

    // Optimistic update
    const previousIsFollowing = isFollowing;
    setIsFollowing(!isFollowing);

    try {
      if (isFollowing) {
        // Unfollow
        const result = await unfollowUserMutation.mutateAsync({ userId });

        if (result.data?.unfollowUser) {
          // Successfully unfollowed
          if (onFollowChange) {
            onFollowChange(false, {
              followersCount: -1,
              followingCount: 0,
            });
          }
        } else {
          // Revert if failed
          setIsFollowing(previousIsFollowing);
        }
      } else {
        // Follow
        const result = await followUserMutation.mutateAsync({ userId });

        if (result.data?.followUser) {
          // Successfully followed
          if (onFollowChange) {
            onFollowChange(true, {
              followersCount: 1,
              followingCount: 0,
            });
          }
        } else {
          // Revert if failed
          setIsFollowing(previousIsFollowing);
        }
      }
    } catch (error) {
      // Revert optimistic update on error
      setIsFollowing(previousIsFollowing);
      console.error('Follow/unfollow error:', error);
    }
  };

  if (!canFollow) {
    return null; // Don't show follow button for own profile
  }

  return (
    <button
      onClick={handleFollowToggle}
      disabled={isLoading}
      className={`
        px-4 py-2 rounded-lg font-medium transition-all duration-200
        ${
          isFollowing
            ? 'bg-zinc-700 hover:bg-zinc-600 text-white border border-zinc-600'
            : 'bg-emeraled-green hover:bg-opacity-90 text-black'
        }
        ${isLoading ? 'opacity-75 cursor-not-allowed' : 'hover:scale-105'}
        ${className}
      `}
    >
      {isLoading ? (
        <span className='flex items-center gap-2'>
          <svg
            className='animate-spin h-4 w-4'
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
          {isFollowing ? 'Unfollowing...' : 'Following...'}
        </span>
      ) : (
        <>
          {isFollowing ? (
            <>
              <span className='mr-1'>✓</span>
              Following
            </>
          ) : (
            <>
              <span className='mr-1'>+</span>
              Follow
            </>
          )}
        </>
      )}
    </button>
  );
}