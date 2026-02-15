// src/lib/albums/index.ts
// Barrel export for album helpers.

export { findOrCreateAlbum, runPostCreateSideEffects } from './find-or-create';
export type {
  FindOrCreateAlbumOptions,
  FindOrCreateAlbumResult,
  AlbumIdentity,
  AlbumFields,
  AlbumArtistInput,
  AlbumEnrichmentStrategy,
  AlbumQueueCheckOptions,
  AlbumLoggingOptions,
  AlbumDedupMethod,
  DbClient,
  TransactionClient,
} from './types';
