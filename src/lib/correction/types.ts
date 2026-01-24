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
  source: 'musicbrainz';
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
