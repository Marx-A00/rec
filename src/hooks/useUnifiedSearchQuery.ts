import { useQuery } from '@tanstack/react-query';

import { UnifiedSearchResult } from '@/types/search';
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

export interface UnifiedSearchResponse {
  results?: UnifiedSearchResult[];
  data?: Album[]; // For backwards compatibility with album-only searches
}

const fetchUnifiedSearch = async (
  query: string,
  type: 'all' | 'album' | 'artist' | 'label' = 'all',
  limit?: number
): Promise<UnifiedSearchResponse> => {
  const params = new URLSearchParams({
    query,
    type,
    ...(limit && { limit: limit.toString() }),
  });

  // Handle legacy 'q' parameter for recommendations AlbumSearch compatibility
  const url =
    type === 'album' && limit
      ? `/api/search?q=${encodeURIComponent(query)}&type=album&limit=${limit}`
      : `/api/search?${params}`;

  const response = await fetch(url);
  return handleApiResponse(response);
};

// ========================================
// Hook
// ========================================

export interface UseUnifiedSearchQueryOptions {
  enabled?: boolean;
  minQueryLength?: number;
  type?: 'all' | 'album' | 'artist' | 'label';
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
