'use client';

import { useState, useEffect } from 'react';

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
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [canFollow, setCanFollow] = useState(true);

  // Check follow status on component mount
  useEffect(() => {
    const checkFollowStatus = async () => {
      try {
        const response = await fetch(`/api/users/${userId}/follow`);
        if (response.ok) {
          const data = await response.json();
          setIsFollowing(data.isFollowing);
          setCanFollow(data.canFollow);
        }
      } catch (error) {
        console.error('Error checking follow status:', error);
      }
    };

    checkFollowStatus();
  }, [userId]);

  const handleFollowToggle = async (e?: React.MouseEvent<HTMLButtonElement>) => {
    if (isLoading || !canFollow) return;

    // Blur the button to remove focus state
    if (e) {
      e.currentTarget.blur();
    }

    setIsLoading(true);
    setError(null);

    // Optimistic update
    const previousIsFollowing = isFollowing;
    setIsFollowing(!isFollowing);

    try {
      const method = isFollowing ? 'DELETE' : 'POST';
      const response = await fetch(`/api/users/${userId}/follow`, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update follow status');
      }

      // Update the actual state based on server response
      setIsFollowing(data.isFollowing);

      // Notify parent component of the change (for updating counts)
      if (onFollowChange) {
        const countChange = data.isFollowing ? 1 : -1;
        onFollowChange(data.isFollowing, {
          followersCount: countChange,
          followingCount: 0, // This would be for the current user's following count
        });
      }
    } catch (error) {
      // Revert optimistic update on error
      setIsFollowing(previousIsFollowing);
      setError(error instanceof Error ? error.message : 'An error occurred');
      console.error('Follow/unfollow error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Clear error when user tries again
  const handleRetry = () => {
    setError(null);
    handleFollowToggle();
  };

  if (!canFollow) {
    return null; // Don't show follow button for own profile
  }

  if (error) {
    return (
      <div className={`flex flex-col gap-2 ${className}`}>
        <button
          onClick={handleRetry}
          className='bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-medium transition-colors'
        >
          Retry
        </button>
        <p className='text-red-400 text-xs'>{error}</p>
      </div>
    );
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
