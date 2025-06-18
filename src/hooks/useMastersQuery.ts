import { useQuery } from '@tanstack/react-query';
import { useState, useMemo, useEffect } from 'react';

import type { ReleasesResponse } from '@/types/album';
import {
  queryKeys,
  defaultQueryOptions,
  handleApiResponse,
  QueryError,
} from '@/lib/queries';
import type {
  UseMastersQueryOptions,
  UseMastersQueryData,
} from '@/types/hooks';

// ========================================
// API Functions
// ========================================

const fetchArtistMasters = async (
  artistId: string,
  page: number = 1
): Promise<ReleasesResponse> => {
  const response = await fetch(
    `/api/artists/${artistId}/releases?page=${page}&per_page=25&sort=year&sort_order=desc&type=master`
  );
  return handleApiResponse(response);
};

// ========================================
// Hook
// ========================================

export function useMastersQuery(
  artistId: string,
  options: UseMastersQueryOptions = {}
): UseMastersQueryData {
  const { enabled = !!artistId } = options;

  const [loadedPages, setLoadedPages] = useState<ReleasesResponse[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  const {
    data: firstPageData,
    isLoading,
    error,
    isError,
  } = useQuery({
    queryKey: queryKeys.artistMasters(artistId, 1),
    queryFn: () => fetchArtistMasters(artistId, 1),
    enabled,
    ...defaultQueryOptions.standard,
  });

  // Update loadedPages when firstPageData changes
  useEffect(() => {
    if (firstPageData) {
      setLoadedPages([firstPageData]);
      setCurrentPage(1);
    }
  }, [firstPageData]);

  // Combine all loaded pages into one array
  const allMasters = useMemo(() => {
    return loadedPages.flatMap(page => page.releases);
  }, [loadedPages]);

  // Check if there are more pages to load
  const hasMorePages = useMemo(() => {
    if (!firstPageData?.pagination) return false;
    return currentPage < firstPageData.pagination.pages;
  }, [firstPageData?.pagination, currentPage]);

  const totalItems = firstPageData?.pagination?.items || 0;

  const loadMoreMasters = async () => {
    if (!hasMorePages || isLoadingMore) return;

    setIsLoadingMore(true);
    try {
      const nextPage = currentPage + 1;
      const nextPageData = await fetchArtistMasters(artistId, nextPage);
      setLoadedPages(prev => [...prev, nextPageData]);
      setCurrentPage(nextPage);
    } catch (error) {
      console.error('Failed to load more masters:', error);
    } finally {
      setIsLoadingMore(false);
    }
  };

  return {
    masters: allMasters,
    isLoading,
    error: error as QueryError | null,
    isError,
    isLoadingMore,
    hasMorePages,
    totalItems,
    loadedCount: allMasters.length,
    loadMoreMasters,
    pagination: firstPageData?.pagination,
  };
}

// Re-export types for convenience
export type { ReleasesResponse } from '@/types/album';
export type {
  UseMastersQueryOptions,
  UseMastersQueryData,
} from '@/types/hooks';
export { QueryError, isQueryError, getErrorMessage } from '@/lib/queries';
