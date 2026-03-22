// src/lib/listenbrainz/types.ts
/**
 * TypeScript interfaces for ListenBrainz API responses,
 * scheduler configuration, and job data.
 *
 * Based on: https://api.listenbrainz.org/1/explore/fresh-releases/
 */

// ============================================================================
// API Response Types
// ============================================================================

/** A single fresh release from the ListenBrainz API */
export interface ListenBrainzFreshRelease {
  artist_credit_name: string;
  artist_mbids: string[];
  caa_id: number | null;
  caa_release_mbid: string | null;
  listen_count: number;
  release_date: string; // ISO date string (YYYY-MM-DD)
  release_group_mbid: string;
  release_group_primary_type: string | null; // 'Album' | 'EP' | 'Single' | etc.
  release_mbid: string;
  release_name: string;
  release_tags: string[];
}

/** Top-level API response wrapper */
export interface ListenBrainzFreshReleasesResponse {
  payload: {
    releases: ListenBrainzFreshRelease[];
    total_count: number;
  };
}

// ============================================================================
// Artist Popularity (from POST /1/popularity/artist)
// ============================================================================

/** Artist popularity data returned by the ListenBrainz Popularity API */
export interface ListenBrainzArtistPopularity {
  artist_mbid: string;
  total_listen_count: number | null;
  total_user_count: number | null;
}

// ============================================================================
// Scheduler Configuration
// ============================================================================

/** Configuration for the ListenBrainz fresh releases scheduler */
export interface ListenBrainzScheduleConfig {
  enabled: boolean;
  intervalMinutes: number; // Default: 10080 (7 days)
  days: number; // Lookback window in days (1-90, default: 14)
  includeFuture: boolean; // Include future releases (default: true)
  primaryTypes: string[]; // e.g. ['Album', 'EP', 'Single']
  minListenCount: number; // Minimum listens to include (default: 0)
  maxReleases: number; // Max releases per sync (default: 0 = no limit)
  minArtistListeners: number; // Minimum unique listeners on artist (default: 1000)
}

// ============================================================================
// BullMQ Job Data
// ============================================================================

/** Data payload for a ListenBrainz fresh releases sync job */
export interface ListenBrainzSyncFreshReleasesJobData {
  days?: number;
  includeFuture?: boolean;
  primaryTypes?: string[];
  /** Minimum listen count to include a release (default: 0 = no filter) */
  minListenCount?: number;
  /** Max releases to process after filtering (default: 0 = no limit) */
  maxReleases?: number;
  /** Minimum unique listeners on artist to include (default: 0 = disabled) */
  minArtistListeners?: number;
  priority?: 'low' | 'medium' | 'high';
  requestId?: string;
  source?: 'scheduled' | 'manual' | 'graphql';
}

// ============================================================================
// Sync Result
// ============================================================================

/** Statistics returned after a sync run completes */
export interface ListenBrainzSyncResult {
  success: boolean;
  albumsCreated: number;
  albumsUpdated: number;
  albumsSkipped: number;
  artistsCreated: number;
  errors: string[];
  duration: number; // milliseconds
}
