// src/lib/musicbrainz/index.ts

// Core MusicBrainz API services
export { MusicBrainzService as BasicMusicBrainzService, musicbrainzService as basicMusicBrainzService } from './basic-service';
export { MusicBrainzService, musicBrainzService } from './musicbrainz-service';
export { 
  QueuedMusicBrainzService, 
  getQueuedMusicBrainzService,
  destroyQueuedMusicBrainzService 
} from './queue-service';

// Factory function available if needed (though getQueuedMusicBrainzService can be used directly)
export function createMusicBrainzQueueService() {
  const { getQueuedMusicBrainzService } = require('./queue-service');
  return getQueuedMusicBrainzService();
}

// Error handling and monitoring
export { musicbrainzErrorHandler } from './error-handler';
export * from './errors';

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
} from './basic-service';

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
