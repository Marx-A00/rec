// src/lib/albums/types.ts
// Type definitions for the unified album find-or-create helper.

import type { Album, PrismaClient } from '@prisma/client';
import type { ITXClientDenyList } from '@prisma/client/runtime/library';

// Prisma transaction client type (same pattern as artist helper)
export type TransactionClient = Omit<PrismaClient, ITXClientDenyList>;
export type DbClient = PrismaClient | TransactionClient;

// ============================================================================
// Identity (dedup lookup fields)
// ============================================================================

export interface AlbumIdentity {
  title: string;
  musicbrainzId?: string | null;
  spotifyId?: string | null;
  deezerId?: string | null;
  discogsId?: string | null;
  /** Used for title+artist dedup fallback */
  primaryArtistName?: string | null;
  /** Used for title+artist+year dedup (±1 year fuzzy match) */
  releaseYear?: number | null;
}

// ============================================================================
// Optional fields to set on creation
// ============================================================================

export interface AlbumFields {
  releaseDate?: Date | null;
  releaseType?: string | null;
  releaseStatus?: string | null;
  trackCount?: number | null;
  coverArtUrl?: string | null;
  source?: 'DEEZER' | 'MUSICBRAINZ' | 'SPOTIFY' | 'DISCOGS' | 'USER_SUBMITTED';
  sourceUrl?: string | null;
  spotifyUrl?: string | null;
  secondaryTypes?: string[];
  metadata?: Record<string, unknown>;
}

// ============================================================================
// Artist association input
// ============================================================================

export interface AlbumArtistInput {
  name: string;
  musicbrainzId?: string | null;
  spotifyId?: string | null;
  deezerId?: string | null;
  discogsId?: string | null;
  role?: 'PRIMARY' | 'FEATURED';
  position?: number;
}

// ============================================================================
// Enrichment strategies
// ============================================================================

export type AlbumEnrichmentStrategy = 'queue-check' | 'none';

export interface AlbumQueueCheckOptions {
  source:
    | 'collection_add'
    | 'recommendation_create'
    | 'search'
    | 'browse'
    | 'manual'
    | 'spotify_sync'
    | 'deezer_import'
    | 'admin_manual';
  priority?: 'low' | 'medium' | 'high';
  requestId?: string;
  parentJobId?: string;
}

// ============================================================================
// Logging options
// ============================================================================

export interface AlbumLoggingOptions {
  operation: string;
  category?: string;
  sources?: string[];
  userId?: string | null;
  jobId?: string | null; // Unique ID for this log entry (used as parent for child logs)
  parentJobId?: string | null;
  rootJobId?: string | null;
  isRootJob?: boolean;
  metadata?: Record<string, unknown>;
}

// ============================================================================
// Main function options
// ============================================================================

export interface FindOrCreateAlbumOptions {
  db: DbClient;
  identity: AlbumIdentity;
  fields?: AlbumFields;
  artists?: AlbumArtistInput[];
  enrichment?: AlbumEnrichmentStrategy;
  queueCheckOptions?: AlbumQueueCheckOptions;
  logging?: AlbumLoggingOptions | null;
  insideTransaction?: boolean;
  backfillExternalIds?: boolean;
  caller: string;
}

// ============================================================================
// Return type
// ============================================================================

export type AlbumDedupMethod =
  | 'musicbrainzId'
  | 'spotifyId'
  | 'deezerId'
  | 'title+artist+year'
  | 'title+artist'
  | null;

export interface FindOrCreateAlbumResult {
  album: Album;
  created: boolean;
  dedupMethod: AlbumDedupMethod;
  /** Number of artists created during this operation (0 if album already existed) */
  artistsCreated: number;
}
