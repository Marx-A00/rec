/**
 * Type definitions for the apply correction system.
 * Handles selective field updates and atomic correction application.
 */

import type { Album, DataQuality } from '@prisma/client';

import type { CorrectionPreview, MBRecording } from '../preview/types';

// ============================================================================
// Field Selection Types
// ============================================================================

/**
 * Selection state for metadata fields.
 * Each field can be independently selected for update.
 */
export interface MetadataSelections {
  /** Album title */
  title: boolean;
  /** Release date */
  releaseDate: boolean;
  /** Release type (Album, EP, Single, etc.) */
  releaseType: boolean;
  /** Release country code */
  releaseCountry: boolean;
  /** Barcode / UPC */
  barcode: boolean;
  /** Record label */
  label: boolean;
}

/**
 * Selection state for external ID fields.
 * Controls which external identifiers to update.
 */
export interface ExternalIdSelections {
  /** MusicBrainz release ID */
  musicbrainzId: boolean;
  /** Spotify album ID */
  spotifyId: boolean;
  /** Discogs release ID */
  discogsId: boolean;
}

/**
 * Cover art handling options.
 * - use_source: Replace current cover with source cover art
 * - keep_current: Preserve existing cover art
 * - clear: Remove cover art entirely
 */
export type CoverArtChoice = 'use_source' | 'keep_current' | 'clear';

/**
 * Complete field selection state for correction application.
 * Organized into five logical groups for granular control.
 */
export interface FieldSelections {
  /** Core metadata field selections */
  metadata: MetadataSelections;
  /**
   * Per-artist selection state.
   * Key: artist MBID or unique identifier
   * Value: whether to apply this artist change
   */
  artists: Map<string, boolean>;
  /**
   * Per-track selection state.
   * Key: track identifier (format: "disc-track", e.g., "1-3" for disc 1, track 3)
   * Value: whether to apply this track change
   */
  tracks: Map<string, boolean>;
  /** External ID field selections */
  externalIds: ExternalIdSelections;
  /** Cover art handling choice */
  coverArt: CoverArtChoice;
}

/**
 * Creates default field selections with all options enabled.
 * Use this as a starting point when user wants to apply all changes.
 */
export function createDefaultSelections(): FieldSelections {
  return {
    metadata: {
      title: true,
      releaseDate: true,
      releaseType: true,
      releaseCountry: true,
      barcode: true,
      label: true,
    },
    artists: new Map(),
    tracks: new Map(),
    externalIds: {
      musicbrainzId: true,
      spotifyId: true,
      discogsId: true,
    },
    coverArt: 'use_source',
  };
}

/**
 * Creates field selections populated from a correction preview.
 * Selects all available changes by default.
 *
 * @param preview - The correction preview to derive selections from
 * @returns FieldSelections with all tracks and artists mapped
 */
export function selectAllFromPreview(
  preview: CorrectionPreview
): FieldSelections {
  const selections = createDefaultSelections();

  // Populate artist selections from artist diff
  if (preview.artistDiff?.source) {
    preview.artistDiff.source.forEach(artist => {
      // Use MBID if available, otherwise use name as identifier
      const key = artist.mbid ?? artist.name;
      selections.artists.set(key, true);
    });
  }

  // Populate track selections from track diffs
  if (preview.trackDiffs) {
    preview.trackDiffs.forEach(trackDiff => {
      const key = `${trackDiff.discNumber}-${trackDiff.position}`;
      selections.tracks.set(key, true);
    });
  }

  return selections;
}

// ============================================================================
// Apply Input/Output Types
// ============================================================================

/**
 * Input parameters for applying a correction.
 * Includes optimistic locking via expectedUpdatedAt.
 */
export interface ApplyInput {
  /** Album ID to apply correction to */
  albumId: string;
  /** The correction preview with all diff data */
  preview: CorrectionPreview;
  /** Field selections determining which changes to apply */
  selections: FieldSelections;
  /**
   * Expected album updatedAt timestamp for optimistic locking.
   * If album was modified since preview was generated, apply will fail.
   */
  expectedUpdatedAt: Date;
  /** ID of the admin user applying the correction */
  adminUserId: string;
  /** Source of the correction data (musicbrainz or discogs) */
  source?: 'musicbrainz' | 'discogs';
}

/**
 * Summary of changes that were applied to the album.
 */
export interface AppliedChanges {
  /** List of metadata field names that were updated */
  metadata: string[];
  /** Artist changes applied */
  artists: {
    /** Names of artists added to album */
    added: string[];
    /** Names of artists removed from album */
    removed: string[];
  };
  /** Track changes applied */
  tracks: {
    /** Number of tracks added */
    added: number;
    /** Number of tracks modified */
    modified: number;
    /** Number of tracks removed */
    removed: number;
  };
  /** List of external ID field names that were updated */
  externalIds: string[];
  /** Whether cover art was changed */
  coverArt: boolean;
  /** Data quality before correction */
  dataQualityBefore: DataQuality;
  /** Data quality after correction */
  dataQualityAfter: DataQuality;
}

/**
 * Successful apply result.
 */
export interface ApplySuccessResult {
  success: true;
  /** Updated album record */
  album: Album;
  /** Summary of changes applied */
  changes: AppliedChanges;
}

/**
 * Failed apply result.
 */
export interface ApplyFailureResult {
  success: false;
  /** Error details */
  error: ApplyError;
}

/**
 * Apply operation result (success or failure).
 */
export type ApplyResult = ApplySuccessResult | ApplyFailureResult;

// ============================================================================
// Error Types
// ============================================================================

/**
 * Error codes for apply operation failures.
 */
export type ApplyErrorCode =
  | 'STALE_DATA' // Album was modified since preview was generated
  | 'ALBUM_NOT_FOUND' // Album no longer exists
  | 'TRANSACTION_FAILED' // Database transaction error
  | 'INVALID_SELECTION' // Invalid field selection provided
  | 'VALIDATION_ERROR'; // Data validation failed

/**
 * Structured error for apply operation failures.
 */
export interface ApplyError {
  /** Error classification code */
  code: ApplyErrorCode;
  /** Human-readable error message */
  message: string;
  /** Additional context for debugging */
  context?: Record<string, unknown>;
}

// ============================================================================
// Audit Log Types
// ============================================================================

/**
 * Records a single field change with before/after values.
 */
export interface FieldDelta {
  /** Field name that was changed */
  field: string;
  /** Value before correction */
  before: unknown;
  /** Value after correction */
  after: unknown;
}

/**
 * Records a track-level change for audit logging.
 */
export interface TrackChangeLog {
  /** Type of track change */
  action: 'added' | 'modified' | 'removed';
  /** Track title for reference */
  trackTitle: string;
  /** Track position (1-based) */
  position: number;
  /** Disc number (1-based) */
  discNumber: number;
  /** Field-level changes (only for 'modified' actions) */
  deltas?: FieldDelta[];
}

/**
 * Records an artist-level change for audit logging.
 */
export interface ArtistChangeLog {
  /** Type of artist change */
  action: 'added' | 'removed';
  /** Artist name for reference */
  artistName: string;
  /** Artist MusicBrainz ID if available */
  artistMbid?: string;
}

/**
 * Complete audit log payload for a correction operation.
 * Stored in enrichment log for traceability.
 */
export interface AuditLogPayload {
  /** Metadata field changes */
  metadata: FieldDelta[];
  /** Track changes */
  tracks: TrackChangeLog[];
  /** Artist changes */
  artists: ArtistChangeLog[];
  /** External ID changes */
  externalIds: FieldDelta[];
  /** Cover art change (if any) */
  coverArt: FieldDelta | null;
}

// ============================================================================
// Re-export commonly used types from preview
// ============================================================================

export type { MBRecording };
