import { useMutation, useQueryClient } from '@tanstack/react-query';

import { graphqlClient } from '@/lib/graphql-client';
import { queryKeys } from '@/lib/queries';

const DELETE_RECOMMENDATION_MUTATION = `
  mutation DeleteRecommendation($id: String!) {
    deleteRecommendation(id: $id)
  }
`;

const deleteRecommendation = async (id: string): Promise<void> => {
  try {
    await graphqlClient.request(DELETE_RECOMMENDATION_MUTATION, { id });
  } catch (error: any) {
    if (error.response?.errors?.[0]) {
      throw new Error(error.response.errors[0].message);
    }
    throw new Error('Failed to delete recommendation');
  }
};

interface UseDeleteRecommendationMutationOptions {
  onSuccess?: () => void;
  onError?: (error: Error) => void;
}

export const useDeleteRecommendationMutation = (
  options: UseDeleteRecommendationMutationOptions = {}
) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deleteRecommendation(id),
    onSuccess: (_, deletedId) => {
      // Remove the recommendation from the cache
      queryClient.removeQueries({
        queryKey: queryKeys.recommendation(deletedId),
      });

      // Invalidate and refetch the recommendations list
      queryClient.invalidateQueries({ queryKey: queryKeys.recommendations() });

      if (options.onSuccess) {
        options.onSuccess();
      }
    },
    onError: error => {
      console.error('Failed to delete recommendation:', error);
      if (options.onError) {
        options.onError(
          error instanceof Error ? error : new Error('Delete failed')
        );
      }
    },
  });
};
