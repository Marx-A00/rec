import { useQuery } from '@tanstack/react-query';

import { RecommendationsResponse } from '@/types/recommendation';
import {
  queryKeys,
  defaultQueryOptions,
  handleApiResponse,
  QueryError,
} from '@/lib/queries';

// ========================================
// API Functions
// ========================================

const fetchRecommendations = async (
  page: number = 1,
  perPage: number = 10,
  userId?: string
): Promise<RecommendationsResponse> => {
  const params = new URLSearchParams({
    page: page.toString(),
    per_page: perPage.toString(),
  });

  if (userId) {
    params.append('user_id', userId);
  }

  const response = await fetch(`/api/recommendations?${params}`);
  return handleApiResponse(response);
};

// ========================================
// Hook
// ========================================

export interface UseRecommendationsQueryOptions {
  page?: number;
  perPage?: number;
  userId?: string;
  enabled?: boolean;
}

export function useRecommendationsQuery(
  options: UseRecommendationsQueryOptions = {}
) {
  const { page = 1, perPage = 10, userId, enabled = true } = options;

  return useQuery({
    queryKey: userId
      ? queryKeys.recommendationsByUser(userId)
      : queryKeys.recommendations(),
    queryFn: () => fetchRecommendations(page, perPage, userId),
    enabled,
    // Use realtime options for recommendations as they change frequently
    ...defaultQueryOptions.realtime,
  });
}

// Re-export types for convenience
export type { RecommendationsResponse } from '@/types/recommendation';
export { QueryError, isQueryError, getErrorMessage } from '@/lib/queries';
