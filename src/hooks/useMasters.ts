import { useQuery } from '@tanstack/react-query';
import { useState, useMemo, useEffect } from 'react';

import type { ReleasesResponse } from '@/types/album';

async function fetchArtistMasters(
  artistId: string,
  page: number = 1
): Promise<ReleasesResponse> {
  const response = await fetch(
    `/api/artists/${artistId}/releases?page=${page}&per_page=25&sort=year&sort_order=desc&type=master`
  );
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || 'Failed to fetch artist masters');
  }
  return response.json();
}

export function useMasters(artistId: string) {
  const [loadedPages, setLoadedPages] = useState<ReleasesResponse[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  const {
    data: firstPageData,
    isLoading,
    error,
    isError,
  } = useQuery({
    queryKey: ['artist-masters', artistId, 1],
    queryFn: () => fetchArtistMasters(artistId, 1),
    enabled: !!artistId,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    retry: 2,
    refetchOnWindowFocus: false,
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
    error,
    isError,
    isLoadingMore,
    hasMorePages,
    totalItems,
    loadedCount: allMasters.length,
    loadMoreMasters,
    pagination: firstPageData?.pagination,
  };
}
