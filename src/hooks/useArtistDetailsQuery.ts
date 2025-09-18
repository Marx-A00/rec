import { useQuery } from '@tanstack/react-query';
import { graphqlClient } from '@/lib/graphql-client';
import { GET_ARTIST_DETAILS } from '@/graphql/queries';

import { Artist } from '@/types/artist';
import {
  queryKeys,
  defaultQueryOptions,
  QueryError,
} from '@/lib/queries';

// ========================================
// Types
// ========================================

export interface UseArtistDetailsQueryOptions {
  enabled?: boolean;
  initialData?: Artist;
}

export type UseArtistDetailsQueryResult = ReturnType<
  typeof useArtistDetailsQuery
>;

// ========================================
// API Functions
// ========================================

const fetchArtistDetailsGraphQL = async (artistId: string): Promise<Artist> => {
  try {
    const data = await graphqlClient.request<{ artist: Artist }>(
      GET_ARTIST_DETAILS,
      { id: artistId }
    );

    if (!data.artist) {
      throw new QueryError('Artist not found', 404);
    }

    return data.artist;
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
      error.message || 'Failed to fetch artist details',
      error.response?.status || 500
    );
  }
};

// Use GraphQL by default
const fetchArtistDetails = fetchArtistDetailsGraphQL;

// ========================================
// Hook
// ========================================

export function useArtistDetailsQuery(
  artistId: string,
  options: UseArtistDetailsQueryOptions = {}
) {
  const { initialData, enabled = !!artistId } = options;

  return useQuery({
    queryKey: queryKeys.artist(artistId),
    queryFn: () => fetchArtistDetails(artistId),
    // FIX: make sure that we don't have to change the query Fn
    enabled,
    initialData,
    ...defaultQueryOptions.standard,
  });
}

// Re-export types for convenience
export type { Artist } from '@/types/artist';
export { QueryError, isQueryError, getErrorMessage } from '@/lib/queries';