/**
 * Type definitions for the album correction search system.
 * Used by CorrectionSearchService to search MusicBrainz for correction candidates.
 */

/**
 * Options for correction search
 */
export interface CorrectionSearchOptions {
  /** Album title to search for */
  albumTitle?: string;
  /** Artist name to filter by */
  artistName?: string;
  /** Optional year filter (e.g., 2023) */
  yearFilter?: number;
  /** Maximum results to return (default 10) */
  limit?: number;
  /** Offset for pagination */
  offset?: number;
}

/**
 * Artist credit from MusicBrainz
 */
export interface CorrectionArtistCredit {
  /** Artist MBID */
  mbid: string;
  /** Artist name as credited */
  name: string;
}

/**
 * A single search result for correction
 */
export interface CorrectionSearchResult {
  /** Release group MBID */
  releaseGroupMbid: string;
  /** Album title */
  title: string;
  /** Disambiguation (e.g., "deluxe edition") */
  disambiguation?: string;
  /** Primary artist credits */
  artistCredits: CorrectionArtistCredit[];
  /** Formatted primary artist name for display */
  primaryArtistName: string;
  /** First release date (YYYY or YYYY-MM-DD) */
  firstReleaseDate?: string;
  /** Primary type (Album, EP, Single, etc.) */
  primaryType?: string;
  /** Secondary types (Compilation, Live, Remix, etc.) */
  secondaryTypes?: string[];
  /** MusicBrainz search score (0-100) */
  mbScore: number;
  /** Cover Art Archive thumbnail URL (250px) */
  coverArtUrl: string | null;
  /** Source indicator */
  source: 'musicbrainz' | 'discogs';
}

/**
 * Response from correction search
 */
export interface CorrectionSearchResponse {
  /** Search results */
  results: CorrectionSearchResult[];
  /** Total results available (for pagination) */
  totalCount?: number;
  /** Whether more results are available */
  hasMore: boolean;
  /** The query that was executed */
  query: {
    albumTitle?: string;
    artistName?: string;
    yearFilter?: number;
  };
}

// ============================================================================
// Grouped/Deduplicated Result Types
// ============================================================================

import type { ScoredSearchResult, ScoringStrategy } from './scoring/types';

/**
 * Options for scored search with grouping
 */
export interface ScoredSearchOptions {
  /** Album title to search for */
  albumTitle?: string;
  /** Artist name to filter by */
  artistName?: string;
  /** Optional year filter (e.g., 2023) */
  yearFilter?: number;
  /** Maximum groups to return (default 10) */
  limit?: number;
  /** Offset for pagination */
  offset?: number;
  /** Scoring strategy to use (default: 'normalized') */
  strategy?: ScoringStrategy;
  /** Threshold below which results are flagged as low-confidence (0-1) */
  lowConfidenceThreshold?: number;
}

/**
 * A group of related results (same release group MBID)
 * Groups releases like "OK Computer" regular vs deluxe editions
 */
export interface GroupedSearchResult {
  /** The release group MBID (shared by all versions) */
  releaseGroupMbid: string;
  /** Primary result (best version to display) */
  primaryResult: ScoredSearchResult;
  /** Alternate versions (deluxe, remaster, etc.) */
  alternateVersions: ScoredSearchResult[];
  /** Total number of versions in this group */
  versionCount: number;
  /** Highest score among all versions (for sorting groups) */
  bestScore: number;
}

/**
 * Response from searchWithScoring
 * Contains grouped, deduplicated, scored results
 */
export interface ScoredSearchResponse {
  /** Grouped search results (deduplicated by release group) */
  results: GroupedSearchResult[];
  /** All scored results (ungrouped, for debugging) */
  allResults: ScoredSearchResult[];
  /** Total number of unique release groups */
  totalGroups: number;
  /** Whether more results are available */
  hasMore: boolean;
  /** The query that was executed */
  query: {
    albumTitle?: string;
    artistName?: string;
    yearFilter?: number;
  };
  /** Scoring metadata */
  scoring: {
    /** Strategy used for scoring */
    strategy: ScoringStrategy;
    /** Low-confidence threshold used */
    threshold: number;
    /** Number of results below threshold */
    lowConfidenceCount: number;
  };
}

// Re-export scoring types for convenience
export type {
  ScoredSearchResult,
  ScoringStrategy,
  ScoreBreakdown,
  ConfidenceTier,
} from './scoring/types';
