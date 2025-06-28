import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';

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
  handleApiResponse,
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
// Enhanced API Function (Phase 3)
// ========================================

const fetchUniversalSearch = async (
  query: string,
  options: UseUniversalSearchOptions
): Promise<SearchResponse> => {
  const {
    searchType,
    maxResults,
    entityTypes,
    context = 'global',
    sortBy = 'relevance',
    sortOrder = 'desc',
    deduplicate = true,
    groupBy = 'type',
    advancedFilters = {},
    limit,
    includeMetadata = false,
    searchInTracks = false,
    entityTypeFilter = [],
  } = options;

  const params = new URLSearchParams({
    query,
    type: searchType,
    ...(maxResults && { per_page: maxResults.toString() }),

    // ===========================
    // PHASE 3: Enhanced Parameters
    // ===========================

    // Context and behavior
    context,
    sortBy,
    sortOrder,
    deduplicate: deduplicate.toString(),
    groupBy,

    // Metadata and tracking
    includeMetadata: includeMetadata.toString(),
    searchInTracks: searchInTracks.toString(),
  });

  // Entity types filtering
  if (entityTypeFilter.length > 0) {
    params.set('entityTypes', entityTypeFilter.join(','));
  } else if (entityTypes.length > 0 && searchType === 'all') {
    const typeList = entityTypes.map(et => et.type).join(',');
    params.set('entityTypes', typeList);
  }

  // Advanced filters (JSON-based)
  if (Object.keys(advancedFilters).length > 0) {
    params.set('filters', JSON.stringify(advancedFilters));
  }

  // Result limiting
  if (limit) {
    params.set('limit', limit.toString());
  }

  const response = await fetch(`/api/search?${params}`);
  return handleApiResponse(response);
};

// ========================================
// Enhanced Main Hook (Phase 3)
// ========================================

export function useUniversalSearch(
  query: string,
  options: UseUniversalSearchOptions
) {
  const { enabled, minQueryLength, debounceMs } = options;

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
