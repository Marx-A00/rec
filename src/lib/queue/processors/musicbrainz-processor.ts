// src/lib/queue/processors/musicbrainz-processor.ts
// MusicBrainz API search and lookup handlers

import { prisma } from '@/lib/prisma';

import {
  musicBrainzService,
  verifyMbid,
  hasIdProperty,
} from '../../musicbrainz';
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

  // Verify MBID wasn't redirected
  if (hasIdProperty(result)) {
    return verifyMbid(data.mbid, result);
  }

  return result;
}

export async function handleLookupRelease(
  data: MusicBrainzLookupReleaseJobData
) {
  const result = await musicBrainzService.getRelease(data.mbid, data.includes);

  // Verify MBID wasn't redirected
  if (hasIdProperty(result)) {
    return verifyMbid(data.mbid, result);
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

  // Verify MBID wasn't redirected
  if (hasIdProperty(result)) {
    return verifyMbid(data.mbid, result);
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

  // Verify MBID wasn't redirected
  if (hasIdProperty(result)) {
    return verifyMbid(data.mbid, result);
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
  console.log(
    `🎵 Syncing MusicBrainz new releases (limit: ${data.limit || 50})`
  );
  console.log(
    `   Date range: ${data.dateRange?.from} to ${data.dateRange?.to}`
  );
  console.log(`   Genres: ${data.genres?.join(', ')}`);

  try {
    // Search for release-groups using the Lucene query
    const searchResult = await musicBrainzService.searchReleaseGroups(
      data.query,
      data.limit || 50,
      0
    );

    console.log(
      `📀 Found ${searchResult.length} new releases from MusicBrainz`
    );

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
          console.log(`⚠️  Skipping ${releaseGroup.title} - no artist info`);
          continue;
        }

        // Check if album already exists in database
        const existingAlbum = await prisma.album.findFirst({
          where: {
            musicbrainzId: releaseGroup.id,
          },
        });

        if (existingAlbum) {
          console.log(
            `⏭️  Skipping ${releaseGroup.title} - already in database`
          );
          continue;
        }

        albumsToProcess.push({
          releaseGroup,
          artist: primaryArtist,
        });
      } catch (error) {
        console.error(
          `❌ Error processing release-group ${releaseGroup.id}:`,
          error
        );
        continue;
      }
    }

    console.log(
      `📊 Processing ${albumsToProcess.length} new albums (after deduplication)`
    );

    let albumsCreated = 0;
    let artistsCreated = 0;
    const errors: string[] = [];

    // Process each album
    for (const { releaseGroup, artist } of albumsToProcess) {
      try {
        // Create or get artist
        let dbArtist = await prisma.artist.findFirst({
          where: { musicbrainzId: artist.id },
        });

        if (!dbArtist) {
          dbArtist = await prisma.artist.create({
            data: {
              name: artist.name,
              musicbrainzId: artist.id,
            },
          });
          artistsCreated++;
          console.log(`✨ Created artist: ${artist.name}`);
        }

        // Create album
        const album = await prisma.album.create({
          data: {
            title: releaseGroup.title,
            musicbrainzId: releaseGroup.id,
            releaseDate: releaseGroup.firstReleaseDate
              ? new Date(releaseGroup.firstReleaseDate)
              : null,
            artists: {
              create: {
                artistId: dbArtist.id,
                role: 'primary',
                position: 0,
              },
            },
          },
        });

        albumsCreated++;
        console.log(
          `✨ Created album: ${releaseGroup.title} by ${artist.name}`
        );

        // Queue enrichment job for the new album
        const { getMusicBrainzQueue } = await import('../musicbrainz-queue');
        const { JOB_TYPES } = await import('../jobs');
        const queue = getMusicBrainzQueue();

        await queue.addJob(
          JOB_TYPES.CHECK_ALBUM_ENRICHMENT,
          {
            albumId: album.id,
            source: 'spotify_sync',
            priority: 'low',
            requestId: `mb_new_release_enrichment_${album.id}`,
          },
          {
            priority: 5, // Low priority
            attempts: 3,
            backoff: { type: 'exponential', delay: 5000 },
          }
        );
      } catch (error) {
        const errorMsg = `Failed to process ${releaseGroup.title}: ${error}`;
        console.error(`❌ ${errorMsg}`);
        errors.push(errorMsg);
        continue;
      }
    }

    console.log(`✅ MusicBrainz new releases sync complete`);
    console.log(
      `   Albums created: ${albumsCreated}, Artists created: ${artistsCreated}`
    );

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
    console.error('❌ MusicBrainz new releases sync failed:', error);

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
