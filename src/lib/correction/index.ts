/**
 * Album Correction Module
 *
 * Provides services and types for admin album correction workflow.
 * Searches MusicBrainz for correction candidates with ADMIN priority.
 * Supports scoring, grouping, and deduplication of search results.
 * Generates side-by-side previews with field-level diffs.
 * Applies corrections atomically with audit logging.
 */

// Types
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

// Search service
export {
  CorrectionSearchService,
  getCorrectionSearchService,
} from './search-service';

// Scoring service
export { SearchScoringService, getSearchScoringService } from './scoring';
export type { ScoringOptions, SearchScorer } from './scoring';

// Preview service and types
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

// Apply correction types and utilities
export {
  createDefaultSelections,
  selectAllFromPreview,
  matchTracks,
  calculateTitleSimilarity,
  SIMILARITY_THRESHOLD,
} from './apply';
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
  TrackMatch,
  TrackMatchType,
} from './apply';
