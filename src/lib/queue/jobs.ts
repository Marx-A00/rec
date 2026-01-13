// src/lib/queue/jobs.ts
/**
 * Job types and interfaces for BullMQ job processing
 */

// ============================================================================
// Job Type Definitions
// ============================================================================

export const JOB_TYPES = {
  // MusicBrainz API Jobs
  MUSICBRAINZ_SEARCH_ARTISTS: 'musicbrainz:search-artists',
  MUSICBRAINZ_SEARCH_RELEASES: 'musicbrainz:search-releases',
  MUSICBRAINZ_SEARCH_RECORDINGS: 'musicbrainz:search-recordings',
  MUSICBRAINZ_LOOKUP_ARTIST: 'musicbrainz:lookup-artist',
  MUSICBRAINZ_LOOKUP_RELEASE: 'musicbrainz:lookup-release',
  MUSICBRAINZ_LOOKUP_RECORDING: 'musicbrainz:lookup-recording',
  MUSICBRAINZ_LOOKUP_RELEASE_GROUP: 'musicbrainz:lookup-release-group',
  MUSICBRAINZ_BROWSE_RELEASE_GROUPS_BY_ARTIST:
    'musicbrainz:browse-release-groups-by-artist',
  // Enrichment Check Jobs (lightweight)
  CHECK_ALBUM_ENRICHMENT: 'check:album-enrichment',
  CHECK_ARTIST_ENRICHMENT: 'check:artist-enrichment',
  CHECK_TRACK_ENRICHMENT: 'check:track-enrichment',
  // Actual Enrichment Jobs (heavy)
  ENRICH_ALBUM: 'enrichment:album',
  ENRICH_ARTIST: 'enrichment:artist',
  ENRICH_TRACK: 'enrichment:track',
  // Spotify Sync Jobs (batch processing)
  SPOTIFY_SYNC_NEW_RELEASES: 'spotify:sync-new-releases',
  SPOTIFY_SYNC_FEATURED_PLAYLISTS: 'spotify:sync-featured-playlists',
  // MusicBrainz Sync Jobs (batch processing)
  MUSICBRAINZ_SYNC_NEW_RELEASES: 'musicbrainz:sync-new-releases',
  // Simple Migration Job (one-time use)
  RUN_DISCOGS_MIGRATION: 'migration:run-discogs-migration',
  // Cover Art Caching Jobs
  CACHE_ALBUM_COVER_ART: 'cache:album-cover-art',
  CACHE_ARTIST_IMAGE: 'cache:artist-image',
  // Discogs Jobs
  DISCOGS_SEARCH_ARTIST: 'discogs:search-artist',
  DISCOGS_GET_ARTIST: 'discogs:get-artist',
} as const;

export type JobType = (typeof JOB_TYPES)[keyof typeof JOB_TYPES];

// ============================================================================
// Job Data Interfaces
// ============================================================================

export interface MusicBrainzSearchArtistsJobData {
  query: string;
  limit?: number;
  offset?: number;
  requestId?: string; // For tracking/debugging
}

export interface MusicBrainzSearchReleasesJobData {
  query: string;
  limit?: number;
  offset?: number;
  requestId?: string;
}

export interface MusicBrainzSearchRecordingsJobData {
  query: string;
  limit?: number;
  offset?: number;
  requestId?: string;
}

export interface MusicBrainzLookupArtistJobData {
  mbid: string;
  includes?: string[];
  requestId?: string;
}

export interface MusicBrainzLookupReleaseJobData {
  mbid: string;
  includes?: string[];
  requestId?: string;
}

export interface MusicBrainzLookupRecordingJobData {
  mbid: string;
  includes?: string[];
  requestId?: string;
}

export interface MusicBrainzLookupReleaseGroupJobData {
  mbid: string;
  includes?: string[];
  requestId?: string;
}

export interface MusicBrainzBrowseReleaseGroupsByArtistJobData {
  artistMbid: string;
  limit?: number;
  offset?: number;
  includes?: string[];
  requestId?: string;
}

export interface CheckAlbumEnrichmentJobData {
  albumId: string;
  source:
    | 'collection_add'
    | 'recommendation_create'
    | 'search'
    | 'browse'
    | 'manual'
    | 'spotify_sync'
    | 'admin_manual';
  priority?: 'low' | 'medium' | 'high';
  force?: boolean;
  requestId?: string;
}

export interface CheckArtistEnrichmentJobData {
  artistId: string;
  source:
    | 'collection_add'
    | 'recommendation_create'
    | 'search'
    | 'browse'
    | 'manual'
    | 'spotify_sync'
    | 'admin_manual';
  priority?: 'low' | 'medium' | 'high';
  force?: boolean;
  requestId?: string;
}

export interface CheckTrackEnrichmentJobData {
  trackId: string;
  source:
    | 'collection_add'
    | 'recommendation_create'
    | 'search'
    | 'browse'
    | 'manual'
    | 'spotify_sync';
  priority?: 'low' | 'medium' | 'high';
  requestId?: string;
}

export interface EnrichAlbumJobData {
  albumId: string;
  priority?: 'low' | 'medium' | 'high';
  force?: boolean;
  userAction?:
    | 'collection_add'
    | 'recommendation_create'
    | 'search'
    | 'browse'
    | 'manual'
    | 'spotify_sync'
    | 'admin_manual';
  requestId?: string;
}

export interface EnrichArtistJobData {
  artistId: string;
  priority?: 'low' | 'medium' | 'high';
  force?: boolean;
  userAction?:
    | 'collection_add'
    | 'recommendation_create'
    | 'search'
    | 'browse'
    | 'manual'
    | 'spotify_sync'
    | 'admin_manual';
  requestId?: string;
}

export interface EnrichTrackJobData {
  trackId: string;
  priority?: 'low' | 'medium' | 'high';
  userAction?:
    | 'collection_add'
    | 'recommendation_create'
    | 'search'
    | 'browse'
    | 'manual'
    | 'spotify_sync';
  requestId?: string;
}

// ============================================================================
// Spotify Sync Job Data Interfaces
// ============================================================================

export interface SpotifySyncNewReleasesJobData {
  limit?: number; // Number of releases to fetch per page (default: 50)
  country?: string; // Country code (default: 'US')
  priority?: 'low' | 'medium' | 'high';
  requestId?: string;
  source?: 'scheduled' | 'manual' | 'graphql'; // How this sync was triggered

  // Tag-based filtering for Spotify Search API
  genreTags?: string[]; // e.g., ['rock', 'metal', 'pop']
  year?: number; // e.g., 2025 (defaults to current year)

  // Pagination and follower filtering (Task 11)
  pages?: number; // Number of pages to fetch (default: 1, max: 4 for 200 albums)
  minFollowers?: number; // Minimum artist followers to include album (default: undefined = no filtering)
}

export interface SpotifySyncFeaturedPlaylistsJobData {
  limit?: number; // Number of playlists to process (default: 10)
  country?: string; // Country code (default: 'US')
  extractAlbums?: boolean; // Whether to extract albums from playlist tracks (default: true)
  priority?: 'low' | 'medium' | 'high';
  requestId?: string;
  source?: 'scheduled' | 'manual' | 'graphql';
}

// ============================================================================
// MusicBrainz Sync Job Data Interfaces
// ============================================================================

export interface MusicBrainzSyncNewReleasesJobData {
  query: string; // Lucene query with date range and genre filters
  limit?: number; // Number of releases to fetch (default: 50)
  dateRange?: {
    from: string; // ISO date string (YYYY-MM-DD)
    to: string; // ISO date string (YYYY-MM-DD)
  };
  genres?: string[]; // List of genres to filter by
  priority?: 'low' | 'medium' | 'high';
  requestId?: string;
  source?: 'scheduled' | 'manual' | 'graphql'; // How this sync was triggered
}

// ============================================================================
// Simple Migration Job (one-time use)
// ============================================================================

export interface RunDiscogsMigrationJobData {
  /**
   * Whether to create backup before migration
   * Default: true
   */
  createBackup?: boolean;

  /**
   * Batch size for processing
   * Default: 100
   */
  batchSize?: number;

  /**
   * Request ID for tracking
   */
  requestId?: string;
}

// ============================================================================
// Cover Art Caching Job Data Interface
// ============================================================================

export interface CacheAlbumCoverArtJobData {
  albumId: string;
  priority?: 'low' | 'medium' | 'high';
  requestId?: string;
}

export interface CacheArtistImageJobData {
  artistId: string;
  priority?: 'low' | 'medium' | 'high';
  requestId?: string;
}

// ============================================================================
// Discogs Job Data Interfaces
// ============================================================================

export interface DiscogsSearchArtistJobData {
  artistId: string; // Local database artist ID
  artistName: string; // Name to search for
  musicbrainzData?: any; // Optional MB data for better matching
  requestId?: string;
}

export interface DiscogsGetArtistJobData {
  artistId: string; // Local database artist ID
  discogsId: string; // Discogs artist ID to fetch
  requestId?: string;
}

// ============================================================================
// Job Data Union Type
// ============================================================================

export type MusicBrainzJobData =
  | MusicBrainzSearchArtistsJobData
  | MusicBrainzSearchReleasesJobData
  | MusicBrainzSearchRecordingsJobData
  | MusicBrainzLookupArtistJobData
  | MusicBrainzLookupReleaseJobData
  | MusicBrainzLookupRecordingJobData
  | MusicBrainzLookupReleaseGroupJobData
  | MusicBrainzBrowseReleaseGroupsByArtistJobData
  | CheckAlbumEnrichmentJobData
  | CheckArtistEnrichmentJobData
  | CheckTrackEnrichmentJobData
  | EnrichAlbumJobData
  | EnrichArtistJobData
  | EnrichTrackJobData
  | SpotifySyncNewReleasesJobData
  | SpotifySyncFeaturedPlaylistsJobData
  | MusicBrainzSyncNewReleasesJobData
  | RunDiscogsMigrationJobData
  | CacheAlbumCoverArtJobData
  | CacheArtistImageJobData
  | DiscogsSearchArtistJobData
  | DiscogsGetArtistJobData;

// ============================================================================
// Job Result Interfaces
// ============================================================================

export interface JobResult<T = any> {
  success: boolean;
  data?: T;
  error?: {
    message: string;
    code?: string;
    retryable?: boolean;
  };
  metadata?: {
    duration: number;
    timestamp: string;
    requestId?: string;
  };
}

// ============================================================================
// Simple Migration Result Interface
// ============================================================================

export interface DiscogsMigrationResult {
  success: boolean;
  collectionAlbumsProcessed: number;
  recommendationsProcessed: number;
  backupFile?: string;
  errors: string[];
  duration: number;
}

// ============================================================================
// Job Options
// ============================================================================

export interface MusicBrainzJobOptions {
  /**
   * Job priority (higher number = higher priority)
   * Default: 0
   */
  priority?: number;

  /**
   * Delay before processing (in milliseconds)
   * Default: 0
   */
  delay?: number;

  /**
   * Number of retry attempts
   * Default: 3
   */
  attempts?: number;

  /**
   * Backoff settings for retries
   */
  backoff?: {
    type: 'exponential' | 'fixed';
    delay: number;
  };

  /**
   * Request tracking ID
   */
  requestId?: string;

  /**
   * Number of completed jobs to keep, or boolean for all/none
   * Default: 100
   */
  removeOnComplete?: number | boolean;

  /**
   * Number of failed jobs to keep, or boolean for all/none
   * Default: 50 (keep for debugging)
   */
  removeOnFail?: number | boolean;

  /**
   * Job ID to prevent duplicates (used with repeatable jobs)
   */
  jobId?: string;

  /**
   * Repeatable job configuration
   */
  repeat?: {
    /**
     * Repeat every X milliseconds
     */
    every?: number;
    /**
     * Cron pattern for scheduling
     */
    pattern?: string;
  };
}

// ============================================================================
// Queue Statistics
// ============================================================================

export interface QueueStats {
  waiting: number;
  active: number;
  completed: number;
  failed: number;
  delayed: number;
  paused: number;
}

export interface MusicBrainzQueueMetrics {
  stats: QueueStats;
  rateLimitInfo: {
    maxRequestsPerSecond: number;
    currentWindowRequests: number;
    windowResetTime?: Date;
  };
  lastJobProcessed?: {
    type: JobType;
    timestamp: Date;
    duration: number;
    success: boolean;
  };
}
