// src/lib/queue/processors/musicbrainz-processor.ts
// MusicBrainz API search and lookup handlers

import { prisma } from '@/lib/prisma';
import { queueLogger } from '@/lib/logger';

import { getSchedulerEnabled } from '../../config/app-config';
import { musicBrainzService } from '../../musicbrainz/musicbrainz-service';
import { hasIdProperty } from '../../musicbrainz/mbid-verifier';
import type {
  MusicBrainzSearchArtistsJobData,
  MusicBrainzSearchReleasesJobData,
  MusicBrainzSearchRecordingsJobData,
  MusicBrainzLookupArtistJobData,
  MusicBrainzLookupReleaseJobData,
  MusicBrainzLookupRecordingJobData,
  MusicBrainzLookupReleaseGroupJobData,
  MusicBrainzSyncNewReleasesJobData,
} from '../jobs';

// ============================================================================
// MusicBrainz Search Handlers
// ============================================================================

export async function handleSearchArtists(
  data: MusicBrainzSearchArtistsJobData
) {
  return await musicBrainzService.searchArtists(
    data.query,
    data.limit,
    data.offset
  );
}

export async function handleSearchReleases(
  data: MusicBrainzSearchReleasesJobData
) {
  return await musicBrainzService.searchReleaseGroups(
    data.query,
    data.limit,
    data.offset
  );
}

export async function handleSearchRecordings(
  data: MusicBrainzSearchRecordingsJobData
) {
  return await musicBrainzService.searchRecordings(
    data.query,
    data.limit,
    data.offset
  );
}

// ============================================================================
// MusicBrainz Lookup Handlers (with MBID verification)
// ============================================================================

export async function handleLookupArtist(data: MusicBrainzLookupArtistJobData) {
  const result = await musicBrainzService.getArtist(data.mbid, data.includes);

  // Log warning if MBID was redirected (but return raw data for consumers)
  if (hasIdProperty(result) && result.id !== data.mbid) {
    queueLogger.warn({ originalMbid: data.mbid, redirectedMbid: result.id }, 'MBID redirect detected');
  }

  return result;
}

export async function handleLookupRelease(
  data: MusicBrainzLookupReleaseJobData
) {
  const result = await musicBrainzService.getRelease(data.mbid, data.includes);

  // Log warning if MBID was redirected (but return raw data for consumers)
  if (hasIdProperty(result) && result.id !== data.mbid) {
    queueLogger.warn({ originalMbid: data.mbid, redirectedMbid: result.id }, 'MBID redirect detected');
  }

  return result;
}

export async function handleLookupRecording(
  data: MusicBrainzLookupRecordingJobData
) {
  const result = await musicBrainzService.getRecording(
    data.mbid,
    data.includes
  );

  // Log warning if MBID was redirected (but return raw data for consumers)
  if (hasIdProperty(result) && result.id !== data.mbid) {
    queueLogger.warn({ originalMbid: data.mbid, redirectedMbid: result.id }, 'MBID redirect detected');
  }

  return result;
}

export async function handleLookupReleaseGroup(
  data: MusicBrainzLookupReleaseGroupJobData
) {
  const result = await musicBrainzService.getReleaseGroup(
    data.mbid,
    data.includes
  );

  // Log warning if MBID was redirected (but return raw data for consumers)
  if (hasIdProperty(result) && result.id !== data.mbid) {
    queueLogger.warn({ originalMbid: data.mbid, redirectedMbid: result.id }, 'MBID redirect detected');
  }

  return result;
}

export async function handleBrowseReleaseGroupsByArtist(data: {
  artistMbid: string;
  limit?: number;
  offset?: number;
}) {
  // Browse returns a list of release groups, not a single entity by MBID
  // No verification needed here - the artist MBID is the query parameter
  return await musicBrainzService.getArtistReleaseGroups(
    data.artistMbid,
    data.limit || 100,
    data.offset || 0
  );
}

// ============================================================================
// MusicBrainz New Releases Sync Handler
// ============================================================================

/**
 * Handle MusicBrainz new releases sync job
 * Fetches newly released albums using date-based search with genre filtering
 */
export async function handleMusicBrainzSyncNewReleases(
  data: MusicBrainzSyncNewReleasesJobData
): Promise<unknown> {
  // Safety net: skip execution if scheduler was disabled after this job was queued
  if (data.source === 'scheduled') {
    const enabled = await getSchedulerEnabled('musicbrainz');
    if (!enabled) {
      queueLogger.info('Skipping MusicBrainz sync — scheduler disabled (orphaned job)');
      return { success: true, skipped: true, reason: 'scheduler_disabled' };
    }
  }

  queueLogger.info(
    { limit: data.limit || 50, dateRange: data.dateRange, genres: data.genres },
    'Syncing MusicBrainz new releases'
  );

  try {
    // Search for release-groups using the Lucene query
    const searchResult = await musicBrainzService.searchReleaseGroups(
      data.query,
      data.limit || 50,
      0
    );

    queueLogger.info({ count: searchResult.length }, 'Found new releases from MusicBrainz');

    if (searchResult.length === 0) {
      return {
        success: true,
        albumsProcessed: 0,
        artistsProcessed: 0,
        message: 'No new releases found matching criteria',
        query: data.query,
      };
    }

    // Transform MusicBrainz release-groups to our album format
    const albumsToProcess = [];

    for (const releaseGroup of searchResult) {
      try {
        // Extract artist information from artistCredit (camelCase from interface)
        const artistCredit = releaseGroup.artistCredit || [];
        const primaryArtist = artistCredit[0]?.artist;

        if (!primaryArtist) {
          queueLogger.debug({ title: releaseGroup.title }, 'Skipping release group — no artist info');
          continue;
        }

        // Check if album already exists in database
        const existingAlbum = await prisma.album.findFirst({
          where: {
            musicbrainzId: releaseGroup.id,
          },
        });

        if (existingAlbum) {
          queueLogger.debug({ title: releaseGroup.title }, 'Skipping release group — already in database');
          continue;
        }

        albumsToProcess.push({
          releaseGroup,
          artist: primaryArtist,
        });
      } catch (error) {
        queueLogger.error({ releaseGroupId: releaseGroup.id, error: error instanceof Error ? error.message : String(error) }, 'Error processing release-group');
        continue;
      }
    }

    queueLogger.info({ count: albumsToProcess.length }, 'Processing new albums after deduplication');

    let albumsCreated = 0;
    let artistsCreated = 0;
    const errors: string[] = [];

    // Process each album
    for (const { releaseGroup, artist } of albumsToProcess) {
      try {
        // Use shared find-or-create helper (handles dedup, artist associations, enrichment, logging)
        const { findOrCreateAlbum } = await import('@/lib/albums');
        const releaseYear = releaseGroup.firstReleaseDate
          ? parseInt(releaseGroup.firstReleaseDate.split('-')[0])
          : undefined;

        const {
          album,
          created: albumWasCreated,
          artistsCreated: newArtistsCreated,
        } = await findOrCreateAlbum({
          db: prisma,
          identity: {
            title: releaseGroup.title,
            musicbrainzId: releaseGroup.id,
            primaryArtistName: artist.name,
            releaseYear,
          },
          fields: {
            releaseDate: releaseGroup.firstReleaseDate
              ? new Date(releaseGroup.firstReleaseDate)
              : undefined,
            source: 'MUSICBRAINZ',
          },
          artists: [
            {
              name: artist.name,
              musicbrainzId: artist.id,
              role: 'PRIMARY',
              position: 0,
            },
          ],
          enrichment: 'queue-check',
          queueCheckOptions: {
            source: 'browse',
            priority: 'low',
            requestId: `mb_new_release_enrichment_${releaseGroup.id}`,
            parentJobId: data.requestId || 'mb-sync-batch',
          },
          logging: {
            operation: 'album:created:musicbrainz-sync',
            sources: ['MUSICBRAINZ'],
            parentJobId: data.requestId || 'mb-sync-batch',
            rootJobId: data.requestId || 'mb-sync-batch',
            isRootJob: false,
            metadata: {
              syncSource: 'musicbrainz_new_releases',
              syncTimestamp: new Date().toISOString(),
              query: data.query,
              dateRange: data.dateRange,
              genres: data.genres,
            },
          },
          caller: 'musicbrainz-processor',
        });

        if (albumWasCreated) {
          albumsCreated++;
          artistsCreated += newArtistsCreated;
          queueLogger.info({ title: releaseGroup.title, artist: artist.name, newArtists: newArtistsCreated }, 'Created album');
        } else {
          queueLogger.debug({ title: album.title, albumId: album.id }, 'Album already existed');
        }
      } catch (error) {
        const errorMsg = `Failed to process ${releaseGroup.title}: ${error instanceof Error ? error.message : String(error)}`;
        queueLogger.error({ title: releaseGroup.title, error: error instanceof Error ? error.message : String(error) }, 'Failed to process release');
        errors.push(errorMsg);
        continue;
      }
    }

    queueLogger.info({ albumsCreated, artistsCreated }, 'MusicBrainz new releases sync complete');

    return {
      success: true,
      albumsProcessed: albumsCreated,
      artistsProcessed: artistsCreated,
      duplicatesSkipped: searchResult.length - albumsCreated,
      errors,
      source: 'musicbrainz_new_releases',
      musicBrainzData: {
        totalFetched: searchResult.length,
        totalProcessed: albumsToProcess.length,
        query: data.query,
        dateRange: data.dateRange,
        genres: data.genres,
      },
    };
  } catch (error) {
    queueLogger.error({ error: error instanceof Error ? error.message : String(error) }, 'MusicBrainz new releases sync failed');

    return {
      success: false,
      error: {
        type: 'musicbrainz_sync_error',
        message: error instanceof Error ? error.message : String(error),
        retryable: true,
      },
      albumsProcessed: 0,
      artistsProcessed: 0,
      duplicatesSkipped: 0,
      errors: [error instanceof Error ? error.message : String(error)],
    };
  }
}
