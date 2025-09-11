// src/lib/queue/musicbrainz-processor.ts
import { Job } from 'bullmq';
import { musicBrainzService } from '../musicbrainz';
import { prisma } from '@/lib/prisma';
import {
  shouldEnrichAlbum,
  shouldEnrichArtist,
  calculateEnrichmentPriority,
  mapSourceToUserAction,
} from '../musicbrainz/enrichment-logic';
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
  type EnrichAlbumJobData,
  type EnrichArtistJobData,
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
          results: [{
            id: 'bladee-the-fool-slow',
            title: query,
            processingType: 'SLOW_MOCK',
            duration: `${delaySeconds}s`
          }],
          totalResults: 1,
          processingTime: `${delaySeconds * 1000}ms`
        },
        metadata: {
          duration: delaySeconds * 1000,
          timestamp: new Date().toISOString(),
          requestId
        }
      };
    }

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

      case JOB_TYPES.CHECK_ALBUM_ENRICHMENT:
        result = await handleCheckAlbumEnrichment(job.data as CheckAlbumEnrichmentJobData);
        break;

      case JOB_TYPES.CHECK_ARTIST_ENRICHMENT:
        result = await handleCheckArtistEnrichment(job.data as CheckArtistEnrichmentJobData);
        break;

      case JOB_TYPES.ENRICH_ALBUM:
        result = await handleEnrichAlbum(job.data as EnrichAlbumJobData);
        break;

      case JOB_TYPES.ENRICH_ARTIST:
        result = await handleEnrichArtist(job.data as EnrichArtistJobData);
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

async function handleSearchRecordings(data: MusicBrainzSearchRecordingsJobData) {
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

async function handleLookupReleaseGroup(data: MusicBrainzLookupReleaseGroupJobData) {
  return await musicBrainzService.getReleaseGroup(data.mbid, data.includes);
}

async function handleCheckAlbumEnrichment(data: CheckAlbumEnrichmentJobData) {
  console.log(`🔍 Checking if album ${data.albumId} needs enrichment (source: ${data.source})`);
  
  // Get album with current enrichment status
  const album = await prisma.album.findUnique({
    where: { id: data.albumId },
    include: { artists: { include: { artist: true } } }
  });

  if (!album) {
    console.warn(`Album ${data.albumId} not found for enrichment check`);
    return {
      albumId: data.albumId,
      action: 'skipped',
      reason: 'album_not_found'
    };
  }

  // Check if enrichment is needed using our existing logic
  const needsEnrichment = shouldEnrichAlbum(album);
  
  if (needsEnrichment) {
    console.log(`✅ Album ${data.albumId} needs enrichment, queueing enrichment job`);
    
    // Queue the actual enrichment job
    const queue = await import('./musicbrainz-queue').then(m => m.getMusicBrainzQueue());
    await queue.addJob(JOB_TYPES.ENRICH_ALBUM, {
      albumId: data.albumId,
      priority: data.priority || 'medium',
      userAction: mapSourceToUserAction(data.source),
      requestId: data.requestId
    }, {
      priority: calculateEnrichmentPriority(data.source, data.priority),
      attempts: 3
    });

    // Also check artists on this album
    for (const albumArtist of album.artists) {
      await queue.addJob(JOB_TYPES.CHECK_ARTIST_ENRICHMENT, {
        artistId: albumArtist.artist.id,
        source: data.source,
        priority: 'medium', // Artists get medium priority
        requestId: `${data.requestId}-artist-${albumArtist.artist.id}`
      }, {
        priority: calculateEnrichmentPriority(data.source, 'medium'),
        attempts: 3
      });
    }
    
    return {
      albumId: data.albumId,
      action: 'queued_for_enrichment',
      artistsAlsoQueued: album.artists.length,
      source: data.source
    };
  } else {
    console.log(`⏭️ Album ${data.albumId} doesn't need enrichment, skipping`);
    return {
      albumId: data.albumId,
      action: 'skipped',
      reason: 'enrichment_not_needed',
      currentDataQuality: album.dataQuality,
      lastEnriched: album.lastEnriched,
      source: data.source
    };
  }
}

async function handleCheckArtistEnrichment(data: CheckArtistEnrichmentJobData) {
  console.log(`🔍 Checking if artist ${data.artistId} needs enrichment (source: ${data.source})`);
  
  // Get artist with current enrichment status
  const artist = await prisma.artist.findUnique({
    where: { id: data.artistId }
  });

  if (!artist) {
    console.warn(`Artist ${data.artistId} not found for enrichment check`);
    return {
      artistId: data.artistId,
      action: 'skipped',
      reason: 'artist_not_found'
    };
  }

  // Check if enrichment is needed using our existing logic
  const needsEnrichment = shouldEnrichArtist(artist);
  
  if (needsEnrichment) {
    console.log(`✅ Artist ${data.artistId} needs enrichment, queueing enrichment job`);
    
    // Queue the actual enrichment job
    const queue = await import('./musicbrainz-queue').then(m => m.getMusicBrainzQueue());
    await queue.addJob(JOB_TYPES.ENRICH_ARTIST, {
      artistId: data.artistId,
      priority: data.priority || 'medium',
      userAction: mapSourceToUserAction(data.source),
      requestId: data.requestId
    }, {
      priority: calculateEnrichmentPriority(data.source, data.priority),
      attempts: 3
    });
    
    return {
      artistId: data.artistId,
      action: 'queued_for_enrichment',
      source: data.source
    };
  } else {
    console.log(`⏭️ Artist ${data.artistId} doesn't need enrichment, skipping`);
    return {
      artistId: data.artistId,
      action: 'skipped',
      reason: 'enrichment_not_needed',
      currentDataQuality: artist.dataQuality,
      lastEnriched: artist.lastEnriched,
      source: data.source
    };
  }
}

async function handleEnrichAlbum(data: EnrichAlbumJobData) {
  console.log(`🎵 Starting album enrichment for album ${data.albumId}`);
  
  // Get current album from database
  const album = await prisma.album.findUnique({
    where: { id: data.albumId },
    include: { artists: { include: { artist: true } } }
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
      lastEnriched: album.lastEnriched
    };
  }

  // Mark as in progress
  await prisma.album.update({
    where: { id: data.albumId },
    data: { enrichmentStatus: 'IN_PROGRESS' }
  });

  try {
    let enrichmentResult = null;
    let newDataQuality = album.dataQuality || 'LOW';

    // If we have a MusicBrainz ID, fetch detailed data
    if (album.musicbrainzId) {
      try {
        const mbData = await musicBrainzService.getReleaseGroup(album.musicbrainzId, ['artists']);
        if (mbData) {
          enrichmentResult = await updateAlbumFromMusicBrainz(album, mbData);
          newDataQuality = 'HIGH';
        }
      } catch (mbError) {
        console.warn(`MusicBrainz lookup failed for album ${data.albumId}:`, mbError);
      }
    }

    // If no MusicBrainz ID or lookup failed, try searching
    if (!enrichmentResult && album.title) {
      try {
        const searchQuery = buildAlbumSearchQuery(album);
        const searchResults = await musicBrainzService.searchReleaseGroups(searchQuery, 5);
        
        if (searchResults && searchResults.length > 0) {
          // Find best match based on title and artist similarity
          const bestMatch = findBestAlbumMatch(album, searchResults);
          if (bestMatch && bestMatch.score > 0.8) {
            const mbData = await musicBrainzService.getReleaseGroup(bestMatch.result.id, ['artists']);
            if (mbData) {
              enrichmentResult = await updateAlbumFromMusicBrainz(album, mbData);
              newDataQuality = bestMatch.score > 0.9 ? 'HIGH' : 'MEDIUM';
            }
          }
        }
      } catch (searchError) {
        console.warn(`MusicBrainz search failed for album ${data.albumId}:`, searchError);
      }
    }

    // Update enrichment status
    await prisma.album.update({
      where: { id: data.albumId },
      data: {
        enrichmentStatus: 'COMPLETED',
        dataQuality: newDataQuality,
        lastEnriched: new Date()
      }
    });

    console.log(`✅ Album enrichment completed for ${data.albumId}`, {
      hadResult: !!enrichmentResult,
      dataQuality: newDataQuality
    });

    return {
      albumId: data.albumId,
      action: 'enriched',
      dataQuality: newDataQuality,
      hadMusicBrainzData: !!enrichmentResult,
      enrichmentTimestamp: new Date()
    };

  } catch (error) {
    // Mark as failed
    await prisma.album.update({
      where: { id: data.albumId },
      data: { enrichmentStatus: 'FAILED' }
    });
    throw error;
  }
}

async function handleEnrichArtist(data: EnrichArtistJobData) {
  console.log(`🎤 Starting artist enrichment for artist ${data.artistId}`);
  
  // Get current artist from database
  const artist = await prisma.artist.findUnique({
    where: { id: data.artistId }
  });

  if (!artist) {
    throw new Error(`Artist not found: ${data.artistId}`);
  }

  // Check if enrichment is needed
  const needsEnrichment = shouldEnrichArtist(artist);
  if (!needsEnrichment) {
    console.log(`⏭️ Artist ${data.artistId} does not need enrichment, skipping`);
    return {
      artistId: data.artistId,
      action: 'skipped',
      reason: 'enrichment_not_needed',
      currentDataQuality: artist.dataQuality,
      lastEnriched: artist.lastEnriched
    };
  }

  // Mark as in progress
  await prisma.artist.update({
    where: { id: data.artistId },
    data: { enrichmentStatus: 'IN_PROGRESS' }
  });

  try {
    let enrichmentResult = null;
    let newDataQuality = artist.dataQuality || 'LOW';

    // If we have a MusicBrainz ID, fetch detailed data
    if (artist.musicbrainzId) {
      try {
        const mbData = await musicBrainzService.getArtist(artist.musicbrainzId, ['url-rels']);
        if (mbData) {
          enrichmentResult = await updateArtistFromMusicBrainz(artist, mbData);
          newDataQuality = 'HIGH';
        }
      } catch (mbError) {
        console.warn(`MusicBrainz lookup failed for artist ${data.artistId}:`, mbError);
      }
    }

    // If no MusicBrainz ID or lookup failed, try searching
    if (!enrichmentResult && artist.name) {
      try {
        const searchResults = await musicBrainzService.searchArtists(artist.name, 5);
        
        if (searchResults && searchResults.length > 0) {
          // Find best match based on name similarity
          const bestMatch = findBestArtistMatch(artist, searchResults);
          if (bestMatch && bestMatch.score > 0.8) {
            const mbData = await musicBrainzService.getArtist(bestMatch.result.id, ['url-rels']);
            if (mbData) {
              enrichmentResult = await updateArtistFromMusicBrainz(artist, mbData);
              newDataQuality = bestMatch.score > 0.9 ? 'HIGH' : 'MEDIUM';
            }
          }
        }
      } catch (searchError) {
        console.warn(`MusicBrainz search failed for artist ${data.artistId}:`, searchError);
      }
    }

    // Update enrichment status
    await prisma.artist.update({
      where: { id: data.artistId },
      data: {
        enrichmentStatus: 'COMPLETED',
        dataQuality: newDataQuality,
        lastEnriched: new Date()
      }
    });

    console.log(`✅ Artist enrichment completed for ${data.artistId}`, {
      hadResult: !!enrichmentResult,
      dataQuality: newDataQuality
    });

    return {
      artistId: data.artistId,
      action: 'enriched',
      dataQuality: newDataQuality,
      hadMusicBrainzData: !!enrichmentResult,
      enrichmentTimestamp: new Date()
    };

  } catch (error) {
    // Mark as failed
    await prisma.artist.update({
      where: { id: data.artistId },
      data: { enrichmentStatus: 'FAILED' }
    });
    throw error;
  }
}

// ============================================================================
// Enrichment Helper Functions
// ============================================================================


function buildAlbumSearchQuery(album: any): string {
  let query = `release:"${album.title}"`;
  
  if (album.artists && album.artists.length > 0) {
    // Add primary artist to search
    const primaryArtist = album.artists.find((a: any) => a.role === 'primary') || album.artists[0];
    if (primaryArtist?.artist?.name) {
      query += ` AND artist:"${primaryArtist.artist.name}"`;
    }
  }

  return query;
}

function findBestAlbumMatch(album: any, searchResults: any[]): { result: any; score: number } | null {
  let bestMatch = null;
  let bestScore = 0;

  for (const result of searchResults) {
    let score = 0;

    // Title similarity (most important)
    if (result.title && album.title) {
      score += calculateStringSimilarity(result.title.toLowerCase(), album.title.toLowerCase()) * 0.6;
    }

    // Artist similarity
    if (result['artist-credit'] && album.artists && album.artists.length > 0) {
      const resultArtists = result['artist-credit'].map((ac: any) => ac.name?.toLowerCase() || '');
      const albumArtists = album.artists.map((a: any) => a.artist?.name?.toLowerCase() || '');
      
      let artistScore = 0;
      for (const albumArtist of albumArtists) {
        for (const resultArtist of resultArtists) {
          artistScore = Math.max(artistScore, calculateStringSimilarity(albumArtist, resultArtist));
        }
      }
      score += artistScore * 0.4;
    }

    if (score > bestScore) {
      bestScore = score;
      bestMatch = { result, score };
    }
  }

  return bestMatch;
}

function findBestArtistMatch(artist: any, searchResults: any[]): { result: any; score: number } | null {
  let bestMatch = null;
  let bestScore = 0;

  for (const result of searchResults) {
    let score = 0;

    // Name similarity
    if (result.name && artist.name) {
      score = calculateStringSimilarity(result.name.toLowerCase(), artist.name.toLowerCase());
    }

    if (score > bestScore) {
      bestScore = score;
      bestMatch = { result, score };
    }
  }

  return bestMatch;
}

function calculateStringSimilarity(str1: string, str2: string): number {
  // Simple similarity based on common characters
  const normalize = (s: string) => s.replace(/[^\w\s]/g, '').replace(/\s+/g, ' ').trim();
  const s1 = normalize(str1);
  const s2 = normalize(str2);
  
  if (s1 === s2) return 1;
  if (s1.length === 0 || s2.length === 0) return 0;
  
  // Jaccard similarity using word sets
  const words1 = new Set(s1.split(' '));
  const words2 = new Set(s2.split(' '));
  const intersection = new Set([...words1].filter(x => words2.has(x)));
  const union = new Set([...words1, ...words2]);
  
  return intersection.size / union.size;
}

async function updateAlbumFromMusicBrainz(album: any, mbData: any): Promise<any> {
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
      console.warn('Invalid release date from MusicBrainz:', mbData['first-release-date']);
    }
  }

  if (mbData['primary-type'] && !album.releaseType) {
    updateData.releaseType = mbData['primary-type'];
  }

  if (Object.keys(updateData).length > 0) {
    await prisma.album.update({
      where: { id: album.id },
      data: updateData
    });
    return updateData;
  }

  return null;
}

async function updateArtistFromMusicBrainz(artist: any, mbData: any): Promise<any> {
  const updateData: any = {};

  if (mbData.id && !artist.musicbrainzId) {
    updateData.musicbrainzId = mbData.id;
  }

  if (mbData.name && mbData.name !== artist.name) {
    updateData.name = mbData.name;
  }

  if (mbData['life-span']?.begin && !artist.formedYear) {
    try {
      updateData.formedYear = parseInt(mbData['life-span'].begin.substring(0, 4));
    } catch (e) {
      console.warn('Invalid formed year from MusicBrainz:', mbData['life-span']?.begin);
    }
  }

  if (mbData.area?.iso && !artist.countryCode) {
    updateData.countryCode = mbData.area.iso.substring(0, 2);
  }

  if (Object.keys(updateData).length > 0) {
    await prisma.artist.update({
      where: { id: artist.id },
      data: updateData
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
