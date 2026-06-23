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
  type DeezerImportPlaylistJobData,
  type MusicBrainzSyncNewReleasesJobData,
  type CacheAlbumCoverArtJobData,
  type CacheArtistImageJobData,
  type DiscogsSearchArtistJobData,
  type DiscogsGetArtistJobData,
  type DiscogsSearchAlbumJobData,
  type DiscogsGetMasterJobData,
  type UncoverCreateDailyChallengeJobData,
  type UncoverResetChallengesJobData,
  type FetchSimilarArtistsJobData,
  type FetchArtistImageJobData,
  type LastFmSearchArtistsJobData,
  type LastFmSimilarArtistsJobData,
  type LastFmArtistInfoJobData,
  type ListenBrainzSimilarArtistsJobData,
  type LastFmSyncUserJobData,
  type ComputeTasteMatchesJobData,
} from '../jobs';
import type { ListenBrainzSyncFreshReleasesJobData } from '@/lib/listenbrainz/types';
import type { DeezerEditorialSyncJobData } from '@/lib/deezer/editorial-sync/types';

import { toStructuredJobError } from './utils';
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
  handleCacheAlbumCoverArt,
  handleCacheArtistImage,
} from './cache-processor';
import {
  handleDiscogsSearchArtist,
  handleDiscogsGetArtist,
  handleDiscogsSearchAlbum,
  handleDiscogsGetMaster,
} from './discogs-processor';
import { handleDeezerImportPlaylist } from './deezer-processor';
import { handleDeezerSyncEditorialReleases } from './deezer-editorial-processor';
import {
  handleCreateDailyChallenge,
  handleResetChallenges,
} from './uncover-processor';
import { handleListenBrainzSyncFreshReleases } from './listenbrainz-processor';
import { handleFetchSimilarArtists } from './similar-artists-processor';
import { handleFetchArtistImage } from './image-fetch-processor';
import {
  handleLastFmSearchArtists,
  handleLastFmSimilarArtists,
  handleLastFmArtistInfo,
} from './lastfm-cache-processor';
import { handleLastFmSyncUser } from './lastfm-sync';
import { handleListenBrainzSimilarArtists } from './listenbrainz-cache-processor';

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

      // Enrichment check handlers (pass full Job for parentJobId access)
      case JOB_TYPES.CHECK_ALBUM_ENRICHMENT:
        result = await handleCheckAlbumEnrichment(
          job as Job<CheckAlbumEnrichmentJobData>
        );
        break;

      case JOB_TYPES.CHECK_ARTIST_ENRICHMENT:
        result = await handleCheckArtistEnrichment(
          job as Job<CheckArtistEnrichmentJobData>
        );
        break;

      case JOB_TYPES.CHECK_TRACK_ENRICHMENT:
        result = await handleCheckTrackEnrichment(
          job as Job<CheckTrackEnrichmentJobData>
        );
        break;

      // Enrichment handlers (pass full Job for parentJobId access)
      case JOB_TYPES.ENRICH_ALBUM:
        result = await handleEnrichAlbum(job as Job<EnrichAlbumJobData>);
        break;

      case JOB_TYPES.ENRICH_ARTIST:
        result = await handleEnrichArtist(job as Job<EnrichArtistJobData>);
        break;

      case JOB_TYPES.ENRICH_TRACK:
        result = await handleEnrichTrack(job as Job<EnrichTrackJobData>);
        break;

      case JOB_TYPES.DEEZER_IMPORT_PLAYLIST:
        result = await handleDeezerImportPlaylist(
          job.data as DeezerImportPlaylistJobData,
          job.id
        );
        break;

      // MusicBrainz sync handlers
      case JOB_TYPES.MUSICBRAINZ_SYNC_NEW_RELEASES:
        result = await handleMusicBrainzSyncNewReleases(
          job.data as MusicBrainzSyncNewReleasesJobData
        );
        break;

      // Cache handlers (pass full Job for parentJobId access)
      case JOB_TYPES.CACHE_ALBUM_COVER_ART:
        result = await handleCacheAlbumCoverArt(
          job as Job<CacheAlbumCoverArtJobData>
        );
        break;

      case JOB_TYPES.CACHE_ARTIST_IMAGE:
        result = await handleCacheArtistImage(
          job as Job<CacheArtistImageJobData>
        );
        break;

      // Discogs handlers (pass full Job for parentJobId access)
      case JOB_TYPES.DISCOGS_SEARCH_ARTIST:
        result = await handleDiscogsSearchArtist(
          job as Job<DiscogsSearchArtistJobData>
        );
        break;

      case JOB_TYPES.DISCOGS_GET_ARTIST:
        result = await handleDiscogsGetArtist(
          job as Job<DiscogsGetArtistJobData>
        );
        break;

      case JOB_TYPES.DISCOGS_SEARCH_ALBUM:
        result = await handleDiscogsSearchAlbum(
          job as Job<DiscogsSearchAlbumJobData>
        );
        break;

      case JOB_TYPES.DISCOGS_GET_MASTER:
        result = await handleDiscogsGetMaster(
          job as Job<DiscogsGetMasterJobData>
        );
        break;

      // Uncover daily challenge
      case JOB_TYPES.UNCOVER_CREATE_DAILY_CHALLENGE:
        result = await handleCreateDailyChallenge(
          job.data as UncoverCreateDailyChallengeJobData
        );
        break;

      case JOB_TYPES.UNCOVER_RESET_CHALLENGES:
        result = await handleResetChallenges(
          job.data as UncoverResetChallengesJobData
        );
        break;

      // Deezer Editorial sync handler
      case JOB_TYPES.DEEZER_SYNC_EDITORIAL_RELEASES:
        result = await handleDeezerSyncEditorialReleases(
          job.data as DeezerEditorialSyncJobData,
          job.id
        );
        break;

      // Similar artists & image fetching
      case JOB_TYPES.FETCH_SIMILAR_ARTISTS:
        result = await handleFetchSimilarArtists(
          job as Job<FetchSimilarArtistsJobData>
        );
        break;

      case JOB_TYPES.FETCH_ARTIST_IMAGE:
        result = await handleFetchArtistImage(
          job as Job<FetchArtistImageJobData>
        );
        break;

      // Last.fm cached handlers
      case JOB_TYPES.LASTFM_SEARCH_ARTISTS:
        result = await handleLastFmSearchArtists(
          job as Job<LastFmSearchArtistsJobData>
        );
        break;

      case JOB_TYPES.LASTFM_SIMILAR_ARTISTS:
        result = await handleLastFmSimilarArtists(
          job as Job<LastFmSimilarArtistsJobData>
        );
        break;

      case JOB_TYPES.LASTFM_ARTIST_INFO:
        result = await handleLastFmArtistInfo(
          job as Job<LastFmArtistInfoJobData>
        );
        break;

      // Last.fm user sync handler
      case JOB_TYPES.LASTFM_SYNC_USER:
        result = await handleLastFmSyncUser(job as Job<LastFmSyncUserJobData>);
        break;

      // Last.fm dispatch sync (fan-out to per-user jobs)
      case JOB_TYPES.LASTFM_DISPATCH_SYNC: {
        const { lastfmScheduler } = await import('@/lib/lastfm/sync-scheduler');
        await lastfmScheduler.dispatchSyncJobs();
        result = { success: true };
        break;
      }

      // ListenBrainz cached handler
      case JOB_TYPES.LISTENBRAINZ_SIMILAR_ARTISTS:
        result = await handleListenBrainzSimilarArtists(
          job as Job<ListenBrainzSimilarArtistsJobData>
        );
        break;

      // ListenBrainz sync handler
      case JOB_TYPES.LISTENBRAINZ_SYNC_FRESH_RELEASES:
        result = await handleListenBrainzSyncFreshReleases(
          job.data as ListenBrainzSyncFreshReleasesJobData,
          job.id
        );
        break;

      // Taste match computation
      case JOB_TYPES.COMPUTE_TASTE_MATCHES: {
        const { computeAllTasteMatches, computeTasteMatchesForUser } = await import('@/lib/taste-match/compute');
        const tmData = job.data as ComputeTasteMatchesJobData;
        if (tmData.userId) {
          await computeTasteMatchesForUser(tmData.userId);
        } else {
          await computeAllTasteMatches();
        }
        result = { success: true };
        break;
      }

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
    } else if (jobData.masterId) {
      queryInfo = `Master: ${jobData.masterId}`;
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

    // Convert to structured error format for consistent UI interpretation
    // This provides error.code, error.retryable, and error.retryAfterMs
    const structuredError = toStructuredJobError(error);

    // Log error with structured info
    const errorBorder = chalk.red('─'.repeat(60));
    console.log(errorBorder);
    console.log(
      chalk.red('❌ Failed') +
        ' ' +
        chalk.yellow('[PROCESSOR LAYER]') +
        ' ' +
        chalk.white(job.name) +
        ' ' +
        chalk.gray('(ID: ' + job.id + ')') +
        ' ' +
        chalk.cyan('in ' + duration + 'ms')
    );
    console.log(
      '   ' +
        chalk.red('Code:') +
        ' ' +
        structuredError.code +
        ' | ' +
        chalk.red('Retryable:') +
        ' ' +
        structuredError.retryable
    );
    console.log('   ' + chalk.red('Message:') + ' ' + structuredError.message);
    console.log(errorBorder + '\n');

    return {
      success: false,
      error: structuredError,
      metadata: {
        duration,
        timestamp: new Date().toISOString(),
        requestId,
      },
    };
  }
}
