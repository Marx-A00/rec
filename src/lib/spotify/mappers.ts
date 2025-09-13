// src/lib/spotify/mappers.ts
/**
 * Transform Spotify API data into our database schema format
 * Follows "Add First → Enrich Later" pattern for immediate user feedback
 */

import { prisma } from '../prisma';
import { getMusicBrainzQueue, JOB_TYPES } from '../queue';
import type { CheckAlbumEnrichmentJobData, CheckArtistEnrichmentJobData } from '../queue/jobs';
import type {
  SpotifyAlbumData,
  SpotifyCacheData,
  AlbumCreationData,
  ArtistCreationData,
  ProcessedSpotifyAlbum,
  SpotifyProcessingResult,
  DateParseResult,
  SpotifyAlbumType,
  PrismaReleaseType,
  SpotifyTrackData,
  TrackCreationData
} from './types';

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Parse Spotify release date (handles "2025", "2025-01", "2025-01-15")
 */
export function parseSpotifyDate(dateString: string): DateParseResult {
  if (!dateString) {
    return { date: null, precision: 'invalid' };
  }

  try {
    const parts = dateString.split('-');
    
    if (parts.length === 1) {
      // Year only: "2025"
      const year = parseInt(parts[0]);
      if (year > 1900 && year <= new Date().getFullYear() + 10) {
        return { 
          date: new Date(year, 0, 1), // January 1st of that year
          precision: 'year' 
        };
      }
    } else if (parts.length === 2) {
      // Year-Month: "2025-01"
      const year = parseInt(parts[0]);
      const month = parseInt(parts[1]) - 1; // JS months are 0-indexed
      if (year > 1900 && month >= 0 && month <= 11) {
        return { 
          date: new Date(year, month, 1), // 1st of that month
          precision: 'month' 
        };
      }
    } else if (parts.length === 3) {
      // Full date: "2025-01-15"
      const date = new Date(dateString);
      if (!isNaN(date.getTime())) {
        return { 
          date: date,
          precision: 'day' 
        };
      }
    }
  } catch (error) {
    console.warn(`Failed to parse Spotify date: "${dateString}"`, error);
  }

  return { date: null, precision: 'invalid' };
}

/**
 * Map Spotify album type to our Prisma enum
 * Uses MusicBrainz-aligned logic for better enrichment matching
 */
export function mapAlbumType(spotifyType: string): PrismaReleaseType {
  switch (spotifyType?.toLowerCase()) {
    case 'album':
      return 'ALBUM';
    case 'single':
      return 'SINGLE';
    case 'compilation':
      // Note: In MusicBrainz, 'compilation' is a secondary type, not primary
      // But for Spotify data, we'll map it to our COMPILATION enum
      return 'COMPILATION';
    case 'ep':
      return 'EP';
    default:
      return 'OTHER';
  }
}

/**
 * Determine likely MusicBrainz secondary types from Spotify data
 * This helps with more accurate MusicBrainz matching later
 */
export function inferSecondaryTypes(spotifyAlbum: SpotifyAlbumData): string[] {
  const secondaryTypes: string[] = [];
  const title = spotifyAlbum.name.toLowerCase();
  const type = spotifyAlbum.type.toLowerCase();
  
  // Infer secondary types from title/type patterns
  if (type === 'compilation' || title.includes('compilation')) {
    secondaryTypes.push('compilation');
  }
  if (title.includes('live') || title.includes('concert')) {
    secondaryTypes.push('live');
  }
  if (title.includes('remix') || title.includes('remixes')) {
    secondaryTypes.push('remix');
  }
  if (title.includes('soundtrack') || title.includes('ost')) {
    secondaryTypes.push('soundtrack');
  }
  if (title.includes('demo') || title.includes('demos')) {
    secondaryTypes.push('demo');
  }
  if (title.includes('mixtape') || title.includes('mix tape')) {
    secondaryTypes.push('mixtape/street');
  }
  
  return secondaryTypes;
}

/**
 * Extract individual artist names from Spotify's joined string
 * "Artist 1, Artist 2" → ["Artist 1", "Artist 2"]
 */
export function parseArtistNames(artistsString: string): string[] {
  if (!artistsString) return [];
  
  return artistsString
    .split(',')
    .map(name => name.trim())
    .filter(name => name.length > 0);
}

/**
 * Clean artist name for deduplication matching
 */
export function normalizeArtistName(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^\w\s]/g, '') // Remove special characters
    .replace(/\s+/g, ' ');   // Normalize whitespace
}

// ============================================================================
// Core Transformation Functions
// ============================================================================

/**
 * Transform single Spotify album data to our database format
 * Now includes MusicBrainz-aligned secondary type inference
 */
export function transformSpotifyAlbum(spotifyAlbum: SpotifyAlbumData): AlbumCreationData & { 
  secondaryTypes: string[];
  inferredStatus: 'official'; // Spotify releases are typically official
} {
  const { date: releaseDate } = parseSpotifyDate(spotifyAlbum.releaseDate);
  const secondaryTypes = inferSecondaryTypes(spotifyAlbum);
  
  return {
    title: spotifyAlbum.name,
    releaseDate: releaseDate,
    releaseType: mapAlbumType(spotifyAlbum.type),
    trackCount: spotifyAlbum.totalTracks || null,
    coverArtUrl: spotifyAlbum.image || null,
    spotifyId: spotifyAlbum.id,
    spotifyUrl: spotifyAlbum.spotifyUrl,
    // MusicBrainz-aligned metadata for better matching
    secondaryTypes: secondaryTypes,
    inferredStatus: 'official', // Spotify releases are typically official
    // Initial enrichment state
    dataQuality: 'LOW',
    enrichmentStatus: 'PENDING',
    lastEnriched: null,
  };
}

/**
 * Transform artist name to our database format
 */
export function transformSpotifyArtist(artistName: string, spotifyId?: string): ArtistCreationData {
  return {
    name: artistName.trim(),
    spotifyId: spotifyId,
    // Initial enrichment state  
    dataQuality: 'LOW',
    enrichmentStatus: 'PENDING',
    lastEnriched: null,
  };
}

/**
 * Find or create artist with deduplication logic (reuses existing pattern)
 */
export async function findOrCreateArtist(artistData: ArtistCreationData): Promise<string> {
  // Search for existing artist by name (case-insensitive)
  const existingArtist = await prisma.artist.findFirst({
    where: {
      name: {
        equals: artistData.name,
        mode: 'insensitive'
      }
    }
  });

  if (existingArtist) {
    console.log(`🔄 Reusing existing artist: "${existingArtist.name}" (${existingArtist.id})`);
    return existingArtist.id;
  }

  // Create new artist
  const newArtist = await prisma.artist.create({
    data: {
      name: artistData.name,
      dataQuality: artistData.dataQuality,
      enrichmentStatus: artistData.enrichmentStatus,
      lastEnriched: artistData.lastEnriched,
    }
  });

  console.log(`✨ Created new artist: "${newArtist.name}" (${newArtist.id})`);
  return newArtist.id;
}

// ============================================================================
// Main Processing Functions
// ============================================================================

/**
 * Process single Spotify album: Create DB records + Queue enrichment
 */
export async function processSpotifyAlbum(
  spotifyAlbum: SpotifyAlbumData,
  source: string = 'spotify_sync'
): Promise<{ albumId: string; artistIds: string[] }> {
  console.log(`🎵 Processing Spotify album: "${spotifyAlbum.name}"`);

  // 1. Transform album data
  const albumData = transformSpotifyAlbum(spotifyAlbum);
  
  // 2. Create album record immediately
  const album = await prisma.album.create({
    data: {
      title: albumData.title,
      releaseDate: albumData.releaseDate,
      releaseType: albumData.releaseType,
      trackCount: albumData.trackCount,
      coverArtUrl: albumData.coverArtUrl,
      spotifyId: albumData.spotifyId,
      spotifyUrl: albumData.spotifyUrl,
      dataQuality: albumData.dataQuality,
      enrichmentStatus: albumData.enrichmentStatus,
      lastEnriched: albumData.lastEnriched,
    }
  });

  console.log(`✅ Created album: "${album.title}" (${album.id})`);

  // 3. Process artists
  const artistNames = parseArtistNames(spotifyAlbum.artists);
  const artistIds: string[] = [];

  for (let i = 0; i < artistNames.length; i++) {
    const artistName = artistNames[i];
    const spotifyArtistId = spotifyAlbum.artistIds?.[i]; // May not exist
    
    // Find or create artist
    const artistData = transformSpotifyArtist(artistName, spotifyArtistId);
    const artistId = await findOrCreateArtist(artistData);
    artistIds.push(artistId);

    // Create album-artist relationship
    await prisma.albumArtist.create({
      data: {
        albumId: album.id,
        artistId: artistId,
        role: i === 0 ? 'primary' : 'featured', // First artist is primary
        position: i,
      }
    });

    console.log(`🔗 Linked artist "${artistName}" to album (position ${i})`);
  }

  // 4. Queue enrichment jobs (non-blocking)
  const queue = getMusicBrainzQueue();

  // Queue album enrichment
  const albumJobData: CheckAlbumEnrichmentJobData = {
    albumId: album.id,
    source: source,
    priority: 'medium', // Spotify sync is medium priority
    requestId: `spotify_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
  };

  await queue.addJob(JOB_TYPES.CHECK_ALBUM_ENRICHMENT, albumJobData, {
    priority: 5, // Medium priority in BullMQ (1=highest, 10=lowest)
    attempts: 3,
    backoff: { type: 'exponential', delay: 2000 },
  });

  // Queue artist enrichment jobs
  for (const artistId of artistIds) {
    const artistJobData: CheckArtistEnrichmentJobData = {
      artistId: artistId,
      source: source,
      priority: 'low', // Artist enrichment is lower priority than albums
      requestId: `spotify_artist_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    };

    await queue.addJob(JOB_TYPES.CHECK_ARTIST_ENRICHMENT, artistJobData, {
      priority: 7, // Lower priority for artists
      attempts: 3,
      backoff: { type: 'exponential', delay: 2000 },
    });
  }

  console.log(`⚡ Queued enrichment jobs for album and ${artistIds.length} artists`);

  return { albumId: album.id, artistIds };
}

/**
 * Process multiple Spotify albums from cached data
 */
export async function processSpotifyAlbums(
  spotifyAlbums: SpotifyAlbumData[],
  source: string = 'spotify_sync'
): Promise<SpotifyProcessingResult> {
  console.log(`🚀 Processing ${spotifyAlbums.length} Spotify albums...`);

  const results: { albumId: string; artistIds: string[] }[] = [];
  const errors: string[] = [];
  let duplicatesSkipped = 0;

  for (const spotifyAlbum of spotifyAlbums) {
    try {
      // Check if album already exists (by title + first artist to avoid exact duplicates)
      const artistNames = parseArtistNames(spotifyAlbum.artists);
      const firstArtist = artistNames[0];
      
      if (firstArtist) {
        const existingAlbum = await prisma.album.findFirst({
          where: {
            title: {
              equals: spotifyAlbum.name,
              mode: 'insensitive'
            },
            artists: {
              some: {
                artist: {
                  name: {
                    equals: firstArtist,
                    mode: 'insensitive'
                  }
                }
              }
            }
          }
        });

        if (existingAlbum) {
          console.log(`⏭️  Skipping duplicate: "${spotifyAlbum.name}" by ${firstArtist}`);
          duplicatesSkipped++;
          continue;
        }
      }

      // Process the album
      const result = await processSpotifyAlbum(spotifyAlbum, source);
      results.push(result);

    } catch (error) {
      const errorMsg = `Failed to process "${spotifyAlbum.name}": ${error instanceof Error ? error.message : String(error)}`;
      console.error(`❌ ${errorMsg}`);
      errors.push(errorMsg);
    }
  }

  const stats = {
    albumsProcessed: results.length,
    artistsProcessed: results.reduce((sum, r) => sum + r.artistIds.length, 0),
    duplicatesSkipped,
    errors,
  };

  console.log(`✅ Spotify processing complete:`, stats);

  return {
    albums: [], // We don't need to return the full processed data structure
    stats,
  };
}

/**
 * Process cached Spotify data from database
 */
export async function processCachedSpotifyData(cacheKey: string = 'spotify_trending'): Promise<SpotifyProcessingResult> {
  console.log(`📦 Loading cached Spotify data: ${cacheKey}`);

  const cached = await prisma.cacheData.findUnique({
    where: { key: cacheKey }
  });

  if (!cached) {
    throw new Error(`No cached Spotify data found for key: ${cacheKey}`);
  }

  const spotifyData = cached.data as SpotifyCacheData;
  
  if (!spotifyData.newReleases || !Array.isArray(spotifyData.newReleases)) {
    throw new Error('Invalid cached Spotify data structure');
  }

  console.log(`📊 Found ${spotifyData.newReleases.length} new releases in cache`);

  return await processSpotifyAlbums(spotifyData.newReleases, 'spotify_cache');
}

// ============================================================================
// Track Transformation Functions
// ============================================================================

/**
 * Transform Spotify track data into our TrackCreationData format
 */
export function transformSpotifyTrack(
  spotifyTrack: SpotifyTrackData, 
  albumId: string,
  artistIdMap: Map<string, string> // Map Spotify artist ID -> our artist ID
): TrackCreationData {
  // Map track artists to our artist IDs
  const trackArtists = spotifyTrack.artists.map((artist, index) => ({
    artistId: artistIdMap.get(artist.id) || '', // Will need to handle missing artists
    role: index === 0 ? 'primary' : 'featured', // First artist is primary, others featured
    position: index
  })).filter(ta => ta.artistId); // Remove artists we don't have IDs for

  return {
    title: spotifyTrack.name,
    trackNumber: spotifyTrack.track_number,
    discNumber: spotifyTrack.disc_number,
    durationMs: spotifyTrack.duration_ms,
    explicit: spotifyTrack.explicit,
    previewUrl: spotifyTrack.preview_url,
    spotifyId: spotifyTrack.id,
    spotifyUrl: spotifyTrack.external_urls.spotify,
    albumId: albumId,
    artists: trackArtists,
    // Start with low quality, will be enriched later
    dataQuality: 'LOW',
    enrichmentStatus: 'PENDING',
    lastEnriched: null
  };
}

/**
 * Create track records in database from TrackCreationData
 */
export async function createTrackRecord(trackData: TrackCreationData): Promise<string> {
  // Create the track record
  const track = await prisma.track.create({
    data: {
      title: trackData.title,
      trackNumber: trackData.trackNumber,
      discNumber: trackData.discNumber,
      durationMs: trackData.durationMs,
      explicit: trackData.explicit,
      previewUrl: trackData.previewUrl,
      spotifyId: trackData.spotifyId,
      spotifyUrl: trackData.spotifyUrl,
      albumId: trackData.albumId,
      dataQuality: trackData.dataQuality,
      enrichmentStatus: trackData.enrichmentStatus,
      lastEnriched: trackData.lastEnriched,
      // Album relationship is handled by albumId foreign key
      album: {
        connect: { id: trackData.albumId }
      }
    }
  });

  // Create track-artist relationships
  if (trackData.artists.length > 0) {
    await prisma.trackArtist.createMany({
      data: trackData.artists.map(artist => ({
        trackId: track.id,
        artistId: artist.artistId,
        role: artist.role,
        position: artist.position
      }))
    });
  }

  return track.id;
}

/**
 * Process multiple tracks for an album
 */
export async function processSpotifyTracks(
  spotifyTracks: SpotifyTrackData[],
  albumId: string,
  artistIdMap: Map<string, string>
): Promise<{ 
  tracksCreated: number; 
  trackIds: string[];
  errors: string[];
}> {
  const trackIds: string[] = [];
  const errors: string[] = [];

  console.log(`🎵 Processing ${spotifyTracks.length} tracks for album ${albumId}`);

  for (const spotifyTrack of spotifyTracks) {
    try {
      // Transform Spotify track data
      const trackData = transformSpotifyTrack(spotifyTrack, albumId, artistIdMap);
      
      // Create track record
      const trackId = await createTrackRecord(trackData);
      trackIds.push(trackId);
      
      console.log(`✅ Created track: "${trackData.title}" (${trackData.trackNumber})`);
      
    } catch (error) {
      const errorMsg = `Failed to create track "${spotifyTrack.name}": ${error instanceof Error ? error.message : 'Unknown error'}`;
      console.error(`❌ ${errorMsg}`);
      errors.push(errorMsg);
    }
  }

  console.log(`📊 Track processing complete: ${trackIds.length} created, ${errors.length} errors`);

  return {
    tracksCreated: trackIds.length,
    trackIds,
    errors
  };
}
