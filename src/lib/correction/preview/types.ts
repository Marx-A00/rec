/**
 * Type definitions for album correction preview/diff system.
 * Provides field-by-field comparison between current album data and MusicBrainz sources.
 */

import type { Album, Track } from '@prisma/client';

import type { CorrectionArtistCredit, ScoredSearchResult } from '../types';

// ============================================================================
// Source Types
// ============================================================================

/** Source for correction data - determines which external service to query */
export type CorrectionSource = 'musicbrainz' | 'discogs';

// ============================================================================
// Change Classification
// ============================================================================

/**
 * Five-state classification for field changes.
 *
 * - ADDED: Field exists in source but not in current (e.g., missing release date)
 * - MODIFIED: Both exist but differ (e.g., title changed)
 * - REMOVED: Field exists in current but not in source (rare for corrections)
 * - CONFLICT: Both exist but differ significantly (manual review needed)
 * - UNCHANGED: Values are semantically identical
 */
export type ChangeType =
  | 'ADDED'
  | 'MODIFIED'
  | 'REMOVED'
  | 'CONFLICT'
  | 'UNCHANGED';

// ============================================================================
// Text Diff Types
// ============================================================================

/**
 * Character-level diff part from jsdiff library.
 * Used to highlight exact changes within text fields.
 */
export interface TextDiffPart {
  /** The text content of this part */
  value: string;
  /** True if this part was added in the source */
  added?: boolean;
  /** True if this part was removed (exists in current but not source) */
  removed?: boolean;
}

/**
 * Diff for a text field (title, disambiguation, etc.)
 */
export interface TextDiff {
  /** Field name (e.g., 'title', 'disambiguation') */
  field: string;
  /** Change classification */
  changeType: ChangeType;
  /** Current value in database */
  currentValue: string | null;
  /** Value from MusicBrainz source */
  sourceValue: string | null;
  /** Character-level diff parts (only for MODIFIED/CONFLICT) */
  parts?: TextDiffPart[];
}

// ============================================================================
// Date Diff Types
// ============================================================================

/**
 * Date components for partial date comparison.
 * Handles YYYY, YYYY-MM, and YYYY-MM-DD formats.
 */
export interface DateComponents {
  year?: number;
  month?: number;
  day?: number;
}

/**
 * Diff for release date field with component-level granularity.
 */
export interface DateDiff {
  /** Always 'releaseDate' */
  field: 'releaseDate';
  /** Overall change classification */
  changeType: ChangeType;
  /** Current date components */
  current: DateComponents | null;
  /** Source date components */
  source: DateComponents | null;
  /** Per-component change classification */
  componentChanges: {
    year: ChangeType;
    month: ChangeType;
    day: ChangeType;
  };
}

// ============================================================================
// Array Diff Types
// ============================================================================

/**
 * Diff for array fields (genres, secondaryTypes, etc.)
 */
export interface ArrayDiff {
  /** Field name (e.g., 'genres', 'secondaryTypes') */
  field: string;
  /** Overall change classification */
  changeType: ChangeType;
  /** Current array values */
  currentItems: string[];
  /** Source array values */
  sourceItems: string[];
  /** Items added in source */
  added: string[];
  /** Items removed (exist in current but not source) */
  removed: string[];
  /** Items unchanged (exist in both) */
  unchanged: string[];
}

// ============================================================================
// External ID Diff Types
// ============================================================================

/**
 * Diff for external ID fields (MBID, Spotify, Discogs).
 */
export interface ExternalIdDiff {
  /** Field name */
  field: 'musicbrainzId' | 'spotifyId' | 'discogsId';
  /** Change classification */
  changeType: ChangeType;
  /** Current ID value */
  currentValue: string | null;
  /** Source ID value */
  sourceValue: string | null;
}

// ============================================================================
// Track Diff Types
// ============================================================================

/**
 * Diff for a single track in the track listing.
 * Position-based comparison (disc + track number).
 */
export interface TrackDiff {
  /** Track position (1-based) */
  position: number;
  /** Disc number (1-based) */
  discNumber: number;
  /** Track change classification */
  changeType: 'MATCH' | 'MODIFIED' | 'ADDED' | 'REMOVED';
  /** Current track data (null if ADDED in source) */
  current?: {
    title: string;
    durationMs: number | null;
    trackNumber: number;
  };
  /** Source track from MusicBrainz (null if REMOVED from current) */
  source?: {
    title: string;
    durationMs: number | null;
    mbid?: string;
  };
  /** Title diff parts (only for MODIFIED) */
  titleDiff?: TextDiffPart[];
  /** Duration difference in milliseconds (absolute value) */
  durationDelta?: number;
}

/**
 * Summary statistics for track listing comparison.
 */
export interface TrackListSummary {
  /** Total tracks in current album */
  totalCurrent: number;
  /** Total tracks in source data */
  totalSource: number;
  /** Number of matching tracks (same position, same title) */
  matching: number;
  /** Number of modified tracks (same position, different title/duration) */
  modified: number;
  /** Number of tracks added in source */
  added: number;
  /** Number of tracks removed (exist in current but not source) */
  removed: number;
}

// ============================================================================
// Artist Credit Diff Types
// ============================================================================

/**
 * Diff for artist credits.
 */
export interface ArtistCreditDiff {
  /** Change classification */
  changeType: ChangeType;
  /** Current artist credits */
  current: CorrectionArtistCredit[];
  /** Source artist credits */
  source: CorrectionArtistCredit[];
  /** Formatted current artist string */
  currentDisplay: string;
  /** Formatted source artist string */
  sourceDisplay: string;
  /** Name diff parts if modified */
  nameDiff?: TextDiffPart[];
}

// ============================================================================
// MusicBrainz Release Data Types
// ============================================================================

/**
 * MusicBrainz recording (track) data.
 */
export interface MBRecording {
  /** Recording MBID */
  id: string;
  /** Track title */
  title: string;
  /** Duration in milliseconds */
  length?: number;
  /** Track position within medium */
  position: number;
}

/**
 * MusicBrainz medium (disc/vinyl/CD) data.
 */
export interface MBMedium {
  /** Medium position (1-based) */
  position: number;
  /** Format (CD, Vinyl, Digital, etc.) */
  format?: string;
  /** Number of tracks on this medium */
  trackCount: number;
  /** Track listing */
  tracks: Array<{
    /** Track position within medium */
    position: number;
    /** Recording data */
    recording: MBRecording;
  }>;
}

/**
 * MusicBrainz release data (full release, not just release group).
 * Fetched separately for track listing comparison.
 */
export interface MBReleaseData {
  /** Release MBID (not release group) */
  id: string;
  /** Album title */
  title: string;
  /** Release date (YYYY, YYYY-MM, or YYYY-MM-DD) */
  date?: string;
  /** Country of release */
  country?: string;
  /** Barcode */
  barcode?: string;
  /** Media (discs/vinyls/etc.) */
  media: MBMedium[];
  /** Artist credits */
  artistCredit: Array<{
    /** Artist name as credited */
    name: string;
    /** Join phrase (e.g., ' & ', ' feat. ') */
    joinphrase?: string;
    /** Artist data */
    artist: {
      /** Artist MBID */
      id: string;
      /** Artist name */
      name: string;
      /** Sort name */
      sortName?: string;
      /** Disambiguation */
      disambiguation?: string;
    };
  }>;
}

// ============================================================================
// Union and Summary Types
// ============================================================================

/**
 * Union type for all field diffs.
 */
export type FieldDiff = TextDiff | DateDiff | ArrayDiff | ExternalIdDiff;

/**
 * Complete preview of all changes between current album and MusicBrainz source.
 */
export interface CorrectionPreview {
  /** Current album data from database */
  currentAlbum: Album & { tracks: Track[] };
  /** Selected MusicBrainz search result */
  sourceResult: ScoredSearchResult;
  /** Full MusicBrainz release data (for tracks) */
  mbReleaseData: MBReleaseData | null;
  /** Field-by-field diffs */
  fieldDiffs: FieldDiff[];
  /** Artist credit comparison */
  artistDiff: ArtistCreditDiff;
  /** Track listing comparison */
  trackDiffs: TrackDiff[];
  /** Track summary statistics */
  trackSummary: TrackListSummary;
  /** Cover art comparison */
  coverArt: {
    currentUrl: string | null;
    sourceUrl: string | null;
    changeType: ChangeType;
  };
  /** Summary of all changes */
  summary: {
    /** Total fields compared */
    totalFields: number;
    /** Number of fields that changed */
    changedFields: number;
    /** Number of fields added */
    addedFields: number;
    /** Number of fields modified */
    modifiedFields: number;
    /** Number of conflict fields */
    conflictFields: number;
    /** Whether track listing has changes */
    hasTrackChanges: boolean;
  };
}
