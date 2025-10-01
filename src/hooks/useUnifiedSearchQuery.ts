import { useQuery } from '@tanstack/react-query';

import { graphqlClient } from '@/lib/graphql-client';
import { SEARCH_MUSIC } from '@/graphql/queries';
import { UnifiedSearchResult } from '@/types/search';
import { Album } from '@/types/album';
import { queryKeys, defaultQueryOptions, QueryError } from '@/lib/queries';

// ========================================
// API Functions
// ========================================

export interface UnifiedSearchResponse {
  results?: UnifiedSearchResult[];
  data?: Album[]; // For backwards compatibility with album-only searches
}

interface GraphQLSearchResponse {
  search: {
    artists: any[];
    albums: any[];
    tracks: any[];
    total: number;
    hasMore: boolean;
  };
}

const fetchUnifiedSearchGraphQL = async (
  query: string,
  type: 'all' | 'albums' | 'artists' | 'labels' | 'tracks' = 'all',
  limit?: number
): Promise<UnifiedSearchResponse> => {
  try {
    const data = await graphqlClient.request<GraphQLSearchResponse>(
      SEARCH_MUSIC,
      {
        input: {
          query,
          type: type === 'labels' ? 'all' : type, // GraphQL doesn't have labels type
          limit: limit || 20,
        },
      }
    );

    // Transform GraphQL response to match existing interface
    const results: UnifiedSearchResult[] = [];

    // Add artists to results
    if (type === 'all' || type === 'artists') {
      data.search.artists.forEach(artist => {
        results.push({
          id: artist.id,
          type: 'artist',
          title: artist.name,
          subtitle: `${artist.albumCount || 0} albums, ${artist.trackCount || 0} tracks`,
          artist: artist.name,
          releaseDate: '',
          genre: [],
          label: '',
          image: {
            url: artist.imageUrl || '',
            width: 300,
            height: 300,
            alt: artist.name,
          },
          cover_image: artist.imageUrl,
          _discogs: {
            type: 'artist',
            uri: `/artists/${artist.id}`,
            resource_url: `/api/artists/${artist.id}`,
          },
        });
      });
    }

    // Add albums to results
    if (type === 'all' || type === 'albums') {
      data.search.albums.forEach(album => {
        const primaryArtist =
          album.artists?.find((a: any) => a.isMain)?.artist ||
          album.artists?.[0]?.artist;
        results.push({
          id: album.id,
          type: 'album',
          title: album.title,
          subtitle: primaryArtist?.name || 'Unknown Artist',
          artist: primaryArtist?.name || 'Unknown Artist',
          releaseDate: album.releaseDate || '',
          genre: [],
          label: '',
          image: {
            url: album.coverArtUrl || '',
            width: 300,
            height: 300,
            alt: album.title,
          },
          cover_image: album.coverArtUrl,
          metadata: {
            totalDuration: 0,
            numberOfTracks: album.trackCount || 0,
          },
          _discogs: {
            type: 'album',
            uri: `/albums/${album.id}`,
            resource_url: `/api/albums/${album.id}`,
          },
        });
      });
    }

    // Add tracks to results
    if (type === 'all' || type === 'tracks') {
      data.search.tracks.forEach(track => {
        const primaryArtist =
          track.artists?.find((a: any) => a.isMain)?.artist ||
          track.artists?.[0]?.artist;
        results.push({
          id: track.id,
          type: 'track',
          title: track.title,
          subtitle: `${track.album?.title || 'Unknown Album'} • ${primaryArtist?.name || 'Unknown Artist'}`,
          artist: primaryArtist?.name || 'Unknown Artist',
          releaseDate: '',
          genre: [],
          label: '',
          image: {
            url: track.album?.coverArtUrl || '',
            width: 300,
            height: 300,
            alt: track.title,
          },
          cover_image: track.album?.coverArtUrl,
          _discogs: {
            type: 'track',
            uri: `/tracks/${track.id}`,
            resource_url: `/api/tracks/${track.id}`,
          },
        });
      });
    }

    // For backwards compatibility with album-only searches
    if (type === 'albums') {
      return {
        data: data.search.albums,
        results,
      };
    }

    return { results };
  } catch (error: any) {
    // Handle GraphQL errors
    if (error.response?.errors?.[0]) {
      const graphqlError = error.response.errors[0];
      throw new QueryError(
        graphqlError.message || 'GraphQL error occurred',
        graphqlError.extensions?.code || 500
      );
    }
    throw new QueryError(
      error.message || 'Search failed',
      error.response?.status || 500
    );
  }
};

// Use GraphQL by default
const fetchUnifiedSearch = fetchUnifiedSearchGraphQL;

// ========================================
// Hook
// ========================================

export interface UseUnifiedSearchQueryOptions {
  enabled?: boolean;
  minQueryLength?: number;
  type?: 'all' | 'albums' | 'artists' | 'labels' | 'tracks';
  limit?: number;
}

export function useUnifiedSearchQuery(
  query: string,
  options: UseUnifiedSearchQueryOptions = {}
) {
  const { enabled = true, minQueryLength = 2, type = 'all', limit } = options;

  const shouldQuery = !!query && query.length >= minQueryLength && enabled;

  return useQuery({
    queryKey: queryKeys.search(query, type, limit),
    queryFn: () => fetchUnifiedSearch(query, type, limit),
    enabled: shouldQuery,
    // Use search options for unified search
    ...defaultQueryOptions.search,
  });
}

// Re-export types for convenience
export type { UnifiedSearchResult } from '@/types/search';
export type { Album } from '@/types/album';
export { QueryError, isQueryError, getErrorMessage } from '@/lib/queries';
