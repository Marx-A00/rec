import { useMutation, useQueryClient } from '@tanstack/react-query';

import { useUpdateProfileMutation } from '@/generated/graphql';
import { queryKeys } from '@/lib/queries';

interface UpdateProfileRequest {
  name: string;
  bio: string;
}

interface UpdateProfileResponse {
  name: string;
  bio: string;
  id: string;
}

function normalizeProfileInput(p: UpdateProfileRequest) {
  return { name: p.name.trim(), bio: p.bio.trim() };
}

interface UseUpdateUserProfileMutationOptions {
  onSuccess?: (updatedUser: { name: string; bio: string }) => void;
  onError?: (error: string) => void;
}

export const useUpdateUserProfileMutation = (
  userId: string,
  options: UseUpdateUserProfileMutationOptions = {}
) => {
  const queryClient = useQueryClient();
  const updateProfileGQL = useUpdateProfileMutation();

  return useMutation({
    mutationFn: async (profileData: UpdateProfileRequest) => {
      const input = normalizeProfileInput(profileData);
      const res = await updateProfileGQL.mutateAsync(input);
      return res.updateProfile as UpdateProfileResponse;
    },
    onSuccess: data => {
      // Invalidate user queries to refetch updated profile data
      queryClient.invalidateQueries({ queryKey: queryKeys.user(userId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.users() });

      if (options.onSuccess) {
        options.onSuccess({ name: data.name, bio: data.bio });
      }
    },
    onError: error => {
      console.error('Profile update error:', error);
      if (options.onError) {
        options.onError(
          error instanceof Error ? error.message : 'An error occurred'
        );
      }
    },
  });
};
