// src/lib/queue/musicbrainz-processor.ts
import { Job } from 'bullmq';
import { musicbrainzService } from '../musicbrainz';
import {
  JOB_TYPES,
  type MusicBrainzJobData,
  type JobResult,
  type MusicBrainzSearchArtistsJobData,
  type MusicBrainzSearchReleasesJobData,
  type MusicBrainzSearchRecordingsJobData,
  type MusicBrainzLookupArtistJobData,
  type MusicBrainzLookupReleaseJobData,
  type MusicBrainzLookupRecordingJobData,
  type MusicBrainzLookupReleaseGroupJobData,
} from './jobs';

/**
 * Process MusicBrainz jobs and make actual API calls
 * This processor respects the 1 request/second rate limit through BullMQ
 */
export async function processMusicBrainzJob(
  job: Job<MusicBrainzJobData, JobResult>
): Promise<JobResult> {
  const startTime = Date.now();
  const requestId = (job.data as any).requestId || job.id;

  console.log(`🎵 Processing MusicBrainz job: ${job.name}`, {
    requestId,
    jobId: job.id,
    attempt: job.attemptsMade + 1,
    maxAttempts: job.opts.attempts,
  });

  try {
    let result: any;

    // Route to appropriate MusicBrainz service method
    switch (job.name) {
      case JOB_TYPES.MUSICBRAINZ_SEARCH_ARTISTS:
        result = await handleSearchArtists(job.data as MusicBrainzSearchArtistsJobData);
        break;

      case JOB_TYPES.MUSICBRAINZ_SEARCH_RELEASES:
        result = await handleSearchReleases(job.data as MusicBrainzSearchReleasesJobData);
        break;

      case JOB_TYPES.MUSICBRAINZ_SEARCH_RECORDINGS:
        result = await handleSearchRecordings(job.data as MusicBrainzSearchRecordingsJobData);
        break;

      case JOB_TYPES.MUSICBRAINZ_LOOKUP_ARTIST:
        result = await handleLookupArtist(job.data as MusicBrainzLookupArtistJobData);
        break;

      case JOB_TYPES.MUSICBRAINZ_LOOKUP_RELEASE:
        result = await handleLookupRelease(job.data as MusicBrainzLookupReleaseJobData);
        break;

      case JOB_TYPES.MUSICBRAINZ_LOOKUP_RECORDING:
        result = await handleLookupRecording(job.data as MusicBrainzLookupRecordingJobData);
        break;

      case JOB_TYPES.MUSICBRAINZ_LOOKUP_RELEASE_GROUP:
        result = await handleLookupReleaseGroup(job.data as MusicBrainzLookupReleaseGroupJobData);
        break;

      default:
        throw new Error(`Unknown job type: ${job.name}`);
    }

    const duration = Date.now() - startTime;

    console.log(`✅ MusicBrainz job completed: ${job.name}`, {
      requestId,
      duration: `${duration}ms`,
      resultCount: Array.isArray(result) ? result.length : 1,
    });

    return {
      success: true,
      data: result,
      metadata: {
        duration,
        timestamp: new Date().toISOString(),
        requestId,
      },
    };

  } catch (error) {
    const duration = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    console.error(`❌ MusicBrainz job failed: ${job.name}`, {
      requestId,
      error: errorMessage,
      duration: `${duration}ms`,
      attempt: job.attemptsMade + 1,
    });

    // Determine if error is retryable
    const isRetryable = isRetryableError(error);

    return {
      success: false,
      error: {
        message: errorMessage,
        code: getErrorCode(error),
        retryable: isRetryable,
      },
      metadata: {
        duration,
        timestamp: new Date().toISOString(),
        requestId,
      },
    };
  }
}

// ============================================================================
// Job Handlers
// ============================================================================

async function handleSearchArtists(data: MusicBrainzSearchArtistsJobData) {
  return await musicbrainzService.searchArtists(
    data.query,
    data.limit,
    data.offset
  );
}

async function handleSearchReleases(data: MusicBrainzSearchReleasesJobData) {
  return await musicbrainzService.searchReleaseGroups(
    data.query,
    data.limit,
    data.offset
  );
}

async function handleSearchRecordings(data: MusicBrainzSearchRecordingsJobData) {
  return await musicbrainzService.searchRecordings(
    data.query,
    data.limit,
    data.offset
  );
}

async function handleLookupArtist(data: MusicBrainzLookupArtistJobData) {
  return await musicbrainzService.getArtist(data.mbid, data.includes);
}

async function handleLookupRelease(data: MusicBrainzLookupReleaseJobData) {
  return await musicbrainzService.getRelease(data.mbid, data.includes);
}

async function handleLookupRecording(data: MusicBrainzLookupRecordingJobData) {
  return await musicbrainzService.getRecording(data.mbid, data.includes);
}

async function handleLookupReleaseGroup(data: MusicBrainzLookupReleaseGroupJobData) {
  return await musicbrainzService.getReleaseGroup(data.mbid, data.includes);
}

// ============================================================================
// Error Handling Utilities
// ============================================================================

/**
 * Determine if an error is retryable
 */
function isRetryableError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;

  const message = error.message.toLowerCase();

  // Network errors - retryable
  if (message.includes('network') || 
      message.includes('timeout') || 
      message.includes('econnreset') ||
      message.includes('enotfound')) {
    return true;
  }

  // MusicBrainz specific errors
  if (message.includes('503') || message.includes('service unavailable')) {
    return true; // Service temporarily unavailable
  }

  if (message.includes('429') || message.includes('rate limit')) {
    return true; // Rate limited - will be retried with backoff
  }

  if (message.includes('500') || message.includes('internal server error')) {
    return true; // Server error - might be temporary
  }

  // Non-retryable errors
  if (message.includes('404') || message.includes('not found')) {
    return false; // Entity doesn't exist
  }

  if (message.includes('400') || message.includes('bad request')) {
    return false; // Invalid request data
  }

  // Default to retryable for unknown errors
  return true;
}

/**
 * Extract error code from error object
 */
function getErrorCode(error: unknown): string | undefined {
  if (!(error instanceof Error)) return undefined;

  const message = error.message;

  // HTTP status codes
  if (message.includes('404')) return 'NOT_FOUND';
  if (message.includes('429')) return 'RATE_LIMITED';
  if (message.includes('500')) return 'SERVER_ERROR';
  if (message.includes('503')) return 'SERVICE_UNAVAILABLE';
  if (message.includes('timeout')) return 'TIMEOUT';

  // Network errors
  if (message.includes('ECONNRESET')) return 'CONNECTION_RESET';
  if (message.includes('ENOTFOUND')) return 'DNS_ERROR';

  return 'UNKNOWN_ERROR';
}
