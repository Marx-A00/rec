// src/hooks/useArtistRecommendations.ts
'use client';

import { useState, useCallback, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';

export type FilterType = 'all' | 'basis' | 'recommended';
export type SortType = 'newest' | 'oldest' | 'highest_score' | 'lowest_score';

interface UseArtistRecommendationsOptions {
  artistId: string;
  initialFilter?: FilterType;
  initialSort?: SortType;
  limit?: number;
}

interface ArtistRecommendation {
  id: string;
  score: number;
  description: string;
  createdAt: string;
  userId: string;
  basisAlbumDiscogsId: string;
  recommendedAlbumDiscogsId: string;
  basisAlbumTitle: string;
  recommendedAlbumTitle: string;
  basisAlbumArtist: string;
  recommendedAlbumArtist: string;
  basisAlbumImageUrl: string | null;
  recommendedAlbumImageUrl: string | null;
  basisAlbumYear: string | null;
  recommendedAlbumYear: string | null;
  albumRole: 'basis' | 'recommended' | 'both';
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
  isOwnRecommendation: boolean;
}

interface ArtistRecommendationsResponse {
  recommendations: ArtistRecommendation[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasMore: boolean;
  };
}

async function fetchArtistRecommendations(
  artistId: string,
  filter: FilterType,
  sort: SortType,
  page: number,
  limit: number
): Promise<ArtistRecommendationsResponse> {
  const params = new URLSearchParams({
    filter,
    sort,
    page: page.toString(),
    limit: limit.toString(),
  });

  const response = await fetch(
    `/api/artists/${artistId}/recommendations?${params}`
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to fetch recommendations');
  }

  return response.json();
}

export function useArtistRecommendations({
  artistId,
  initialFilter = 'all',
  initialSort = 'newest',
  limit = 12,
}: UseArtistRecommendationsOptions) {
  const [filter, setFilter] = useState<FilterType>(initialFilter);
  const [sort, setSort] = useState<SortType>(initialSort);
  const [page, setPage] = useState(1);
  const [allRecommendations, setAllRecommendations] = useState<
    ArtistRecommendation[]
  >([]);

  // Reset page when filter or sort changes
  useEffect(() => {
    setPage(1);
    setAllRecommendations([]);
  }, [filter, sort]);

  const { data, isLoading, error, isError, refetch, isFetching } = useQuery({
    queryKey: ['artist-recommendations', artistId, filter, sort, page, limit],
    queryFn: () =>
      fetchArtistRecommendations(artistId, filter, sort, page, limit),
    enabled: !!artistId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    retry: 2,
    refetchOnWindowFocus: false,
  });

  // Update all recommendations when new data arrives
  useEffect(() => {
    if (data?.recommendations) {
      if (page === 1) {
        setAllRecommendations(data.recommendations);
      } else {
        setAllRecommendations(prev => [...prev, ...data.recommendations]);
      }
    }
  }, [data, page]);

  const loadMore = useCallback(() => {
    if (data?.pagination.hasMore && !isFetching) {
      setPage(prev => prev + 1);
    }
  }, [data?.pagination.hasMore, isFetching]);

  return {
    data: {
      recommendations: allRecommendations,
      pagination: data?.pagination,
    },
    isLoading: isLoading && page === 1,
    error,
    isError,
    filter,
    setFilter,
    sort,
    setSort,
    loadMore,
    hasMore: data?.pagination.hasMore || false,
    total: data?.pagination.total || 0,
    refetch,
    isFetching,
  };
}
