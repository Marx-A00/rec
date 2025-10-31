'use client';

import { useState } from 'react';

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
  const followMutation = useFollowUserMutation();
  const unfollowMutation = useUnfollowUserMutation();

  const loading =
    followMutation.status === 'pending' ||
    unfollowMutation.status === 'pending';

  const handleToggle = async () => {
    try {
      if (isFollowing) {
        await unfollowMutation.mutateAsync({ userId });
        setIsFollowing(false);
        onFollowChange?.(false);
      } else {
        await followMutation.mutateAsync({ userId });
        setIsFollowing(true);
        onFollowChange?.(true);
      }
    } catch (e) {
      // noop
    }
  };

  return (
    <Button onClick={handleToggle} disabled={loading} className={className}>
      {loading ? '...' : isFollowing ? 'Unfollow' : 'Follow'}
    </Button>
  );
}
