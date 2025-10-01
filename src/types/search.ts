import { Track } from './album';

// ===========================
// PHASE 3: Enhanced Search Types
// ===========================

// Enhanced search filters interface
export interface SearchFilters {
  genre?: string[];
  year?: {
    min?: number;
    max?: number;
  };
  decade?: string[];
  label?: string[];
  country?: string[];
  format?: string[];
  status?: string[];
  userStatus?: 'active' | 'inactive' | 'pending';
  collection?: string;
  recommendation?: boolean;
}

// Search context types
export type SearchContext =
  | 'global'
  | 'modal'
  | 'users'
  | 'recommendations'
  | 'compact'
  | 'collection'
  | 'sidebar'
  | 'inline';

// Sort options
export type SortBy =
  | 'relevance'
  | 'title'
  | 'artist'
  | 'year'
  | 'added'
  | 'popularity'
  | 'alphabetical';

// Group by options
export type GroupBy = 'none' | 'type' | 'artist' | 'label' | 'year' | 'genre';

// Enhanced search metadata
export interface SearchMetadata {
  query: string;
  executionTime: number;
  totalResults: number;
  deduplicationApplied: boolean;
  duplicatesRemoved?: number;
  filtersApplied: SearchFilters;
  context: SearchContext;
  sortBy: SortBy;
  groupBy: GroupBy;
  entityTypes: string[];
  timestamp: string;
  performance: {
    discogsApiTime?: number;
    processingTime: number;
    deduplicationTime?: number;
    filteringTime?: number;
  };
}

// Enhanced deduplication info
export interface DeduplicationInfo {
  strategy: 'master-preferred' | 'artist-title' | 'none';
  totalBeforeDeduplication: number;
  totalAfterDeduplication: number;
  duplicatesRemoved: number;
  masterPreferenceApplied: boolean;
  groupingMethod: 'masterId' | 'artistTitle' | 'exactMatch';
}

// Track search result (for track search implementation)
export interface TrackSearchResult {
  id: string;
  title: string;
  artist: string;
  duration?: string;
  position?: string;
  releaseId: string;
  releaseTitle: string;
  releaseYear?: string;
  releaseImage?: {
    url: string;
    width: number;
    height: number;
    alt: string;
  };
}

// Unified search result interface that matches what the search API returns
export interface UnifiedSearchResult {
  id: string;
  type: string;
  title: string;
  subtitle: string;
  artist: string;
  releaseDate: string | null;
  genre: string[];
  label: string;
  // Preferred data source for this result (used for routing/fetching)
  source?: 'musicbrainz' | 'discogs' | 'local';
  image: {
    url: string;
    width: number;
    height: number;
    alt: string;
  };
  cover_image?: string; // For backwards compatibility
  tracks?: Track[];
  metadata?: {
    totalDuration: number;
    numberOfTracks: number;
  };
  _discogs: {
    type?: string;
    uri?: string;
    resource_url?: string;
  };

  // ===========================
  // PHASE 3: Enhanced result fields
  // ===========================

  // Deduplication information
  _deduplication?: {
    isDuplicate: boolean;
    masterOf?: string[]; // IDs of releases this master represents
    preferredOver?: string[]; // IDs of releases this was preferred over
    groupingKey?: string; // The key used for grouping (artist-title combination)
  };

  // Enhanced metadata
  relevanceScore?: number;
  weight?: number; // For weighted results in recommendations

  // Track search results (when searching for tracks)
  trackResults?: TrackSearchResult[];

  // Context-specific data
  contextData?: {
    inUserCollection?: boolean;
    recommendationScore?: number;
    collectionStatus?: string;
    userRating?: number;
  };

  // Enhanced genre and classification
  primaryGenre?: string;
  subgenres?: string[];
  styles?: string[];

  // Additional metadata for enhanced filtering
  country?: string;
  formats?: string[];
  decade?: string;

  // Performance metrics
  _performance?: {
    retrievalTime?: number;
    processingTime?: number;
  };
}

// Enhanced grouped results
export interface GroupedSearchResults {
  albums: UnifiedSearchResult[];
  artists: UnifiedSearchResult[];
  labels: UnifiedSearchResult[];
  tracks?: UnifiedSearchResult[]; // For track search results
  users?: UnifiedSearchResult[]; // For user search results
  playlists?: UnifiedSearchResult[]; // For playlist search results
  other: UnifiedSearchResult[];
}

// Enhanced pagination with more metadata
export interface SearchPagination {
  page: number;
  per_page: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
  // Phase 3 enhancements
  totalBeforeFiltering?: number;
  totalBeforeDeduplication?: number;
  resultCounts?: {
    albums: number;
    artists: number;
    labels: number;
    tracks?: number;
    users?: number;
    playlists?: number;
    other: number;
  };
}

// Enhanced API response from search endpoint
export interface SearchResponse {
  results: UnifiedSearchResult[];
  grouped: GroupedSearchResults;
  total: number;
  pagination?: SearchPagination;

  // ===========================
  // PHASE 3: Enhanced response fields
  // ===========================

  // Search metadata (optional, controlled by includeMetadata parameter)
  metadata?: SearchMetadata;

  // Deduplication information
  deduplication?: DeduplicationInfo;

  // Filter application results
  filterResults?: {
    totalBeforeFiltering: number;
    totalAfterFiltering: number;
    appliedFilters: SearchFilters;
    filterCounts?: Record<string, Record<string, number>>; // Filter facet counts
  };

  // Performance metrics
  performance?: {
    totalExecutionTime: number;
    discogsApiTime?: number;
    processingTime: number;
    deduplicationTime?: number;
    filteringTime?: number;
    sortingTime?: number;
  };

  // Context-specific data
  context?: {
    searchContext: SearchContext;
    userContext?: {
      collectionSize?: number;
      preferences?: Record<string, any>;
    };
    recommendationContext?: {
      seedAlbums?: string[];
      algorithmUsed?: string;
    };
  };
}

// Legacy compatibility - maintain existing interface
export type { SearchResponse as LegacySearchResponse };
