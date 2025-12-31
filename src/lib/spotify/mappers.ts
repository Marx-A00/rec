// src/lib/spotify/mappers.ts
/**
 * Transform Spotify API data into our database schema format
 * Follows "Add First → Enrich Later" pattern for immediate user feedback
 */

import { SpotifyApi } from '@spotify/web-api-ts-sdk';
import { Prisma } from '@prisma/client';

import { prisma } from '../prisma';
import { getMusicBrainzQueue, JOB_TYPES } from '../queue';
import type {
  CheckAlbumEnrichmentJobData,
  CheckArtistEnrichmentJobData,
  CheckTrackEnrichmentJobData,
} from '../queue/jobs';
import { createSpotifySyncMetadata } from '@/types/album-metadata';

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
  TrackCreationData,
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
          precision: 'year',
        };
      }
    } else if (parts.length === 2) {
      // Year-Month: "2025-01"
      const year = parseInt(parts[0]);
      const month = parseInt(parts[1]) - 1; // JS months are 0-indexed
      if (year > 1900 && month >= 0 && month <= 11) {
        return {
          date: new Date(year, month, 1), // 1st of that month
          precision: 'month',
        };
      }
    } else if (parts.length === 3) {
      // Full date: "2025-01-15"
      const date = new Date(dateString);
      if (!isNaN(date.getTime())) {
        return {
          date: date,
          precision: 'day',
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
 * Extract individual artist names from Spotify data
 * Handles both string format "Artist 1, Artist 2" and object array format from API
 */
export function parseArtistNames(
  artists: string | Array<{ name: string }>
): string[] {
  if (!artists) return [];

  // Handle array of artist objects (from Spotify API)
  if (Array.isArray(artists)) {
    return artists
      .map(artist => artist.name)
      .filter(name => name && name.length > 0);
  }

  // Handle comma-separated string format
  if (typeof artists === 'string') {
    return artists
      .split(',')
      .map(name => name.trim())
      .filter(name => name.length > 0);
  }

  return [];
}

/**
 * Clean artist name for deduplication matching
 */
export function normalizeArtistName(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^\w\s]/g, '') // Remove special characters
    .replace(/\s+/g, ' '); // Normalize whitespace
}

// ============================================================================
// Core Transformation Functions
// ============================================================================

/**
 * Transform single Spotify album data to our database format
 * Now includes MusicBrainz-aligned secondary type inference
 */
export function transformSpotifyAlbum(
  spotifyAlbum: SpotifyAlbumData
): AlbumCreationData & {
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
export function transformSpotifyArtist(
  artistName: string,
  spotifyId?: string
): ArtistCreationData {
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
export async function findOrCreateArtist(
  artistData: ArtistCreationData
): Promise<string> {
  // Search for existing artist by name (case-insensitive)
  const existingArtist = await prisma.artist.findFirst({
    where: {
      name: {
        equals: artistData.name,
        mode: 'insensitive',
      },
    },
  });

  if (existingArtist) {
    console.log(
      `🔄 Reusing existing artist: "${existingArtist.name}" (${existingArtist.id})`
    );
    return existingArtist.id;
  }

  // Create new artist
  const newArtist = await prisma.artist.create({
    data: {
      name: artistData.name,
      spotifyId: artistData.spotifyId, // CRITICAL: Prevents duplicate artists
      source: 'SPOTIFY', // CRITICAL: Mark source as Spotify, not MusicBrainz
      dataQuality: artistData.dataQuality,
      enrichmentStatus: artistData.enrichmentStatus,
      lastEnriched: artistData.lastEnriched,
    },
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
  source: string = 'spotify_sync',
  metadataOptions?: {
    jobId?: string;
    batchId?: string;
    query?: string;
    country?: string;
    genreTags?: string[];
    year?: number;
  }
): Promise<{ albumId: string; artistIds: string[]; tracksCreated?: number }> {
  console.log(`🎵 Processing Spotify album: "${spotifyAlbum.name}"`);

  // 1. Transform album data
  const albumData = transformSpotifyAlbum(spotifyAlbum);

  // 2. Create album record immediately
  const album = await prisma.album.create({
    data: {
      title: albumData.title,
      releaseDate: albumData.releaseDate,
      releaseType: albumData.releaseType,
      releaseStatus: albumData.inferredStatus, // Official releases from Spotify
      trackCount: albumData.trackCount,
      coverArtUrl: albumData.coverArtUrl,
      spotifyId: albumData.spotifyId,
      spotifyUrl: albumData.spotifyUrl,
      source: 'SPOTIFY', // CRITICAL: Mark source as Spotify, not MusicBrainz
      sourceUrl: albumData.spotifyUrl, // Audit trail for data origin
      secondaryTypes: albumData.secondaryTypes, // Improves MusicBrainz matching
      dataQuality: albumData.dataQuality,
      enrichmentStatus: albumData.enrichmentStatus,
      lastEnriched: albumData.lastEnriched,
      // Track sync metadata for job auditing and "New This Week" features
      metadata: createSpotifySyncMetadata(
        source === 'spotify_playlists' ? 'spotify_playlists' : 'spotify_search',
        metadataOptions
      ) as Prisma.JsonValue,
    },
  });

  console.log(`✅ Created album: "${album.title}" (${album.id})`);

  // 3. Tracks will be created later by MusicBrainz enrichment (not from Spotify)
  console.log(
    `🎵 Tracks will be created by MusicBrainz enrichment, not from Spotify`
  );

  // 4. Process artists
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
      },
    });

    console.log(`🔗 Linked artist "${artistName}" to album (position ${i})`);
  }

  // 4. Queue enrichment jobs (non-blocking)
  const queue = getMusicBrainzQueue();

  // Queue album enrichment
  const albumJobData: CheckAlbumEnrichmentJobData = {
    albumId: album.id,
    source: 'spotify_sync', // Automated Spotify background sync
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
      source: 'spotify_sync', // Automated Spotify background sync
      priority: 'low', // Artist enrichment is lower priority than albums
      requestId: `spotify_artist_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    };

    await queue.addJob(JOB_TYPES.CHECK_ARTIST_ENRICHMENT, artistJobData, {
      priority: 7, // Lower priority for artists
      attempts: 3,
      backoff: { type: 'exponential', delay: 2000 },
    });
  }

  console.log(
    `⚡ Queued enrichment jobs for album and ${artistIds.length} artists`
  );

  // 5. No track processing - MusicBrainz enrichment will handle tracks
  console.log(
    `📋 Album "${album.title}" ready for MusicBrainz enrichment to add tracks`
  );

  return {
    albumId: album.id,
    artistIds,
    tracksCreated: 0, // No tracks created from Spotify
  };
}

/**
 * Process multiple Spotify albums from cached data
 */
export async function processSpotifyAlbums(
  spotifyAlbums: SpotifyAlbumData[],
  source: string = 'spotify_sync',
  metadataOptions?: {
    jobId?: string;
    batchId?: string;
    query?: string;
    country?: string;
    genreTags?: string[];
    year?: number;
  }
): Promise<SpotifyProcessingResult> {
  console.log(`🚀 Processing ${spotifyAlbums.length} Spotify albums...`);

  const results: { albumId: string; artistIds: string[] }[] = [];
  const errors: string[] = [];
  let duplicatesSkipped = 0;

  for (const spotifyAlbum of spotifyAlbums) {
    try {
      // Check if album already exists by Spotify ID first (most reliable)
      if (spotifyAlbum.id) {
        const existingBySpotifyId = await prisma.album.findUnique({
          where: { spotifyId: spotifyAlbum.id },
        });

        if (existingBySpotifyId) {
          console.log(
            `⏭️  Skipping duplicate (Spotify ID): "${spotifyAlbum.name}"`
          );
          duplicatesSkipped++;
          continue;
        }
      }

      // Check if album already exists (by title + first artist to avoid exact duplicates)
      const artistNames = parseArtistNames(spotifyAlbum.artists);
      const firstArtist = artistNames[0];

      if (firstArtist) {
        const existingAlbum = await prisma.album.findFirst({
          where: {
            title: {
              equals: spotifyAlbum.name,
              mode: 'insensitive',
            },
            artists: {
              some: {
                artist: {
                  name: {
                    equals: firstArtist,
                    mode: 'insensitive',
                  },
                },
              },
            },
          },
        });

        if (existingAlbum) {
          console.log(
            `⏭️  Skipping duplicate: "${spotifyAlbum.name}" by ${firstArtist}`
          );
          duplicatesSkipped++;
          continue;
        }
      }

      // Process the album
      const result = await processSpotifyAlbum(spotifyAlbum, source, metadataOptions);
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
export async function processCachedSpotifyData(
  cacheKey: string = 'spotify_trending'
): Promise<SpotifyProcessingResult> {
  console.log(`📦 Loading cached Spotify data: ${cacheKey}`);

  const cached = await prisma.cacheData.findUnique({
    where: { key: cacheKey },
  });

  if (!cached) {
    throw new Error(`No cached Spotify data found for key: ${cacheKey}`);
  }

  const spotifyData = cached.data as unknown as SpotifyCacheData;

  if (!spotifyData.newReleases || !Array.isArray(spotifyData.newReleases)) {
    throw new Error('Invalid cached Spotify data structure');
  }

  console.log(
    `📊 Found ${spotifyData.newReleases.length} new releases in cache`
  );

  return await processSpotifyAlbums(spotifyData.newReleases, 'spotify_cache');
}

// ============================================================================
// Spotify Track Fetching
// ============================================================================

/**
 * Fetch tracks for a Spotify album using the Spotify API
 */
async function fetchSpotifyAlbumTracks(
  albumId: string
): Promise<SpotifyTrackData[]> {
  try {
    // Create Spotify client with client credentials
    const spotifyClient = SpotifyApi.withClientCredentials(
      process.env.SPOTIFY_CLIENT_ID!,
      process.env.SPOTIFY_CLIENT_SECRET!
    );

    // Fetch album tracks (up to 50 tracks per request)
    const albumTracks = await spotifyClient.albums.tracks(albumId, 'US', 50);

    // Transform to our SpotifyTrackData format
    const tracks: SpotifyTrackData[] = albumTracks.items.map(track => ({
      id: track.id,
      name: track.name,
      track_number: track.track_number,
      disc_number: track.disc_number,
      duration_ms: track.duration_ms,
      explicit: track.explicit,
      preview_url: track.preview_url,
      artists: track.artists.map(artist => ({
        id: artist.id,
        name: artist.name,
        type: artist.type,
        uri: artist.uri,
        href: artist.href,
        external_urls: artist.external_urls,
      })),
      external_urls: track.external_urls,
      href: track.href,
      type: track.type,
      uri: track.uri,
      is_local: track.is_local,
      is_playable: track.is_playable,
    }));

    console.log(`🎵 Fetched ${tracks.length} tracks for album ${albumId}`);
    return tracks;
  } catch (error) {
    console.error(`❌ Failed to fetch tracks for album ${albumId}:`, error);
    return []; // Return empty array on failure
  }
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
  const trackArtists = spotifyTrack.artists
    .map((artist, index) => ({
      artistId: artistIdMap.get(artist.id) || '', // Will need to handle missing artists
      role: index === 0 ? 'primary' : 'featured', // First artist is primary, others featured
      position: index,
    }))
    .filter(ta => ta.artistId); // Remove artists we don't have IDs for

  return {
    title: spotifyTrack.name,
    trackNumber: spotifyTrack.track_number,
    discNumber: spotifyTrack.disc_number,
    durationMs: spotifyTrack.duration_ms,
    explicit: spotifyTrack.explicit,
    previewUrl: spotifyTrack.preview_url,
    spotifyId: spotifyTrack.id,
    spotifyUrl: spotifyTrack.external_urls.spotify,
    youtubeUrl: undefined, // Will be populated during MusicBrainz enrichment
    albumId: albumId,
    artists: trackArtists,
    // Start with low quality, will be enriched later
    dataQuality: 'LOW',
    enrichmentStatus: 'PENDING',
    lastEnriched: null,
  };
}

/**
 * Create track records in database from TrackCreationData
 */
export async function createTrackRecord(
  trackData: TrackCreationData
): Promise<string> {
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
      youtubeUrl: trackData.youtubeUrl,
      albumId: trackData.albumId,
      dataQuality: trackData.dataQuality,
      enrichmentStatus: trackData.enrichmentStatus,
      lastEnriched: trackData.lastEnriched,
    } as any,
  });

  // Create track-artist relationships
  if (trackData.artists.length > 0) {
    await prisma.trackArtist.createMany({
      data: trackData.artists.map(artist => ({
        trackId: track.id,
        artistId: artist.artistId,
        role: artist.role,
        position: artist.position,
      })),
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

  console.log(
    `🎵 Processing ${spotifyTracks.length} tracks for album ${albumId}`
  );

  for (const spotifyTrack of spotifyTracks) {
    try {
      // Transform Spotify track data
      const trackData = transformSpotifyTrack(
        spotifyTrack,
        albumId,
        artistIdMap
      );

      // Create track record
      const trackId = await createTrackRecord(trackData);
      trackIds.push(trackId);

      // Queue track enrichment job
      const queue = getMusicBrainzQueue();
      const trackJobData: CheckTrackEnrichmentJobData = {
        trackId: trackId,
        source: 'spotify_sync',
        priority: 'low', // Tracks are lower priority than albums
        requestId: `spotify_track_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      };

      await queue.addJob(JOB_TYPES.CHECK_TRACK_ENRICHMENT, trackJobData, {
        priority: 9, // Very low priority for tracks
        attempts: 3,
        backoff: { type: 'exponential', delay: 2000 },
      });

      console.log(
        `✅ Created track: "${trackData.title}" (${trackData.trackNumber}) + queued enrichment`
      );
    } catch (error) {
      const errorMsg = `Failed to create track "${spotifyTrack.name}": ${error instanceof Error ? error.message : 'Unknown error'}`;
      console.error(`❌ ${errorMsg}`);
      errors.push(errorMsg);
    }
  }

  console.log(
    `📊 Track processing complete: ${trackIds.length} created, ${errors.length} errors`
  );

  return {
    tracksCreated: trackIds.length,
    trackIds,
    errors,
  };
}
