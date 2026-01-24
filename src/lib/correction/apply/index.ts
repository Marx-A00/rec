/**
 * Apply Correction Module
 *
 * Provides types and utilities for applying corrections to albums.
 * Handles selective field updates, track matching, atomic transactions, and audit logging.
 *
 * @example
 * ```typescript
 * import { applyCorrectionService, selectAllFromPreview } from '@/lib/correction/apply';
 *
 * // Create field selections from preview
 * const selections = selectAllFromPreview(preview);
 *
 * // Apply correction atomically
 * const result = await applyCorrectionService.applyCorrection({
 *   albumId: album.id,
 *   preview,
 *   selections,
 *   expectedUpdatedAt: album.updatedAt,
 *   adminUserId: session.user.id,
 * });
 *
 * if (result.success) {
 *   console.log('Applied:', result.changes);
 * }
 * ```
 */

// ============================================================================
// Types
// ============================================================================

export type {
  MetadataSelections,
  ExternalIdSelections,
  CoverArtChoice,
  FieldSelections,
  ApplyInput,
  AppliedChanges,
  ApplySuccessResult,
  ApplyFailureResult,
  ApplyResult,
  ApplyErrorCode,
  ApplyError,
  FieldDelta,
  TrackChangeLog,
  ArtistChangeLog,
  AuditLogPayload,
} from './types';

// ============================================================================
// Factory functions
// ============================================================================

export { createDefaultSelections, selectAllFromPreview } from './types';

// ============================================================================
// Track matcher
// ============================================================================

export {
  matchTracks,
  calculateTitleSimilarity,
  SIMILARITY_THRESHOLD,
} from './track-matcher';
export type { TrackMatch, TrackMatchType } from './track-matcher';

// ============================================================================
// Field selectors
// ============================================================================

export {
  buildAlbumUpdateData,
  buildTrackUpdateData,
  buildTrackCreateData,
  getTrackIdsToDelete,
  hasAnyMetadataSelected,
  parseReleaseDate,
} from './field-selector';

// ============================================================================
// Data quality calculator
// ============================================================================

export {
  calculateDataQuality,
  buildQualityFactors,
  QUALITY_THRESHOLDS,
  QUALITY_WEIGHTS,
} from './data-quality-calculator';
export type {
  DataQualityFactors,
  DataQualitySource,
} from './data-quality-calculator';

// ============================================================================
// Apply service
// ============================================================================

export {
  ApplyCorrectionService,
  applyCorrectionService,
  StaleDataError,
} from './apply-service';
