// src/lib/deezer/editorial-sync/types.ts
/**
 * TypeScript interfaces for Deezer editorial API responses,
 * scheduler configuration, job data, and sync results.
 *
 * Based on: https://api.deezer.com/editorial/{genre_id}/releases
 */

// ============================================================================
// API Response Types
// ============================================================================

/** A single release from the Deezer editorial releases endpoint */
export interface DeezerEditorialRelease {
  id: number;
  title: string;
  cover_small: string;
  cover_medium: string;
  cover_big: string;
  cover_xl: string;
  release_date: string; // 'YYYY-MM-DD'
  artist: {
    id: number;
    name: string;
  };
  type: string; // 'album' | 'ep' | 'single' etc.
}

/** Top-level API response from Deezer editorial releases */
export interface DeezerEditorialResponse {
  data: DeezerEditorialRelease[];
  total: number;
  next?: string;
}

// ============================================================================
// Scheduler Configuration
// ============================================================================

/** Configuration for the Deezer editorial releases scheduler */
export interface DeezerEditorialScheduleConfig {
  enabled: boolean;
  intervalMinutes: number; // Default: 10080 (7 days)
  maxReleases: number; // Max releases per sync (default: 100)
  genres: string[]; // Genre IDs (default: ['0'] = all genres)
  filterDeluxe: boolean; // Filter out deluxe/remastered editions (default: true)
}

// ============================================================================
// BullMQ Job Data
// ============================================================================

/** Data payload for a Deezer editorial releases sync job */
export interface DeezerEditorialSyncJobData {
  maxReleases: number;
  genres: string[];
  filterDeluxe: boolean;
  source: 'scheduled' | 'manual' | 'graphql';
  requestId: string;
}

// ============================================================================
// Sync Result
// ============================================================================

/** Statistics returned after a Deezer editorial sync run completes */
export interface DeezerEditorialSyncResult {
  success: boolean;
  albumsCreated: number;
  albumsUpdated: number;
  albumsSkipped: number;
  artistsCreated: number;
  errors: string[];
  duration: number; // milliseconds
  syncJobId?: string;
}
