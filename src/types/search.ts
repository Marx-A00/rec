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
  source?: 'musicbrainz' | 'discogs' | 'local' | 'spotify';
  // MusicBrainz release type information
  primaryType?: string; // 'Album', 'Single', 'EP', 'Broadcast', 'Other'
  secondaryTypes?: string[]; // 'Compilation', 'Soundtrack', 'Live', 'Remix', 'DJ-mix', 'Mixtape/Street', etc.
  image: {
    url: string;
    width: number;
    height: number;
    alt: string;
  };
  cover_image?: string; // For backwards compatibility
  tracks?: Track[];
  // Track-specific fields (when type is 'track')
  albumId?: string; // The album this track belongs to
  album?: {
    id: string;
    title: string;
    coverArtUrl?: string | null;
  };
  metadata?: {
    totalDuration: number;
    numberOfTracks: number;
  };
  _discogs: {
    type?: string;
    uri?: string;
    resource_url?: string;
  };

  _lastfm?: {
    listeners?: string;
    mbid?: string;
  };

  _spotify?: {
    spotifyId?: string;
    popularity?: number;
    genres?: string[];
  };

  _musicbrainz?: {
    // Artist-specific fields
    disambiguation?: string; // e.g., "UK death metal band"
    country?: string; // ISO country code (GB, US, CA, etc.)
    lifeSpan?: {
      begin?: string; // Formation year (YYYY or YYYY-MM-DD)
      end?: string;
      ended?: boolean;
    };
    // Track-specific fields
    recordingId?: string; // MusicBrainz Recording ID
    isrc?: string; // International Standard Recording Code
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

// ===========================
// INTELLIGENT SEARCH TYPES
// ===========================

/**
 * Intelligent search metadata for recording-first search with intent detection
 */
export interface IntelligentSearchMetadata {
  intent: {
    detected: 'TRACK' | 'ARTIST' | 'ALBUM' | 'MIXED';
    confidence: number; // 0.0 - 1.0
    reasoning: string;
    weights: {
      track: number; // 0.0 - 1.0
      artist: number; // 0.0 - 1.0
      album: number; // 0.0 - 1.0
    };
  };
  performance: {
    apiCalls: number; // Number of API calls made
    apiCallsSaved: number; // Number of API calls saved vs old approach
    totalDuration: number; // Total execution time in ms
  };
  matching: {
    trackMatchScore: number; // 0.0 - 1.0
    artistMatchScore: number; // 0.0 - 1.0
    albumMatchScore: number; // 0.0 - 1.0
  };
}

/**
 * Search result with intelligent search metadata
 * Extends the standard search response with intent detection and performance metrics
 */
export interface IntelligentSearchResult {
  query: string;
  totalResults: number;
  results: UnifiedSearchResult[];
  intelligentMetadata?: IntelligentSearchMetadata;
  deduplicationApplied: boolean;
  duplicatesRemoved: number;
  timing: {
    totalDuration: number;
  };
}
