import { useMutation, useQueryClient } from '@tanstack/react-query';

import { graphqlClient } from '@/lib/graphql-client';
import { CreateRecommendationRequest } from '@/types/recommendation';
import {
  queryKeys,
  createMutationOptions,
} from '@/lib/queries';

// ========================================
// API Functions
// ========================================

const CREATE_RECOMMENDATION_MUTATION = `
  mutation CreateRecommendation($basisAlbumId: UUID!, $recommendedAlbumId: UUID!, $score: Int!) {
    createRecommendation(
      basisAlbumId: $basisAlbumId,
      recommendedAlbumId: $recommendedAlbumId,
      score: $score
    ) {
      id
      score
      createdAt
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

const createRecommendation = async (data: CreateRecommendationRequest): Promise<undefined> => {
  try {
    // Note: The GraphQL mutation uses album UUIDs, not Discogs IDs
    // If data contains Discogs IDs, they need to be converted first
    await graphqlClient.request(CREATE_RECOMMENDATION_MUTATION, {
      basisAlbumId: data.basisAlbumDiscogsId, // This might need conversion
      recommendedAlbumId: data.recommendedAlbumDiscogsId, // This might need conversion
      score: data.score,
    });
  } catch (error: any) {
    if (error.response?.errors?.[0]) {
      throw new Error(error.response.errors[0].message);
    }
    throw new Error('Failed to create recommendation');
  }
};

// ========================================
// Hook
// ========================================

export interface UseCreateRecommendationMutationOptions {
  onSuccess?: () => void;
  onError?: (error: unknown) => void;
}

export function useCreateRecommendationMutation(
  options: UseCreateRecommendationMutationOptions = {}
) {
  const queryClient = useQueryClient();
  const { onSuccess, onError } = options;

  return useMutation({
    mutationFn: createRecommendation,
    onSuccess: () => {
      // Invalidate and refetch recommendations
      queryClient.invalidateQueries({
        queryKey: queryKeys.recommendations(),
      });
      onSuccess?.();
    },
    onError: error => {
      onError?.(error);
    },
    ...createMutationOptions(),
  });
}

// Re-export types for convenience
export type { CreateRecommendationRequest } from '@/types/recommendation';
export { QueryError, isQueryError, getErrorMessage } from '@/lib/queries';
