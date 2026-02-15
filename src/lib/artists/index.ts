// src/lib/artists/index.ts
// Public API for the artist find-or-create helper

export { findOrCreateArtist, runPostCreateSideEffects } from './find-or-create';

export type {
  ArtistIdentity,
  ArtistFields,
  EnrichmentStrategy,
  QueueCheckOptions,
  InlineFetchOptions,
  LoggingOptions,
  FindOrCreateArtistOptions,
  FindOrCreateArtistResult,
  DbClient,
  TransactionClient,
} from './types';
