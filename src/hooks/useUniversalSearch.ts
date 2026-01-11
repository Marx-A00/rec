import { useMemo } from 'react';

import {
  useSearchQuery,
  SearchType,
  SearchMode as GraphQLSearchMode,
} from '@/generated/graphql';
import {
  UnifiedSearchResult,
  SearchFilters,
  SearchContext,
  SortBy,
  GroupBy,
} from '@/types/search';

export type SearchMode = 'LOCAL_ONLY' | 'LOCAL_AND_EXTERNAL' | 'EXTERNAL_ONLY';

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
  searchMode?: SearchMode;

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
// Enhanced Main Hook (Phase 3)
// ========================================

export function useUniversalSearch(
  query: string,
  options: UseUniversalSearchOptions
) {
  const {
    enabled,
    minQueryLength,
    searchType,
    maxResults,
    limit,
    searchMode = 'LOCAL_ONLY',
  } = options;

  const shouldQuery = !!query && query.length >= minQueryLength && enabled;

  // Map searchType to GraphQL SearchType enum
  let type: SearchType = SearchType.All;
  if (searchType === 'albums') {
    type = SearchType.Album;
  } else if (searchType === 'artists') {
    type = SearchType.Artist;
  } else if (searchType === 'tracks') {
    type = SearchType.Track;
  } else if (searchType === 'users') {
    type = SearchType.User;
  }

  // Map SearchMode to GraphQL enum
  let graphqlSearchMode: GraphQLSearchMode = GraphQLSearchMode.LocalOnly;
  if (searchMode === 'LOCAL_AND_EXTERNAL') {
    graphqlSearchMode = GraphQLSearchMode.LocalAndExternal;
  } else if (searchMode === 'EXTERNAL_ONLY') {
    graphqlSearchMode = GraphQLSearchMode.ExternalOnly;
  }

  // Use the generated GraphQL hook
  const queryResult = useSearchQuery(
    {
      input: {
        query,
        type,
        limit: limit || maxResults || 20,
        searchMode: graphqlSearchMode,
      },
    },
    {
      enabled: shouldQuery,
      staleTime: 1000 * 60 * 5, // 5 minutes
      gcTime: 1000 * 60 * 10, // 10 minutes
    }
  );

  // Transform and normalize results
  const results = useMemo(() => {
    if (!queryResult.data?.search) return [];

    const searchData = queryResult.data.search;
    const transformedResults: UnifiedSearchResult[] = [];

    // Transform albums (now UnifiedRelease type)
    if (searchData.albums) {
      searchData.albums.forEach(album => {
        // Map DataSource enum to lowercase string
        const sourceMap: Record<string, 'local' | 'musicbrainz' | 'discogs'> = {
          LOCAL: 'local',
          MUSICBRAINZ: 'musicbrainz',
          DISCOGS: 'discogs',
        };
        const source = sourceMap[album.source] || 'local';

        transformedResults.push({
          id: album.id,
          type: 'album' as const,
          title: album.title,
          subtitle: album.artistName || 'Unknown Artist',
          artist: album.artistName || 'Unknown Artist',
          releaseDate:
            album.releaseDate instanceof Date
              ? album.releaseDate.toISOString()
              : album.releaseDate || '',
          genre: [],
          label: '',
          source,
          primaryType: album.primaryType || undefined,
          secondaryTypes: album.secondaryTypes || [],
          image: {
            url: album.imageUrl || '',
            width: 300,
            height: 300,
            alt: album.title,
          },
          cover_image: album.imageUrl || undefined,
          _discogs: {},
        });
      });
    }

    // Transform artists
    if (searchData.artists) {
      searchData.artists.forEach(artist => {
        const localId = String(artist.id);
        const musicbrainzId = artist.musicbrainzId || undefined;
        // Heuristic: if GraphQL returned an MBID equal to id (no local record), treat as external
        const isExternalOnly = !!musicbrainzId && musicbrainzId === localId;

        const navId = isExternalOnly ? musicbrainzId! : localId;
        const source: 'local' | 'musicbrainz' = isExternalOnly
          ? 'musicbrainz'
          : 'local';

        transformedResults.push({
          id: navId,
          type: 'artist' as const,
          title: artist.name,
          subtitle: 'Artist',
          artist: artist.name,
          releaseDate: '',
          genre: [],
          label: '',
          source,
          image: {
            url: artist.imageUrl || '',
            width: 300,
            height: 300,
            alt: artist.name,
          },
          cover_image: artist.imageUrl || undefined,
          _discogs: {},
        });
      });
    }

    // Transform tracks
    if (searchData.tracks) {
      console.log(
        `[useUniversalSearch] Received ${searchData.tracks.length} tracks from GraphQL`
      );
      if (searchData.tracks.length > 0) {
        console.log(`[useUniversalSearch] First track from GraphQL:`, {
          id: searchData.tracks[0].id,
          title: searchData.tracks[0].title,
          searchCoverArtUrl: searchData.tracks[0].searchCoverArtUrl,
          searchArtistName: searchData.tracks[0].searchArtistName,
          albumCoverUrl: searchData.tracks[0].album?.coverArtUrl,
        });
      }

      searchData.tracks.forEach(track => {
        // All tracks come from our local database - no source inference needed
        const trackSource = 'local' as const;

        // Prefer searchCoverArtUrl for external search results, fall back to album.coverArtUrl
        const coverArtUrl =
          track.searchCoverArtUrl || track.album?.coverArtUrl || '';
        // Prefer searchArtistName for external search results, fall back to artists relation
        const artistName =
          track.searchArtistName ||
          track.artists?.[0]?.artist?.name ||
          'Unknown Artist';

        console.log(`[useUniversalSearch] Track ${track.id}:`, {
          title: track.title,
          searchCoverArtUrl: track.searchCoverArtUrl,
          albumCoverArtUrl: track.album?.coverArtUrl,
          finalCoverArtUrl: coverArtUrl,
          searchArtistName: track.searchArtistName,
          artistsName: track.artists?.[0]?.artist?.name,
          finalArtistName: artistName,
        });

        // For external tracks (trackNumber = 0), show album title without track number
        const subtitle =
          track.trackNumber > 0
            ? `Track ${track.trackNumber}${track.album ? ` - ${track.album.title}` : ''}`
            : track.album?.title
              ? `from ${track.album.title}`
              : 'Track';

        transformedResults.push({
          id: track.id,
          type: 'track' as const,
          title: track.title,
          subtitle,
          artist: artistName,
          releaseDate: '',
          genre: [],
          label: '',
          source: trackSource,
          image: {
            url: coverArtUrl,
            width: 300,
            height: 300,
            alt: track.title,
          },
          cover_image: coverArtUrl || undefined,
          albumId: track.albumId || track.album?.id,
          album: track.album || undefined,
          _discogs: {},
          metadata: {
            totalDuration: track.durationMs || 0,
            numberOfTracks: 1,
          },
        });
      });

      console.log(
        `[useUniversalSearch] Transformed ${transformedResults.filter(r => r.type === 'track').length} tracks`
      );
    }

    // Transform users
    if (searchData.users) {
      searchData.users.forEach(user => {
        transformedResults.push({
          id: user.id,
          type: 'user' as const,
          title: user.username || 'Unknown User',
          subtitle: user.bio || 'User',
          artist: '', // Not applicable for users
          releaseDate: '',
          genre: [],
          label: '',
          source: 'local',
          image: {
            url: user.image || '',
            width: 300,
            height: 300,
            alt: user.username || 'User',
          },
          cover_image: user.image || undefined,
          _discogs: {},
          // Add user-specific context data
          contextData: {
            followersCount: user.followersCount,
            followingCount: user.followingCount,
            recommendationsCount: user.recommendationsCount,
          },
        });
      });
    }

    return transformedResults;
  }, [queryResult.data?.search]);

  // Group results by type
  const grouped = useMemo(() => {
    return {
      albums: results.filter(r => r.type === 'album'),
      artists: results.filter(r => r.type === 'artist'),
      tracks: results.filter(r => r.type === 'track'),
      users: results.filter(r => r.type === 'user'),
      labels: [],
      other: [],
    };
  }, [results]);

  // ===========================
  // PHASE 3: Enhanced Return Data
  // ===========================

  return {
    ...queryResult,
    results,
    hasMore: queryResult.data?.search?.hasMore || false,

    // Phase 3 enhanced data
    grouped,
    metadata: undefined, // Would need to be added to GraphQL schema
    deduplication: undefined, // Would need to be added to GraphQL schema
    filterResults: undefined, // Would need to be added to GraphQL schema
    performance: undefined, // Would need to be added to GraphQL schema
    context: undefined, // Would need to be added to GraphQL schema
    pagination: {
      total: queryResult.data?.search?.total || 0,
      per_page: maxResults || 20,
      page: 1,
      totalPages: 1,
      hasNext: queryResult.data?.search?.hasMore || false,
      hasPrev: false,
    },
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
