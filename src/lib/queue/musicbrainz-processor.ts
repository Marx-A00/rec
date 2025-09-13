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
  type SpotifySyncNewReleasesJobData,
  type SpotifySyncFeaturedPlaylistsJobData,
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

      case JOB_TYPES.SPOTIFY_SYNC_NEW_RELEASES:
        result = await handleSpotifySyncNewReleases(job.data as SpotifySyncNewReleasesJobData);
        break;

      case JOB_TYPES.SPOTIFY_SYNC_FEATURED_PLAYLISTS:
        result = await handleSpotifySyncFeaturedPlaylists(job.data as SpotifySyncFeaturedPlaylistsJobData);
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
          // Debug logging for search results
          console.log(`🔍 Found ${searchResults.length} search results for "${album.title}"`);
          console.log(`📊 First result: "${searchResults[0].title}" by ${searchResults[0].artistCredit?.map(ac => ac.name).join(', ')} (score: ${searchResults[0].score})`);
          
          // Find best match based on title and artist similarity
          const bestMatch = findBestAlbumMatch(album, searchResults);
          console.log(`🎯 Best match: ${bestMatch ? 
            `"${bestMatch.result.title}" - Combined: ${(bestMatch.score * 100).toFixed(1)}% (MB: ${bestMatch.mbScore}, Jaccard: ${(bestMatch.jaccardScore * 100).toFixed(1)}%)` : 
            'None found'}`);
          
          if (bestMatch && bestMatch.score > 0.8) {  // 80% threshold for combined score
            const mbData = await musicBrainzService.getReleaseGroup(bestMatch.result.id, ['artists', 'tags', 'releases']);
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
        const mbData = await musicBrainzService.getArtist(artist.musicbrainzId, ['url-rels', 'tags']);
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
          console.log(`🔍 Found ${searchResults.length} artist search results for "${artist.name}"`);
          console.log(`📊 First result: "${searchResults[0].name}" (score: ${searchResults[0].score})`);
          
          // Find best match based on name similarity
          const bestMatch = findBestArtistMatch(artist, searchResults);
          console.log(`🎯 Best artist match: ${bestMatch ? 
            `"${bestMatch.result.name}" - Combined: ${(bestMatch.score * 100).toFixed(1)}% (MB: ${bestMatch.mbScore}, Jaccard: ${(bestMatch.jaccardScore * 100).toFixed(1)}%)` : 
            'None found'}`);
          
          if (bestMatch && bestMatch.score > 0.8) {
            const mbData = await musicBrainzService.getArtist(bestMatch.result.id, ['url-rels', 'tags']);
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
  // Use releasegroup field for release group searches
  let query = `releasegroup:"${album.title}"`;
  
  if (album.artists && album.artists.length > 0) {
    // Add primary artist to search
    const primaryArtist = album.artists.find((a: any) => a.role === 'primary') || album.artists[0];
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

function findBestAlbumMatch(album: any, searchResults: any[]): { result: any; score: number; mbScore: number; jaccardScore: number } | null {
  let bestMatch = null;
  let bestScore = 0;

  for (const result of searchResults) {
    // Get MusicBrainz's confidence score (0-100)
    const mbScore = result.score || 0;
    
    // Calculate our Jaccard similarity score (0-1)
    let jaccardScore = 0;

    // Title similarity (most important)
    if (result.title && album.title) {
      jaccardScore += calculateStringSimilarity(result.title.toLowerCase(), album.title.toLowerCase()) * 0.6;
    }

    // Artist similarity
    if (result.artistCredit && album.artists && album.artists.length > 0) {
      const resultArtists = result.artistCredit.map((ac: any) => ac.name?.toLowerCase() || '');
      const albumArtists = album.artists.map((a: any) => a.artist?.name?.toLowerCase() || '');
      
      let artistScore = 0;
      for (const albumArtist of albumArtists) {
        for (const resultArtist of resultArtists) {
          artistScore = Math.max(artistScore, calculateStringSimilarity(albumArtist, resultArtist));
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
        jaccardScore: jaccardScore 
      };
    }
  }

  return bestMatch;
}

function findBestArtistMatch(artist: any, searchResults: any[]): { result: any; score: number; mbScore: number; jaccardScore: number } | null {
  let bestMatch = null;
  let bestScore = 0;

  for (const result of searchResults) {
    // Get MusicBrainz's confidence score (0-100)
    const mbScore = result.score || 0;
    
    // Calculate our Jaccard similarity score (0-1)
    let jaccardScore = 0;

    // Name similarity
    if (result.name && artist.name) {
      jaccardScore = calculateStringSimilarity(result.name.toLowerCase(), artist.name.toLowerCase());
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
        jaccardScore: jaccardScore 
      };
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
    const releaseWithCountry = mbData.releases.find((release: any) => release.country);
    if (releaseWithCountry?.country) {
      updateData.releaseCountry = releaseWithCountry.country;
    }
  }

  if (Object.keys(updateData).length > 0) {
    // Check if another album already has this MusicBrainz ID before updating
    if (updateData.musicbrainzId) {
      const existingAlbum = await prisma.album.findUnique({
        where: { musicbrainzId: updateData.musicbrainzId }
      });
      
      if (existingAlbum && existingAlbum.id !== album.id) {
        console.log(`⚠️ Duplicate MusicBrainz ID detected: Album ${album.id} ("${album.title}") would get MusicBrainz ID ${updateData.musicbrainzId}, but it's already used by album ${existingAlbum.id} ("${existingAlbum.title}")`);
        console.log(`   → Skipping MusicBrainz ID update to avoid constraint violation`);
        console.log(`   → Consider implementing album merging logic for true deduplication`);
        
        // Remove musicbrainzId from update to avoid constraint error
        delete updateData.musicbrainzId;
        
        // If we removed the only update field, skip the entire update
        if (Object.keys(updateData).length === 0) {
          console.log(`   → No other fields to update, skipping database update`);
          return null;
        }
      }
    }

    // Proceed with the update (without conflicting musicbrainzId if removed)
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

  if (Object.keys(updateData).length > 0) {
    // Check if another artist already has this MusicBrainz ID before updating
    if (updateData.musicbrainzId) {
      const existingArtist = await prisma.artist.findUnique({
        where: { musicbrainzId: updateData.musicbrainzId }
      });
      
      if (existingArtist && existingArtist.id !== artist.id) {
        console.log(`⚠️ Duplicate MusicBrainz ID detected: Artist ${artist.id} ("${artist.name}") would get MusicBrainz ID ${updateData.musicbrainzId}, but it's already used by artist ${existingArtist.id} ("${existingArtist.name}")`);
        console.log(`   → Skipping MusicBrainz ID update to avoid constraint violation`);
        console.log(`   → Consider implementing artist merging logic for true deduplication`);
        
        // Remove musicbrainzId from update to avoid constraint error
        delete updateData.musicbrainzId;
        
        // If we removed the only update field, skip the entire update
        if (Object.keys(updateData).length === 0) {
          console.log(`   → No other fields to update, skipping database update`);
          return null;
        }
      }
    }

    // Proceed with the update (without conflicting musicbrainzId if removed)
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

// ============================================================================
// Spotify Sync Job Handlers
// ============================================================================

/**
 * Handle Spotify new releases sync job
 * Fetches fresh data from Spotify API and processes through our mappers
 */
async function handleSpotifySyncNewReleases(data: SpotifySyncNewReleasesJobData): Promise<any> {
  console.log(`🎵 Syncing Spotify new releases (limit: ${data.limit || 20}, country: ${data.country || 'US'})`);

  try {
    // Import Spotify client, mappers, and error handling
    const { SpotifyApi } = await import('@spotify/web-api-ts-sdk');
    const { processSpotifyAlbums } = await import('../spotify/mappers');
    const { withSpotifyRetry, withSpotifyMetrics } = await import('../spotify/error-handling');

    // Initialize Spotify client with retry wrapper
    const createSpotifyClient = () => SpotifyApi.withClientCredentials(
      process.env.SPOTIFY_CLIENT_ID!,
      process.env.SPOTIFY_CLIENT_SECRET!
    );

    // Fetch new releases with retry logic and metrics
    const newReleases = await withSpotifyMetrics(
      () => withSpotifyRetry(
        async () => {
          const spotifyClient = createSpotifyClient();
          return await spotifyClient.browse.getNewReleases(
            (data.country || 'US') as any, 
            (data.limit || 20) as any
          );
        },
        'Spotify getNewReleases API call'
      ),
      'Spotify New Releases Sync'
    );

    console.log(`📀 Fetched ${newReleases.albums.items.length} new releases from Spotify`);

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
      totalTracks: album.total_tracks
    }));

    // Process through our mappers (creates DB records + queues enrichment)
    const result = await processSpotifyAlbums(spotifyAlbums, data.source || 'spotify_sync');

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
        limit: data.limit || 20
      }
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
        statusCode: errorInfo.statusCode
      },
      albumsProcessed: 0,
      artistsProcessed: 0,
      duplicatesSkipped: 0,
      errors: [errorInfo.message]
    };
  }
}

/**
 * Handle Spotify featured playlists sync job
 * Fetches playlists and extracts albums from tracks
 */
async function handleSpotifySyncFeaturedPlaylists(data: SpotifySyncFeaturedPlaylistsJobData): Promise<any> {
  console.log(`🎵 Syncing Spotify featured playlists (limit: ${data.limit || 10}, country: ${data.country || 'US'})`);

  try {
    // Import Spotify client, mappers, and error handling
    const { SpotifyApi } = await import('@spotify/web-api-ts-sdk');
    const { processSpotifyAlbums } = await import('../spotify/mappers');
    const { withSpotifyRetry, withSpotifyMetrics } = await import('../spotify/error-handling');

    // Initialize Spotify client with retry wrapper
    const createSpotifyClient = () => SpotifyApi.withClientCredentials(
      process.env.SPOTIFY_CLIENT_ID!,
      process.env.SPOTIFY_CLIENT_SECRET!
    );

    // Fetch featured playlists with retry logic and metrics
    const featured = await withSpotifyMetrics(
      () => withSpotifyRetry(
        async () => {
          const spotifyClient = createSpotifyClient();
          return await spotifyClient.browse.getFeaturedPlaylists(
            (data.country || 'US') as any, 
            (data.limit || 10) as any
          );
        },
        'Spotify getFeaturedPlaylists API call'
      ),
      'Spotify Featured Playlists Sync'
    );

    console.log(`📋 Fetched ${featured.playlists.items.length} featured playlists from Spotify`);

    if (!data.extractAlbums) {
      // Just return playlist info without processing albums
      return {
        success: true,
        playlistsProcessed: featured.playlists.items.length,
        albumsProcessed: 0,
        message: 'Playlists fetched but album extraction was disabled'
      };
    }

    // Extract albums from playlist tracks
    const albumsMap = new Map<string, any>(); // Deduplicate albums by Spotify ID
    let totalTracks = 0;

    for (const playlist of featured.playlists.items) {
      try {
        console.log(`🎧 Processing playlist: "${playlist.name}"`);
        
        // Get playlist tracks (limit to first 50 tracks per playlist)
        const tracks = await spotifyClient.playlists.getPlaylistItems(
          playlist.id,
          (data.country || 'US') as any,
          undefined,
          50, // limit
          0   // offset
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
              artists: album.artists.map(a => a.name).join(', '),
              artistIds: album.artists.map(a => a.id),
              releaseDate: album.release_date,
              image: album.images[0]?.url || null,
              spotifyUrl: album.external_urls.spotify,
              type: album.album_type,
              totalTracks: album.total_tracks
            });
          }
        }

      } catch (error) {
        console.error(`❌ Failed to process playlist "${playlist.name}":`, error);
        // Continue with other playlists
      }
    }

    const uniqueAlbums = Array.from(albumsMap.values());
    console.log(`📀 Extracted ${uniqueAlbums.length} unique albums from ${totalTracks} tracks`);

    if (uniqueAlbums.length === 0) {
      return {
        success: true,
        playlistsProcessed: featured.playlists.items.length,
        albumsProcessed: 0,
        message: 'No albums found in playlist tracks'
      };
    }

    // Process through our mappers
    const result = await processSpotifyAlbums(uniqueAlbums, data.source || 'spotify_playlists');

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
        limit: data.limit || 10
      }
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
        statusCode: errorInfo.statusCode
      },
      playlistsProcessed: 0,
      albumsProcessed: 0,
      artistsProcessed: 0,
      duplicatesSkipped: 0,
      errors: [errorInfo.message]
    };
  }
}
