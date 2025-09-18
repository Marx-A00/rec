import { useMutation, useQueryClient } from '@tanstack/react-query';

import { graphqlClient } from '@/lib/graphql-client';
import { queryKeys } from '@/lib/queries';
import { Recommendation } from '@/types/recommendation';

interface UpdateRecommendationRequest {
  score?: number;
  // Note: GraphQL mutation only updates score, not album details
}

const UPDATE_RECOMMENDATION_MUTATION = `
  mutation UpdateRecommendation($id: String!, $score: Int!) {
    updateRecommendation(id: $id, score: $score) {
      id
      score
      createdAt
      updatedAt
      basisAlbum {
        id
        title
      }
      recommendedAlbum {
        id
        title
      }
    }
  }
`;

const updateRecommendation = async (
  id: string,
  data: UpdateRecommendationRequest
): Promise<Recommendation> => {
  try {
    const result: any = await graphqlClient.request(UPDATE_RECOMMENDATION_MUTATION, {
      id,
      score: data.score!,
    });

    // Transform GraphQL response to match Recommendation type
    return {
      id: result.updateRecommendation.id,
      score: result.updateRecommendation.score,
      createdAt: result.updateRecommendation.createdAt,
      updatedAt: result.updateRecommendation.updatedAt,
      userId: '', // These fields would need to be fetched separately if needed
      basisAlbumDiscogsId: '',
      recommendedAlbumDiscogsId: '',
      basisAlbumTitle: result.updateRecommendation.basisAlbum.title,
      basisAlbumArtist: '',
      basisAlbumImageUrl: null,
      basisAlbumYear: null,
      recommendedAlbumTitle: result.updateRecommendation.recommendedAlbum.title,
      recommendedAlbumArtist: '',
      recommendedAlbumImageUrl: null,
      recommendedAlbumYear: null,
      user: null,
    };
  } catch (error: any) {
    if (error.response?.errors?.[0]) {
      throw new Error(error.response.errors[0].message);
    }
    throw new Error('Failed to update recommendation');
  }
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
