/**
 * Album Correction Module
 *
 * Provides services and types for admin album correction workflow.
 * Searches MusicBrainz for correction candidates with ADMIN priority.
 */

// Types
export type {
  CorrectionSearchOptions,
  CorrectionArtistCredit,
  CorrectionSearchResult,
  CorrectionSearchResponse,
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
