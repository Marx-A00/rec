import { useMutation, useQueryClient } from '@tanstack/react-query';

import { queryKeys, handleApiResponse } from '@/lib/queries';
import { Recommendation } from '@/types/recommendation';

interface UpdateRecommendationRequest {
  score?: number;
  basisAlbumDiscogsId?: string;
  recommendedAlbumDiscogsId?: string;
  basisAlbumTitle?: string;
  basisAlbumArtist?: string;
  basisAlbumImageUrl?: string;
  basisAlbumYear?: number;
  recommendedAlbumTitle?: string;
  recommendedAlbumArtist?: string;
  recommendedAlbumImageUrl?: string;
  recommendedAlbumYear?: number;
}

interface UpdateRecommendationResponse {
  recommendation: Recommendation;
  success: boolean;
}

const updateRecommendation = async (
  id: string,
  data: UpdateRecommendationRequest
): Promise<Recommendation> => {
  const response = await fetch(`/api/recommendations/${id}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });

  const result: UpdateRecommendationResponse =
    await handleApiResponse(response);
  return result.recommendation;
};

interface UseUpdateRecommendationMutationOptions {
  onSuccess?: (data: Recommendation) => void;
  onError?: (error: Error) => void;
}

export const useUpdateRecommendationMutation = (
  options: UseUpdateRecommendationMutationOptions = {}
) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string;
      data: UpdateRecommendationRequest;
    }) => updateRecommendation(id, data),
    onSuccess: data => {
      // Invalidate and refetch recommendation queries
      queryClient.invalidateQueries({ queryKey: queryKeys.recommendations() });
      queryClient.invalidateQueries({
        queryKey: queryKeys.recommendation(data.id),
      });

      // Optionally update the cache directly for the specific recommendation
      queryClient.setQueryData(queryKeys.recommendation(data.id), data);

      if (options.onSuccess) {
        options.onSuccess(data);
      }
    },
    onError: error => {
      console.error('Failed to update recommendation:', error);
      if (options.onError) {
        options.onError(
          error instanceof Error ? error : new Error('Update failed')
        );
      }
    },
  });
};
