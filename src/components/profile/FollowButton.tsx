'use client';

import { useEffect, useState, useRef } from 'react';
import { Loader2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  useFollowUserMutation,
  useUnfollowUserMutation,
} from '@/generated/graphql';

export default function FollowButton({
  userId,
  initialFollowing = false,
  onFollowChange,
  className,
}: {
  userId: string;
  initialFollowing?: boolean;
  onFollowChange?: (
    isFollowing: boolean,
    newCounts?: { followersCount: number; followingCount: number }
  ) => void;
  className?: string;
}) {
  const [isFollowing, setIsFollowing] = useState(initialFollowing);
  const [isLoading, setIsLoading] = useState(false);
  const previousFollowingRef = useRef(initialFollowing);
  const followMutation = useFollowUserMutation();
  const unfollowMutation = useUnfollowUserMutation();

  // Sync with initialFollowing prop when it changes (e.g., after query refetch)
  useEffect(() => {
    setIsFollowing(initialFollowing);
  }, [initialFollowing]);

  const handleToggle = async () => {
    // Store previous state for rollback
    const wasFollowing = isFollowing;
    previousFollowingRef.current = wasFollowing;

    // Optimistic UI update
    const newFollowingState = !wasFollowing;
    setIsFollowing(newFollowingState);
    setIsLoading(true);

    // Notify parent immediately for optimistic count update
    onFollowChange?.(newFollowingState);

    try {
      if (wasFollowing) {
        await unfollowMutation.mutateAsync({ userId });
      } else {
        await followMutation.mutateAsync({ userId });
      }
    } catch {
      // Rollback on error
      setIsFollowing(wasFollowing);
      onFollowChange?.(wasFollowing);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Button
      onClick={handleToggle}
      disabled={isLoading}
      variant={isFollowing ? 'outline' : 'destructive'}
      className={className}
    >
      {isLoading ? (
        <Loader2 className='h-4 w-4 animate-spin' />
      ) : isFollowing ? (
        'Following'
      ) : (
        'Follow'
      )}
    </Button>
  );
}
