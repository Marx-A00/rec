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
  // Enrichment Check Jobs (lightweight)
  CHECK_ALBUM_ENRICHMENT: 'check:album-enrichment',
  CHECK_ARTIST_ENRICHMENT: 'check:artist-enrichment',
  // Actual Enrichment Jobs (heavy)
  ENRICH_ALBUM: 'enrichment:album',
  ENRICH_ARTIST: 'enrichment:artist',
} as const;

export type JobType = typeof JOB_TYPES[keyof typeof JOB_TYPES];

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

export interface CheckAlbumEnrichmentJobData {
  albumId: string;
  source: 'collection_add' | 'recommendation_create' | 'search' | 'browse' | 'manual';
  priority?: 'low' | 'medium' | 'high';
  requestId?: string;
}

export interface CheckArtistEnrichmentJobData {
  artistId: string;
  source: 'collection_add' | 'recommendation_create' | 'search' | 'browse' | 'manual';
  priority?: 'low' | 'medium' | 'high';
  requestId?: string;
}

export interface EnrichAlbumJobData {
  albumId: string;
  priority?: 'low' | 'medium' | 'high';
  userAction?: 'collection_add' | 'recommendation_create' | 'search' | 'browse';
  requestId?: string;
}

export interface EnrichArtistJobData {
  artistId: string;
  priority?: 'low' | 'medium' | 'high';
  userAction?: 'collection_add' | 'recommendation_create' | 'search' | 'browse';
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
  | CheckAlbumEnrichmentJobData
  | CheckArtistEnrichmentJobData
  | EnrichAlbumJobData
  | EnrichArtistJobData;

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
   * Whether this job can be removed when completed
   * Default: true
   */
  removeOnComplete?: boolean;
  
  /**
   * Whether this job can be removed when failed
   * Default: false (keep for debugging)
   */
  removeOnFail?: boolean;
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
