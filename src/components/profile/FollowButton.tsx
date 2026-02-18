'use client';

import { useRef, useState } from 'react';
import { Loader2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  useFollowUserMutation,
  useUnfollowUserMutation,
} from '@/generated/graphql';

export default function FollowButton({
  userId,
  isFollowing = false,
  onFollowChange,
  className,
}: {
  userId: string;
  isFollowing?: boolean;
  onFollowChange?: (
    isFollowing: boolean,
    newCounts?: { followersCount: number; followingCount: number }
  ) => void;
  className?: string;
}) {
  // Optimistic override shown while mutation is in-flight.
  // Once the prop catches up via query refetch, the override is redundant
  // (override ?? prop yields the same value) so no cleanup needed.
  const [optimisticOverride, setOptimisticOverride] = useState<boolean | null>(
    null
  );
  const [isLoading, setIsLoading] = useState(false);
  const previousFollowingRef = useRef(isFollowing);
  const followMutation = useFollowUserMutation();
  const unfollowMutation = useUnfollowUserMutation();

  const displayFollowing = optimisticOverride ?? isFollowing;

  const handleToggle = async () => {
    const wasFollowing = displayFollowing;
    previousFollowingRef.current = wasFollowing;

    const newFollowingState = !wasFollowing;
    setOptimisticOverride(newFollowingState);
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
      // Rollback — clear override and notify parent
      setOptimisticOverride(null);
      onFollowChange?.(wasFollowing);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Button
      onClick={handleToggle}
      disabled={isLoading}
      variant={displayFollowing ? 'outline' : 'destructive'}
      className={className}
    >
      {isLoading ? (
        <Loader2 className='h-4 w-4 animate-spin' />
      ) : displayFollowing ? (
        'Following'
      ) : (
        'Follow'
      )}
    </Button>
  );
}
