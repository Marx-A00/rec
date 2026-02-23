import { useMutation, useQueryClient } from '@tanstack/react-query';

import { graphqlClient } from '@/lib/graphql-client';
import { queryKeys } from '@/lib/queries';

interface UpdateRecommendationRequest {
  score: number;
}

interface UpdateRecommendationResponse {
  updateRecommendation: { id: string };
}

const UPDATE_RECOMMENDATION_MUTATION = `
  mutation UpdateRecommendation($id: String!, $score: Int!) {
    updateRecommendation(id: $id, score: $score) {
      id
    }
  }
`;

const updateRecommendation = async (
  id: string,
  data: UpdateRecommendationRequest
): Promise<string> => {
  try {
    const result = await graphqlClient.request<UpdateRecommendationResponse>(
      UPDATE_RECOMMENDATION_MUTATION,
      { id, score: data.score }
    );
    return result.updateRecommendation.id;
  } catch (error: unknown) {
    const gqlError = error as {
      response?: { errors?: Array<{ message: string }> };
    };
    if (gqlError.response?.errors?.[0]) {
      throw new Error(gqlError.response.errors[0].message);
    }
    throw new Error('Failed to update recommendation');
  }
};

interface UseUpdateRecommendationMutationOptions {
  onSuccess?: () => void;
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
    onSuccess: updatedId => {
      // Invalidate to refetch with fresh data
      queryClient.invalidateQueries({ queryKey: queryKeys.recommendations() });
      queryClient.invalidateQueries({
        queryKey: queryKeys.recommendation(updatedId),
      });

      if (options.onSuccess) {
        options.onSuccess();
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
