import { useMutation, useQueryClient } from '@tanstack/react-query';

import { graphqlClient } from '@/lib/graphql-client';
import { queryKeys } from '@/lib/queries';

interface FollowActionResponse {
  isFollowing: boolean;
  message: string;
}

const FOLLOW_USER_MUTATION = `
  mutation FollowUser($userId: String!) {
    followUser(userId: $userId) {
      id
      follower {
        id
        followingCount
      }
      followed {
        id
        followersCount
      }
    }
  }
`;

const UNFOLLOW_USER_MUTATION = `
  mutation UnfollowUser($userId: String!) {
    unfollowUser(userId: $userId)
  }
`;

const followUser = async (userId: string): Promise<FollowActionResponse> => {
  try {
    await graphqlClient.request(FOLLOW_USER_MUTATION, { userId });
    return {
      isFollowing: true,
      message: 'Successfully followed user',
    };
  } catch (error: any) {
    if (error.response?.errors?.[0]) {
      throw new Error(error.response.errors[0].message);
    }
    throw new Error('Failed to follow user');
  }
};

const unfollowUser = async (userId: string): Promise<FollowActionResponse> => {
  try {
    await graphqlClient.request(UNFOLLOW_USER_MUTATION, { userId });
    return {
      isFollowing: false,
      message: 'Successfully unfollowed user',
    };
  } catch (error: any) {
    if (error.response?.errors?.[0]) {
      throw new Error(error.response.errors[0].message);
    }
    throw new Error('Failed to unfollow user');
  }
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
