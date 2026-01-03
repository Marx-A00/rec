// src/types/album-metadata.ts
/**
 * Type-safe metadata structure for Album.metadata JSON field
 * Tracks how albums enter the system and provides audit trail
 */

/**
 * Source types for album creation
 */
export type AlbumSyncSource =
  | 'spotify_search' // Spotify new releases via search API
  | 'spotify_playlists' // Spotify featured playlists
  | 'musicbrainz_sync' // MusicBrainz automated sync
  | 'user_collection' // User manually added to collection
  | 'user_recommendation' // User added via recommendation flow
  | 'manual' // Manual admin/system add
  | 'unknown'; // Legacy albums without metadata

/**
 * Base metadata - ALWAYS included for all albums
 */
export interface AlbumMetadataBase {
  syncSource: AlbumSyncSource;
  syncedAt: string; // ISO 8601 timestamp
}

/**
 * Spotify sync-specific metadata
 */
export interface SpotifySyncMetadata {
  jobId?: string; // BullMQ job ID
  batchId?: string; // Sync batch identifier (e.g., "2025-01-24_weekly")
  spotifyQuery?: string; // Search query used (e.g., "tag:new year:2025")
  spotifyCountry?: string; // Market code (e.g., "US")
  spotifyGenreTags?: string[]; // Genre filters applied
  spotifyYear?: number; // Year filter
}

/**
 * User collection-specific metadata
 */
export interface UserCollectionMetadata {
  addedByUserId: string; // User who added the album
  collectionId: string; // Collection it was added to
  addedVia?: 'search' | 'browse' | 'import'; // How they found it
}

/**
 * User recommendation-specific metadata
 */
export interface UserRecommendationMetadata {
  addedByUserId: string; // User who created the recommendation
  recommendationId: string; // Recommendation record ID
  basisAlbumId?: string; // Album that triggered this recommendation
}

/**
 * MusicBrainz sync-specific metadata
 */
export interface MusicBrainzSyncMetadata {
  jobId?: string; // BullMQ job ID
  batchId?: string; // Sync batch identifier
  mbQuery?: string; // MusicBrainz query used
  mbGenres?: string[]; // Genre filters
  mbDateRange?: string; // Date range filter
}

/**
 * Complete album metadata type (discriminated union)
 * Note: Uses Record<string, any> for Prisma JSON compatibility
 */
export type AlbumMetadata = AlbumMetadataBase &
  (
    | SpotifySyncMetadata
    | UserCollectionMetadata
    | UserRecommendationMetadata
    | MusicBrainzSyncMetadata
    | Record<string, never> // Empty object for base metadata only
  ) &
  Record<string, unknown>; // Index signature for Prisma JSON

/**
 * Helper to create Spotify sync metadata
 */
export function createSpotifySyncMetadata(
  source: 'spotify_search' | 'spotify_playlists',
  options?: {
    jobId?: string;
    batchId?: string;
    query?: string;
    country?: string;
    genreTags?: string[];
    year?: number;
  }
): AlbumMetadata {
  return {
    syncSource: source,
    syncedAt: new Date().toISOString(),
    jobId: options?.jobId,
    batchId: options?.batchId,
    spotifyQuery: options?.query,
    spotifyCountry: options?.country,
    spotifyGenreTags: options?.genreTags,
    spotifyYear: options?.year,
  };
}

/**
 * Helper to create user collection metadata
 */
export function createUserCollectionMetadata(
  userId: string,
  collectionId: string,
  addedVia?: 'search' | 'browse' | 'import'
): AlbumMetadata {
  return {
    syncSource: 'user_collection',
    syncedAt: new Date().toISOString(),
    addedByUserId: userId,
    collectionId,
    addedVia,
  };
}

/**
 * Helper to create user recommendation metadata
 */
export function createUserRecommendationMetadata(
  userId: string,
  recommendationId: string,
  basisAlbumId?: string
): AlbumMetadata {
  return {
    syncSource: 'user_recommendation',
    syncedAt: new Date().toISOString(),
    addedByUserId: userId,
    recommendationId,
    basisAlbumId,
  };
}

/**
 * Helper to create MusicBrainz sync metadata
 */
export function createMusicBrainzSyncMetadata(options?: {
  jobId?: string;
  batchId?: string;
  query?: string;
  genres?: string[];
  dateRange?: string;
}): AlbumMetadata {
  return {
    syncSource: 'musicbrainz_sync',
    syncedAt: new Date().toISOString(),
    jobId: options?.jobId,
    batchId: options?.batchId,
    mbQuery: options?.query,
    mbGenres: options?.genres,
    mbDateRange: options?.dateRange,
  };
}
