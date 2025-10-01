import { useMutation, useQueryClient } from '@tanstack/react-query';

import { graphqlClient } from '@/lib/graphql-client';
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

const UPDATE_PROFILE_MUTATION = `
  mutation UpdateProfile($name: String, $bio: String) {
    updateProfile(name: $name, bio: $bio) {
      id
      name
      bio
    }
  }
`;

const updateUserProfile = async (
  _userId: string,
  profileData: UpdateProfileRequest
): Promise<UpdateProfileResponse> => {
  try {
    const data: any = await graphqlClient.request(UPDATE_PROFILE_MUTATION, {
      name: profileData.name.trim(),
      bio: profileData.bio.trim(),
    });

    return data.updateProfile;
  } catch (error: any) {
    if (error.response?.errors?.[0]) {
      throw new Error(error.response.errors[0].message);
    }
    throw new Error('Failed to update profile');
  }
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
