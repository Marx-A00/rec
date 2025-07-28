// src/hooks/useAlbumRecommendations.ts
'use client';

import { useQuery } from '@tanstack/react-query';
import { useState, useCallback, useEffect } from 'react';

export interface AlbumRecommendation {
  id: string;
  score: number;
  createdAt: string;
  updatedAt: string;
  userId: string;
  albumRole: 'basis' | 'recommended';
  otherAlbum: {
    discogsId: string;
    title: string;
    artist: string;
    imageUrl: string | null;
    year: string | null;
  };
  user: {
    id: string;
    name: string | null;
    image: string | null;
  };
}

interface AlbumRecommendationsResponse {
  recommendations: AlbumRecommendation[];
  pagination: {
    page: number;
    per_page: number;
    total: number;
    has_more: boolean;
  };
  success: boolean;
}

export type FilterType = 'all' | 'basis' | 'recommended';
export type SortType = 'newest' | 'oldest' | 'highest_score' | 'lowest_score';

interface UseAlbumRecommendationsOptions {
  albumId: string;
  filter?: FilterType;
  sort?: SortType;
  page?: number;
  perPage?: number;
}

async function fetchAlbumRecommendations({
  albumId,
  filter = 'all',
  sort = 'newest',
  page = 1,
  perPage = 12,
}: UseAlbumRecommendationsOptions): Promise<AlbumRecommendationsResponse> {
  const params = new URLSearchParams({
    page: page.toString(),
    per_page: perPage.toString(),
    filter,
    sort,
  });

  const response = await fetch(
    `/api/albums/${albumId}/recommendations?${params}`
  );

  if (!response.ok) {
    throw new Error('Failed to fetch album recommendations');
  }

  return response.json();
}

export function useAlbumRecommendations(
  options: UseAlbumRecommendationsOptions
) {
  const [filter, setFilter] = useState<FilterType>(options.filter || 'all');
  const [sort, setSort] = useState<SortType>(options.sort || 'newest');
  const [page, setPage] = useState(options.page || 1);

  // Debounced values for API calls
  const [debouncedFilter, setDebouncedFilter] = useState(filter);
  const [debouncedSort, setDebouncedSort] = useState(sort);

  // Debounce filter changes
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedFilter(filter);
    }, 300);

    return () => clearTimeout(timer);
  }, [filter]);

  // Debounce sort changes
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSort(sort);
    }, 300);

    return () => clearTimeout(timer);
  }, [sort]);

  const queryKey = [
    'album-recommendations',
    options.albumId,
    debouncedFilter,
    debouncedSort,
    page,
  ];

  const query = useQuery({
    queryKey,
    queryFn: () =>
      fetchAlbumRecommendations({
        ...options,
        filter: debouncedFilter,
        sort: debouncedSort,
        page,
      }),
    enabled: !!options.albumId,
    staleTime: 10 * 60 * 1000, // 10 minutes - increased for better performance
    gcTime: 30 * 60 * 1000, // 30 minutes - keep data in cache longer
    retry: 2,
    retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000),
    refetchOnWindowFocus: false,
    refetchOnMount: false, // Don't refetch on component remount
    refetchInterval: false, // No automatic refetching
  });

  const loadMore = useCallback(() => {
    if (query.data?.pagination.has_more) {
      setPage(prev => prev + 1);
    }
  }, [query.data?.pagination.has_more]);

  const resetFilters = useCallback(() => {
    setFilter('all');
    setSort('newest');
    setPage(1);
  }, []);

  return {
    ...query,
    filter,
    setFilter: useCallback((newFilter: FilterType) => {
      setFilter(newFilter);
      setPage(1); // Reset to page 1 when filter changes
    }, []),
    sort,
    setSort: useCallback((newSort: SortType) => {
      setSort(newSort);
      setPage(1); // Reset to page 1 when sort changes
    }, []),
    page,
    loadMore,
    resetFilters,
    hasMore: query.data?.pagination.has_more || false,
    total: query.data?.pagination.total || 0,
    isFetching: query.isFetching,
  };
}
