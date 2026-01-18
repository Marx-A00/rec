// src/lib/musicbrainz/index.ts

// Core MusicBrainz API services
export {
  MusicBrainzService as BasicMusicBrainzService,
  musicbrainzService as basicMusicBrainzService,
} from './basic-service';
export { MusicBrainzService, musicBrainzService } from './musicbrainz-service';
export {
  QueuedMusicBrainzService,
  getQueuedMusicBrainzService,
  destroyQueuedMusicBrainzService,
} from './queue-service';

// Factory function available if needed (though getQueuedMusicBrainzService can be used directly)
export async function createMusicBrainzQueueService() {
  // Import dynamically to avoid circular dependency with the re-export above
  const { getQueuedMusicBrainzService: getService } = await import(
    './queue-service'
  );
  return getService();
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

// Enrichment decision logic
export {
  shouldEnrichAlbum,
  shouldEnrichArtist,
  analyzeAlbumEnrichmentNeed,
  analyzeArtistEnrichmentNeed,
  calculateEnrichmentPriority,
  mapSourceToUserAction,
} from './enrichment-logic';

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

export type { CreateArtistData, CreateAlbumData } from './mappers';

export type {
  EnrichmentDecision,
  AlbumEnrichmentData,
  ArtistEnrichmentData,
} from './enrichment-logic';

// Re-export the main MusicBrainzApi for advanced usage
export { MusicBrainzApi } from 'musicbrainz-api';
