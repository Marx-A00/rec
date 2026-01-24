/**
 * Apply Correction Module
 *
 * Provides types and utilities for applying corrections to albums.
 * Handles selective field updates, track matching, and audit logging.
 */

// Types
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

// Factory functions
export { createDefaultSelections, selectAllFromPreview } from './types';

// Track matcher
export {
  matchTracks,
  calculateTitleSimilarity,
  SIMILARITY_THRESHOLD,
} from './track-matcher';
export type { TrackMatch, TrackMatchType } from './track-matcher';
