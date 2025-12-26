import { useQuery } from '@tanstack/react-query';

import { graphqlClient } from '@/lib/graphql-client';
import { GET_ALBUM_DETAILS } from '@/graphql/queries';
import { queryKeys, defaultQueryOptions, QueryError } from '@/lib/queries';
import type {
  GetAlbumDetailsAdminQuery,
  GetAlbumDetailsAdminQueryVariables,
} from '@/generated/graphql';
import type {
  UseAlbumDetailsQueryOptions,
  UseAlbumDetailsQueryResult,
} from '@/types/hooks';

// Type for the album object returned by the GraphQL query
export type AlbumDetailsData = NonNullable<GetAlbumDetailsAdminQuery['album']>;

// ========================================
// API Functions
// ========================================

const fetchAlbumDetailsGraphQL = async (albumId: string): Promise<AlbumDetailsData> => {
  try {
    const data = await graphqlClient.request<GetAlbumDetailsAdminQuery, GetAlbumDetailsAdminQueryVariables>(
      GET_ALBUM_DETAILS,
      { id: albumId }
    );

    if (!data.album) {
      throw new QueryError('Album not found', 404);
    }

    return data.album;
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
      error.message || 'Failed to fetch album details',
      error.response?.status || 500
    );
  }
};

// Use GraphQL by default
const fetchAlbumDetails = fetchAlbumDetailsGraphQL;

// ========================================
// Hook
// ========================================

export function useAlbumDetailsQuery(
  albumId: string,
  options: UseAlbumDetailsQueryOptions = {}
): UseAlbumDetailsQueryResult {
  const { initialData, enabled = !!albumId } = options;

  return useQuery({
    queryKey: queryKeys.album(albumId),
    queryFn: () => fetchAlbumDetails(albumId),
    enabled,
    initialData,
    ...defaultQueryOptions.standard,
  });
}

// Re-export types for convenience
export type { Album } from '@/types/album';
export type {
  UseAlbumDetailsQueryOptions,
  UseAlbumDetailsQueryResult,
} from '@/types/hooks';
export { QueryError, isQueryError, getErrorMessage } from '@/lib/queries';
