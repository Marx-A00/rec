// src/hooks/useAlbumRecommendations.ts
'use client';

import { useState, useCallback, useEffect, useMemo } from 'react';

import { useGetAlbumRecommendationsQuery } from '@/generated/graphql';

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
    username: string | null;
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

export function useAlbumRecommendations(
  options: UseAlbumRecommendationsOptions
) {
  const [filter, setFilter] = useState<FilterType>(options.filter || 'all');
  const [sort, setSort] = useState<SortType>(options.sort || 'newest');
  const [page, setPage] = useState(options.page || 1);
  const perPage = options.perPage || 12;

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

  // Calculate skip for pagination
  const skip = (page - 1) * perPage;

  // Use generated GraphQL query hook
  const query = useGetAlbumRecommendationsQuery(
    {
      albumId: options.albumId,
      filter: debouncedFilter,
      sort: debouncedSort,
      skip,
      limit: perPage,
    },
    {
      enabled: !!options.albumId,
      staleTime: 10 * 60 * 1000, // 10 minutes
      gcTime: 30 * 60 * 1000, // 30 minutes
      retry: 2,
      retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000),
      refetchOnWindowFocus: false,
      refetchOnMount: false,
      refetchInterval: false,
    }
  );

  // Transform GraphQL data to match the expected interface
  const data: AlbumRecommendationsResponse | undefined = useMemo(() => {
    if (!query.data?.getAlbumRecommendations) return undefined;

    const { recommendations, pagination } = query.data.getAlbumRecommendations;

    return {
      recommendations: recommendations.map(rec => ({
        id: rec.id,
        score: rec.score,
        createdAt:
          typeof rec.createdAt === 'string'
            ? rec.createdAt
            : rec.createdAt.toISOString(),
        updatedAt:
          typeof rec.updatedAt === 'string'
            ? rec.updatedAt
            : rec.updatedAt.toISOString(),
        userId: rec.userId,
        albumRole: rec.albumRole as 'basis' | 'recommended',
        otherAlbum: {
          discogsId: rec.otherAlbum.id, // Using album ID as discogsId for compatibility
          title: rec.otherAlbum.title,
          artist: rec.otherAlbum.artist,
          imageUrl: rec.otherAlbum.imageUrl || null,
          year: rec.otherAlbum.year || null,
        },
        user: {
          id: rec.user.id,
          username: rec.user.username || null,
          image: rec.user.image || null,
        },
      })),
      pagination: {
        page: pagination.page,
        per_page: pagination.perPage,
        total: pagination.total,
        has_more: pagination.hasMore,
      },
      success: true,
    };
  }, [query.data]);

  const loadMore = useCallback(() => {
    if (data?.pagination.has_more) {
      setPage(prev => prev + 1);
    }
  }, [data?.pagination.has_more]);

  const resetFilters = useCallback(() => {
    setFilter('all');
    setSort('newest');
    setPage(1);
  }, []);

  return {
    data,
    isLoading: query.isLoading,
    error: query.error,
    isError: query.isError,
    refetch: query.refetch,
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
    hasMore: data?.pagination.has_more || false,
    total: data?.pagination.total || 0,
    isFetching: query.isFetching,
  };
}
