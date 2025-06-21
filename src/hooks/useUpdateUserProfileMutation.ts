import { useMutation, useQueryClient } from '@tanstack/react-query';

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

const updateUserProfile = async (
  userId: string,
  profileData: UpdateProfileRequest
): Promise<UpdateProfileResponse> => {
  const response = await fetch(`/api/users/${userId}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      name: profileData.name.trim(),
      bio: profileData.bio.trim(),
    }),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || 'Failed to update profile');
  }

  return response.json();
};

interface UseUpdateUserProfileMutationOptions {
  onSuccess?: (updatedUser: { name: string; bio: string }) => void;
  onError?: (error: string) => void;
}

export const useUpdateUserProfileMutation = (
  userId: string,
  options: UseUpdateUserProfileMutationOptions = {}
) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (profileData: UpdateProfileRequest) =>
      updateUserProfile(userId, profileData),
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
