/**
 * Type definitions for the artist correction search system.
 * Used by ArtistCorrectionSearchService to search MusicBrainz for artist correction candidates.
 *
 * Key decisions from RESEARCH.md:
 * - Store artistType as string VARCHAR(20), not enum (MusicBrainz may add new types)
 * - Partial dates stored as-is ("1965" or "1965-03" or "1965-03-21")
 * - topReleases array helps disambiguate common artist names
 */

/**
 * A top release for artist disambiguation
 * Helps identify the right artist when multiple share the same name (e.g., "John Smith")
 */
export interface ArtistTopRelease {
  /** Release/album title */
  title: string;
  /** Release year (partial date, e.g., "2023") */
  year?: string;
  /** Release type (Album, EP, Single, etc.) */
  type?: string;
}

/**
 * A single artist search result for correction
 */
export interface ArtistSearchResult {
  /** MusicBrainz artist ID */
  artistMbid: string;
  /** Artist name */
  name: string;
  /** Sort name (e.g., "Beatles, The") */
  sortName: string;
  /** Disambiguation (e.g., "British rock band") */
  disambiguation?: string;
  /**
   * Artist type as string (not enum - MusicBrainz may add new types)
   * Common values: "Person", "Group", "Orchestra", "Choir", "Character", "Other"
   */
  type?: string;
  /** Country code (ISO 3166-1 alpha-2, e.g., "GB", "US") */
  country?: string;
  /** Area name (city/region, e.g., "Liverpool") */
  area?: string;
  /**
   * Begin date (partial date string from MusicBrainz)
   * Can be "1965", "1965-03", or "1965-03-21" - preserved as-is
   */
  beginDate?: string;
  /**
   * End date (partial date string from MusicBrainz)
   * Can be "1970", "1970-04", or "1970-04-10" - preserved as-is
   */
  endDate?: string;
  /** Whether the artist has ended (disbanded, deceased) */
  ended?: boolean;
  /** Gender (only meaningful for "Person" type) */
  gender?: string;
  /** MusicBrainz search score (0-100) */
  mbScore: number;
  /** Top releases for disambiguation in UI */
  topReleases?: ArtistTopRelease[];
}

/**
 * Options for artist correction search
 */
export interface ArtistCorrectionSearchOptions {
  /** Search query (artist name) */
  query: string;
  /** Maximum results to return (default 10) */
  limit?: number;
  /** Offset for pagination */
  offset?: number;
}

/**
 * Response from artist correction search
 */
export interface ArtistCorrectionSearchResponse {
  /** Search results */
  results: ArtistSearchResult[];
  /** Total results available (for pagination) */
  totalCount?: number;
  /** Whether more results are available */
  hasMore: boolean;
  /** The query that was executed */
  query: string;
}
