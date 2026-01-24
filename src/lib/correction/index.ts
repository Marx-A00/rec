/**
 * Album Correction Module
 *
 * Provides services and types for admin album correction workflow.
 * Searches MusicBrainz for correction candidates with ADMIN priority.
 * Supports scoring, grouping, and deduplication of search results.
 * Generates side-by-side previews with field-level diffs.
 * Applies corrections atomically with audit logging.
 *
 * @example
 * ```typescript
 * import {
 *   getSearchScoringService,
 *   getCorrectionPreviewService,
 *   applyCorrectionService,
 *   selectAllFromPreview,
 * } from '@/lib/correction';
 *
 * // 1. Search for correction candidates
 * const searchService = getSearchScoringService();
 * const results = await searchService.searchWithScoring({
 *   albumTitle: album.title,
 *   artistName: album.artistName,
 * });
 *
 * // 2. Generate preview for selected result
 * const previewService = getCorrectionPreviewService();
 * const preview = await previewService.generatePreview(album, results[0]);
 *
 * // 3. Apply correction atomically
 * const selections = selectAllFromPreview(preview);
 * const result = await applyCorrectionService.applyCorrection({
 *   albumId: album.id,
 *   preview,
 *   selections,
 *   expectedUpdatedAt: album.updatedAt,
 *   adminUserId: session.user.id,
 * });
 * ```
 */

// ============================================================================
// Types (from ./types.ts)
// ============================================================================

export type {
  CorrectionSearchOptions,
  CorrectionArtistCredit,
  CorrectionSearchResult,
  CorrectionSearchResponse,
  ScoredSearchOptions,
  GroupedSearchResult,
  ScoredSearchResponse,
  ScoredSearchResult,
  ScoringStrategy,
  ScoreBreakdown,
  ConfidenceTier,
} from './types';

// ============================================================================
// Search service
// ============================================================================

export {
  CorrectionSearchService,
  getCorrectionSearchService,
} from './search-service';

// ============================================================================
// Scoring service
// ============================================================================

export { SearchScoringService, getSearchScoringService } from './scoring';
export type { ScoringOptions, SearchScorer } from './scoring';

// ============================================================================
// Preview service
// ============================================================================

export {
  getCorrectionPreviewService,
  CorrectionPreviewService,
} from './preview';
export { DiffEngine, TextNormalizer } from './preview';
export type {
  CorrectionPreview,
  ChangeType,
  FieldDiff,
  TextDiff,
  DateDiff,
  ArrayDiff,
  TrackDiff,
  TrackListSummary,
  ArtistCreditDiff,
  ExternalIdDiff,
  MBReleaseData,
} from './preview';

// ============================================================================
// Apply correction service
// ============================================================================

export {
  // Service and singleton
  ApplyCorrectionService,
  applyCorrectionService,
  StaleDataError,
  // Selection factories
  createDefaultSelections,
  selectAllFromPreview,
  // Track matching
  matchTracks,
  calculateTitleSimilarity,
  SIMILARITY_THRESHOLD,
  // Field selectors
  buildAlbumUpdateData,
  buildTrackUpdateData,
  buildTrackCreateData,
  getTrackIdsToDelete,
  hasAnyMetadataSelected,
  parseReleaseDate,
  // Data quality
  calculateDataQuality,
  buildQualityFactors,
  QUALITY_THRESHOLDS,
  QUALITY_WEIGHTS,
} from './apply';

export type {
  // Selection types
  MetadataSelections,
  ExternalIdSelections,
  CoverArtChoice,
  FieldSelections,
  // Input/output types
  ApplyInput,
  AppliedChanges,
  ApplySuccessResult,
  ApplyFailureResult,
  ApplyResult,
  ApplyErrorCode,
  ApplyError,
  // Audit types
  FieldDelta,
  TrackChangeLog,
  ArtistChangeLog,
  AuditLogPayload,
  // Track matcher types
  TrackMatch,
  TrackMatchType,
  // Data quality types
  DataQualityFactors,
  DataQualitySource,
} from './apply';
