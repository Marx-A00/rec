/**
 * Type definitions for the artist correction apply system.
 * Handles selective field updates and atomic artist correction application.
 */

import type { Artist, DataQuality } from '@prisma/client';

import type { ArtistCorrectionPreview } from '../preview/types';

// ============================================================================
// Field Selection Types
// ============================================================================

/**
 * Selection state for artist metadata fields.
 * Each field can be independently selected for update.
 */
export interface ArtistMetadataSelections {
  /** Artist name */
  name?: boolean;
  /** Disambiguation comment */
  disambiguation?: boolean;
  /** ISO 3166-1 alpha-2 country code */
  countryCode?: boolean;
  /** Artist type (Person, Group, Orchestra, etc.) */
  artistType?: boolean;
  /** Area/city of origin */
  area?: boolean;
  /** Begin date (birth/formation) */
  beginDate?: boolean;
  /** End date (death/dissolution) */
  endDate?: boolean;
  /** Gender (only meaningful for Person type) */
  gender?: boolean;
  /** Image URL */
  imageUrl?: boolean;
}

/**
 * Selection state for artist external ID fields.
 * Controls which external identifiers to update.
 */
export interface ArtistExternalIdSelections {
  /** MusicBrainz artist ID */
  musicbrainzId?: boolean;
  /** Discogs artist ID */
  discogsId?: boolean;
  /** IPI code (Interested Parties Information) */
  ipi?: boolean;
  /** ISNI code (International Standard Name Identifier) */
  isni?: boolean;
}

/**
 * Complete field selection state for artist correction application.
 * Organized into two logical groups for granular control.
 */
export interface ArtistFieldSelections {
  /** Core metadata field selections */
  metadata: ArtistMetadataSelections;
  /** External ID field selections */
  externalIds: ArtistExternalIdSelections;
}

/**
 * Creates default field selections with all options enabled.
 * Use this as a starting point when user wants to apply all changes.
 */
export function createDefaultArtistSelections(): ArtistFieldSelections {
  return {
    metadata: {
      name: true,
      disambiguation: true,
      countryCode: true,
      artistType: true,
      area: true,
      beginDate: true,
      endDate: true,
      gender: true,
      imageUrl: true,
    },
    externalIds: {
      musicbrainzId: true,
      discogsId: true,
      ipi: true,
      isni: true,
    },
  };
}

// ============================================================================
// Apply Input/Output Types
// ============================================================================

/**
 * Input parameters for applying an artist correction.
 * Includes optimistic locking via expectedUpdatedAt.
 */
export interface ArtistApplyInput {
  /** Artist ID to apply correction to */
  artistId: string;
  /** The correction preview with all diff data */
  preview: ArtistCorrectionPreview;
  /** Field selections determining which changes to apply */
  selections: ArtistFieldSelections;
  /**
   * Expected artist updatedAt timestamp for optimistic locking.
   * If artist was modified since preview was generated, apply will fail.
   */
  expectedUpdatedAt: Date;
  /** ID of the admin user applying the correction */
  adminUserId: string;
}

/**
 * Summary of changes that were applied to the artist.
 */
export interface ArtistAppliedChanges {
  /** List of metadata field names that were updated */
  metadata: string[];
  /** List of external ID field names that were updated */
  externalIds: string[];
  /** Number of albums affected by this artist change */
  affectedAlbumCount: number;
  /** Data quality before correction */
  dataQualityBefore: DataQuality;
  /** Data quality after correction (always HIGH for admin) */
  dataQualityAfter: DataQuality;
}

/**
 * Successful apply result.
 */
export interface ArtistApplySuccessResult {
  success: true;
  /** Updated artist record */
  artist: Artist;
  /** Summary of changes applied */
  changes: ArtistAppliedChanges;
  /** Number of albums affected by this artist update */
  affectedAlbumCount: number;
}

/**
 * Failed apply result.
 */
export interface ArtistApplyFailureResult {
  success: false;
  /** Error details */
  error: ArtistApplyError;
}

/**
 * Apply operation result (success or failure).
 */
export type ArtistApplyResult =
  | ArtistApplySuccessResult
  | ArtistApplyFailureResult;

// ============================================================================
// Error Types
// ============================================================================

/**
 * Error codes for apply operation failures.
 */
export type ArtistApplyErrorCode =
  | 'STALE_DATA' // Artist was modified since preview was generated
  | 'ARTIST_NOT_FOUND' // Artist no longer exists
  | 'TRANSACTION_FAILED' // Database transaction error
  | 'INVALID_SELECTION' // Invalid field selection provided
  | 'VALIDATION_ERROR'; // Data validation failed

/**
 * Structured error for apply operation failures.
 */
export interface ArtistApplyError {
  /** Error classification code */
  code: ArtistApplyErrorCode;
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
export interface ArtistFieldDelta {
  /** Field name that was changed */
  field: string;
  /** Value before correction */
  before: unknown;
  /** Value after correction */
  after: unknown;
}

/**
 * Complete audit log payload for an artist correction operation.
 * Stored in enrichment log for traceability.
 */
export interface ArtistAuditLogPayload {
  /** Metadata field changes */
  metadata: ArtistFieldDelta[];
  /** External ID changes */
  externalIds: ArtistFieldDelta[];
}

// ============================================================================
// Re-export commonly used types from preview
// ============================================================================

export type { ArtistCorrectionPreview } from '../preview/types';
