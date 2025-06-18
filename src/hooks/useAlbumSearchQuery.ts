import { useQuery } from '@tanstack/react-query';

import { Album } from '@/types/album';
import {
  queryKeys,
  defaultQueryOptions,
  handleApiResponse,
  QueryError,
} from '@/lib/queries';

// ========================================
// API Functions
// ========================================

const fetchAlbums = async (query: string): Promise<{ albums: Album[] }> => {
  const response = await fetch(
    `/api/albums/search?query=${encodeURIComponent(query)}`
  );
  return handleApiResponse(response);
};

// ========================================
// Hook
// ========================================

export interface UseAlbumSearchQueryOptions {
  enabled?: boolean;
  minQueryLength?: number;
}

export function useAlbumSearchQuery(
  query: string,
  options: UseAlbumSearchQueryOptions = {}
) {
  const { enabled = true, minQueryLength = 3 } = options;

  const shouldQuery = !!query && query.length >= minQueryLength && enabled;

  return useQuery({
    queryKey: queryKeys.albumSearch(query),
    queryFn: () => fetchAlbums(query),
    enabled: shouldQuery,
    // Use search options for album search
    ...defaultQueryOptions.search,
  });
}

// Re-export types for convenience
export type { Album } from '@/types/album';
export { QueryError, isQueryError, getErrorMessage } from '@/lib/queries';
