import { useMutation, useQueryClient } from '@tanstack/react-query';

import { CreateRecommendationRequest } from '@/types/recommendation';
import {
  queryKeys,
  createMutationOptions,
  handleApiResponse,
  QueryError,
} from '@/lib/queries';

// ========================================
// API Functions
// ========================================

const createRecommendation = async (data: CreateRecommendationRequest) => {
  const response = await fetch('/api/recommendations', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });

  return handleApiResponse(response);
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
    onSuccess: data => {
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
