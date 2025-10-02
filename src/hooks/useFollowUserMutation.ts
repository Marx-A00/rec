import { useMutation, useQueryClient } from '@tanstack/react-query';

import {
  useFollowUserMutation as useFollowUserGQL,
  useUnfollowUserMutation,
} from '@/generated/graphql';
import { queryKeys } from '@/lib/queries';

interface FollowActionResponse {
  isFollowing: boolean;
  message: string;
}

function mapGQLError(error: unknown): Error {
  const e = error as any;
  const message =
    e?.response?.errors?.[0]?.message || e?.message || 'Request failed';
  return new Error(message);
}

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
  const followGQL = useFollowUserGQL();
  const unfollowGQL = useUnfollowUserMutation();

  return useMutation({
    mutationFn: async ({ action }: { action: 'follow' | 'unfollow' }) => {
      try {
        if (action === 'follow') {
          await followGQL.mutateAsync({ userId });
          return {
            isFollowing: true,
            message: 'Successfully followed user',
          } as FollowActionResponse;
        }
        await unfollowGQL.mutateAsync({ userId });
        return {
          isFollowing: false,
          message: 'Successfully unfollowed user',
        } as FollowActionResponse;
      } catch (error) {
        throw mapGQLError(error);
      }
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
