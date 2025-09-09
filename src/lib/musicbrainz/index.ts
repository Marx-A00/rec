// src/lib/musicbrainz/index.ts

// Core MusicBrainz API services
export { MusicBrainzService, musicbrainzService } from './service';
export { 
  QueuedMusicBrainzService, 
  getQueuedMusicBrainzService,
  destroyQueuedMusicBrainzService 
} from './queue-service';

// Create a factory function instead of direct instance to avoid import issues
export function createMusicBrainzQueueService() {
  return getQueuedMusicBrainzService();
}

// Data validation schemas
export {
  MusicBrainzArtistSearchSchema,
  MusicBrainzReleaseGroupSearchSchema,
  MusicBrainzRecordingSearchSchema,
  validateArtistSearchResult,
  validateReleaseGroupSearchResult,
  validateRecordingSearchResult,
  safeValidateArtistSearchResult,
  safeValidateReleaseGroupSearchResult,
  safeValidateRecordingSearchResult,
} from './schemas';

// Data mapping functions
export {
  mapArtistSearchToCanonical,
  mapReleaseGroupSearchToCanonical,
  mapArtistCreditToCanonical,
  extractArtistCreditsFromReleaseGroup,
} from './mappers';

// Database integration service
export {
  MusicBrainzIntegrationService,
  createMusicBrainzIntegrationService,
} from './integration';

// Type exports
export type {
  ArtistSearchResult,
  ReleaseGroupSearchResult,
  RecordingSearchResult,
} from './service';

export type {
  ValidatedArtistSearchResult,
  ValidatedReleaseGroupSearchResult,
  ValidatedRecordingSearchResult,
} from './schemas';

export type {
  CreateArtistData,
  CreateAlbumData,
} from './mappers';

// Re-export the main MusicBrainzApi for advanced usage
export { MusicBrainzApi } from 'musicbrainz-api';
