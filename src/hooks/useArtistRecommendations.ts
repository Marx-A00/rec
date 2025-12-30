// src/hooks/useArtistRecommendations.ts
'use client';

import { useState, useCallback, useEffect, useMemo } from 'react';

import {
  useGetArtistRecommendationsQuery,
  AlbumRole,
  ArtistRecommendationSort,
  GetArtistRecommendationsQuery,
} from '@/generated/graphql';

export type FilterType = 'all' | 'basis' | 'recommended';
export type SortType = 'newest' | 'oldest' | 'highest_score' | 'lowest_score';

interface UseArtistRecommendationsOptions {
  artistId: string;
  initialFilter?: FilterType;
  initialSort?: SortType;
  limit?: number;
}

// Type for the recommendations returned from GraphQL
type GraphQLRecommendation = NonNullable<
  GetArtistRecommendationsQuery['artistRecommendations']
>['recommendations'][number];

export function useArtistRecommendations({
  artistId,
  initialFilter = 'all',
  initialSort = 'newest',
  limit = 12,
}: UseArtistRecommendationsOptions) {
  const [filter, setFilter] = useState<FilterType>(initialFilter);
  const [sort, setSort] = useState<SortType>(initialSort);
  const [offset, setOffset] = useState(0);
  const [allRecommendations, setAllRecommendations] = useState<
    GraphQLRecommendation[]
  >([]);

  // Map local filter/sort to GraphQL enums
  const gqlFilter = useMemo((): AlbumRole | undefined => {
    if (filter === 'all') return undefined;
    if (filter === 'basis') return AlbumRole.Basis;
    if (filter === 'recommended') return AlbumRole.Recommended;
    return undefined;
  }, [filter]);

  const gqlSort = useMemo((): ArtistRecommendationSort => {
    switch (sort) {
      case 'newest':
        return ArtistRecommendationSort.Newest;
      case 'oldest':
        return ArtistRecommendationSort.Oldest;
      case 'highest_score':
        return ArtistRecommendationSort.HighestScore;
      case 'lowest_score':
        return ArtistRecommendationSort.LowestScore;
      default:
        return ArtistRecommendationSort.Newest;
    }
  }, [sort]);

  // Reset offset when filter or sort changes
  useEffect(() => {
    setOffset(0);
    setAllRecommendations([]);
  }, [filter, sort]);

  const { data, isLoading, error, refetch, isFetching } =
    useGetArtistRecommendationsQuery(
      {
        artistId,
        filter: gqlFilter,
        sort: gqlSort,
        limit,
        offset,
      },
      {
        enabled: !!artistId,
        staleTime: 5 * 60 * 1000, // 5 minutes
        gcTime: 10 * 60 * 1000, // 10 minutes
        retry: 2,
        refetchOnWindowFocus: false,
      }
    );

  // Update all recommendations when new data arrives
  useEffect(() => {
    if (data?.artistRecommendations?.recommendations) {
      if (offset === 0) {
        setAllRecommendations(data.artistRecommendations.recommendations);
      } else {
        setAllRecommendations(prev => [
          ...prev,
          ...data.artistRecommendations.recommendations,
        ]);
      }
    }
  }, [data, offset]);

  const loadMore = useCallback(() => {
    if (data?.artistRecommendations?.hasMore && !isFetching) {
      setOffset(prev => prev + limit);
    }
  }, [data?.artistRecommendations?.hasMore, isFetching, limit]);

  const totalCount = data?.artistRecommendations?.totalCount || 0;
  const hasMore = data?.artistRecommendations?.hasMore || false;

  // Convert error to have message property for backward compatibility
  const errorWithMessage = error
    ? { message: error instanceof Error ? error.message : String(error) }
    : null;

  return {
    data: {
      recommendations: allRecommendations,
      pagination: {
        page: Math.floor(offset / limit) + 1,
        limit,
        total: totalCount,
        totalPages: Math.ceil(totalCount / limit),
        hasMore,
      },
    },
    isLoading: isLoading && offset === 0,
    error: errorWithMessage,
    isError: !!error,
    filter,
    setFilter,
    sort,
    setSort,
    loadMore,
    hasMore,
    total: totalCount,
    refetch,
    isFetching,
  };
}
