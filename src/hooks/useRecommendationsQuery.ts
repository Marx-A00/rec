import { useQuery } from '@tanstack/react-query';
import { useState, useMemo, useEffect } from 'react';

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
// Hook Types
// ========================================

export interface UseRecommendationsQueryOptions {
  perPage?: number;
  userId?: string;
  enabled?: boolean;
}

export interface UseRecommendationsQueryData {
  recommendations: RecommendationsResponse['recommendations'];
  isLoading: boolean;
  error: QueryError | null;
  isError: boolean;
  isLoadingMore: boolean;
  hasMorePages: boolean;
  totalItems: number;
  loadedCount: number;
  loadMoreRecommendations: () => Promise<void>;
  pagination?: RecommendationsResponse['pagination'];
}

// ========================================
// Hook
// ========================================

export function useRecommendationsQuery(
  options: UseRecommendationsQueryOptions = {}
): UseRecommendationsQueryData {
  const { perPage = 10, userId, enabled = true } = options;

  const [loadedPages, setLoadedPages] = useState<RecommendationsResponse[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  const {
    data: firstPageData,
    isLoading,
    error,
    isError,
  } = useQuery({
    queryKey: userId
      ? [...queryKeys.recommendationsByUser(userId), { page: 1 }]
      : [...queryKeys.recommendations(), { page: 1 }],
    queryFn: () => fetchRecommendations(1, perPage, userId),
    enabled,
    // Use realtime options for recommendations as they change frequently
    ...defaultQueryOptions.realtime,
  });

  // Update loadedPages when firstPageData changes
  useEffect(() => {
    if (firstPageData) {
      setLoadedPages([firstPageData]);
      setCurrentPage(1);
    }
  }, [firstPageData]);

  // Combine all loaded pages into one array
  const allRecommendations = useMemo(() => {
    return loadedPages.flatMap(page => page.recommendations);
  }, [loadedPages]);

  // Check if there are more pages to load
  const hasMorePages = useMemo(() => {
    if (!firstPageData?.pagination) return false;
    return firstPageData.pagination.has_more;
  }, [firstPageData?.pagination]);

  const totalItems = firstPageData?.pagination?.total || 0;

  const loadMoreRecommendations = async () => {
    if (!hasMorePages || isLoadingMore) return;

    setIsLoadingMore(true);
    try {
      const nextPage = currentPage + 1;
      const nextPageData = await fetchRecommendations(nextPage, perPage, userId);
      setLoadedPages(prev => [...prev, nextPageData]);
      setCurrentPage(nextPage);
    } catch (error) {
      console.error('Failed to load more recommendations:', error);
    } finally {
      setIsLoadingMore(false);
    }
  };

  return {
    recommendations: allRecommendations,
    isLoading,
    error: error as QueryError | null,
    isError,
    isLoadingMore,
    hasMorePages,
    totalItems,
    loadedCount: allRecommendations.length,
    loadMoreRecommendations,
    pagination: firstPageData?.pagination,
  };
}

// Re-export types for convenience
export type { RecommendationsResponse } from '@/types/recommendation';
export { QueryError, isQueryError, getErrorMessage } from '@/lib/queries';
