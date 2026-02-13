/**
 * Type definitions for artist correction preview/diff system.
 * Provides field-by-field comparison between current artist data and MusicBrainz sources.
 */

import type { Artist } from '@prisma/client';

// Re-export ChangeType from album preview types for consistency
export { type ChangeType } from '../../preview/types';

/** Source for correction data - determines which external service to query */
export type CorrectionSource = 'musicbrainz' | 'discogs';

// ============================================================================
// MusicBrainz Artist Data Types
// ============================================================================

/**
 * MusicBrainz artist life-span data.
 * Contains begin/end dates as partial date strings (YYYY, YYYY-MM, or YYYY-MM-DD).
 */
export interface MBArtistLifeSpan {
  /** Begin date (birth for Person, formation for Group) */
  begin?: string;
  /** End date (death for Person, dissolution for Group) */
  end?: string;
  /** Whether the artist has ended (deceased, disbanded) */
  ended?: boolean;
}

/**
 * MusicBrainz area data (country, city, region).
 */
export interface MBArtistArea {
  /** Area MBID */
  id: string;
  /** Area name (e.g., "London", "United Kingdom") */
  name: string;
  /** ISO 3166-1 alpha-2 country code (for countries) */
  iso31661Code?: string;
}

/**
 * MusicBrainz artist alias.
 */
export interface MBArtistAlias {
  /** Alias text */
  name: string;
  /** Sort name for this alias */
  sortName?: string;
  /** Alias type (e.g., "Legal name", "Stage name") */
  type?: string;
  /** Locale for this alias (e.g., "ja", "en") */
  locale?: string;
  /** Whether this is the primary name for the locale */
  primary?: boolean;
}

/**
 * Full MusicBrainz artist data fetched via API.
 * Contains all fields available from the /ws/2/artist endpoint.
 */
export interface MBArtistData {
  /** Artist MBID */
  id: string;
  /** Artist name */
  name: string;
  /** Sort name for alphabetical ordering */
  sortName?: string;
  /** Disambiguation comment (e.g., "UK rock band") */
  disambiguation?: string;
  /** Artist type: Person, Group, Orchestra, Choir, Character, Other */
  type?: string;
  /** ISO 3166-1 alpha-2 country code */
  country?: string;
  /** Area of origin (city, region) */
  area?: MBArtistArea;
  /** Birth/formation and death/dissolution dates */
  lifeSpan?: MBArtistLifeSpan;
  /** Gender (only for Person type) */
  gender?: string;
  /** IPI codes (Interested Parties Information) */
  ipis?: string[];
  /** ISNI codes (International Standard Name Identifier) */
  isnis?: string[];
  /** Artist aliases (alternate names) */
  aliases?: MBArtistAlias[];
}

// ============================================================================
// Artist Field Diff Types
// ============================================================================

/**
 * Diff for a single artist field.
 * Compares current database value with MusicBrainz source value.
 */
export interface ArtistFieldDiff {
  /** Field name (e.g., 'name', 'disambiguation', 'countryCode') */
  field: string;
  /** Change classification */
  changeType: 'ADDED' | 'MODIFIED' | 'REMOVED' | 'UNCHANGED';
  /** Current value in database */
  current: string | null;
  /** Value from MusicBrainz source */
  source: string | null;
}

// ============================================================================
// Artist Correction Preview Types
// ============================================================================

/**
 * Summary statistics for artist field changes.
 */
export interface ArtistPreviewSummary {
  /** Total number of fields compared */
  totalFields: number;
  /** Number of fields that changed (added + modified + removed) */
  changedFields: number;
  /** Number of fields added (null in current, has value in source) */
  addedFields: number;
  /** Number of fields modified (both have values, differ) */
  modifiedFields: number;
}

/**
 * Complete preview of all changes between current artist and MusicBrainz source.
 * Includes album count for admin impact awareness.
 */
export interface ArtistCorrectionPreview {
  /** Current artist data from database */
  currentArtist: Artist;
  /** Full MusicBrainz artist data */
  mbArtistData: MBArtistData;
  /** Field-by-field diffs */
  fieldDiffs: ArtistFieldDiff[];
  /** Number of albums by this artist (for impact context) */
  albumCount: number;
  /** Summary statistics */
  summary: ArtistPreviewSummary;
}
