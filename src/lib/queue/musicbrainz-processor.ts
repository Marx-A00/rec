// src/lib/queue/musicbrainz-processor.ts
import { Job } from 'bullmq';
import chalk from 'chalk';

import { prisma } from '@/lib/prisma';

import { musicBrainzService } from '../musicbrainz';
import {
  shouldEnrichAlbum,
  shouldEnrichArtist,
  calculateEnrichmentPriority,
  mapSourceToUserAction,
} from '../musicbrainz/enrichment-logic';
import { searchSpotifyArtists } from '../spotify/search';
import { calculateStringSimilarity as fuzzyMatch } from '../utils/string-similarity';
import {
  MusicBrainzRecordingDetail,
  MusicBrainzRelation,
} from '../musicbrainz/schemas';

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
  type CacheAlbumCoverArtJobData,
  type CacheArtistImageJobData,
  type DiscogsSearchArtistJobData,
  type DiscogsGetArtistJobData,
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

  // Minimal processing log - worker handles the main logging

  try {
    let result: any;

    // Handle slow processing for testing Bull Board UI
    const isSlowJob = (job.data as any).slowProcessing;
    if (isSlowJob) {
      const delaySeconds = (job.data as any).delaySeconds || 10;
      const query = (job.data as any).query || 'slow job';
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

    // Route to appropriate MusicBrainz service method
    switch (job.name) {
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
        result = await handleBrowseReleaseGroupsByArtist(job.data as any);
        break;

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

      case JOB_TYPES.ENRICH_ALBUM:
        result = await handleEnrichAlbum(job.data as EnrichAlbumJobData);
        break;

      case JOB_TYPES.ENRICH_ARTIST:
        result = await handleEnrichArtist(job.data as EnrichArtistJobData);
        break;

      case JOB_TYPES.ENRICH_TRACK:
        result = await handleEnrichTrack(job.data as EnrichTrackJobData);
        break;

      case JOB_TYPES.SPOTIFY_SYNC_NEW_RELEASES:
        result = await handleSpotifySyncNewReleases(
          job.data as SpotifySyncNewReleasesJobData
        );
        break;

      case JOB_TYPES.SPOTIFY_SYNC_FEATURED_PLAYLISTS:
        result = await handleSpotifySyncFeaturedPlaylists(
          job.data as SpotifySyncFeaturedPlaylistsJobData
        );
        break;

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
    const jobData = job.data as any;
    let queryInfo = '';

    if (jobData.query) {
      queryInfo = `"${jobData.query}"`;
    } else if (jobData.mbid) {
      // For lookup jobs, try to extract the name from the result
      let entityName = '';
      if (job.name.includes('artist') && result?.name) {
        entityName = result.name;
      } else if (job.name.includes('release') && result?.title) {
        entityName = result.title;
      } else if (job.name.includes('recording') && result?.title) {
        entityName = result.title;
      }

      queryInfo = entityName
        ? `"${entityName}" • MBID: ${jobData.mbid.substring(0, 8)}...`
        : `MBID: ${jobData.mbid.substring(0, 8)}...`;
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

    // Error logging handled by worker

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
  return await musicBrainzService.searchArtists(
    data.query,
    data.limit,
    data.offset
  );
}

async function handleSearchReleases(data: MusicBrainzSearchReleasesJobData) {
  return await musicBrainzService.searchReleaseGroups(
    data.query,
    data.limit,
    data.offset
  );
}

async function handleSearchRecordings(
  data: MusicBrainzSearchRecordingsJobData
) {
  return await musicBrainzService.searchRecordings(
    data.query,
    data.limit,
    data.offset
  );
}

async function handleLookupArtist(data: MusicBrainzLookupArtistJobData) {
  return await musicBrainzService.getArtist(data.mbid, data.includes);
}

async function handleLookupRelease(data: MusicBrainzLookupReleaseJobData) {
  return await musicBrainzService.getRelease(data.mbid, data.includes);
}

async function handleLookupRecording(data: MusicBrainzLookupRecordingJobData) {
  return await musicBrainzService.getRecording(data.mbid, data.includes);
}

async function handleLookupReleaseGroup(
  data: MusicBrainzLookupReleaseGroupJobData
) {
  return await musicBrainzService.getReleaseGroup(data.mbid, data.includes);
}

async function handleBrowseReleaseGroupsByArtist(data: {
  artistMbid: string;
  limit?: number;
  offset?: number;
}) {
  return await musicBrainzService.getArtistReleaseGroups(
    data.artistMbid,
    data.limit || 100,
    data.offset || 0
  );
}

async function handleCheckAlbumEnrichment(data: CheckAlbumEnrichmentJobData) {
  console.log(
    `🔍 Checking if album ${data.albumId} needs enrichment (source: ${data.source})`
  );

  // Get album with current enrichment status (include tracks to check if enrichment needed)
  const album = await prisma.album.findUnique({
    where: { id: data.albumId },
    include: {
      artists: { include: { artist: true } },
      tracks: true, // Include tracks for shouldEnrichAlbum check
    },
  });

  if (!album) {
    console.warn(`Album ${data.albumId} not found for enrichment check`);
    return {
      albumId: data.albumId,
      action: 'skipped',
      reason: 'album_not_found',
    };
  }

  // Check if enrichment is needed using our existing logic
  const needsEnrichment = shouldEnrichAlbum(album);

  if (needsEnrichment) {
    console.log(
      `✅ Album ${data.albumId} needs enrichment, queueing enrichment job`
    );

    // Queue the actual enrichment job
    const queue = await import('./musicbrainz-queue').then(m =>
      m.getMusicBrainzQueue()
    );
    await queue.addJob(
      JOB_TYPES.ENRICH_ALBUM,
      {
        albumId: data.albumId,
        priority: data.priority || 'medium',
        userAction: mapSourceToUserAction(data.source),
        requestId: data.requestId,
      },
      {
        priority: calculateEnrichmentPriority(data.source, data.priority),
        attempts: 3,
      }
    );

    // Also check artists on this album
    for (const albumArtist of album.artists) {
      await queue.addJob(
        JOB_TYPES.CHECK_ARTIST_ENRICHMENT,
        {
          artistId: albumArtist.artist.id,
          source: data.source,
          priority: 'medium', // Artists get medium priority
          requestId: `${data.requestId}-artist-${albumArtist.artist.id}`,
        },
        {
          priority: calculateEnrichmentPriority(data.source, 'medium'),
          attempts: 3,
        }
      );
    }

    return {
      albumId: data.albumId,
      action: 'queued_for_enrichment',
      artistsAlsoQueued: album.artists.length,
      source: data.source,
    };
  } else {
    console.log(`⏭️ Album ${data.albumId} doesn't need enrichment, skipping`);
    return {
      albumId: data.albumId,
      action: 'skipped',
      reason: 'enrichment_not_needed',
      currentDataQuality: album.dataQuality,
      lastEnriched: album.lastEnriched,
      source: data.source,
    };
  }
}

async function handleCheckArtistEnrichment(data: CheckArtistEnrichmentJobData) {
  console.log(
    `🔍 Checking if artist ${data.artistId} needs enrichment (source: ${data.source})`
  );

  // Get artist with current enrichment status
  const artist = await prisma.artist.findUnique({
    where: { id: data.artistId },
  });

  if (!artist) {
    console.warn(`Artist ${data.artistId} not found for enrichment check`);
    return {
      artistId: data.artistId,
      action: 'skipped',
      reason: 'artist_not_found',
    };
  }

  // Check if enrichment is needed using our existing logic
  const needsEnrichment = shouldEnrichArtist(artist);

  if (needsEnrichment) {
    console.log(
      `✅ Artist ${data.artistId} needs enrichment, queueing enrichment job`
    );

    // Queue the actual enrichment job
    const queue = await import('./musicbrainz-queue').then(m =>
      m.getMusicBrainzQueue()
    );
    await queue.addJob(
      JOB_TYPES.ENRICH_ARTIST,
      {
        artistId: data.artistId,
        priority: data.priority || 'medium',
        userAction: mapSourceToUserAction(data.source),
        requestId: data.requestId,
      },
      {
        priority: calculateEnrichmentPriority(data.source, data.priority),
        attempts: 3,
      }
    );

    return {
      artistId: data.artistId,
      action: 'queued_for_enrichment',
      source: data.source,
    };
  } else {
    console.log(`⏭️ Artist ${data.artistId} doesn't need enrichment, skipping`);
    return {
      artistId: data.artistId,
      action: 'skipped',
      reason: 'enrichment_not_needed',
      currentDataQuality: artist.dataQuality,
      lastEnriched: artist.lastEnriched,
      source: data.source,
    };
  }
}

async function handleEnrichAlbum(data: EnrichAlbumJobData) {
  console.log(`🎵 Starting album enrichment for album ${data.albumId}`);

  // Get current album from database
  const album = await prisma.album.findUnique({
    where: { id: data.albumId },
    include: {
      artists: { include: { artist: true } },
      tracks: true, // 🎵 Include tracks for enrichment decision
    },
  });

  if (!album) {
    throw new Error(`Album not found: ${data.albumId}`);
  }

  // Check if enrichment is needed
  const needsEnrichment = shouldEnrichAlbum(album);
  if (!needsEnrichment) {
    console.log(`⏭️ Album ${data.albumId} does not need enrichment, skipping`);
    return {
      albumId: data.albumId,
      action: 'skipped',
      reason: 'enrichment_not_needed',
      currentDataQuality: album.dataQuality,
      lastEnriched: album.lastEnriched,
    };
  }

  // Mark as in progress
  await prisma.album.update({
    where: { id: data.albumId },
    data: { enrichmentStatus: 'IN_PROGRESS' },
  });

  try {
    let enrichmentResult = null;
    let newDataQuality = album.dataQuality || 'LOW';

    // If we have a MusicBrainz ID, fetch detailed data
    if (album.musicbrainzId) {
      try {
        const mbData = await musicBrainzService.getReleaseGroup(
          album.musicbrainzId,
          ['artists', 'releases']
        );
        if (mbData) {
          enrichmentResult = await updateAlbumFromMusicBrainz(album, mbData);
          newDataQuality = 'HIGH';

          // 🎵 FETCH TRACKS for albums that already have MusicBrainz IDs
          if (mbData.releases && mbData.releases.length > 0) {
            try {
              const primaryRelease = mbData.releases[0];
              console.log(
                `🎵 Fetching tracks for existing MB album: ${primaryRelease.title}`
              );

              const releaseWithTracks = await musicBrainzService.getRelease(
                primaryRelease.id,
                [
                  'recordings', // Get all track data
                  'artist-credits', // Track-level artist info
                  'isrcs', // Track ISRCs
                  'url-rels', // Track URLs (YouTube, etc.)
                ]
              );

              if (releaseWithTracks?.media) {
                const totalTracks = releaseWithTracks.media.reduce(
                  (sum: number, medium: any) =>
                    sum + (medium.tracks?.length || 0),
                  0
                );
                console.log(
                  `✅ Fetched ${totalTracks} tracks for existing album "${album.title}"!`
                );

                // 🚀 PROCESS TRACKS for existing albums too!
                await processMusicBrainzTracksForAlbum(
                  album.id,
                  releaseWithTracks
                );
              }
            } catch (error) {
              console.warn(
                `⚠️ Failed to fetch tracks for existing album "${album.title}":`,
                error
              );
            }
          }
        }
      } catch (mbError) {
        console.warn(
          `MusicBrainz lookup failed for album ${data.albumId}:`,
          mbError
        );
      }
    }

    // If no MusicBrainz ID or lookup failed, try searching
    if (!enrichmentResult && album.title) {
      try {
        const searchQuery = buildAlbumSearchQuery(album);
        const searchResults = await musicBrainzService.searchReleaseGroups(
          searchQuery,
          5
        );

        if (searchResults && searchResults.length > 0) {
          // Debug logging for search results
          console.log(
            `🔍 Found ${searchResults.length} search results for "${album.title}"`
          );
          console.log(
            `📊 First result: "${searchResults[0].title}" by ${searchResults[0].artistCredit?.map(ac => ac.name).join(', ')} (score: ${searchResults[0].score})`
          );

          // Find best match based on title and artist similarity
          const bestMatch = findBestAlbumMatch(album, searchResults);
          console.log(
            `🎯 Best match: ${
              bestMatch
                ? `"${bestMatch.result.title}" - Combined: ${(bestMatch.score * 100).toFixed(1)}% (MB: ${bestMatch.mbScore}, Jaccard: ${(bestMatch.jaccardScore * 100).toFixed(1)}%)`
                : 'None found'
            }`
          );

          if (bestMatch && bestMatch.score > 0.8) {
            // 80% threshold for combined score
            const mbData = await musicBrainzService.getReleaseGroup(
              bestMatch.result.id,
              ['artists', 'tags', 'releases']
            );
            if (mbData) {
              enrichmentResult = await updateAlbumFromMusicBrainz(
                album,
                mbData
              );
              newDataQuality = bestMatch.score > 0.9 ? 'HIGH' : 'MEDIUM';

              // 🚀 OPTIMIZATION: Fetch tracks for this album efficiently
              if (mbData.releases && mbData.releases.length > 0) {
                try {
                  // Get the first release (main edition) with all tracks
                  const primaryRelease = mbData.releases[0];
                  console.log(
                    `🎵 Fetching tracks for release: ${primaryRelease.title}`
                  );

                  const releaseWithTracks = await musicBrainzService.getRelease(
                    primaryRelease.id,
                    [
                      'recordings', // Get all track data
                      'artist-credits', // Track-level artist info
                      'isrcs', // Track ISRCs
                      'url-rels', // Track URLs (YouTube, etc.)
                    ]
                  );

                  if (releaseWithTracks?.media) {
                    const totalTracks = releaseWithTracks.media.reduce(
                      (sum: number, medium: any) =>
                        sum + (medium.tracks?.length || 0),
                      0
                    );
                    console.log(
                      `✅ Fetched ${totalTracks} tracks for "${album.title}" in one API call!`
                    );

                    // 🚀 BULK PROCESS TRACKS - Much more efficient!
                    await processMusicBrainzTracksForAlbum(
                      album.id,
                      releaseWithTracks
                    );
                  }
                } catch (error) {
                  console.warn(
                    `⚠️ Failed to fetch tracks for album "${album.title}":`,
                    error
                  );
                }
              }
            }
          }
        }
      } catch (searchError) {
        console.warn(
          `MusicBrainz search failed for album ${data.albumId}:`,
          searchError
        );
      }
    }

    // Update enrichment status
    await prisma.album.update({
      where: { id: data.albumId },
      data: {
        enrichmentStatus: 'COMPLETED',
        dataQuality: newDataQuality,
        lastEnriched: new Date(),
      },
    });

    console.log(`✅ Album enrichment completed for ${data.albumId}`, {
      hadResult: !!enrichmentResult,
      dataQuality: newDataQuality,
    });

    return {
      albumId: data.albumId,
      action: 'enriched',
      dataQuality: newDataQuality,
      hadMusicBrainzData: !!enrichmentResult,
      enrichmentTimestamp: new Date(),
    };
  } catch (error) {
    // Mark as failed
    await prisma.album.update({
      where: { id: data.albumId },
      data: { enrichmentStatus: 'FAILED' },
    });
    throw error;
  }
}

async function handleEnrichArtist(data: EnrichArtistJobData) {
  console.log(`🎤 Starting artist enrichment for artist ${data.artistId}`);

  // Get current artist from database
  const artist = await prisma.artist.findUnique({
    where: { id: data.artistId },
  });

  if (!artist) {
    throw new Error(`Artist not found: ${data.artistId}`);
  }

  // Check if enrichment is needed
  const needsEnrichment = shouldEnrichArtist(artist);
  if (!needsEnrichment) {
    console.log(
      `⏭️ Artist ${data.artistId} does not need enrichment, skipping`
    );
    return {
      artistId: data.artistId,
      action: 'skipped',
      reason: 'enrichment_not_needed',
      currentDataQuality: artist.dataQuality,
      lastEnriched: artist.lastEnriched,
    };
  }

  // Mark as in progress
  await prisma.artist.update({
    where: { id: data.artistId },
    data: { enrichmentStatus: 'IN_PROGRESS' },
  });

  try {
    let enrichmentResult = null;
    let newDataQuality = artist.dataQuality || 'LOW';

    // If we have a MusicBrainz ID, fetch detailed data
    if (artist.musicbrainzId) {
      try {
        const mbData = await musicBrainzService.getArtist(
          artist.musicbrainzId,
          ['url-rels', 'tags']
        );
        if (mbData) {
          enrichmentResult = await enrichArtistMetadata(artist, mbData);
          newDataQuality = 'HIGH';
        }
      } catch (mbError) {
        console.warn(
          `MusicBrainz lookup failed for artist ${data.artistId}:`,
          mbError
        );
      }
    }

    // If no MusicBrainz ID or lookup failed, try searching
    if (!enrichmentResult && artist.name) {
      try {
        const searchResults = await musicBrainzService.searchArtists(
          artist.name,
          5
        );

        if (searchResults && searchResults.length > 0) {
          console.log(
            `🔍 Found ${searchResults.length} artist search results for "${artist.name}"`
          );
          console.log(
            `📊 First result: "${searchResults[0].name}" (score: ${searchResults[0].score})`
          );

          // Find best match based on name similarity
          const bestMatch = findBestArtistMatch(artist, searchResults);
          console.log(
            `🎯 Best artist match: ${
              bestMatch
                ? `"${bestMatch.result.name}" - Combined: ${(bestMatch.score * 100).toFixed(1)}% (MB: ${bestMatch.mbScore}, Jaccard: ${(bestMatch.jaccardScore * 100).toFixed(1)}%)`
                : 'None found'
            }`
          );

          if (bestMatch && bestMatch.score > 0.8) {
            const mbData = await musicBrainzService.getArtist(
              bestMatch.result.id,
              ['url-rels', 'tags']
            );
            if (mbData) {
              enrichmentResult = await enrichArtistMetadata(artist, mbData);
              newDataQuality = bestMatch.score > 0.9 ? 'HIGH' : 'MEDIUM';
            }
          }
        }
      } catch (searchError) {
        console.warn(
          `MusicBrainz search failed for artist ${data.artistId}:`,
          searchError
        );
      }
    }

    // Queue Discogs search as fallback if no Discogs ID and no image yet
    if (!enrichmentResult && !artist.discogsId && !artist.imageUrl) {
      console.log(
        `🔍 No Discogs ID found for "${artist.name}", queueing Discogs search as fallback`
      );
      try {
        const queue = await import('./musicbrainz-queue').then(m =>
          m.getMusicBrainzQueue()
        );
        await queue.addJob(
          JOB_TYPES.DISCOGS_SEARCH_ARTIST,
          {
            artistId: artist.id,
            artistName: artist.name,
            requestId: `${data.requestId}-discogs-search`,
          },
          {
            priority: 7, // Low priority for fallback searches
            attempts: 2, // Fewer retries for searches
            backoff: { type: 'exponential', delay: 3000 },
          }
        );
        console.log(`📤 Queued Discogs search for "${artist.name}"`);
      } catch (searchError) {
        console.warn(
          `Failed to queue Discogs search for artist ${artist.id}:`,
          searchError
        );
      }
    }

    // Update enrichment status
    await prisma.artist.update({
      where: { id: data.artistId },
      data: {
        enrichmentStatus: 'COMPLETED',
        dataQuality: newDataQuality,
        lastEnriched: new Date(),
      },
    });

    console.log(`✅ Artist enrichment completed for ${data.artistId}`, {
      hadResult: !!enrichmentResult,
      dataQuality: newDataQuality,
    });

    // Queue artist image caching to Cloudflare (non-blocking)
    // Only queue if artist now has an imageUrl after enrichment
    const enrichedArtist = await prisma.artist.findUnique({
      where: { id: data.artistId },
      select: { imageUrl: true, cloudflareImageId: true },
    });

    if (enrichedArtist?.imageUrl && !enrichedArtist.cloudflareImageId) {
      try {
        const queue = await import('./musicbrainz-queue').then(m =>
          m.getMusicBrainzQueue()
        );
        const cacheJobData: CacheArtistImageJobData = {
          artistId: data.artistId,
          requestId: `enrich-cache-artist-${data.artistId}`,
        };

        await queue.addJob(JOB_TYPES.CACHE_ARTIST_IMAGE, cacheJobData, {
          priority: 5, // Medium priority
          attempts: 3,
          backoff: { type: 'exponential', delay: 2000 },
        });

        console.log(`📤 Queued artist image caching for ${data.artistId}`);
      } catch (cacheError) {
        // Don't fail enrichment if caching queue fails
        console.warn(
          `Failed to queue artist image caching for ${data.artistId}:`,
          cacheError
        );
      }
    }

    return {
      artistId: data.artistId,
      action: 'enriched',
      dataQuality: newDataQuality,
      hadMusicBrainzData: !!enrichmentResult,
      enrichmentTimestamp: new Date(),
    };
  } catch (error) {
    // Mark as failed
    await prisma.artist.update({
      where: { id: data.artistId },
      data: { enrichmentStatus: 'FAILED' },
    });
    throw error;
  }
}

// ============================================================================
// Enrichment Helper Functions
// ============================================================================

function buildAlbumSearchQuery(album: any): string {
  // Use releasegroup field for release group searches
  let query = `releasegroup:"${album.title}"`;

  if (album.artists && album.artists.length > 0) {
    // Add primary artist to search
    const primaryArtist =
      album.artists.find((a: any) => a.role === 'primary') || album.artists[0];
    if (primaryArtist?.artist?.name) {
      query += ` AND artist:"${primaryArtist.artist.name}"`;
    }
  }

  // Add type filter based on the actual release type
  const releaseType = album.releaseType?.toLowerCase() || 'album';
  query += ` AND type:${releaseType}`;

  // Add status filter to only include official releases
  query += ` AND status:official`;

  return query;
}

function findBestAlbumMatch(
  album: any,
  searchResults: any[]
): {
  result: any;
  score: number;
  mbScore: number;
  jaccardScore: number;
} | null {
  let bestMatch = null;
  let bestScore = 0;

  for (const result of searchResults) {
    // Get MusicBrainz's confidence score (0-100)
    const mbScore = result.score || 0;

    // Calculate our Jaccard similarity score (0-1)
    let jaccardScore = 0;

    // Title similarity (most important)
    if (result.title && album.title) {
      jaccardScore +=
        calculateStringSimilarity(
          result.title.toLowerCase(),
          album.title.toLowerCase()
        ) * 0.6;
    }

    // Artist similarity
    if (result.artistCredit && album.artists && album.artists.length > 0) {
      const resultArtists = result.artistCredit.map(
        (ac: any) => ac.name?.toLowerCase() || ''
      );
      const albumArtists = album.artists.map(
        (a: any) => a.artist?.name?.toLowerCase() || ''
      );

      let artistScore = 0;
      for (const albumArtist of albumArtists) {
        for (const resultArtist of resultArtists) {
          artistScore = Math.max(
            artistScore,
            calculateStringSimilarity(albumArtist, resultArtist)
          );
        }
      }
      jaccardScore += artistScore * 0.4;
    }

    // Hybrid scoring: Combine MusicBrainz score with our Jaccard similarity
    // MB score (0-100) normalized to 0-1, weighted 70%
    // Jaccard score (0-1) weighted 30%
    const combinedScore = (mbScore / 100) * 0.7 + jaccardScore * 0.3;

    if (combinedScore > bestScore) {
      bestScore = combinedScore;
      bestMatch = {
        result,
        score: combinedScore,
        mbScore: mbScore,
        jaccardScore: jaccardScore,
      };
    }
  }

  return bestMatch;
}

function findBestArtistMatch(
  artist: any,
  searchResults: any[]
): {
  result: any;
  score: number;
  mbScore: number;
  jaccardScore: number;
} | null {
  let bestMatch = null;
  let bestScore = 0;

  for (const result of searchResults) {
    // Get MusicBrainz's confidence score (0-100)
    const mbScore = result.score || 0;

    // Calculate our Jaccard similarity score (0-1)
    let jaccardScore = 0;

    // Name similarity
    if (result.name && artist.name) {
      jaccardScore = calculateStringSimilarity(
        result.name.toLowerCase(),
        artist.name.toLowerCase()
      );
    }

    // Hybrid scoring: Combine MusicBrainz score with our Jaccard similarity
    // MB score (0-100) normalized to 0-1, weighted 70%
    // Jaccard score (0-1) weighted 30%
    const combinedScore = (mbScore / 100) * 0.7 + jaccardScore * 0.3;

    if (combinedScore > bestScore) {
      bestScore = combinedScore;
      bestMatch = {
        result,
        score: combinedScore,
        mbScore: mbScore,
        jaccardScore: jaccardScore,
      };
    }
  }

  return bestMatch;
}

// Use fuzzy matching instead of Jaccard similarity - better for typos and variations
const calculateStringSimilarity = fuzzyMatch;

async function updateAlbumFromMusicBrainz(
  album: any,
  mbData: any
): Promise<any> {
  const updateData: any = {};

  if (mbData.id && !album.musicbrainzId) {
    updateData.musicbrainzId = mbData.id;
  }

  if (mbData.title && mbData.title !== album.title) {
    updateData.title = mbData.title;
  }

  if (mbData['first-release-date'] && !album.releaseDate) {
    try {
      updateData.releaseDate = new Date(mbData['first-release-date']);
    } catch (e) {
      console.warn(
        'Invalid release date from MusicBrainz:',
        mbData['first-release-date']
      );
    }
  }

  if (mbData['primary-type'] && !album.releaseType) {
    updateData.releaseType = mbData['primary-type'];
  }

  // Extract genre tags from MusicBrainz
  if (mbData.tags && mbData.tags.length > 0) {
    // Get top 5 genre tags, sorted by count (popularity)
    const genres = mbData.tags
      .sort((a: any, b: any) => (b.count || 0) - (a.count || 0))
      .slice(0, 5)
      .map((tag: any) => tag.name);
    updateData.genres = genres;
  }

  // Extract secondary types (live, compilation, etc.)
  if (mbData['secondary-types'] && mbData['secondary-types'].length > 0) {
    updateData.secondaryTypes = mbData['secondary-types'];
  } else {
    updateData.secondaryTypes = []; // Ensure empty array if no secondary types
  }

  // Extract release status (official, promotion, bootleg, etc.)
  if (mbData.status) {
    updateData.releaseStatus = mbData.status;
  }

  // Extract release country from releases
  if (mbData.releases && mbData.releases.length > 0) {
    // Get country from the first release that has one
    const releaseWithCountry = mbData.releases.find(
      (release: any) => release.country
    );
    if (releaseWithCountry?.country) {
      updateData.releaseCountry = releaseWithCountry.country;
    }
  }

  if (Object.keys(updateData).length > 0) {
    // Check if another album already has this MusicBrainz ID before updating
    if (updateData.musicbrainzId) {
      const existingAlbum = await prisma.album.findUnique({
        where: { musicbrainzId: updateData.musicbrainzId },
      });

      if (existingAlbum && existingAlbum.id !== album.id) {
        console.log(
          `⚠️ Duplicate MusicBrainz ID detected: Album ${album.id} ("${album.title}") would get MusicBrainz ID ${updateData.musicbrainzId}, but it's already used by album ${existingAlbum.id} ("${existingAlbum.title}")`
        );
        console.log(
          `   → Skipping MusicBrainz ID update to avoid constraint violation`
        );
        console.log(
          `   → Consider implementing album merging logic for true deduplication`
        );

        // Remove musicbrainzId from update to avoid constraint error
        delete updateData.musicbrainzId;

        // If we removed the only update field, skip the entire update
        if (Object.keys(updateData).length === 0) {
          console.log(
            `   → No other fields to update, skipping database update`
          );
          return null;
        }
      }
    }

    // Proceed with the update (without conflicting musicbrainzId if removed)
    await prisma.album.update({
      where: { id: album.id },
      data: updateData,
    });
    return updateData;
  }

  return null;
}

async function enrichArtistMetadata(artist: any, mbData: any): Promise<any> {
  const updateData: any = {};

  if (mbData.id && !artist.musicbrainzId) {
    updateData.musicbrainzId = mbData.id;
  }

  if (mbData.name && mbData.name !== artist.name) {
    updateData.name = mbData.name;
  }

  if (mbData['life-span']?.begin && !artist.formedYear) {
    try {
      updateData.formedYear = parseInt(
        mbData['life-span'].begin.substring(0, 4)
      );
    } catch (e) {
      console.warn(
        'Invalid formed year from MusicBrainz:',
        mbData['life-span']?.begin
      );
    }
  }

  if (mbData.area?.iso && !artist.countryCode) {
    updateData.countryCode = mbData.area.iso.substring(0, 2);
  }

  // Extract full area name (country/region)
  if (mbData.area?.name) {
    updateData.area = mbData.area.name;
  }

  // Extract artist type (Group, Person, etc.)
  if (mbData.type) {
    updateData.artistType = mbData.type;
  }

  // Extract genre tags from MusicBrainz
  if (mbData.tags && mbData.tags.length > 0) {
    // Get top 5 genre tags, sorted by count (popularity)
    const genres = mbData.tags
      .sort((a: any, b: any) => (b.count || 0) - (a.count || 0))
      .slice(0, 5)
      .map((tag: any) => tag.name);
    updateData.genres = genres;
  }

  // Extract Discogs ID from MusicBrainz relations
  if (mbData.relations && !artist.discogsId) {
    const discogsRel = mbData.relations.find(
      (rel: any) => rel.type === 'discogs'
    );
    if (discogsRel?.url?.resource) {
      // Extract ID from URL like "https://www.discogs.com/artist/125246"
      const discogsMatch = discogsRel.url.resource.match(/\/artist\/(\d+)/);
      if (discogsMatch) {
        updateData.discogsId = discogsMatch[1];
        console.log(
          `🔗 Found Discogs ID ${discogsMatch[1]} for "${artist.name}"`
        );
      }
    }
  }

  // Enrich artist image
  // Priority: Spotify > Discogs > Wikimedia Commons
  let imageUrl: string | undefined;

  // 1. Try Spotify first (best quality + most reliable)
  try {
    const spotifyResults = await searchSpotifyArtists(artist.name);

    if (spotifyResults.length > 0) {
      // Find best match using multi-factor scoring
      let bestMatch = null;
      let bestScore = 0;

      for (const result of spotifyResults) {
        // Name similarity (60% weight)
        const nameScore = calculateStringSimilarity(
          artist.name.toLowerCase(),
          result.name.toLowerCase()
        );

        // Genre overlap (30% weight) - Jaccard similarity of genre sets
        let genreScore = 0;
        if (
          artist.genres?.length > 0 &&
          result.genres &&
          result.genres.length > 0
        ) {
          const artistGenres = new Set(
            (artist.genres as string[]).map((g: string) => g.toLowerCase())
          );
          const spotifyGenres = new Set(
            (result.genres as string[]).map((g: string) => g.toLowerCase())
          );
          const intersection = new Set(
            [...artistGenres].filter(g => spotifyGenres.has(g))
          );
          const union = new Set([...artistGenres, ...spotifyGenres]);
          genreScore = intersection.size / union.size;
        }

        // Popularity boost (10% weight) - normalized 0-1
        const popularityBoost = (result.popularity || 0) / 100;

        // Combined score
        const combinedScore =
          nameScore * 0.6 + genreScore * 0.3 + popularityBoost * 0.1;

        // Accept if:
        // 1. Combined score >= 80%, OR
        // 2. Exact name match (100%) with any popularity
        const isAcceptable =
          combinedScore >= 0.8 || (nameScore === 1.0 && combinedScore >= 0.6);

        if (isAcceptable && combinedScore > bestScore) {
          bestScore = combinedScore;
          bestMatch = { result, nameScore, genreScore, popularityBoost };
        }
      }

      if (bestMatch?.result.imageUrl) {
        imageUrl = bestMatch.result.imageUrl;
        const matchType =
          bestMatch.nameScore === 1.0
            ? 'exact name match'
            : 'multi-factor match';
        console.log(
          `📸 Got artist image from Spotify for "${artist.name}" ` +
            `(${matchType}: ${(bestScore * 100).toFixed(1)}% - ` +
            `name: ${(bestMatch.nameScore * 100).toFixed(0)}%, ` +
            `genre: ${(bestMatch.genreScore * 100).toFixed(0)}%, ` +
            `popularity: ${(bestMatch.popularityBoost * 100).toFixed(0)}%)`
        );
      } else if (spotifyResults.length > 0) {
        console.log(
          `⚠️ Spotify returned ${spotifyResults.length} results for "${artist.name}" ` +
            `but no match met threshold (need 80% combined or 100% name match)`
        );
      }
    }
  } catch (error) {
    console.warn(
      `Failed to fetch Spotify image for artist ${artist.id}:`,
      error
    );
  }

  // 2. Try Discogs (only if no Spotify image)
  // Use the discogsId we just extracted from MB relations, or existing discogsId
  const discogsId = updateData.discogsId || artist.discogsId;
  const hasDiscogsImage = artist.imageUrl?.includes('discogs.com');

  if (!imageUrl && discogsId && !hasDiscogsImage) {
    // Fetch Discogs image if we have ID and don't already have a Discogs image
    try {
      const { unifiedArtistService } = await import(
        '@/lib/api/unified-artist-service'
      );
      const discogsArtist = await unifiedArtistService.getArtistDetails(
        discogsId,
        { source: 'discogs', skipLocalCache: true }
      );
      if (discogsArtist.imageUrl) {
        imageUrl = discogsArtist.imageUrl;
        console.log(
          `📸 Got artist image from Discogs for "${artist.name}" ${artist.imageUrl ? '(upgrading from Wikimedia)' : ''}`
        );
      }
    } catch (error) {
      console.warn(
        `Failed to fetch Discogs image for artist ${artist.id}:`,
        error
      );
    }
  }

  // 3. Fallback to Wikimedia Commons (via Wikidata) - only if no Spotify or Discogs
  if (!imageUrl && !artist.imageUrl && mbData.relations) {
    try {
      // Extract Wikidata QID from MusicBrainz relations
      const wikidataRel = mbData.relations.find(
        (rel: any) => rel.type === 'wikidata'
      );
      if (wikidataRel?.url?.resource) {
        const qidMatch = wikidataRel.url.resource.match(/\/wiki\/(Q\d+)/);
        if (qidMatch) {
          const qid = qidMatch[1];
          // Fetch Wikimedia image filename from Wikidata P18 property
          const wikidataUrl = `https://www.wikidata.org/w/api.php?action=wbgetentities&ids=${qid}&props=claims&format=json&origin=*`;
          const response = await fetch(wikidataUrl);
          const data = await response.json();
          const filename =
            data?.entities?.[qid]?.claims?.P18?.[0]?.mainsnak?.datavalue?.value;

          if (filename) {
            const encoded = encodeURIComponent(filename);
            imageUrl = `https://commons.wikimedia.org/wiki/Special:FilePath/${encoded}?width=600`;
            console.log(
              `📸 Got artist image from Wikimedia Commons for "${artist.name}"`
            );
          }
        }
      }
    } catch (error) {
      console.warn(
        `Failed to fetch Wikimedia image for artist ${artist.id}:`,
        error
      );
    }
  }

  if (imageUrl) {
    updateData.imageUrl = imageUrl;
  }

  if (Object.keys(updateData).length > 0) {
    // Check if another artist already has this MusicBrainz ID before updating
    if (updateData.musicbrainzId) {
      const existingArtist = await prisma.artist.findUnique({
        where: { musicbrainzId: updateData.musicbrainzId },
      });

      if (existingArtist && existingArtist.id !== artist.id) {
        console.log(
          `⚠️ Duplicate MusicBrainz ID detected: Artist ${artist.id} ("${artist.name}") would get MusicBrainz ID ${updateData.musicbrainzId}, but it's already used by artist ${existingArtist.id} ("${existingArtist.name}")`
        );
        console.log(
          `   → Skipping MusicBrainz ID update to avoid constraint violation`
        );
        console.log(
          `   → Consider implementing artist merging logic for true deduplication`
        );

        // Remove musicbrainzId from update to avoid constraint error
        delete updateData.musicbrainzId;

        // If we removed the only update field, skip the entire update
        if (Object.keys(updateData).length === 0) {
          console.log(
            `   → No other fields to update, skipping database update`
          );
          return null;
        }
      }
    }

    // Proceed with the update (without conflicting musicbrainzId if removed)
    await prisma.artist.update({
      where: { id: artist.id },
      data: updateData,
    });
    return updateData;
  }

  return null;
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
  if (
    message.includes('network') ||
    message.includes('timeout') ||
    message.includes('econnreset') ||
    message.includes('enotfound')
  ) {
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

// ============================================================================
// Spotify Sync Job Handlers
// ============================================================================

/**
 * Handle Spotify new releases sync job
 * Fetches fresh data from Spotify API and processes through our mappers
 */
async function handleSpotifySyncNewReleases(
  data: SpotifySyncNewReleasesJobData
): Promise<any> {
  console.log(
    `🎵 Syncing Spotify new releases (limit: ${data.limit || 20}, country: ${data.country || 'US'})`
  );

  try {
    // Import Spotify client, mappers, and error handling
    const { SpotifyApi } = await import('@spotify/web-api-ts-sdk');
    const { processSpotifyAlbums } = await import('../spotify/mappers');
    const { withSpotifyRetry, withSpotifyMetrics } = await import(
      '../spotify/error-handling'
    );

    // Initialize Spotify client with retry wrapper
    const createSpotifyClient = () =>
      SpotifyApi.withClientCredentials(
        process.env.SPOTIFY_CLIENT_ID!,
        process.env.SPOTIFY_CLIENT_SECRET!
      );

    // Fetch new releases with retry logic and metrics
    const newReleases = await withSpotifyMetrics(
      () =>
        withSpotifyRetry(async () => {
          const spotifyClient = createSpotifyClient();
          return await spotifyClient.browse.getNewReleases(
            (data.country || 'US') as any,
            (data.limit || 20) as any
          );
        }, 'Spotify getNewReleases API call'),
      'Spotify New Releases Sync'
    );

    console.log(
      `📀 Fetched ${newReleases.albums.items.length} new releases from Spotify`
    );

    // Transform Spotify data to our format
    const spotifyAlbums = newReleases.albums.items.map(album => ({
      id: album.id,
      name: album.name,
      artists: album.artists.map(a => a.name).join(', '),
      artistIds: album.artists.map(a => a.id),
      releaseDate: album.release_date,
      image: album.images[0]?.url || null,
      spotifyUrl: album.external_urls.spotify,
      type: album.album_type,
      totalTracks: album.total_tracks,
    }));

    // Process through our mappers (creates DB records + queues enrichment)
    const result = await processSpotifyAlbums(
      spotifyAlbums,
      data.source || 'spotify_sync'
    );

    console.log(`✅ Spotify new releases sync complete:`, result.stats);

    return {
      success: true,
      albumsProcessed: result.stats.albumsProcessed,
      artistsProcessed: result.stats.artistsProcessed,
      duplicatesSkipped: result.stats.duplicatesSkipped,
      errors: result.stats.errors,
      source: 'spotify_new_releases',
      spotifyData: {
        totalFetched: newReleases.albums.items.length,
        country: data.country || 'US',
        limit: data.limit || 20,
      },
    };
  } catch (error) {
    console.error('❌ Spotify new releases sync failed:', error);

    // Import error handling to get better error info
    const { analyzeSpotifyError } = await import('../spotify/error-handling');
    const errorInfo = analyzeSpotifyError(error);

    // Return structured error response
    return {
      success: false,
      error: {
        type: errorInfo.type,
        message: errorInfo.message,
        retryable: errorInfo.retryable,
        statusCode: errorInfo.statusCode,
      },
      albumsProcessed: 0,
      artistsProcessed: 0,
      duplicatesSkipped: 0,
      errors: [errorInfo.message],
    };
  }
}

/**
 * Handle Spotify featured playlists sync job
 * Fetches playlists and extracts albums from tracks
 */
async function handleSpotifySyncFeaturedPlaylists(
  data: SpotifySyncFeaturedPlaylistsJobData
): Promise<any> {
  console.log(
    `🎵 Syncing Spotify featured playlists (limit: ${data.limit || 10}, country: ${data.country || 'US'})`
  );

  try {
    // Import Spotify client, mappers, and error handling
    const { SpotifyApi } = await import('@spotify/web-api-ts-sdk');
    const { processSpotifyAlbums } = await import('../spotify/mappers');
    const { withSpotifyRetry, withSpotifyMetrics } = await import(
      '../spotify/error-handling'
    );

    // Initialize Spotify client with retry wrapper
    const createSpotifyClient = () =>
      SpotifyApi.withClientCredentials(
        process.env.SPOTIFY_CLIENT_ID!,
        process.env.SPOTIFY_CLIENT_SECRET!
      );

    // Fetch featured playlists with retry logic and metrics
    const featured = await withSpotifyMetrics(
      () =>
        withSpotifyRetry(async () => {
          const spotifyClient = createSpotifyClient();
          return await spotifyClient.browse.getFeaturedPlaylists(
            (data.country || 'US') as any,
            (data.limit || 10) as any
          );
        }, 'Spotify getFeaturedPlaylists API call'),
      'Spotify Featured Playlists Sync'
    );

    console.log(
      `📋 Fetched ${featured.playlists.items.length} featured playlists from Spotify`
    );

    if (!data.extractAlbums) {
      // Just return playlist info without processing albums
      return {
        success: true,
        playlistsProcessed: featured.playlists.items.length,
        albumsProcessed: 0,
        message: 'Playlists fetched but album extraction was disabled',
      };
    }

    // Extract albums from playlist tracks
    const albumsMap = new Map<string, any>(); // Deduplicate albums by Spotify ID
    let totalTracks = 0;

    for (const playlist of featured.playlists.items) {
      try {
        console.log(`🎧 Processing playlist: "${playlist.name}"`);

        // Get playlist tracks (limit to first 50 tracks per playlist)
        const playlistClient = createSpotifyClient();
        const tracks = await playlistClient.playlists.getPlaylistItems(
          playlist.id,
          (data.country || 'US') as any,
          undefined,
          50, // limit
          0 // offset
        );

        totalTracks += tracks.items.length;

        // Extract unique albums from tracks
        for (const item of tracks.items) {
          if (item.track && item.track.type === 'track' && item.track.album) {
            const album = item.track.album;

            // Skip if we already have this album
            if (albumsMap.has(album.id)) continue;

            albumsMap.set(album.id, {
              id: album.id,
              name: album.name,
              artists: album.artists.map((a: any) => a.name).join(', '),
              artistIds: album.artists.map((a: any) => a.id),
              releaseDate: album.release_date,
              image: album.images[0]?.url || null,
              spotifyUrl: album.external_urls.spotify,
              type: album.album_type,
              totalTracks: album.total_tracks,
            });
          }
        }
      } catch (error) {
        console.error(
          `❌ Failed to process playlist "${playlist.name}":`,
          error
        );
        // Continue with other playlists
      }
    }

    const uniqueAlbums = Array.from(albumsMap.values());
    console.log(
      `📀 Extracted ${uniqueAlbums.length} unique albums from ${totalTracks} tracks`
    );

    if (uniqueAlbums.length === 0) {
      return {
        success: true,
        playlistsProcessed: featured.playlists.items.length,
        albumsProcessed: 0,
        message: 'No albums found in playlist tracks',
      };
    }

    // Process through our mappers
    const result = await processSpotifyAlbums(
      uniqueAlbums,
      data.source || 'spotify_playlists'
    );

    console.log(`✅ Spotify featured playlists sync complete:`, result.stats);

    return {
      success: true,
      playlistsProcessed: featured.playlists.items.length,
      albumsProcessed: result.stats.albumsProcessed,
      artistsProcessed: result.stats.artistsProcessed,
      duplicatesSkipped: result.stats.duplicatesSkipped,
      errors: result.stats.errors,
      source: 'spotify_featured_playlists',
      spotifyData: {
        totalPlaylists: featured.playlists.items.length,
        totalTracks: totalTracks,
        uniqueAlbums: uniqueAlbums.length,
        country: data.country || 'US',
        limit: data.limit || 10,
      },
    };
  } catch (error) {
    console.error('❌ Spotify featured playlists sync failed:', error);

    // Import error handling to get better error info
    const { analyzeSpotifyError } = await import('../spotify/error-handling');
    const errorInfo = analyzeSpotifyError(error);

    // Return structured error response
    return {
      success: false,
      error: {
        type: errorInfo.type,
        message: errorInfo.message,
        retryable: errorInfo.retryable,
        statusCode: errorInfo.statusCode,
      },
      playlistsProcessed: 0,
      albumsProcessed: 0,
      artistsProcessed: 0,
      duplicatesSkipped: 0,
      errors: [errorInfo.message],
    };
  }
}

// ============================================================================
// Track Enrichment Handlers
// ============================================================================

/**
 * Check if a track needs enrichment and queue enrichment job if needed
 */
async function handleCheckTrackEnrichment(data: CheckTrackEnrichmentJobData) {
  console.log(
    `🔍 Checking if track ${data.trackId} needs enrichment (source: ${data.source})`
  );

  // Get track with current enrichment status
  const track = await (prisma.track as any).findUnique({
    where: { id: data.trackId },
    select: {
      id: true,
      title: true,
      musicbrainzId: true,
      lastEnriched: true,
    },
  });

  if (!track) {
    console.error(`❌ Track ${data.trackId} not found`);
    return {
      success: false,
      error: {
        message: `Track ${data.trackId} not found`,
        code: 'TRACK_NOT_FOUND',
        retryable: false,
      },
      metadata: {
        duration: 0,
        timestamp: new Date().toISOString(),
        requestId: data.requestId,
      },
    };
  }

  // For now, enrich if no MusicBrainz ID
  const needsEnrichment = !track.musicbrainzId;

  if (!needsEnrichment) {
    console.log(`✅ Track "${track.title}" already enriched`);
    return {
      success: true,
      data: {
        trackId: track.id,
        action: 'skipped',
        reason: 'already_enriched',
        dataQuality: 'MEDIUM',
        hadMusicBrainzData: !!track.musicbrainzId,
      },
      metadata: {
        duration: 0,
        timestamp: new Date().toISOString(),
        requestId: data.requestId,
      },
    };
  }

  // Queue enrichment job
  const { getMusicBrainzQueue } = await import('../queue');
  const queue = getMusicBrainzQueue();

  const enrichmentJobData: EnrichTrackJobData = {
    trackId: track.id,
    priority: data.priority || 'low',
    userAction: data.source === 'spotify_sync' ? 'browse' : data.source,
    requestId: data.requestId,
  };

  await queue.addJob(JOB_TYPES.ENRICH_TRACK, enrichmentJobData, {
    priority: 8, // Lower priority for tracks
    attempts: 3,
    backoff: { type: 'exponential', delay: 2000 },
  });

  console.log(`⚡ Queued track enrichment for "${track.title}"`);

  return {
    success: true,
    data: {
      trackId: track.id,
      action: 'queued_enrichment',
      dataQuality: 'LOW',
      hadMusicBrainzData: !!track.musicbrainzId,
      enqueuedTimestamp: new Date().toISOString(),
    },
    metadata: {
      duration: 0,
      timestamp: new Date().toISOString(),
      requestId: data.requestId,
    },
  };
}

/**
 * Enrich a track with MusicBrainz data
 */
async function handleEnrichTrack(data: EnrichTrackJobData) {
  console.log(`🎵 Enriching track ${data.trackId}`);

  const startTime = Date.now();

  try {
    // Get track with related data
    const track = await prisma.track.findUnique({
      where: { id: data.trackId },
      include: {
        artists: {
          include: {
            artist: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    });

    if (!track) {
      throw new Error(`Track ${data.trackId} not found`);
    }

    let musicbrainzData = null;
    let matchFound = false;

    // Try ISRC lookup first (most reliable)
    if (track.isrc) {
      try {
        console.log(`🔍 Looking up track by ISRC: ${track.isrc}`);
        const recordings = await musicBrainzService.searchRecordings(
          `isrc:${track.isrc}`,
          1
        );

        if (recordings.length > 0) {
          const recording = recordings[0];
          console.log(`✅ Found track by ISRC with score ${recording.score}`);
          musicbrainzData = recording;
          matchFound = true;
        }
      } catch (error) {
        console.warn(`⚠️ ISRC lookup failed for ${track.isrc}:`, error);
      }
    }

    // If no ISRC match, try title + artist search
    if (!matchFound) {
      try {
        const artistName = track.artists[0]?.artist?.name || 'Unknown Artist';
        const searchQuery = `recording:"${track.title}" AND artist:"${artistName}"`;

        console.log(`🔍 Searching MusicBrainz for: ${searchQuery}`);

        const recordings = await musicBrainzService.searchRecordings(
          searchQuery,
          10
        );

        if (recordings.length > 0) {
          // Find best match using title similarity and duration
          const bestMatch = findBestTrackMatch(track, recordings);
          if (bestMatch) {
            console.log(`✅ Found track match with score ${bestMatch.score}`);
            musicbrainzData = bestMatch;
            matchFound = true;
          }
        }
      } catch (error) {
        console.warn(`⚠️ Track search failed:`, error);
      }
    }

    // Update track with enrichment results
    const updateData: any = {
      lastEnriched: new Date(),
    };

    if (matchFound && musicbrainzData) {
      updateData.musicbrainzId = musicbrainzData.id;

      // Fetch detailed recording data with relationships
      try {
        const detailedRecording = await musicBrainzService.getRecording(
          musicbrainzData.id,
          [
            'artist-credits', // Get artist information
            'releases', // Get releases this recording appears on
            'isrcs', // Get ISRC codes
            'url-rels', // Get URLs (Spotify, YouTube, etc.)
            'tags', // Get genre/style tags
          ]
        );

        if (detailedRecording) {
          console.log(`🎵 Enhanced track data fetched for "${track.title}"`);
          // TODO: Update track with additional metadata from detailedRecording
          // Could extract: length, disambiguation, additional ISRCs, genres, etc.
        }
      } catch (error) {
        console.warn(`⚠️ Failed to fetch detailed recording data:`, error);
      }
    }

    await (prisma.track as any).update({
      where: { id: track.id },
      data: updateData,
    });

    const duration = Date.now() - startTime;
    console.log(
      `✅ Track enrichment completed in ${duration}ms (${matchFound ? 'enriched' : 'no match'})`
    );

    return {
      success: true,
      data: {
        trackId: track.id,
        action: matchFound ? 'enriched' : 'no_match_found',
        dataQuality: matchFound ? 'MEDIUM' : 'LOW',
        hadMusicBrainzData: !!musicbrainzData,
        enrichmentTimestamp: updateData.lastEnriched.toISOString(),
      },
      metadata: {
        duration,
        timestamp: new Date().toISOString(),
        requestId: data.requestId,
      },
    };
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(`❌ Track enrichment failed:`, error);

    // Update track status to failed
    await (prisma.track as any).update({
      where: { id: data.trackId },
      data: {
        lastEnriched: new Date(),
      },
    });

    return {
      success: false,
      error: {
        message:
          error instanceof Error
            ? error.message
            : 'Unknown error during track enrichment',
        code: 'ENRICHMENT_ERROR',
        retryable: true,
      },
      metadata: {
        duration,
        timestamp: new Date().toISOString(),
        requestId: data.requestId,
      },
    };
  }
}

/**
 * Find the best matching track from MusicBrainz search results
 */
function findBestTrackMatch(track: any, recordings: any[]): any | null {
  let bestMatch = null;
  let bestScore = 0;

  for (const recording of recordings) {
    let score = recording.score || 0;

    // Boost score for duration match (within 5 seconds)
    if (track.durationMs && recording.length) {
      const trackDurationSec = Math.round(track.durationMs / 1000);
      const recordingDurationSec = Math.round(recording.length / 1000);
      const durationDiff = Math.abs(trackDurationSec - recordingDurationSec);

      if (durationDiff <= 5) {
        score += 10; // Boost for close duration match
      }
    }

    // Boost score for exact title match
    if (recording.title && track.title) {
      const titleSimilarity = calculateStringSimilarity(
        track.title.toLowerCase(),
        recording.title.toLowerCase()
      );
      score += titleSimilarity * 10;
    }

    if (score > bestScore) {
      bestScore = score;
      bestMatch = recording;
    }
  }

  // Only return matches with reasonable confidence
  return bestScore >= 70 ? bestMatch : null;
}

// ============================================================================
// Bulk Track Processing from MusicBrainz
// ============================================================================

/**
 * Process all tracks for an album from MusicBrainz release data
 * This is MUCH more efficient than individual track enrichment jobs
 */
async function processMusicBrainzTracksForAlbum(
  albumId: string,
  mbRelease: any
) {
  console.log(
    `🎵 Processing tracks for album ${albumId} from MusicBrainz release`
  );

  try {
    // Get existing tracks for this album from our database
    const existingTracks = await prisma.track.findMany({
      where: { albumId },
      select: {
        id: true,
        title: true,
        trackNumber: true,
        discNumber: true,
        durationMs: true,
        musicbrainzId: true,
      },
    });

    let tracksProcessed = 0;
    let tracksMatched = 0;
    let tracksUpdated = 0;

    // Process each disc/medium
    for (const medium of mbRelease.media || []) {
      const discNumber = medium.position || 1;

      // Process each track on this disc
      for (const mbTrack of medium.tracks || []) {
        try {
          const trackNumber = mbTrack.position;
          const mbRecording = mbTrack.recording;

          if (!mbRecording) continue;

          // Find matching existing track by position and title similarity
          const matchingTrack = findMatchingTrack(existingTracks, {
            trackNumber,
            discNumber,
            title: mbRecording.title,
            durationMs: mbRecording.length ? mbRecording.length * 1000 : null,
          });

          if (matchingTrack) {
            // Update existing track with MusicBrainz data
            const updateData: any = {
              lastEnriched: new Date(),
            };

            // Only update if we don't already have MusicBrainz ID
            if (!matchingTrack.musicbrainzId) {
              updateData.musicbrainzId = mbRecording.id;

              // Extract ISRC from MusicBrainz data
              const isrc =
                mbRecording.isrcs && mbRecording.isrcs.length > 0
                  ? mbRecording.isrcs[0]
                  : null;
              if (isrc) {
                updateData.isrc = isrc;
                console.log(
                  `🏷️ Found ISRC for "${matchingTrack.title}": ${isrc}`
                );
              }

              // Extract YouTube URL from MusicBrainz url-rels
              const youtubeUrl = extractYouTubeUrl(mbRecording);
              if (youtubeUrl) {
                updateData.youtubeUrl = youtubeUrl;
                console.log(
                  `🎬 Found YouTube URL for "${matchingTrack.title}": ${youtubeUrl}`
                );
              }

              console.log(
                `🔗 Linking track "${matchingTrack.title}" to MusicBrainz ID: ${mbRecording.id}`
              );
              tracksMatched++;
            }

            // Update track
            await (prisma.track as any).update({
              where: { id: matchingTrack.id },
              data: updateData,
            });

            tracksUpdated++;
          } else {
            // Create missing track from MusicBrainz data
            try {
              console.log(
                `🆕 Creating new track: "${mbRecording.title}" (${trackNumber})`
              );

              // Extract ISRC from MusicBrainz data
              const isrc =
                mbRecording.isrcs && mbRecording.isrcs.length > 0
                  ? mbRecording.isrcs[0]
                  : null;

              // Extract YouTube URL from MusicBrainz url-rels
              const youtubeUrl = extractYouTubeUrl(mbRecording);

              if (isrc) {
                console.log(
                  `🏷️ Found ISRC for "${mbRecording.title}": ${isrc}`
                );
              }
              if (youtubeUrl) {
                console.log(
                  `🎬 Found YouTube URL for "${mbRecording.title}": ${youtubeUrl}`
                );
              }

              const newTrack = await (prisma.track as any).create({
                data: {
                  albumId,
                  title: mbRecording.title,
                  trackNumber,
                  discNumber,
                  durationMs: mbRecording.length
                    ? mbRecording.length * 1000
                    : null,
                  explicit: false, // MusicBrainz doesn't provide explicit flag
                  previewUrl: null, // No preview URL from MusicBrainz
                  musicbrainzId: mbRecording.id,
                  isrc, // 🏷️ NEW: Store ISRC
                  youtubeUrl,
                  dataQuality: 'HIGH', // Coming from MusicBrainz = high quality
                  enrichmentStatus: 'COMPLETED',
                  lastEnriched: new Date(),
                },
              });

              // Create track-artist relationships
              if (mbRecording['artist-credit']) {
                for (
                  let artistIndex = 0;
                  artistIndex < mbRecording['artist-credit'].length;
                  artistIndex++
                ) {
                  const mbArtist = mbRecording['artist-credit'][artistIndex];
                  const artistName = mbArtist.name || mbArtist.artist?.name;

                  if (artistName) {
                    // Find or create artist in our database
                    let artist = await prisma.artist.findFirst({
                      where: {
                        OR: [
                          { musicbrainzId: mbArtist.artist?.id },
                          { name: { equals: artistName, mode: 'insensitive' } },
                        ],
                      },
                    });

                    if (!artist) {
                      // Create artist if not found
                      artist = await prisma.artist.create({
                        data: {
                          name: artistName,
                          musicbrainzId: mbArtist.artist?.id || null,
                          dataQuality: 'MEDIUM',
                          enrichmentStatus: 'PENDING',
                          lastEnriched: null,
                        },
                      });
                      console.log(`🎤 Created new artist: "${artistName}"`);
                    }

                    // Create track-artist relationship
                    await prisma.trackArtist.create({
                      data: {
                        trackId: newTrack.id,
                        artistId: artist.id,
                        role: artistIndex === 0 ? 'primary' : 'featured',
                        position: artistIndex,
                      },
                    });
                  }
                }
              }

              tracksMatched++; // Count as matched since we created it
              tracksUpdated++; // Count as updated since it's new

              if (youtubeUrl) {
                console.log(
                  `🎬 Added YouTube URL for new track "${mbRecording.title}": ${youtubeUrl}`
                );
              }
            } catch (trackError) {
              console.error(
                `❌ Failed to create track "${mbRecording.title}":`,
                trackError
              );
            }
          }

          tracksProcessed++;
        } catch (error) {
          console.error(
            `❌ Failed to process track ${mbTrack.position}:`,
            error
          );
        }
      }
    }

    console.log(`✅ Bulk track processing complete:`);
    console.log(`   - ${tracksProcessed} tracks processed`);
    console.log(`   - ${tracksMatched} tracks matched to MusicBrainz`);
    console.log(`   - ${tracksUpdated} tracks updated`);
  } catch (error) {
    console.error(
      `❌ Bulk track processing failed for album ${albumId}:`,
      error
    );
  }
}

/**
 * Normalize track title for better matching between Spotify and MusicBrainz
 * Handles featuring artist differences: "Song (feat. Artist)" vs "Song"
 */
function normalizeTrackTitle(title: string): string {
  return title
    .toLowerCase()
    .replace(/\s*\(feat\.?\s+[^)]+\)/gi, '') // Remove (feat. Artist)
    .replace(/\s*\(featuring\s+[^)]+\)/gi, '') // Remove (featuring Artist)
    .replace(/\s*feat\.?\s+[^,]+/gi, '') // Remove feat. Artist
    .replace(/\s*featuring\s+[^,]+/gi, '') // Remove featuring Artist
    .replace(/\s*with\s+[^,]+/gi, '') // Remove with Artist
    .replace(/[^\w\s]/g, '') // Remove punctuation
    .replace(/\s+/g, ' ') // Normalize whitespace
    .trim();
}

/**
 * Find existing track that matches MusicBrainz track data
 * Enhanced to handle featuring artist differences between Spotify and MusicBrainz
 */
function findMatchingTrack(
  existingTracks: any[],
  mbTrackData: any
): any | null {
  // First try exact position match (most reliable)
  const match = existingTracks.find(
    track =>
      track.trackNumber === mbTrackData.trackNumber &&
      track.discNumber === mbTrackData.discNumber
  );

  if (match) {
    console.log(
      `🎯 Position match: Track ${match.trackNumber} "${match.title}" → "${mbTrackData.title}"`
    );
    return match;
  }

  // Fallback to normalized title similarity
  const normalizedMBTitle = normalizeTrackTitle(mbTrackData.title);
  let bestMatch = null;
  let bestScore = 0;

  for (const track of existingTracks) {
    const normalizedSpotifyTitle = normalizeTrackTitle(track.title);

    // Try exact normalized match first
    if (normalizedSpotifyTitle === normalizedMBTitle) {
      console.log(
        `🎯 Exact normalized match: "${track.title}" → "${mbTrackData.title}"`
      );
      return track;
    }

    // Calculate similarity with normalized titles
    const titleSimilarity = calculateStringSimilarity(
      normalizedSpotifyTitle,
      normalizedMBTitle
    );

    // Boost score for duration match (within 5 seconds)
    let score = titleSimilarity;
    if (track.durationMs && mbTrackData.durationMs) {
      const durationDiff =
        Math.abs(track.durationMs - mbTrackData.durationMs) / 1000;
      if (durationDiff <= 5) {
        score += 0.2; // Boost for close duration match
      }
    }

    if (score > bestScore && score > 0.7) {
      bestScore = score;
      bestMatch = track;
    }
  }

  return bestMatch;
}

/**
 * Extract YouTube URL from MusicBrainz recording URL relationships
 */
function extractYouTubeUrl(
  mbRecording: MusicBrainzRecordingDetail
): string | null {
  // Check both 'relations' and 'url-rels' fields (MusicBrainz API can use either)
  // @ts-expect-error - Handling different MusicBrainz API response formats
  const relations = mbRecording.relations || mbRecording['url-rels'] || [];

  if (relations.length === 0) return null;

  // Look for YouTube URL relationships
  for (const relation of relations) {
    const relationType = relation.type || relation['target-type'];
    const relationUrl =
      relation.url?.resource || relation.url || relation.target;

    if (!relationUrl) continue;

    // Direct YouTube relationship
    if (relationType === 'youtube' && relationUrl) {
      console.log(`🎬 Found direct YouTube relation: ${relationUrl}`);
      return relationUrl;
    }

    // Streaming music relationships that might be YouTube
    if (relationType === 'streaming music' && relationUrl) {
      if (
        relationUrl.includes('youtube.com') ||
        relationUrl.includes('youtu.be')
      ) {
        console.log(`🎬 Found YouTube in streaming music: ${relationUrl}`);
        return relationUrl;
      }
    }

    // Free streaming that might be YouTube
    if (relationType === 'free streaming' && relationUrl) {
      if (
        relationUrl.includes('youtube.com') ||
        relationUrl.includes('youtu.be')
      ) {
        console.log(`🎬 Found YouTube in free streaming: ${relationUrl}`);
        return relationUrl;
      }
    }

    // Performance/video relationships
    if (relationType === 'performance' && relationUrl) {
      if (
        relationUrl.includes('youtube.com') ||
        relationUrl.includes('youtu.be')
      ) {
        console.log(`🎬 Found YouTube in performance: ${relationUrl}`);
        return relationUrl;
      }
    }
  }

  return null;
}

// ============================================================================
// Cover Art Caching Handler
// ============================================================================

async function handleCacheAlbumCoverArt(
  data: CacheAlbumCoverArtJobData
): Promise<any> {
  const { albumId, requestId } = data;

  try {
    // Fetch album from database
    const album = await prisma.album.findUnique({
      where: { id: albumId },
      select: {
        id: true,
        title: true,
        coverArtUrl: true,
        cloudflareImageId: true,
      },
    });

    if (!album) {
      // Non-retryable error: album doesn't exist
      throw new Error(`Album ${albumId} not found`);
    }

    // Skip if already cached
    if (album.cloudflareImageId && album.cloudflareImageId !== 'none') {
      return {
        success: true,
        cached: true,
        albumId,
        cloudflareImageId: album.cloudflareImageId,
        message: 'Already cached',
      };
    }

    // Skip if no cover art URL (mark as 'none')
    if (!album.coverArtUrl) {
      await prisma.album.update({
        where: { id: albumId },
        data: { cloudflareImageId: 'none' },
      });

      return {
        success: true, // Don't retry - this is expected
        cached: false,
        albumId,
        cloudflareImageId: 'none',
        message: 'No cover art URL available',
      };
    }

    // Import cacheAlbumArt lazily to avoid circular dependencies
    const { cacheAlbumArt } = await import('@/lib/cloudflare-images');

    // Upload to Cloudflare
    const result = await cacheAlbumArt(
      album.coverArtUrl,
      album.id,
      album.title
    );

    if (!result) {
      // Check if it's a 404 (non-retryable) or transient error (retryable)
      // For now, mark as 'none' and don't retry
      await prisma.album.update({
        where: { id: albumId },
        data: { cloudflareImageId: 'none' },
      });

      return {
        success: true, // Don't retry - mark as processed
        cached: false,
        albumId,
        cloudflareImageId: 'none',
        message: 'Failed to fetch image from source (404 or invalid URL)',
      };
    }

    // Update database with Cloudflare image ID
    await prisma.album.update({
      where: { id: albumId },
      data: { cloudflareImageId: result.id },
    });

    console.log(`✅ Cached cover art for "${album.title}" (${albumId})`);

    return {
      success: true,
      cached: false,
      albumId,
      cloudflareImageId: result.id,
      cloudflareUrl: result.url,
      message: 'Successfully cached',
    };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error';
    console.error(
      `❌ Error caching cover art for album ${albumId}:`,
      errorMessage
    );

    // Throw to trigger BullMQ retry with exponential backoff
    throw new Error(`Failed to cache album ${albumId}: ${errorMessage}`);
  }
}

/**
 * Handle CACHE_ARTIST_IMAGE job
 * Caches artist images from external sources to Cloudflare Images CDN
 */
async function handleCacheArtistImage(
  data: CacheArtistImageJobData
): Promise<any> {
  const { artistId, requestId } = data;

  try {
    // Fetch artist from database
    const artist = await prisma.artist.findUnique({
      where: { id: artistId },
      select: {
        id: true,
        name: true,
        imageUrl: true,
        cloudflareImageId: true,
      },
    });

    if (!artist) {
      // Non-retryable error: artist doesn't exist
      throw new Error(`Artist ${artistId} not found`);
    }

    // Skip if already cached
    if (artist.cloudflareImageId && artist.cloudflareImageId !== 'none') {
      return {
        success: true,
        cached: true,
        artistId,
        cloudflareImageId: artist.cloudflareImageId,
        message: 'Already cached',
      };
    }

    // Skip if no image URL (mark as 'none')
    if (!artist.imageUrl) {
      await prisma.artist.update({
        where: { id: artistId },
        data: { cloudflareImageId: 'none' },
      });

      return {
        success: true, // Don't retry - this is expected
        cached: false,
        artistId,
        cloudflareImageId: 'none',
        message: 'No image URL available',
      };
    }

    // Import cacheArtistImage lazily to avoid circular dependencies
    const { cacheArtistImage } = await import('@/lib/cloudflare-images');

    // Upload to Cloudflare
    const result = await cacheArtistImage(
      artist.imageUrl,
      artist.id,
      artist.name
    );

    if (!result) {
      // Check if it's a 404 (non-retryable) or transient error (retryable)
      // For now, mark as 'none' and don't retry
      await prisma.artist.update({
        where: { id: artistId },
        data: { cloudflareImageId: 'none' },
      });

      return {
        success: true, // Don't retry - mark as processed
        cached: false,
        artistId,
        cloudflareImageId: 'none',
        message: 'Failed to fetch image from source (404 or invalid URL)',
      };
    }

    // Update database with Cloudflare image ID
    await prisma.artist.update({
      where: { id: artistId },
      data: { cloudflareImageId: result.id },
    });

    console.log(`✅ Cached image for "${artist.name}" (${artistId})`);

    return {
      success: true,
      cached: false,
      artistId,
      cloudflareImageId: result.id,
      cloudflareUrl: result.url,
      message: 'Successfully cached',
    };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error';
    console.error(
      `❌ Error caching image for artist ${artistId}:`,
      errorMessage
    );

    // Throw to trigger BullMQ retry with exponential backoff
    throw new Error(`Failed to cache artist ${artistId}: ${errorMessage}`);
  }
}

// ============================================================================
// Discogs Artist Search & Fetch Handlers
// ============================================================================

/**
 * Search Discogs for artist by name when MusicBrainz doesn't provide Discogs ID
 */
async function handleDiscogsSearchArtist(
  data: DiscogsSearchArtistJobData
): Promise<any> {
  console.log(`🔍 Searching Discogs for artist: "${data.artistName}"`);

  try {
    // Initialize Discogs client (using require for CommonJS module)
    const Discogs = require('disconnect');
    const discogsClient = new Discogs.Client({
      userAgent: 'RecProject/1.0 +https://rec-music.org',
      consumerKey: process.env.CONSUMER_KEY!,
      consumerSecret: process.env.CONSUMER_SECRET!,
    }).database();

    // Search for artist on Discogs
    const searchResults = await discogsClient.search({
      query: data.artistName,
      type: 'artist',
      per_page: 10,
    });

    if (!searchResults.results || searchResults.results.length === 0) {
      console.log(`❌ No Discogs results found for "${data.artistName}"`);
      return {
        artistId: data.artistId,
        action: 'no_results',
        searchedName: data.artistName,
      };
    }

    console.log(
      `📊 Found ${searchResults.results.length} Discogs results for "${data.artistName}"`
    );

    // Find best match using fuzzy matching
    const bestMatch = findBestDiscogsArtistMatch(
      data.artistName,
      searchResults.results
    );

    if (!bestMatch) {
      console.log(`❌ No confident match found for "${data.artistName}"`);
      return {
        artistId: data.artistId,
        action: 'no_confident_match',
        searchedName: data.artistName,
        resultsCount: searchResults.results.length,
      };
    }

    console.log(
      `✅ Found Discogs match: "${bestMatch.result.title}" (ID: ${bestMatch.result.id}, confidence: ${(bestMatch.score * 100).toFixed(1)}%)`
    );

    // Extract Discogs ID and queue fetch job
    const discogsId = bestMatch.result.id;

    // Update database with Discogs ID
    await prisma.artist.update({
      where: { id: data.artistId },
      data: { discogsId: String(discogsId) },
    });

    // Queue job to fetch artist details and image
    const queue = await import('./musicbrainz-queue').then(m =>
      m.getMusicBrainzQueue()
    );
    await queue.addJob(
      JOB_TYPES.DISCOGS_GET_ARTIST,
      {
        artistId: data.artistId,
        discogsId: String(discogsId),
        requestId: data.requestId,
      },
      {
        priority: 6, // Medium-low priority
        attempts: 3,
        backoff: { type: 'exponential', delay: 2000 },
      }
    );

    console.log(`📤 Queued Discogs fetch for artist ${data.artistId}`);

    return {
      artistId: data.artistId,
      action: 'found_and_queued',
      discogsId: String(discogsId),
      matchConfidence: bestMatch.score,
      discogsTitle: bestMatch.result.title,
    };
  } catch (error) {
    console.error(`❌ Discogs search failed for "${data.artistName}":`, error);
    throw error;
  }
}

/**
 * Fetch artist details and image from Discogs using Discogs ID
 */
async function handleDiscogsGetArtist(
  data: DiscogsGetArtistJobData
): Promise<any> {
  console.log(`🎤 Fetching Discogs artist details for ID: ${data.discogsId}`);

  try {
    // Use unified artist service to fetch Discogs data
    const { unifiedArtistService } = await import(
      '@/lib/api/unified-artist-service'
    );
    const discogsArtist = await unifiedArtistService.getArtistDetails(
      data.discogsId,
      { source: 'discogs', skipLocalCache: true }
    );

    if (!discogsArtist.imageUrl) {
      console.log(`⚠️ No image found for Discogs artist ${data.discogsId}`);
      return {
        artistId: data.artistId,
        action: 'no_image',
        discogsId: data.discogsId,
      };
    }

    // Update artist with image URL
    await prisma.artist.update({
      where: { id: data.artistId },
      data: { imageUrl: discogsArtist.imageUrl },
    });

    console.log(`📸 Updated artist ${data.artistId} with Discogs image`);

    // Queue Cloudflare caching job
    const queue = await import('./musicbrainz-queue').then(m =>
      m.getMusicBrainzQueue()
    );
    await queue.addJob(
      JOB_TYPES.CACHE_ARTIST_IMAGE,
      {
        artistId: data.artistId,
        requestId: `discogs-cache-${data.artistId}`,
      },
      {
        priority: 5,
        attempts: 3,
        backoff: { type: 'exponential', delay: 2000 },
      }
    );

    console.log(`📤 Queued Cloudflare caching for artist ${data.artistId}`);

    return {
      artistId: data.artistId,
      action: 'image_updated_and_queued_cache',
      discogsId: data.discogsId,
      imageUrl: discogsArtist.imageUrl,
    };
  } catch (error) {
    console.error(
      `❌ Failed to fetch Discogs artist ${data.discogsId}:`,
      error
    );
    throw error;
  }
}

/**
 * Find best matching Discogs artist result using fuzzy string matching
 */
function findBestDiscogsArtistMatch(
  searchName: string,
  results: any[]
): { result: any; score: number } | null {
  let bestMatch = null;
  let bestScore = 0;

  for (const result of results) {
    // Extract artist name from result title
    // Discogs format: "Artist Name" or "Artist Name (2)" for disambiguation
    const resultName = result.title.replace(/\s*\(\d+\)$/, '').trim();

    // Calculate similarity score
    const similarity = calculateStringSimilarity(
      searchName.toLowerCase(),
      resultName.toLowerCase()
    );

    // Require high confidence (85%+) for Discogs matches
    if (similarity > bestScore && similarity >= 0.85) {
      bestScore = similarity;
      bestMatch = { result, score: similarity };
    }
  }

  return bestMatch;
}
