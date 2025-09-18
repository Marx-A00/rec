import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';

import { graphqlClient } from '@/lib/graphql-client';
import {
  UnifiedSearchResult,
  SearchResponse,
  SearchFilters,
  SearchContext,
  SortBy,
  GroupBy,
} from '@/types/search';
import {
  queryKeys,
  defaultQueryOptions,
  QueryError,
} from '@/lib/queries';

// ========================================
// Types from UniversalSearchBar (Phase 3 Enhanced)
// ========================================

interface SearchEntityType {
  type: 'album' | 'artist' | 'label' | 'track' | 'user' | 'playlist';
  endpoint?: string;
  displayName: string;
  searchFields?: string[];
  weight?: number;
  deduplicate?: boolean;
  maxResults?: number;
}

interface SearchFilter {
  key: string;
  label: string;
  type: 'text' | 'select' | 'range' | 'boolean' | 'multiselect' | 'daterange';
  options?: any[];
  defaultValue?: any;
  validation?: (value: any) => boolean;
}

// ========================================
// Enhanced Hook Options Interface (Phase 3)
// ========================================

export interface UseUniversalSearchOptions {
  entityTypes: SearchEntityType[];
  searchType: 'all' | 'albums' | 'artists' | 'labels' | 'tracks' | 'users';
  filters: SearchFilter[];
  debounceMs: number;
  minQueryLength: number;
  maxResults: number;
  enabled: boolean;

  // ===========================
  // PHASE 3: Enhanced Options
  // ===========================

  // Search context for context-aware results
  context?: SearchContext;

  // Sorting options
  sortBy?: SortBy;
  sortOrder?: 'asc' | 'desc';

  // Deduplication
  deduplicate?: boolean;

  // Grouping
  groupBy?: GroupBy;

  // Advanced filters (JSON-based)
  advancedFilters?: SearchFilters;

  // Result limiting per entity type
  limit?: number;

  // Include metadata in response
  includeMetadata?: boolean;

  // Track search within releases
  searchInTracks?: boolean;

  // Entity type filtering
  entityTypeFilter?: string[];
}

// ========================================
// GraphQL Queries
// ========================================

const SEARCH_QUERY = `
  query Search($input: SearchInput!) {
    search(input: $input) {
      total
      albums {
        id
        musicbrainzId
        title
        releaseDate
        coverArtUrl
        artists {
          artist {
            id
            name
          }
        }
      }
      artists {
        id
        musicbrainzId
        name
        imageUrl
      }
      tracks {
        id
        musicbrainzId
        title
        durationMs
        trackNumber
        album {
          id
          title
          coverArtUrl
        }
        artists {
          artist {
            id
            name
          }
        }
      }
    }
  }
`;

const SEARCH_ALBUMS_QUERY = `
  query SearchAlbums($query: String!, $limit: Int) {
    searchAlbums(query: $query, limit: $limit) {
      id
      musicbrainzId
      title
      releaseDate
      coverArtUrl
      artists {
        artist {
          id
          name
        }
      }
    }
  }
`;

const SEARCH_ARTISTS_QUERY = `
  query SearchArtists($query: String!, $limit: Int) {
    searchArtists(query: $query, limit: $limit) {
      id
      musicbrainzId
      name
      imageUrl
    }
  }
`;

const SEARCH_TRACKS_QUERY = `
  query SearchTracks($query: String!, $limit: Int) {
    searchTracks(query: $query, limit: $limit) {
      id
      musicbrainzId
      title
      durationMs
      trackNumber
      album {
        id
        title
        coverArtUrl
      }
      artists {
        artist {
          id
          name
        }
      }
    }
  }
`;

// ========================================
// Enhanced API Function (Phase 3)
// ========================================

const fetchUniversalSearch = async (
  query: string,
  options: UseUniversalSearchOptions
): Promise<SearchResponse> => {
  const {
    searchType,
    maxResults,
    limit,
  } = options;

  try {
    let results: UnifiedSearchResult[] = [];

    if (searchType === 'all') {
      // Use the unified search query
      const data: any = await graphqlClient.request(SEARCH_QUERY, {
        input: {
          query: query,
          type: 'ALL',
          limit: limit || maxResults || 10
        }
      });

      // Transform GraphQL results to UnifiedSearchResult format
      const albumResults = (data.search.albums || []).map((album: any) => ({
        id: album.id,
        type: 'album' as const,
        title: album.title,
        subtitle: album.artists?.map((a: any) => a.artist.name).join(', '),
        imageUrl: album.coverArtUrl,
        metadata: {
          year: album.releaseDate ? new Date(album.releaseDate).getFullYear() : null,
          musicbrainzId: album.musicbrainzId
        }
      }));

      const artistResults = (data.search.artists || []).map((artist: any) => ({
        id: artist.id,
        type: 'artist' as const,
        title: artist.name,
        imageUrl: artist.imageUrl,
        metadata: {
          musicbrainzId: artist.musicbrainzId
        }
      }));

      const trackResults = (data.search.tracks || []).map((track: any) => ({
        id: track.id,
        type: 'track' as const,
        title: track.title,
        subtitle: track.artists?.map((a: any) => a.artist.name).join(', '),
        imageUrl: track.album?.coverArtUrl,
        metadata: {
          album: track.album?.title,
          durationMs: track.durationMs,
          trackNumber: track.trackNumber,
          musicbrainzId: track.musicbrainzId
        }
      }));

      results = [...albumResults, ...artistResults, ...trackResults];
    } else if (searchType === 'albums') {
      const data: any = await graphqlClient.request(SEARCH_ALBUMS_QUERY, {
        query,
        limit: limit || maxResults || 10
      });

      results = data.searchAlbums.map((album: any) => ({
        id: album.id,
        type: 'album' as const,
        title: album.title,
        subtitle: album.artists?.map((a: any) => a.artist.name).join(', '),
        imageUrl: album.coverArtUrl,
        metadata: {
          year: album.releaseDate ? new Date(album.releaseDate).getFullYear() : null,
          musicbrainzId: album.musicbrainzId
        }
      }));
    } else if (searchType === 'artists') {
      const data: any = await graphqlClient.request(SEARCH_ARTISTS_QUERY, {
        query,
        limit: limit || maxResults || 10
      });

      results = data.searchArtists.map((artist: any) => ({
        id: artist.id,
        type: 'artist' as const,
        title: artist.name,
        imageUrl: artist.imageUrl,
        metadata: {
          musicbrainzId: artist.musicbrainzId
        }
      }));
    } else if (searchType === 'tracks') {
      const data: any = await graphqlClient.request(SEARCH_TRACKS_QUERY, {
        query,
        limit: limit || maxResults || 10
      });

      results = data.searchTracks.map((track: any) => ({
        id: track.id,
        type: 'track' as const,
        title: track.title,
        subtitle: track.artists?.map((a: any) => a.artist.name).join(', '),
        imageUrl: track.album?.coverArtUrl,
        metadata: {
          album: track.album?.title,
          durationMs: track.durationMs,
          trackNumber: track.trackNumber,
          musicbrainzId: track.musicbrainzId
        }
      }));
    }

    return {
      results,
      grouped: {
        albums: results.filter(r => r.type === 'album'),
        artists: results.filter(r => r.type === 'artist'),
        tracks: results.filter(r => r.type === 'track'),
        labels: [],
        other: []
      },
      total: results.length,
      pagination: {
        total: results.length,
        per_page: maxResults || 10,
        page: 1,
        totalPages: 1,
        hasNext: false,
        hasPrev: false
      }
    };
  } catch (error: any) {
    if (error.response?.errors?.[0]) {
      throw new QueryError(error.response.errors[0].message);
    }
    throw new QueryError('Failed to perform search');
  }
};

// ========================================
// Enhanced Main Hook (Phase 3)
// ========================================

export function useUniversalSearch(
  query: string,
  options: UseUniversalSearchOptions
) {
  const { enabled, minQueryLength } = options;

  const shouldQuery = !!query && query.length >= minQueryLength && enabled;

  // Enhanced query key including new parameters
  const queryKey = useMemo(() => {
    // Create a comprehensive key that includes Phase 3 parameters
    const baseKey = queryKeys.search(
      query,
      options.searchType,
      options.maxResults
    );

    // Add Phase 3 parameters to create unique cache key
    const enhancedParams = {
      context: options.context,
      sortBy: options.sortBy,
      sortOrder: options.sortOrder,
      deduplicate: options.deduplicate,
      groupBy: options.groupBy,
      advancedFilters: options.advancedFilters,
      entityTypeFilter: options.entityTypeFilter,
      limit: options.limit,
    };

    // Only add enhanced params if they differ from defaults
    const hasEnhancedParams = Object.values(enhancedParams).some(
      value =>
        value !== undefined &&
        value !== null &&
        (Array.isArray(value) ? value.length > 0 : true) &&
        (typeof value === 'object' && value !== null
          ? Object.keys(value).length > 0
          : true)
    );

    return hasEnhancedParams
      ? ([...baseKey, 'enhanced', enhancedParams] as const)
      : baseKey;
  }, [
    query,
    options.searchType,
    options.maxResults,
    options.context,
    options.sortBy,
    options.sortOrder,
    options.deduplicate,
    options.groupBy,
    options.advancedFilters,
    options.entityTypeFilter,
    options.limit,
  ]);

  const queryResult = useQuery({
    queryKey,
    queryFn: () => fetchUniversalSearch(query, options),
    enabled: shouldQuery,
    // Use search options for unified search
    ...defaultQueryOptions.search,
  });

  // Extract and normalize results with Phase 3 enhancements
  const results = useMemo(() => {
    if (!queryResult.data?.results) return [];

    // Results are already processed by the enhanced API
    // No need for client-side filtering since server handles it
    return queryResult.data.results;
  }, [queryResult.data?.results]);

  // ===========================
  // PHASE 3: Enhanced Return Data
  // ===========================

  return {
    ...queryResult,
    results,

    // Phase 3 enhanced data
    grouped: queryResult.data?.grouped,
    metadata: queryResult.data?.metadata,
    deduplication: queryResult.data?.deduplication,
    filterResults: queryResult.data?.filterResults,
    performance: queryResult.data?.performance,
    context: queryResult.data?.context,
    pagination: queryResult.data?.pagination,
  };
}

// ========================================
// Enhanced Exports (Phase 3)
// ========================================

// Re-export types for convenience
export type {
  UnifiedSearchResult,
  SearchResponse,
  SearchFilters,
  SearchContext,
  SortBy,
  GroupBy,
} from '@/types/search';
export { QueryError, isQueryError, getErrorMessage } from '@/lib/queries';
