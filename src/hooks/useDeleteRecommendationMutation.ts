import { useMutation, useQueryClient } from '@tanstack/react-query';

import { queryKeys, handleApiResponse } from '@/lib/queries';

interface DeleteRecommendationResponse {
  success: boolean;
  message: string;
}

const deleteRecommendation = async (id: string): Promise<void> => {
  const response = await fetch(`/api/recommendations/${id}`, {
    method: 'DELETE',
  });

  await handleApiResponse(response);
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
