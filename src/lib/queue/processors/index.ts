// src/lib/queue/processors/index.ts
// Main router that imports all processor files and routes job types to handlers

import { Job } from 'bullmq';
import chalk from 'chalk';

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
  type CheckAlbumEnrichmentJobData,
  type CheckArtistEnrichmentJobData,
  type CheckTrackEnrichmentJobData,
  type EnrichAlbumJobData,
  type EnrichArtistJobData,
  type EnrichTrackJobData,
  type SpotifySyncNewReleasesJobData,
  type SpotifySyncFeaturedPlaylistsJobData,
  type MusicBrainzSyncNewReleasesJobData,
  type CacheAlbumCoverArtJobData,
  type CacheArtistImageJobData,
  type DiscogsSearchArtistJobData,
  type DiscogsGetArtistJobData,
} from '../jobs';

import { isRetryableError, getErrorCode } from './utils';

// Import handlers from individual processor files
import {
  handleSearchArtists,
  handleSearchReleases,
  handleSearchRecordings,
  handleLookupArtist,
  handleLookupRelease,
  handleLookupRecording,
  handleLookupReleaseGroup,
  handleBrowseReleaseGroupsByArtist,
  handleMusicBrainzSyncNewReleases,
} from './musicbrainz-processor';

import {
  handleCheckAlbumEnrichment,
  handleCheckArtistEnrichment,
  handleCheckTrackEnrichment,
  handleEnrichAlbum,
  handleEnrichArtist,
  handleEnrichTrack,
} from './enrichment-processor';

import {
  handleSpotifySyncNewReleases,
  handleSpotifySyncFeaturedPlaylists,
} from './spotify-processor';

import {
  handleCacheAlbumCoverArt,
  handleCacheArtistImage,
} from './cache-processor';

import {
  handleDiscogsSearchArtist,
  handleDiscogsGetArtist,
} from './discogs-processor';

// Re-export JOB_TYPES for convenience
export { JOB_TYPES } from '../jobs';

/**
 * Process jobs and route to appropriate handlers
 * This processor respects the 1 request/second rate limit through BullMQ
 */
export async function processMusicBrainzJob(
  job: Job<MusicBrainzJobData, JobResult>
): Promise<JobResult> {
  const startTime = Date.now();
  const requestId =
    ((job.data as Record<string, unknown>).requestId as string) || job.id;

  try {
    let result: unknown;

    // Handle slow processing for testing Bull Board UI
    const jobData = job.data as Record<string, unknown>;
    const isSlowJob = jobData.slowProcessing;
    if (isSlowJob) {
      const delaySeconds = (jobData.delaySeconds as number) || 10;
      const query = (jobData.query as string) || 'slow job';
      console.log(`🐌 ${query} (${delaySeconds}s delay)`);

      // Simulate slow processing
      await new Promise(resolve => setTimeout(resolve, delaySeconds * 1000));

      // Return mock result for slow job
      return {
        success: true,
        data: {
          results: [
            {
              id: 'bladee-the-fool-slow',
              title: query,
              processingType: 'SLOW_MOCK',
              duration: `${delaySeconds}s`,
            },
          ],
          totalResults: 1,
          processingTime: `${delaySeconds * 1000}ms`,
        },
        metadata: {
          duration: delaySeconds * 1000,
          timestamp: new Date().toISOString(),
          requestId,
        },
      };
    }

    // Route to appropriate handler based on job type
    switch (job.name) {
      // MusicBrainz search handlers
      case JOB_TYPES.MUSICBRAINZ_SEARCH_ARTISTS:
        result = await handleSearchArtists(
          job.data as MusicBrainzSearchArtistsJobData
        );
        break;

      case JOB_TYPES.MUSICBRAINZ_SEARCH_RELEASES:
        result = await handleSearchReleases(
          job.data as MusicBrainzSearchReleasesJobData
        );
        break;

      case JOB_TYPES.MUSICBRAINZ_SEARCH_RECORDINGS:
        result = await handleSearchRecordings(
          job.data as MusicBrainzSearchRecordingsJobData
        );
        break;

      // MusicBrainz lookup handlers
      case JOB_TYPES.MUSICBRAINZ_LOOKUP_ARTIST:
        result = await handleLookupArtist(
          job.data as MusicBrainzLookupArtistJobData
        );
        break;

      case JOB_TYPES.MUSICBRAINZ_LOOKUP_RELEASE:
        result = await handleLookupRelease(
          job.data as MusicBrainzLookupReleaseJobData
        );
        break;

      case JOB_TYPES.MUSICBRAINZ_LOOKUP_RECORDING:
        result = await handleLookupRecording(
          job.data as MusicBrainzLookupRecordingJobData
        );
        break;

      case JOB_TYPES.MUSICBRAINZ_LOOKUP_RELEASE_GROUP:
        result = await handleLookupReleaseGroup(
          job.data as MusicBrainzLookupReleaseGroupJobData
        );
        break;

      case JOB_TYPES.MUSICBRAINZ_BROWSE_RELEASE_GROUPS_BY_ARTIST:
        result = await handleBrowseReleaseGroupsByArtist(
          job.data as { artistMbid: string; limit?: number; offset?: number }
        );
        break;

      // Enrichment check handlers
      case JOB_TYPES.CHECK_ALBUM_ENRICHMENT:
        result = await handleCheckAlbumEnrichment(
          job.data as CheckAlbumEnrichmentJobData
        );
        break;

      case JOB_TYPES.CHECK_ARTIST_ENRICHMENT:
        result = await handleCheckArtistEnrichment(
          job.data as CheckArtistEnrichmentJobData
        );
        break;

      case JOB_TYPES.CHECK_TRACK_ENRICHMENT:
        result = await handleCheckTrackEnrichment(
          job.data as CheckTrackEnrichmentJobData
        );
        break;

      // Enrichment handlers
      case JOB_TYPES.ENRICH_ALBUM:
        result = await handleEnrichAlbum(job.data as EnrichAlbumJobData);
        break;

      case JOB_TYPES.ENRICH_ARTIST:
        result = await handleEnrichArtist(job.data as EnrichArtistJobData);
        break;

      case JOB_TYPES.ENRICH_TRACK:
        result = await handleEnrichTrack(job.data as EnrichTrackJobData);
        break;

      // Spotify sync handlers
      case JOB_TYPES.SPOTIFY_SYNC_NEW_RELEASES:
        result = await handleSpotifySyncNewReleases(
          job.data as SpotifySyncNewReleasesJobData,
          job.id
        );
        break;

      case JOB_TYPES.SPOTIFY_SYNC_FEATURED_PLAYLISTS:
        result = await handleSpotifySyncFeaturedPlaylists(
          job.data as SpotifySyncFeaturedPlaylistsJobData,
          job.id
        );
        break;

      // MusicBrainz sync handlers
      case JOB_TYPES.MUSICBRAINZ_SYNC_NEW_RELEASES:
        result = await handleMusicBrainzSyncNewReleases(
          job.data as MusicBrainzSyncNewReleasesJobData
        );
        break;

      // Cache handlers
      case JOB_TYPES.CACHE_ALBUM_COVER_ART:
        result = await handleCacheAlbumCoverArt(
          job.data as CacheAlbumCoverArtJobData
        );
        break;

      case JOB_TYPES.CACHE_ARTIST_IMAGE:
        result = await handleCacheArtistImage(
          job.data as CacheArtistImageJobData
        );
        break;

      // Discogs handlers
      case JOB_TYPES.DISCOGS_SEARCH_ARTIST:
        result = await handleDiscogsSearchArtist(
          job.data as DiscogsSearchArtistJobData
        );
        break;

      case JOB_TYPES.DISCOGS_GET_ARTIST:
        result = await handleDiscogsGetArtist(
          job.data as DiscogsGetArtistJobData
        );
        break;

      default:
        throw new Error(`Unknown job type: ${job.name}`);
    }

    const duration = Date.now() - startTime;
    const resultCount = Array.isArray(result) ? result.length : 1;

    // Extract query/identifier info for logging
    let queryInfo = '';

    if (jobData.query) {
      queryInfo = `"${jobData.query}"`;
    } else if (jobData.mbid) {
      // For lookup jobs, try to extract the name from the result
      let entityName = '';
      const resultObj = result as Record<string, unknown> | null;
      if (job.name.includes('artist') && resultObj?.name) {
        entityName = resultObj.name as string;
      } else if (job.name.includes('release') && resultObj?.title) {
        entityName = resultObj.title as string;
      } else if (job.name.includes('recording') && resultObj?.title) {
        entityName = resultObj.title as string;
      }

      const mbid = jobData.mbid as string;
      queryInfo = entityName
        ? `"${entityName}" • MBID: ${mbid.substring(0, 8)}...`
        : `MBID: ${mbid.substring(0, 8)}...`;
    } else if (jobData.albumId) {
      queryInfo = `Album: ${jobData.albumId}`;
    } else if (jobData.artistId) {
      queryInfo = `Artist: ${jobData.artistId}`;
    }

    // Success logging with colored borders
    const border = chalk.yellow('─'.repeat(60));
    console.log(border);
    console.log(
      `${chalk.green('✅ Completed')} ${chalk.yellow('[PROCESSOR LAYER]')} ${chalk.white(job.name)} ${queryInfo ? chalk.magenta(`[${queryInfo}]`) + ' ' : ''}${chalk.gray(`(ID: ${job.id})`)} ${chalk.cyan(`in ${duration}ms`)} ${chalk.gray(`• Results: ${resultCount}`)}`
    );
    console.log(border + '\n');

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
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error';

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
