import { useMutation, useQueryClient } from '@tanstack/react-query';

import { queryKeys } from '@/lib/queries';

interface FollowActionResponse {
  isFollowing: boolean;
  message: string;
}

const followUser = async (userId: string): Promise<FollowActionResponse> => {
  const response = await fetch(`/api/users/${userId}/follow`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const data = await response.json();
    throw new Error(data.error || 'Failed to follow user');
  }

  return response.json();
};

const unfollowUser = async (userId: string): Promise<FollowActionResponse> => {
  const response = await fetch(`/api/users/${userId}/follow`, {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const data = await response.json();
    throw new Error(data.error || 'Failed to unfollow user');
  }

  return response.json();
};

interface UseFollowUserMutationOptions {
  onSuccess?: (
    isFollowing: boolean,
    newCounts: { followersCount: number; followingCount: number }
  ) => void;
  onError?: (error: string) => void;
}

export const useFollowUserMutation = (
  userId: string,
  options: UseFollowUserMutationOptions = {}
) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ action }: { action: 'follow' | 'unfollow' }) => {
      return action === 'follow' ? followUser(userId) : unfollowUser(userId);
    },
    onSuccess: data => {
      // Invalidate user data to refetch updated follower counts
      queryClient.invalidateQueries({ queryKey: queryKeys.user(userId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.users() });

      if (options.onSuccess) {
        const countChange = data.isFollowing ? 1 : -1;
        options.onSuccess(data.isFollowing, {
          followersCount: countChange,
          followingCount: 0, // This would be for the current user's following count
        });
      }
    },
    onError: error => {
      console.error('Follow/unfollow error:', error);
      if (options.onError) {
        options.onError(
          error instanceof Error ? error.message : 'An error occurred'
        );
      }
    },
  });
};
