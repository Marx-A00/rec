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
} from './types';

// Services
export {
  CorrectionSearchService,
  getCorrectionSearchService,
} from './search-service';
