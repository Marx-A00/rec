import { useQuery } from '@tanstack/react-query';

import { Album } from '@/types/album';
import {
  queryKeys,
  defaultQueryOptions,
  handleApiResponse,
  QueryError,
} from '@/lib/queries';
import type {
  UseAlbumDetailsQueryOptions,
  UseAlbumDetailsQueryResult,
} from '@/types/hooks';

// ========================================
// API Functions
// ========================================

const fetchAlbumDetails = async (albumId: string): Promise<Album> => {
  const response = await fetch(`/api/albums/${albumId}`);
  const data = await handleApiResponse(response);
  return data.album;
};

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
