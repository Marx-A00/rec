// src/lib/queue/processors/enrichment-processor.ts
// Album, artist, and track enrichment handlers

import { Job } from 'bullmq';

import { prisma } from '@/lib/prisma';
import { createLlamaLogger } from '@/lib/logging/llama-logger';

import { musicBrainzService } from '../../musicbrainz';
import {
  shouldEnrichAlbum,
  shouldEnrichArtist,
  calculateEnrichmentPriority,
  mapSourceToUserAction,
} from '../../musicbrainz/enrichment-logic';
import { searchSpotifyArtists } from '../../spotify/search';
import type { MusicBrainzRecordingDetail } from '../../musicbrainz/schemas';
import {
  JOB_TYPES,
  type CheckAlbumEnrichmentJobData,
  type CheckArtistEnrichmentJobData,
  type CheckTrackEnrichmentJobData,
  type EnrichAlbumJobData,
  type EnrichArtistJobData,
  type EnrichTrackJobData,
  type CacheArtistImageJobData,
} from '../jobs';
import { analyzeTitle } from '../../musicbrainz/title-utils';

import {
  calculateStringSimilarity,
  buildAlbumSearchQuery,
  buildReleaseSearchQuery,
  findBestAlbumMatch,
  findBestArtistMatch,
  findBestTrackMatch,
  findBestReleaseMatch,
  normalizeTrackTitle,
  findMatchingTrack,
} from './utils';

// ============================================================================
// Field Change Tracking Types
// ============================================================================

interface FieldChange {
  field: string;
  before: unknown;
  after: unknown;
}

interface EnrichmentUpdateResult {
  updateData: Record<string, unknown> | null;
  fieldChanges: FieldChange[];
}

// Helper to format field values for display
function formatFieldValue(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  if (Array.isArray(value)) return value.join(', ');
  if (value instanceof Date) return value.toISOString().split('T')[0];
  return String(value);
}

// ============================================================================
// Check Enrichment Handlers
// ============================================================================

export async function handleCheckAlbumEnrichment(
  job: Job<CheckAlbumEnrichmentJobData>
) {
  const data = job.data;
  // Don't pass parentJobId to ENRICH_ALBUM - let it be the root job
  // CHECK_* jobs are just dispatchers, not meaningful enrichment operations

  console.log(
    `🔍 Checking if album ${data.albumId} needs enrichment (source: ${data.source}, force: ${data.force || false})`
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

  // Check if enrichment is needed - force flag bypasses all checks
  const needsEnrichment = data.force || shouldEnrichAlbum(album);

  if (needsEnrichment) {
    console.log(
      `✅ Album ${data.albumId} ${data.force ? 'force re-enrichment requested' : 'needs enrichment'}, queueing enrichment job`
    );

    // Queue the actual enrichment job
    const queue = await import('../musicbrainz-queue').then(m =>
      m.getMusicBrainzQueue()
    );
    await queue.addJob(
      JOB_TYPES.ENRICH_ALBUM,
      {
        albumId: data.albumId,
        priority: data.priority || 'medium',
        force: data.force,
        userAction: mapSourceToUserAction(data.source),
        requestId: data.requestId,
        // No parentJobId - ENRICH_ALBUM is the root job
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
          // No parentJobId - ENRICH_ARTIST will be its own root job
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
      force: data.force,
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

export async function handleCheckArtistEnrichment(
  job: Job<CheckArtistEnrichmentJobData>
) {
  const data = job.data;
  // Don't pass parentJobId to ENRICH_ARTIST - let it be the root job
  // CHECK_* jobs are just dispatchers, not meaningful enrichment operations

  console.log(
    `🔍 Checking if artist ${data.artistId} needs enrichment (source: ${data.source}, force: ${data.force || false})`
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

  // Check if enrichment is needed - force flag bypasses all checks
  const needsEnrichment = data.force || shouldEnrichArtist(artist);

  if (needsEnrichment) {
    console.log(
      `✅ Artist ${data.artistId} ${data.force ? 'force re-enrichment requested' : 'needs enrichment'}, queueing enrichment job`
    );

    // Queue the actual enrichment job
    const queue = await import('../musicbrainz-queue').then(m =>
      m.getMusicBrainzQueue()
    );
    await queue.addJob(
      JOB_TYPES.ENRICH_ARTIST,
      {
        artistId: data.artistId,
        priority: data.priority || 'medium',
        force: data.force,
        userAction: mapSourceToUserAction(data.source),
        requestId: data.requestId,
        // No parentJobId - ENRICH_ARTIST is the root job
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
      force: data.force,
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

export async function handleCheckTrackEnrichment(
  job: Job<CheckTrackEnrichmentJobData>
) {
  const data = job.data;
  // Don't pass parentJobId to ENRICH_TRACK - let it be the root job
  // CHECK_* jobs are just dispatchers, not meaningful enrichment operations

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
  const { getMusicBrainzQueue } = await import('../musicbrainz-queue');
  const queue = getMusicBrainzQueue();

  const enrichmentJobData: EnrichTrackJobData = {
    trackId: track.id,
    priority: data.priority || 'low',
    userAction: data.source === 'spotify_sync' ? 'browse' : data.source,
    requestId: data.requestId,
    // No parentJobId - ENRICH_TRACK is the root job
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

// ============================================================================
// Album Enrichment Handler
// ============================================================================

export async function handleEnrichAlbum(job: Job<EnrichAlbumJobData>) {
  const data = job.data;
  const rootJobId = data.parentJobId || job.id;

  console.log(`🎵 Starting album enrichment for album ${data.albumId}`);

  // Initialize enrichment logger
  const llamaLogger = createLlamaLogger(prisma);

  // Track enrichment metrics
  const startTime = Date.now();
  const sourcesAttempted: string[] = [];
  const fieldsEnriched: string[] = [];
  const allFieldChanges: FieldChange[] = [];
  let apiCallCount = 0;

  // Get current album from database
  const album = await prisma.album.findUnique({
    where: { id: data.albumId },
    include: {
      artists: { include: { artist: true } },
      tracks: true,
    },
  });

  if (!album) {
    throw new Error(`Album not found: ${data.albumId}`);
  }

  const dataQualityBefore = album.dataQuality || 'LOW';
  const artistName = album.artists?.[0]?.artist?.name || 'Unknown Artist';

  // Check if enrichment is needed (with logger for cooldown checks)
  // Skip this check if force=true (admin requested force re-enrichment)
  if (!data.force) {
    const enrichmentDecision = await shouldEnrichAlbum(album, llamaLogger);
    if (!enrichmentDecision.shouldEnrich) {
      console.log(
        `⏭️ Album ${data.albumId} does not need enrichment, skipping - ${enrichmentDecision.reason}`
      );

      // Reset enrichment status if it was set to IN_PROGRESS by the admin trigger
      if (album.enrichmentStatus === 'IN_PROGRESS') {
        await prisma.album.update({
          where: { id: data.albumId },
          data: { enrichmentStatus: 'COMPLETED' },
        });
      }

      // Log the skip with the reason
      await llamaLogger.logEnrichment({
        entityType: 'ALBUM',
        entityId: album.id,
        operation: JOB_TYPES.ENRICH_ALBUM,
        sources: [],
        status: 'SKIPPED',
        reason: enrichmentDecision.reason,
        fieldsEnriched: [],
        dataQualityBefore,
        dataQualityAfter: album.dataQuality || 'LOW',
        durationMs: Date.now() - startTime,
        apiCallCount: 0,
        metadata: {
          albumTitle: album.title,
          artistName,
          confidence: enrichmentDecision.confidence,
        },
        jobId: job.id,
        parentJobId: data.parentJobId || null,
        isRootJob: !data.parentJobId,
        triggeredBy: data.userAction || 'manual',
      });

      return {
        albumId: data.albumId,
        action: 'skipped',
        reason: enrichmentDecision.reason,
        currentDataQuality: album.dataQuality,
        lastEnriched: album.lastEnriched,
      };
    }
  } else {
    console.log(
      `🔄 Force re-enrichment requested for album ${data.albumId}, bypassing checks`
    );
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
        sourcesAttempted.push('MUSICBRAINZ');
        apiCallCount++;
        const mbData = (await musicBrainzService.getReleaseGroup(
          album.musicbrainzId,
          ['artists', 'releases', 'tags']
        )) as MusicBrainzReleaseGroupData;
        if (mbData) {
          const updateResult = await updateAlbumFromMusicBrainz(album, mbData);
          enrichmentResult = updateResult.updateData;
          allFieldChanges.push(...updateResult.fieldChanges);
          newDataQuality = 'HIGH';

          // Track which fields were enriched
          if (mbData.title) fieldsEnriched.push('title');
          if (mbData['first-release-date']) fieldsEnriched.push('releaseDate');
          if (mbData['artist-credit']) fieldsEnriched.push('artists');
          if (mbData.tags && mbData.tags.length > 0)
            fieldsEnriched.push('genres');

          // Fetch tracks for albums that already have MusicBrainz IDs
          if (mbData.releases && mbData.releases.length > 0) {
            try {
              const primaryRelease = mbData.releases[0];
              console.log(
                `🎵 Fetching tracks for existing MB album: ${primaryRelease.title}`
              );

              apiCallCount++;
              const releaseWithTracks = await musicBrainzService.getRelease(
                primaryRelease.id,
                ['recordings', 'artist-credits', 'isrcs', 'url-rels']
              );

              if (releaseWithTracks?.media) {
                const totalTracks = releaseWithTracks.media.reduce(
                  (sum: number, medium: { tracks?: unknown[] }) =>
                    sum + (medium.tracks?.length || 0),
                  0
                );
                console.log(
                  `✅ Fetched ${totalTracks} tracks for existing album "${album.title}"!`
                );

                fieldsEnriched.push('tracks');
                await processMusicBrainzTracksForAlbum(
                  album.id,
                  releaseWithTracks,
                  {
                    jobId: job.id || `enrich-album-${Date.now()}`,
                    parentJobId: data.parentJobId || null,
                    rootJobId: data.parentJobId || job.id || null,
                  }
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
    // Enhanced flow: handles edition/version albums (Deluxe, Anniversary, etc.)
    if (!enrichmentResult && album.title) {
      try {
        if (!sourcesAttempted.includes('MUSICBRAINZ')) {
          sourcesAttempted.push('MUSICBRAINZ');
        }

        // Analyze the title for edition/version indicators
        const titleAnalysis = analyzeTitle(album.title);
        if (titleAnalysis.isEditionOrVersion) {
          console.log(
            `📀 Edition detected: "${album.title}" (keywords: ${titleAnalysis.detectedKeywords.join(', ')})`
          );
          console.log(`   Base title: "${titleAnalysis.baseTitle}"`);
        }

        // Step 1: Try full title search on release-groups (current behavior)
        apiCallCount++;
        const searchQuery = buildAlbumSearchQuery(album);
        const searchResults = await musicBrainzService.searchReleaseGroups(
          searchQuery,
          5
        );

        let bestMatch = null;
        if (searchResults && searchResults.length > 0) {
          console.log(
            `🔍 Found ${searchResults.length} release-group results for "${album.title}"`
          );
          console.log(
            `📊 First result: "${searchResults[0].title}" by ${searchResults[0].artistCredit?.map((ac: { name: string }) => ac.name).join(', ')} (score: ${searchResults[0].score})`
          );

          bestMatch = findBestAlbumMatch(album, searchResults);
          console.log(
            `🎯 Best release-group match: ${
              bestMatch
                ? `"${bestMatch.result.title}" - Combined: ${(bestMatch.score * 100).toFixed(1)}% (MB: ${bestMatch.mbScore}, Jaccard: ${(bestMatch.jaccardScore * 100).toFixed(1)}%)`
                : 'None found'
            }`
          );
        }

        // Step 2: If edition detected AND no good release-group match, try release search
        let releaseMatch = null;
        if (!bestMatch && titleAnalysis.isEditionOrVersion) {
          console.log(
            `🔍 No release-group match, trying direct release search for edition...`
          );
          apiCallCount++;
          const releaseQuery = buildReleaseSearchQuery(album.title, artistName);
          const releaseResults = await musicBrainzService.searchReleases(
            releaseQuery,
            5
          );

          if (releaseResults && releaseResults.length > 0) {
            console.log(
              `📀 Found ${releaseResults.length} release results for "${album.title}"`
            );
            // Find best match based on title similarity
            for (const release of releaseResults) {
              const titleSimilarity = calculateStringSimilarity(
                album.title.toLowerCase(),
                release.title.toLowerCase()
              );
              if (titleSimilarity > 0.8) {
                releaseMatch = release;
                console.log(
                  `🎯 Found release match: "${release.title}" (${(titleSimilarity * 100).toFixed(1)}% similar)`
                );
                break;
              }
            }
          }
        }

        // Step 3: If still no match AND edition detected, search with base title
        let baseMatch = null;
        if (!bestMatch && !releaseMatch && titleAnalysis.isEditionOrVersion) {
          console.log(
            `🔍 Trying base title search: "${titleAnalysis.baseTitle}"`
          );
          apiCallCount++;
          // Build query with base title
          const baseAlbum = { ...album, title: titleAnalysis.baseTitle };
          const baseQuery = buildAlbumSearchQuery(baseAlbum);
          const baseResults = await musicBrainzService.searchReleaseGroups(
            baseQuery,
            5
          );

          if (baseResults && baseResults.length > 0) {
            baseMatch = findBestAlbumMatch(baseAlbum, baseResults);
            if (baseMatch && baseMatch.score > 0.8) {
              console.log(
                `🎯 Found base title match: "${baseMatch.result.title}" (${(baseMatch.score * 100).toFixed(1)}%)`
              );

              // Step 4: Get all releases under this release-group and find the specific edition
              apiCallCount++;
              const releases = await musicBrainzService.getReleaseGroupReleases(
                baseMatch.result.id,
                50
              );
              console.log(
                `📀 Found ${releases.length} releases under "${baseMatch.result.title}"`
              );

              const specificRelease = findBestReleaseMatch(
                releases,
                album.title
              );
              if (specificRelease) {
                console.log(
                  `✅ Found specific edition: "${specificRelease.release.title}" (${(specificRelease.score * 100).toFixed(1)}% match)`
                );
                releaseMatch = {
                  id: specificRelease.release.id,
                  title: specificRelease.release.title,
                  releaseGroup: { id: baseMatch.result.id },
                };
              } else {
                console.log(
                  `⚠️ No specific edition found, using first official release`
                );
                // Use base match, tracks will come from first release
                bestMatch = baseMatch;
              }
            }
          }
        }

        // Process the match we found (either release-group or specific release)
        if (bestMatch && bestMatch.score > 0.8) {
          apiCallCount++;
          const mbData = (await musicBrainzService.getReleaseGroup(
            bestMatch.result.id,
            ['artists', 'tags', 'releases']
          )) as MusicBrainzReleaseGroupData;
          if (mbData) {
            const updateResult = await updateAlbumFromMusicBrainz(
              album,
              mbData
            );
            enrichmentResult = updateResult.updateData;
            allFieldChanges.push(...updateResult.fieldChanges);
            newDataQuality = bestMatch.score > 0.9 ? 'HIGH' : 'MEDIUM';

            if (mbData.title) fieldsEnriched.push('title');
            if (mbData['first-release-date'])
              fieldsEnriched.push('releaseDate');
            if (mbData['artist-credit']) fieldsEnriched.push('artists');
            if (mbData.tags && mbData.tags.length > 0)
              fieldsEnriched.push('genres');

            // Fetch tracks for this album
            if (mbData.releases && mbData.releases.length > 0) {
              try {
                const primaryRelease = mbData.releases[0];
                console.log(
                  `🎵 Fetching tracks for release: ${primaryRelease.title}`
                );

                apiCallCount++;
                const releaseWithTracks = await musicBrainzService.getRelease(
                  primaryRelease.id,
                  ['recordings', 'artist-credits', 'isrcs', 'url-rels']
                );

                if (releaseWithTracks?.media) {
                  const totalTracks = releaseWithTracks.media.reduce(
                    (sum: number, medium: { tracks?: unknown[] }) =>
                      sum + (medium.tracks?.length || 0),
                    0
                  );
                  console.log(
                    `✅ Fetched ${totalTracks} tracks for "${album.title}" in one API call!`
                  );

                  fieldsEnriched.push('tracks');
                  await processMusicBrainzTracksForAlbum(
                    album.id,
                    releaseWithTracks,
                    {
                      jobId: job.id || `enrich-album-${Date.now()}`,
                      parentJobId: data.parentJobId || null,
                      rootJobId: data.parentJobId || job.id || null,
                    }
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
        } else if (releaseMatch) {
          // We found a specific release (edition), fetch its data
          console.log(
            `🎵 Fetching tracks from specific release: "${releaseMatch.title}"`
          );
          apiCallCount++;
          const releaseWithTracks = await musicBrainzService.getRelease(
            releaseMatch.id,
            [
              'recordings',
              'artist-credits',
              'isrcs',
              'url-rels',
              'release-groups',
            ]
          );

          if (releaseWithTracks) {
            // Update album with release-group data if available
            if (releaseMatch.releaseGroup?.id) {
              apiCallCount++;
              const mbData = (await musicBrainzService.getReleaseGroup(
                releaseMatch.releaseGroup.id,
                ['artists', 'tags']
              )) as MusicBrainzReleaseGroupData;
              if (mbData) {
                const updateResult = await updateAlbumFromMusicBrainz(
                  album,
                  mbData
                );
                enrichmentResult = updateResult.updateData;
                allFieldChanges.push(...updateResult.fieldChanges);
                newDataQuality = 'MEDIUM'; // Edition match is medium confidence

                if (mbData.title) fieldsEnriched.push('title');
                if (mbData['first-release-date'])
                  fieldsEnriched.push('releaseDate');
                if (mbData['artist-credit']) fieldsEnriched.push('artists');
                if (mbData.tags && mbData.tags.length > 0)
                  fieldsEnriched.push('genres');
              }
            }

            // Process tracks from the specific release
            if (releaseWithTracks.media) {
              const totalTracks = releaseWithTracks.media.reduce(
                (sum: number, medium: { tracks?: unknown[] }) =>
                  sum + (medium.tracks?.length || 0),
                0
              );
              console.log(
                `✅ Fetched ${totalTracks} tracks from edition "${releaseMatch.title}"`
              );

              fieldsEnriched.push('tracks');
              await processMusicBrainzTracksForAlbum(
                album.id,
                releaseWithTracks,
                {
                  jobId: job.id || `enrich-album-${Date.now()}`,
                  parentJobId: data.parentJobId || null,
                  rootJobId: data.parentJobId || job.id || null,
                }
              );
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

    // ========================================================================
    // Spotify Track Fallback
    // If MusicBrainz search failed to find tracks and album has a Spotify ID,
    // fetch tracks from Spotify as a fallback (lower quality but better than nothing)
    // ========================================================================
    const hasTracksEnriched = fieldsEnriched.includes('tracks');
    if (!hasTracksEnriched && album.spotifyId) {
      console.log(
        `📀 No MusicBrainz tracks found for "${album.title}", trying Spotify fallback...`
      );

      try {
        // Import the Spotify track fetcher
        const { fetchSpotifyAlbumTracks, processSpotifyTracks } = await import(
          '../../spotify/mappers'
        );

        // Fetch tracks from Spotify API
        const spotifyTracks = await fetchSpotifyAlbumTracks(album.spotifyId);

        if (spotifyTracks.length > 0) {
          console.log(
            `🎵 Found ${spotifyTracks.length} tracks from Spotify for "${album.title}"`
          );

          // Build artist ID map from album artists
          const artistIdMap = new Map<string, string>();
          for (const albumArtist of album.artists) {
            if (albumArtist.artist.spotifyId) {
              artistIdMap.set(
                albumArtist.artist.spotifyId,
                albumArtist.artist.id
              );
            }
          }

          // Process and create tracks
          const result = await processSpotifyTracks(
            spotifyTracks,
            album.id,
            artistIdMap,
            {
              parentJobId: job.id || null,
              rootJobId: data.parentJobId || job.id || null,
            }
          );

          if (result.tracksCreated > 0) {
            fieldsEnriched.push('tracks');
            sourcesAttempted.push('SPOTIFY');

            // Set data quality to MEDIUM (better than LOW, but not as good as MusicBrainz HIGH)
            if (newDataQuality === 'LOW') {
              newDataQuality = 'MEDIUM';
            }

            console.log(
              `✅ Created ${result.tracksCreated} tracks from Spotify fallback for "${album.title}"`
            );

            // Log the Spotify fallback as a separate operation with same jobId
            // This links the two log entries together
            await llamaLogger.logEnrichment({
              entityType: 'ALBUM',
              entityId: album.id,
              operation: 'SPOTIFY_TRACK_FALLBACK',
              sources: ['SPOTIFY'],
              status: 'SUCCESS',
              reason:
                'Created tracks from Spotify after MusicBrainz search failed',
              fieldsEnriched: ['tracks'],
              dataQualityBefore,
              dataQualityAfter: newDataQuality,
              durationMs: Date.now() - startTime,
              apiCallCount: apiCallCount + 1,
              metadata: {
                albumTitle: album.title,
                artistName,
                tracksCreated: result.tracksCreated,
                fallbackReason: 'No MusicBrainz match found',
                spotifyId: album.spotifyId,
              },
              jobId: job.id,
              parentJobId: data.parentJobId || null,
              isRootJob: false, // Fallback is always child of album enrichment
              triggeredBy: data.userAction || 'manual',
            });
          } else {
            console.warn(
              `⚠️ Spotify returned tracks but none were created for "${album.title}"`
            );
          }
        } else {
          console.log(
            `⚠️ No tracks available from Spotify for "${album.title}"`
          );
        }
      } catch (spotifyError) {
        console.warn(
          `⚠️ Spotify track fallback failed for "${album.title}":`,
          spotifyError
        );
      }
    }

    // Determine final status
    let finalStatus: 'SUCCESS' | 'NO_DATA_AVAILABLE' | 'PARTIAL_SUCCESS' =
      'SUCCESS';
    if (fieldsEnriched.length === 0 && sourcesAttempted.length > 0) {
      finalStatus = 'NO_DATA_AVAILABLE';
    } else if (
      fieldsEnriched.length > 0 &&
      fieldsEnriched.length < 3 &&
      sourcesAttempted.length > 1
    ) {
      finalStatus = 'PARTIAL_SUCCESS';
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

    // Log successful enrichment
    await llamaLogger.logEnrichment({
      entityType: 'ALBUM',
      entityId: album.id,
      operation: JOB_TYPES.ENRICH_ALBUM,
      sources: sourcesAttempted,
      status: finalStatus,
      fieldsEnriched,
      dataQualityBefore,
      dataQualityAfter: newDataQuality,
      durationMs: Date.now() - startTime,
      apiCallCount,
      metadata: {
        albumTitle: album.title,
        artistName,
        hadMusicBrainzData: !!enrichmentResult,
        fieldChanges: allFieldChanges.map(fc => ({
          field: fc.field,
          before: formatFieldValue(fc.before),
          after: formatFieldValue(fc.after),
        })),
      },
      jobId: job.id,
      parentJobId: data.parentJobId || null,
      isRootJob: !data.parentJobId,
      triggeredBy: data.userAction || 'manual',
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

    // Log failed enrichment
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error';
    const errorCode = error instanceof Error ? error.name : 'UNKNOWN_ERROR';

    await llamaLogger.logEnrichment({
      entityType: 'ALBUM',
      entityId: album.id,
      operation: JOB_TYPES.ENRICH_ALBUM,
      sources: sourcesAttempted,
      status: 'FAILED',
      fieldsEnriched,
      dataQualityBefore,
      dataQualityAfter: album.dataQuality || 'LOW',
      errorMessage,
      errorCode,
      durationMs: Date.now() - startTime,
      apiCallCount,
      metadata: {
        albumTitle: album.title,
        artistName,
        errorStack: error instanceof Error ? error.stack : undefined,
      },
      jobId: job.id,
      parentJobId: data.parentJobId || null,
      isRootJob: !data.parentJobId,
      triggeredBy: data.userAction || 'manual',
    });

    throw error;
  }
}

// ============================================================================
// Artist Enrichment Handler
// ============================================================================

export async function handleEnrichArtist(job: Job<EnrichArtistJobData>) {
  const data = job.data;
  const rootJobId = data.parentJobId || job.id;

  console.log(`🎤 Starting artist enrichment for artist ${data.artistId}`);

  // Initialize enrichment logger
  const llamaLogger = createLlamaLogger(prisma);

  // Track enrichment metrics
  const startTime = Date.now();
  const sourcesAttempted: string[] = [];
  const fieldsEnriched: string[] = [];
  const allFieldChanges: FieldChange[] = [];
  let apiCallCount = 0;

  // Get current artist from database
  const artist = await prisma.artist.findUnique({
    where: { id: data.artistId },
  });

  if (!artist) {
    throw new Error(`Artist not found: ${data.artistId}`);
  }

  const dataQualityBefore = artist.dataQuality || 'LOW';

  // Check if enrichment is needed (with logger for cooldown checks)
  // Skip this check if force=true (admin requested force re-enrichment)
  if (!data.force) {
    const enrichmentDecision = await shouldEnrichArtist(artist, llamaLogger);
    if (!enrichmentDecision.shouldEnrich) {
      console.log(
        `⏭️ Artist ${data.artistId} does not need enrichment, skipping - ${enrichmentDecision.reason}`
      );

      // Reset enrichment status if it was set to IN_PROGRESS by the admin trigger
      if (artist.enrichmentStatus === 'IN_PROGRESS') {
        await prisma.artist.update({
          where: { id: data.artistId },
          data: { enrichmentStatus: 'COMPLETED' },
        });
      }

      // Log the skip with the reason
      await llamaLogger.logEnrichment({
        entityType: 'ARTIST',
        entityId: artist.id,
        operation: JOB_TYPES.ENRICH_ARTIST,
        sources: [],
        status: 'SKIPPED',
        reason: enrichmentDecision.reason,
        fieldsEnriched: [],
        dataQualityBefore,
        dataQualityAfter: artist.dataQuality || 'LOW',
        durationMs: Date.now() - startTime,
        apiCallCount: 0,
        metadata: {
          artistName: artist.name,
          confidence: enrichmentDecision.confidence,
        },
        jobId: job.id,
        parentJobId: data.parentJobId || null,
        isRootJob: !data.parentJobId,
        triggeredBy: data.userAction || 'manual',
      });

      return {
        artistId: data.artistId,
        action: 'skipped',
        reason: enrichmentDecision.reason,
        currentDataQuality: artist.dataQuality,
        lastEnriched: artist.lastEnriched,
      };
    }
  } else {
    console.log(
      `🔄 Force re-enrichment requested for artist ${data.artistId}, bypassing checks`
    );
  }

  // Mark as in progress
  await prisma.artist.update({
    where: { id: data.artistId },
    data: { enrichmentStatus: 'IN_PROGRESS' },
  });

  try {
    let enrichmentResult: EnrichmentUpdateResult = {
      updateData: null,
      fieldChanges: [],
    };
    let newDataQuality = artist.dataQuality || 'LOW';
    const allFieldChanges: FieldChange[] = [];

    // If we have a MusicBrainz ID, fetch detailed data
    if (artist.musicbrainzId) {
      try {
        sourcesAttempted.push('MUSICBRAINZ');
        apiCallCount++;
        const mbData = await musicBrainzService.getArtist(
          artist.musicbrainzId,
          ['url-rels', 'tags']
        );
        if (mbData) {
          enrichmentResult = await enrichArtistMetadata(artist, mbData);
          allFieldChanges.push(...enrichmentResult.fieldChanges);
          newDataQuality = 'HIGH';

          if (mbData.name) fieldsEnriched.push('name');
          if (mbData.country) fieldsEnriched.push('countryCode');
          if (mbData['life-span']?.begin) fieldsEnriched.push('formedYear');
          if (mbData.disambiguation) fieldsEnriched.push('biography');
        }
      } catch (mbError) {
        console.warn(
          `MusicBrainz lookup failed for artist ${data.artistId}:`,
          mbError
        );
      }
    }

    // If no MusicBrainz ID or lookup failed, try searching
    if (!enrichmentResult.updateData && artist.name) {
      try {
        if (!sourcesAttempted.includes('MUSICBRAINZ')) {
          sourcesAttempted.push('MUSICBRAINZ');
        }
        apiCallCount++;
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

          const bestMatch = findBestArtistMatch(artist, searchResults);
          console.log(
            `🎯 Best artist match: ${
              bestMatch
                ? `"${bestMatch.result.name}" - Combined: ${(bestMatch.score * 100).toFixed(1)}% (MB: ${bestMatch.mbScore}, Jaccard: ${(bestMatch.jaccardScore * 100).toFixed(1)}%)`
                : 'None found'
            }`
          );

          if (bestMatch && bestMatch.score > 0.8) {
            apiCallCount++;
            const mbData = await musicBrainzService.getArtist(
              bestMatch.result.id,
              ['url-rels', 'tags']
            );
            if (mbData) {
              enrichmentResult = await enrichArtistMetadata(artist, mbData);
              allFieldChanges.push(...enrichmentResult.fieldChanges);
              newDataQuality = bestMatch.score > 0.9 ? 'HIGH' : 'MEDIUM';

              if (mbData.name) fieldsEnriched.push('name');
              if (mbData.country) fieldsEnriched.push('countryCode');
              if (mbData['life-span']?.begin) fieldsEnriched.push('formedYear');
              if (mbData.disambiguation) fieldsEnriched.push('biography');
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
    if (!enrichmentResult.updateData && !artist.discogsId && !artist.imageUrl) {
      console.log(
        `🔍 No Discogs ID found for "${artist.name}", queueing Discogs search as fallback`
      );
      try {
        const queue = await import('../musicbrainz-queue').then(m =>
          m.getMusicBrainzQueue()
        );
        await queue.addJob(
          JOB_TYPES.DISCOGS_SEARCH_ARTIST,
          {
            artistId: artist.id,
            artistName: artist.name,
            requestId: `${data.requestId}-discogs-search`,
            parentJobId: rootJobId,
          },
          {
            priority: 7,
            attempts: 2,
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

    // Determine final status
    let finalStatus: 'SUCCESS' | 'NO_DATA_AVAILABLE' | 'PARTIAL_SUCCESS' =
      'SUCCESS';
    if (fieldsEnriched.length === 0 && sourcesAttempted.length > 0) {
      finalStatus = 'NO_DATA_AVAILABLE';
    } else if (
      fieldsEnriched.length > 0 &&
      fieldsEnriched.length < 3 &&
      sourcesAttempted.length > 1
    ) {
      finalStatus = 'PARTIAL_SUCCESS';
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
      hadResult: !!enrichmentResult.updateData,
      dataQuality: newDataQuality,
      fieldChanges: allFieldChanges.length,
    });

    // Log successful enrichment
    await llamaLogger.logEnrichment({
      entityType: 'ARTIST',
      entityId: artist.id,
      operation: JOB_TYPES.ENRICH_ARTIST,
      sources: sourcesAttempted,
      status: finalStatus,
      fieldsEnriched,
      dataQualityBefore,
      dataQualityAfter: newDataQuality,
      durationMs: Date.now() - startTime,
      apiCallCount,
      metadata: {
        artistName: artist.name,
        hadMusicBrainzData: !!enrichmentResult.updateData,
        fieldChanges: allFieldChanges.map(fc => ({
          field: fc.field,
          before: formatFieldValue(fc.before),
          after: formatFieldValue(fc.after),
        })),
      },
      jobId: job.id,
      parentJobId: data.parentJobId || null,
      isRootJob: !data.parentJobId,
      triggeredBy: data.userAction || 'manual',
    });

    // Queue artist image caching to Cloudflare (non-blocking)
    const enrichedArtist = await prisma.artist.findUnique({
      where: { id: data.artistId },
      select: { imageUrl: true, cloudflareImageId: true },
    });

    if (enrichedArtist?.imageUrl && !enrichedArtist.cloudflareImageId) {
      try {
        const queue = await import('../musicbrainz-queue').then(m =>
          m.getMusicBrainzQueue()
        );
        const cacheJobData: CacheArtistImageJobData = {
          artistId: data.artistId,
          requestId: `enrich-cache-artist-${data.artistId}`,
          parentJobId: rootJobId,
        };

        await queue.addJob(JOB_TYPES.CACHE_ARTIST_IMAGE, cacheJobData, {
          priority: 5,
          attempts: 3,
          backoff: { type: 'exponential', delay: 2000 },
        });

        console.log(`📤 Queued artist image caching for ${data.artistId}`);
      } catch (cacheError) {
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

    // Log failed enrichment
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error';
    const errorCode = error instanceof Error ? error.name : 'UNKNOWN_ERROR';

    await llamaLogger.logEnrichment({
      entityType: 'ARTIST',
      entityId: artist.id,
      operation: JOB_TYPES.ENRICH_ARTIST,
      sources: sourcesAttempted,
      status: 'FAILED',
      fieldsEnriched,
      dataQualityBefore,
      dataQualityAfter: artist.dataQuality || 'LOW',
      errorMessage,
      errorCode,
      durationMs: Date.now() - startTime,
      apiCallCount,
      metadata: {
        artistName: artist.name,
        errorStack: error instanceof Error ? error.stack : undefined,
      },
      jobId: job.id,
      parentJobId: data.parentJobId || null,
      isRootJob: !data.parentJobId,
      triggeredBy: data.userAction || 'manual',
    });

    throw error;
  }
}

// ============================================================================
// Track Enrichment Handler
// ============================================================================

export async function handleEnrichTrack(job: Job<EnrichTrackJobData>) {
  const data = job.data;
  console.log(`🎵 Enriching track ${data.trackId}`);

  // Initialize enrichment logger
  const llamaLogger = createLlamaLogger(prisma);

  // Track enrichment metrics
  const startTime = Date.now();
  const sourcesAttempted: string[] = [];
  const fieldsEnriched: string[] = [];
  let apiCallCount = 0;

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

    const dataQualityBefore = track.dataQuality || 'LOW';
    const artistName = track.artists[0]?.artist?.name || 'Unknown Artist';

    let musicbrainzData = null;
    let matchFound = false;

    // Try ISRC lookup first (most reliable)
    if (track.isrc) {
      try {
        sourcesAttempted.push('MUSICBRAINZ');
        apiCallCount++;
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
          fieldsEnriched.push('musicbrainzId');
        }
      } catch (error) {
        console.warn(`⚠️ ISRC lookup failed for ${track.isrc}:`, error);
      }
    }

    // If no ISRC match, try title + artist search
    if (!matchFound) {
      try {
        if (!sourcesAttempted.includes('MUSICBRAINZ')) {
          sourcesAttempted.push('MUSICBRAINZ');
        }
        apiCallCount++;
        const searchQuery = `recording:"${track.title}" AND artist:"${artistName}"`;

        console.log(`🔍 Searching MusicBrainz for: ${searchQuery}`);

        const recordings = await musicBrainzService.searchRecordings(
          searchQuery,
          10
        );

        if (recordings.length > 0) {
          const bestMatch = findBestTrackMatch(track, recordings);
          if (bestMatch) {
            console.log(`✅ Found track match with score ${bestMatch.score}`);
            musicbrainzData = bestMatch;
            matchFound = true;
            fieldsEnriched.push('musicbrainzId');
          }
        }
      } catch (error) {
        console.warn(`⚠️ Track search failed:`, error);
      }
    }

    // Update track with enrichment results
    const updateData: Record<string, unknown> = {
      lastEnriched: new Date(),
    };

    if (matchFound && musicbrainzData) {
      // Check if another track on this album already has this MusicBrainz ID
      const existingTrack = await prisma.track.findFirst({
        where: {
          albumId: track.albumId,
          musicbrainzId: musicbrainzData.id,
          NOT: { id: track.id },
        },
        select: { id: true, title: true },
      });

      if (existingTrack) {
        console.warn(
          `⚠️ Skipping musicbrainzId - already used by track "${existingTrack.title}" on same album`
        );
        matchFound = false; // Don't count as enriched
        fieldsEnriched.splice(fieldsEnriched.indexOf('musicbrainzId'), 1);
      } else {
        updateData.musicbrainzId = musicbrainzData.id;
      }

      // Fetch detailed recording data with relationships
      try {
        apiCallCount++;
        const detailedRecording = await musicBrainzService.getRecording(
          musicbrainzData.id,
          ['artist-credits', 'releases', 'isrcs', 'url-rels', 'tags']
        );

        if (detailedRecording) {
          console.log(`🎵 Enhanced track data fetched for "${track.title}"`);
          if (detailedRecording.length) fieldsEnriched.push('durationMs');
          if (detailedRecording.isrcs?.length) fieldsEnriched.push('isrc');
        }
      } catch (error) {
        console.warn(`⚠️ Failed to fetch detailed recording data:`, error);
      }
    }

    await (prisma.track as any).update({
      where: { id: track.id },
      data: updateData,
    });

    // Determine final status
    const newDataQuality = matchFound ? 'MEDIUM' : 'LOW';
    let finalStatus: 'SUCCESS' | 'NO_DATA_AVAILABLE' | 'PARTIAL_SUCCESS' =
      'SUCCESS';
    if (fieldsEnriched.length === 0 && sourcesAttempted.length > 0) {
      finalStatus = 'NO_DATA_AVAILABLE';
    } else if (fieldsEnriched.length > 0 && fieldsEnriched.length < 2) {
      finalStatus = 'PARTIAL_SUCCESS';
    }

    const duration = Date.now() - startTime;
    console.log(
      `✅ Track enrichment completed in ${duration}ms (${matchFound ? 'enriched' : 'no match'})`
    );

    // Log successful enrichment
    await llamaLogger.logEnrichment({
      entityType: 'TRACK',
      entityId: track.id,
      operation: JOB_TYPES.ENRICH_TRACK,
      sources: sourcesAttempted,
      status: finalStatus,
      fieldsEnriched,
      dataQualityBefore,
      dataQualityAfter: newDataQuality,
      durationMs: duration,
      apiCallCount,
      metadata: {
        trackTitle: track.title,
        artistName,
        hadMusicBrainzData: !!musicbrainzData,
      },
      jobId: job.id,
      parentJobId: data.parentJobId || null,
      isRootJob: !data.parentJobId,
      triggeredBy: data.userAction || 'manual',
    });

    return {
      success: true,
      data: {
        trackId: track.id,
        action: matchFound ? 'enriched' : 'no_match_found',
        dataQuality: newDataQuality,
        hadMusicBrainzData: !!musicbrainzData,
        enrichmentTimestamp: updateData.lastEnriched,
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

    // Get track for logging (in case error happened before we fetched it)
    let trackTitle = 'Unknown Track';
    let trackArtistName = 'Unknown Artist';
    let trackDataQualityBefore: 'LOW' | 'MEDIUM' | 'HIGH' = 'LOW';
    try {
      const track = await prisma.track.findUnique({
        where: { id: data.trackId },
        include: {
          artists: {
            include: {
              artist: {
                select: {
                  name: true,
                },
              },
            },
          },
        },
      });
      if (track) {
        trackTitle = track.title;
        trackArtistName = track.artists[0]?.artist?.name || 'Unknown Artist';
        trackDataQualityBefore =
          (track.dataQuality as 'LOW' | 'MEDIUM' | 'HIGH') || 'LOW';
      }
    } catch {
      // Ignore errors when fetching track for logging
    }

    // Update track status to failed
    await (prisma.track as any).update({
      where: { id: data.trackId },
      data: {
        lastEnriched: new Date(),
      },
    });

    // Log failed enrichment
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error';
    const errorCode = error instanceof Error ? error.name : 'UNKNOWN_ERROR';

    await llamaLogger.logEnrichment({
      entityType: 'TRACK',
      entityId: data.trackId,
      operation: JOB_TYPES.ENRICH_TRACK,
      sources: sourcesAttempted,
      status: 'FAILED',
      fieldsEnriched,
      dataQualityBefore: trackDataQualityBefore,
      dataQualityAfter: trackDataQualityBefore,
      errorMessage,
      errorCode,
      durationMs: duration,
      apiCallCount,
      metadata: {
        trackTitle,
        artistName: trackArtistName,
        errorStack: error instanceof Error ? error.stack : undefined,
      },
      jobId: job.id,
      parentJobId: data.parentJobId || null,
      isRootJob: !data.parentJobId,
      triggeredBy: data.userAction || 'manual',
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

// ============================================================================
// Helper Functions
// ============================================================================

interface MusicBrainzReleaseGroupData {
  id: string;
  title?: string;
  'first-release-date'?: string;
  'primary-type'?: string;
  'secondary-types'?: string[];
  status?: string;
  'artist-credit'?: Array<{
    name: string;
    artist: { id: string; name: string };
  }>;
  tags?: Array<{ name: string; count?: number }>;
  releases?: Array<{ id: string; title: string; country?: string }>;
}

async function updateAlbumFromMusicBrainz(
  album: {
    id: string;
    title: string;
    musicbrainzId: string | null;
    releaseDate: Date | null;
    releaseType: string | null;
    genres: string[] | null;
    secondaryTypes: string[] | null;
    releaseStatus: string | null;
    releaseCountry: string | null;
  },
  mbData: MusicBrainzReleaseGroupData
): Promise<EnrichmentUpdateResult> {
  const updateData: Record<string, unknown> = {};
  const fieldChanges: FieldChange[] = [];

  if (mbData.id && !album.musicbrainzId) {
    updateData.musicbrainzId = mbData.id;
    fieldChanges.push({
      field: 'musicbrainzId',
      before: album.musicbrainzId,
      after: mbData.id,
    });
  }

  if (mbData.title && mbData.title !== album.title) {
    updateData.title = mbData.title;
    fieldChanges.push({
      field: 'title',
      before: album.title,
      after: mbData.title,
    });
  }

  if (mbData['first-release-date'] && !album.releaseDate) {
    try {
      const newDate = new Date(mbData['first-release-date']);
      updateData.releaseDate = newDate;
      fieldChanges.push({
        field: 'releaseDate',
        before: album.releaseDate,
        after: mbData['first-release-date'],
      });
    } catch (e) {
      console.warn(
        'Invalid release date from MusicBrainz:',
        mbData['first-release-date']
      );
    }
  }

  if (mbData['primary-type'] && !album.releaseType) {
    updateData.releaseType = mbData['primary-type'];
    fieldChanges.push({
      field: 'releaseType',
      before: album.releaseType,
      after: mbData['primary-type'],
    });
  }

  // Extract genre tags from MusicBrainz
  if (mbData.tags && mbData.tags.length > 0) {
    const genres = mbData.tags
      .sort((a, b) => (b.count || 0) - (a.count || 0))
      .slice(0, 5)
      .map(tag => tag.name);
    updateData.genres = genres;
    fieldChanges.push({
      field: 'genres',
      before: album.genres,
      after: genres,
    });
  }

  // Extract secondary types (live, compilation, etc.)
  if (mbData['secondary-types'] && mbData['secondary-types'].length > 0) {
    updateData.secondaryTypes = mbData['secondary-types'];
    fieldChanges.push({
      field: 'secondaryTypes',
      before: album.secondaryTypes,
      after: mbData['secondary-types'],
    });
  }

  // Extract release status (official, promotion, bootleg, etc.)
  if (mbData.status && mbData.status !== album.releaseStatus) {
    updateData.releaseStatus = mbData.status;
    fieldChanges.push({
      field: 'releaseStatus',
      before: album.releaseStatus,
      after: mbData.status,
    });
  }

  // Extract release country from releases
  if (mbData.releases && mbData.releases.length > 0) {
    const releaseWithCountry = mbData.releases.find(release => release.country);
    if (
      releaseWithCountry?.country &&
      releaseWithCountry.country !== album.releaseCountry
    ) {
      updateData.releaseCountry = releaseWithCountry.country;
      fieldChanges.push({
        field: 'releaseCountry',
        before: album.releaseCountry,
        after: releaseWithCountry.country,
      });
    }
  }

  if (Object.keys(updateData).length > 0) {
    // Check if another album already has this MusicBrainz ID before updating
    if (updateData.musicbrainzId) {
      const existingAlbum = await prisma.album.findUnique({
        where: { musicbrainzId: updateData.musicbrainzId as string },
      });

      if (existingAlbum && existingAlbum.id !== album.id) {
        console.log(
          `⚠️ Duplicate MusicBrainz ID detected: Album ${album.id} ("${album.title}") would get MusicBrainz ID ${updateData.musicbrainzId}, but it's already used by album ${existingAlbum.id} ("${existingAlbum.title}")`
        );
        console.log(
          `   → Skipping MusicBrainz ID update to avoid constraint violation`
        );

        delete updateData.musicbrainzId;
        // Remove from fieldChanges too
        const mbIdIndex = fieldChanges.findIndex(
          fc => fc.field === 'musicbrainzId'
        );
        if (mbIdIndex !== -1) fieldChanges.splice(mbIdIndex, 1);

        if (Object.keys(updateData).length === 0) {
          console.log(
            `   → No other fields to update, skipping database update`
          );
          return { updateData: null, fieldChanges: [] };
        }
      }
    }

    await prisma.album.update({
      where: { id: album.id },
      data: updateData,
    });
    return { updateData, fieldChanges };
  }

  return { updateData: null, fieldChanges: [] };
}

interface MusicBrainzArtistData {
  id: string;
  name?: string;
  country?: string;
  area?: { iso?: string; name?: string };
  type?: string;
  'life-span'?: { begin?: string };
  disambiguation?: string;
  tags?: Array<{ name: string; count?: number }>;
  relations?: Array<{
    type: string;
    url?: { resource: string };
  }>;
}

async function enrichArtistMetadata(
  artist: {
    id: string;
    name: string;
    musicbrainzId: string | null;
    formedYear: number | null;
    countryCode: string | null;
    discogsId: string | null;
    imageUrl: string | null;
    genres: string[] | null;
    area?: string | null;
    artistType?: string | null;
  },
  mbData: MusicBrainzArtistData
): Promise<EnrichmentUpdateResult> {
  const updateData: Record<string, unknown> = {};
  const fieldChanges: FieldChange[] = [];

  if (mbData.id && !artist.musicbrainzId) {
    updateData.musicbrainzId = mbData.id;
    fieldChanges.push({
      field: 'musicbrainzId',
      before: artist.musicbrainzId,
      after: mbData.id,
    });
  }

  if (mbData.name && mbData.name !== artist.name) {
    updateData.name = mbData.name;
    fieldChanges.push({
      field: 'name',
      before: artist.name,
      after: mbData.name,
    });
  }

  if (mbData['life-span']?.begin && !artist.formedYear) {
    try {
      const formedYear = parseInt(mbData['life-span'].begin.substring(0, 4));
      updateData.formedYear = formedYear;
      fieldChanges.push({
        field: 'formedYear',
        before: artist.formedYear,
        after: formedYear,
      });
    } catch (e) {
      console.warn(
        'Invalid formed year from MusicBrainz:',
        mbData['life-span']?.begin
      );
    }
  }

  if (mbData.area?.iso && !artist.countryCode) {
    const countryCode = mbData.area.iso.substring(0, 2);
    updateData.countryCode = countryCode;
    fieldChanges.push({
      field: 'countryCode',
      before: artist.countryCode,
      after: countryCode,
    });
  }

  // Extract full area name (country/region)
  if (mbData.area?.name && mbData.area.name !== artist.area) {
    updateData.area = mbData.area.name;
    fieldChanges.push({
      field: 'area',
      before: artist.area,
      after: mbData.area.name,
    });
  }

  // Extract artist type (Group, Person, etc.)
  if (mbData.type && mbData.type !== artist.artistType) {
    updateData.artistType = mbData.type;
    fieldChanges.push({
      field: 'artistType',
      before: artist.artistType,
      after: mbData.type,
    });
  }

  // Extract genre tags from MusicBrainz
  if (mbData.tags && mbData.tags.length > 0) {
    const genres = mbData.tags
      .sort((a, b) => (b.count || 0) - (a.count || 0))
      .slice(0, 5)
      .map(tag => tag.name);
    const genresChanged =
      JSON.stringify(genres) !== JSON.stringify(artist.genres);
    if (genresChanged) {
      updateData.genres = genres;
      fieldChanges.push({
        field: 'genres',
        before: artist.genres,
        after: genres,
      });
    }
  }

  // Extract Discogs ID from MusicBrainz relations
  if (mbData.relations && !artist.discogsId) {
    const discogsRel = mbData.relations.find(rel => rel.type === 'discogs');
    if (discogsRel?.url?.resource) {
      const discogsMatch = discogsRel.url.resource.match(/\/artist\/(\d+)/);
      if (discogsMatch) {
        updateData.discogsId = discogsMatch[1];
        fieldChanges.push({
          field: 'discogsId',
          before: artist.discogsId,
          after: discogsMatch[1],
        });
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
      let bestMatch = null;
      let bestScore = 0;

      for (const result of spotifyResults) {
        const nameScore = calculateStringSimilarity(
          artist.name.toLowerCase(),
          result.name.toLowerCase()
        );

        let genreScore = 0;
        if (
          artist.genres?.length &&
          result.genres &&
          result.genres.length > 0
        ) {
          const artistGenres = new Set(
            artist.genres.map((g: string) => g.toLowerCase())
          );
          const spotifyGenres = new Set(
            result.genres.map((g: string) => g.toLowerCase())
          );
          const intersection = new Set(
            [...artistGenres].filter(g => spotifyGenres.has(g))
          );
          const union = new Set([...artistGenres, ...spotifyGenres]);
          genreScore = intersection.size / union.size;
        }

        const popularityBoost = (result.popularity || 0) / 100;
        const combinedScore =
          nameScore * 0.6 + genreScore * 0.3 + popularityBoost * 0.1;
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
      }
    }
  } catch (error) {
    console.warn(
      `Failed to fetch Spotify image for artist ${artist.id}:`,
      error
    );
  }

  // 2. Try Discogs (only if no Spotify image)
  const discogsId = (updateData.discogsId as string) || artist.discogsId;
  const hasDiscogsImage = artist.imageUrl?.includes('discogs.com');

  if (!imageUrl && discogsId && !hasDiscogsImage) {
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
      const wikidataRel = mbData.relations.find(rel => rel.type === 'wikidata');
      if (wikidataRel?.url?.resource) {
        const qidMatch = wikidataRel.url.resource.match(/\/wiki\/(Q\d+)/);
        if (qidMatch) {
          const qid = qidMatch[1];
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

  if (imageUrl && imageUrl !== artist.imageUrl) {
    updateData.imageUrl = imageUrl;
    fieldChanges.push({
      field: 'imageUrl',
      before: artist.imageUrl,
      after: imageUrl,
    });
  }

  if (Object.keys(updateData).length > 0) {
    // Check if another artist already has this MusicBrainz ID before updating
    if (updateData.musicbrainzId) {
      const existingArtist = await prisma.artist.findUnique({
        where: { musicbrainzId: updateData.musicbrainzId as string },
      });

      if (existingArtist && existingArtist.id !== artist.id) {
        console.log(
          `⚠️ Duplicate MusicBrainz ID detected: Artist ${artist.id} ("${artist.name}") would get MusicBrainz ID ${updateData.musicbrainzId}, but it's already used by artist ${existingArtist.id} ("${existingArtist.name}")`
        );
        console.log(
          `   → Skipping MusicBrainz ID update to avoid constraint violation`
        );

        delete updateData.musicbrainzId;
        // Remove from fieldChanges too
        const mbIdIndex = fieldChanges.findIndex(
          fc => fc.field === 'musicbrainzId'
        );
        if (mbIdIndex !== -1) fieldChanges.splice(mbIdIndex, 1);

        if (Object.keys(updateData).length === 0) {
          console.log(
            `   → No other fields to update, skipping database update`
          );
          return { updateData: null, fieldChanges: [] };
        }
      }
    }

    await prisma.artist.update({
      where: { id: artist.id },
      data: updateData,
    });
    return { updateData, fieldChanges };
  }

  return { updateData: null, fieldChanges: [] };
}

// ============================================================================
// Bulk Track Processing from MusicBrainz
// ============================================================================

interface MusicBrainzMedium {
  position?: number;
  format?: string;
  tracks?: MusicBrainzTrack[];
}

interface MusicBrainzTrack {
  position: number;
  recording: MusicBrainzRecording;
}

interface MusicBrainzRecording {
  id: string;
  title: string;
  length?: number;
  isrcs?: string[];
  relations?: MusicBrainzRecordingDetail['relations'];
  'url-rels'?: MusicBrainzRecordingDetail['relations'];
  'artist-credit'?: Array<{
    name?: string;
    artist?: { id: string; name: string };
  }>;
}

interface MusicBrainzRelease {
  media?: MusicBrainzMedium[];
}

/**
 * Process all tracks for an album from MusicBrainz release data
 * This is MUCH more efficient than individual track enrichment jobs
 */
async function processMusicBrainzTracksForAlbum(
  albumId: string,
  mbRelease: MusicBrainzRelease,
  jobContext?: {
    jobId: string;
    parentJobId?: string | null;
    rootJobId?: string | null;
  }
) {
  // Initialize logger for track creation logging
  const llamaLogger = createLlamaLogger(prisma);
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

    // Filter media to only include audio formats (skip DVD-Video, Blu-ray, etc.)
    const audioMedia = (mbRelease.media || []).filter(medium => {
      const format = medium.format?.toLowerCase() || '';

      if (format.includes('dvd') && format.includes('video')) return false;
      if (format.includes('dvd-video')) return false;
      if (format.includes('blu-ray')) return false;
      if (format.includes('vhs')) return false;
      if (format.includes('laserdisc')) return false;

      return true;
    });

    console.log(
      `📀 Found ${mbRelease.media?.length || 0} total media, ${audioMedia.length} audio media (filtered out video formats)`
    );

    // Process each disc/medium
    for (const medium of audioMedia) {
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
            const updateData: Record<string, unknown> = {
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
              const youtubeUrl = extractYouTubeUrl(
                mbRecording as MusicBrainzRecordingDetail
              );
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

            // Remove from available pool so it can't be matched again
            const index = existingTracks.indexOf(matchingTrack);
            if (index > -1) {
              existingTracks.splice(index, 1);
            }
          } else {
            // Create missing track from MusicBrainz data
            try {
              // Check if this musicbrainzId already exists for this album (duplicate detection)
              const existingTrackWithSameMbId = await prisma.track.findFirst({
                where: {
                  albumId,
                  musicbrainzId: mbRecording.id,
                },
                select: {
                  id: true,
                  title: true,
                  trackNumber: true,
                },
              });

              if (existingTrackWithSameMbId) {
                // Log duplicate for investigation
                console.warn(
                  `⚠️ DUPLICATE RECORDING DETECTED: "${mbRecording.title}" at position ${trackNumber} ` +
                    `has same MusicBrainz ID (${mbRecording.id}) as existing track ` +
                    `"${existingTrackWithSameMbId.title}" at position ${existingTrackWithSameMbId.trackNumber}. ` +
                    `Album ID: ${albumId}. Skipping duplicate.`
                );
                tracksProcessed++;
                continue; // Skip this duplicate track
              }

              console.log(
                `🆕 Creating new track: "${mbRecording.title}" (${trackNumber})`
              );

              const isrc =
                mbRecording.isrcs && mbRecording.isrcs.length > 0
                  ? mbRecording.isrcs[0]
                  : null;

              const youtubeUrl = extractYouTubeUrl(
                mbRecording as MusicBrainzRecordingDetail
              );

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
                  explicit: false,
                  previewUrl: null,
                  musicbrainzId: mbRecording.id,
                  isrc,
                  youtubeUrl,
                  dataQuality: 'HIGH',
                  enrichmentStatus: 'COMPLETED',
                  lastEnriched: new Date(),
                },
              });

              // Log track creation to LlamaLog
              const trackJobId = `track-${newTrack.id}`;
              try {
                await llamaLogger.logEnrichment({
                  entityType: 'TRACK',
                  entityId: newTrack.id,
                  operation: 'track:created:enrichment',
                  category: 'CREATED',
                  sources: ['MUSICBRAINZ'],
                  status: 'SUCCESS',
                  fieldsEnriched: ['title', 'trackNumber', 'durationMs', 'musicbrainzId', 'isrc', 'youtubeUrl'].filter(
                    f => (newTrack as Record<string, unknown>)[f] !== null && (newTrack as Record<string, unknown>)[f] !== undefined
                  ),
                  jobId: trackJobId,
                  parentJobId: jobContext?.jobId || null,
                  rootJobId: jobContext?.rootJobId || jobContext?.jobId || null,
                  isRootJob: false,
                  dataQualityAfter: 'HIGH',
                  metadata: {
                    albumId,
                    trackNumber,
                    discNumber,
                    mbRecordingId: mbRecording.id,
                  },
                });
              } catch (logErr) {
                console.warn('[LlamaLog] Failed to log track creation:', logErr);
              }

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
                    let dbArtist = await prisma.artist.findFirst({
                      where: {
                        OR: [
                          { musicbrainzId: mbArtist.artist?.id },
                          { name: { equals: artistName, mode: 'insensitive' } },
                        ],
                      },
                    });

                    // Track if artist was newly created vs found existing
                    const artistWasCreated = !dbArtist;

                    if (!dbArtist) {
                      dbArtist = await prisma.artist.create({
                        data: {
                          name: artistName,
                          musicbrainzId: mbArtist.artist?.id || null,
                          dataQuality: 'MEDIUM',
                          enrichmentStatus: 'PENDING',
                          lastEnriched: null,
                        },
                      });
                      console.log(`🎤 Created new artist: "${artistName}"`);

                      // Log artist creation to LlamaLog
                      try {
                        await llamaLogger.logEnrichment({
                          entityType: 'ARTIST',
                          entityId: dbArtist.id,
                          operation: 'artist:created:track-child',
                          category: 'CREATED',
                          sources: ['MUSICBRAINZ'],
                          status: 'SUCCESS',
                          fieldsEnriched: ['name', 'musicbrainzId'],
                          parentJobId: jobContext?.jobId || null,
                          rootJobId: jobContext?.rootJobId || jobContext?.jobId || null,
                          isRootJob: false,
                          dataQualityAfter: 'MEDIUM',
                          metadata: {
                            trackId: newTrack.id,
                            trackTitle: mbRecording.title,
                            mbArtistId: mbArtist.artist?.id,
                          },
                        });
                      } catch (err) {
                        console.warn('[LlamaLog] Failed to log artist creation:', err);
                      }
                    } else if (!artistWasCreated) {
                      // Log artist linking to LlamaLog (existing artist associated with track)
                      try {
                        await llamaLogger.logEnrichment({
                          entityType: 'ARTIST',
                          entityId: dbArtist.id,
                          operation: 'artist:linked:track-association',
                          category: 'LINKED',
                          sources: ['MUSICBRAINZ'],
                          status: 'SUCCESS',
                          fieldsEnriched: [],
                          parentJobId: jobContext?.jobId || null,
                          rootJobId: jobContext?.rootJobId || jobContext?.jobId || null,
                          isRootJob: false,
                          metadata: {
                            trackId: newTrack.id,
                            trackTitle: mbRecording.title,
                            existingEntity: true,
                          },
                        });
                      } catch (err) {
                        console.warn('[LlamaLog] Failed to log artist linking:', err);
                      }
                    }

                    await prisma.trackArtist.create({
                      data: {
                        trackId: newTrack.id,
                        artistId: dbArtist.id,
                        role: artistIndex === 0 ? 'primary' : 'featured',
                        position: artistIndex,
                      },
                    });
                  }
                }
              }

              tracksMatched++;
              tracksUpdated++;

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

              // Log track creation failure
              try {
                await llamaLogger.logEnrichment({
                  entityType: 'TRACK',
                  entityId: null,
                  operation: 'track:failed:enrichment',
                  category: 'FAILED',
                  sources: ['MUSICBRAINZ'],
                  status: 'FAILED',
                  fieldsEnriched: [],
                  parentJobId: jobContext?.jobId || null,
                  rootJobId: jobContext?.rootJobId || jobContext?.jobId || null,
                  isRootJob: false,
                  errorMessage: trackError instanceof Error ? trackError.message : String(trackError),
                  metadata: {
                    albumId,
                    attemptedTitle: mbRecording.title,
                    attemptedTrackNumber: trackNumber,
                  },
                });
              } catch (logErr) {
                console.warn('[LlamaLog] Failed to log track failure:', logErr);
              }
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
 * Extract YouTube URL from MusicBrainz recording URL relationships
 */
function extractYouTubeUrl(
  mbRecording: MusicBrainzRecordingDetail
): string | null {
  // Check both 'relations' and 'url-rels' fields
  // @ts-expect-error - Handling different MusicBrainz API response formats
  const relations = mbRecording.relations || mbRecording['url-rels'] || [];

  if (relations.length === 0) return null;

  for (const relation of relations) {
    const relationType = relation.type || (relation as any)['target-type'];
    const relationUrl =
      relation.url?.resource ||
      (relation as any).url ||
      (relation as any).target;

    if (!relationUrl) continue;

    if (relationType === 'youtube' && relationUrl) {
      console.log(`🎬 Found direct YouTube relation: ${relationUrl}`);
      return relationUrl;
    }

    if (relationType === 'streaming music' && relationUrl) {
      if (
        relationUrl.includes('youtube.com') ||
        relationUrl.includes('youtu.be')
      ) {
        console.log(`🎬 Found YouTube in streaming music: ${relationUrl}`);
        return relationUrl;
      }
    }

    if (relationType === 'free streaming' && relationUrl) {
      if (
        relationUrl.includes('youtube.com') ||
        relationUrl.includes('youtu.be')
      ) {
        console.log(`🎬 Found YouTube in free streaming: ${relationUrl}`);
        return relationUrl;
      }
    }

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
