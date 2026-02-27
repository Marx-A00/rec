// src/lib/deezer/playlist-import.ts
/**
 * Deezer playlist import service for the Uncover game.
 * Supports both preview (read-only) and full import workflows.
 *
 * Uses the deezer-ts SDK which provides:
 * - Built-in rate limiting (50 requests per 5 seconds)
 * - Automatic retry with exponential backoff on quota errors
 * - Typed responses and error classes
 * - Auto-pagination via async iterators
 *
 * Preview: Fetches playlist metadata + album list without DB writes.
 * Import: Fetches albums and processes through processDeezerAlbums() pipeline
 *         (proper DEEZER source, deezerId fields, MusicBrainz enrichment queueing).
 */

import {
  Client,
  type Track as DzTrack,
  DeezerNotFoundError,
  DeezerErrorResponse,
} from 'deezer-ts';

import prisma from '@/lib/prisma';

import type { DeezerAlbumData } from './mappers';

// ============================================================================
// Types
// ============================================================================

export interface DeezerPlaylistMetadata {
  playlistId: string;
  name: string;
  description: string | null;
  creator: string;
  image: string | null;
  trackCount: number;
  deezerUrl: string;
}

export interface DeezerPreviewAlbum {
  deezerId: string;
  title: string;
  artist: string;
  artistId: string;
  year: string | null;
  coverUrl: string | null;
  totalTracks: number;
  albumType: string;
  /** Whether this album already exists in the local database */
  existsInDb?: boolean;
  /** The local database album ID if it exists */
  dbAlbumId?: string;
}

export interface DeezerPlaylistPreviewResult {
  playlist: DeezerPlaylistMetadata;
  albums: DeezerPreviewAlbum[];
  stats: {
    totalTracks: number;
    uniqueAlbums: number;
    albumsAfterFilter: number;
    singlesFiltered: number;
    compilationsFiltered: number;
    existingInDb: number;
  };
}

export interface DeezerPlaylistImportResult {
  success: boolean;
  playlist: DeezerPlaylistMetadata;
  processing: {
    albumsProcessed: number;
    artistsProcessed: number;
    duplicatesSkipped: number;
    errors: string[];
  };
  message: string;
}

// ============================================================================
// Progress Callback Types
// ============================================================================

export type PreviewProgressEvent =
  | { phase: 'playlist'; name: string; trackCount: number }
  | { phase: 'tracks'; current: number; total: number }
  | { phase: 'albums'; current: number; total: number }
  | { phase: 'done'; result: DeezerPlaylistPreviewResult }
  | { phase: 'error'; message: string };

export type PreviewProgressCallback = (event: PreviewProgressEvent) => void;

// ============================================================================
// Deezer SDK Client (singleton)
// ============================================================================

/** Rate-limited Deezer client (50 req/5s, auto-retry with backoff) */
const deezerClient = new Client();

// ============================================================================
// Playlist Fetching
// ============================================================================

/**
 * Fetch playlist metadata and ALL tracks using the deezer-ts SDK.
 * Pagination is handled automatically via async iterators.
 */
async function fetchPlaylistWithTracks(
  playlistId: string,
  onProgress?: PreviewProgressCallback
): Promise<{
  metadata: DeezerPlaylistMetadata;
  tracks: DzTrack[];
}> {
  const playlist = await deezerClient.getPlaylist(Number(playlistId));

  const metadata: DeezerPlaylistMetadata = {
    playlistId: String(playlist.id),
    name: playlist.title,
    description: playlist.description || null,
    creator: playlist.creator?.name ?? 'Unknown',
    image: playlist.picture_big || playlist.picture_medium || null,
    trackCount: playlist.nb_tracks,
    deezerUrl: playlist.link,
  };

  console.log(`📋 Playlist "${metadata.name}" — ${metadata.trackCount} tracks`);
  onProgress?.({
    phase: 'playlist',
    name: metadata.name,
    trackCount: metadata.trackCount,
  });

  // Collect all tracks via auto-paginated iterator
  const tracks: DzTrack[] = [];
  const paginatedTracks = await playlist.getTracks();
  for await (const track of paginatedTracks) {
    tracks.push(track);
    // Emit progress every 10 tracks (or on last track)
    if (tracks.length % 10 === 0 || tracks.length === metadata.trackCount) {
      onProgress?.({
        phase: 'tracks',
        current: tracks.length,
        total: metadata.trackCount,
      });
    }
    if (tracks.length % 100 === 0) {
      console.log(
        `📄 Fetched ${tracks.length} of ${metadata.trackCount} tracks`
      );
    }
  }

  return { metadata, tracks };
}

// ============================================================================
// Album Extraction
// ============================================================================

interface AlbumFetchFailure {
  albumId: number;
  title: string;
  reason: 'delisted' | 'error';
  message: string;
}

/**
 * Extract unique albums from playlist tracks.
 * Deduplicates by Deezer album ID, then fetches full album details
 * for metadata (release_date, record_type, nb_tracks).
 *
 * The SDK handles rate limiting and retries automatically.
 * Failures are collected and logged as a single summary at the end.
 */
async function extractUniqueAlbumsWithDetails(
  tracks: DzTrack[],
  onProgress?: PreviewProgressCallback
): Promise<{
  albums: DeezerPreviewAlbum[];
  singlesFiltered: number;
  compilationsFiltered: number;
}> {
  // Deduplicate by album ID
  const albumMap = new Map<number, { track: DzTrack; artistName: string }>();

  for (const track of tracks) {
    if (!track.album || albumMap.has(track.album.id)) continue;
    albumMap.set(track.album.id, {
      track,
      artistName: track.artist.name,
    });
  }

  const totalUniqueAlbums = albumMap.size;
  console.log(
    `📀 Found ${totalUniqueAlbums} unique albums from ${tracks.length} tracks`
  );

  const albums: DeezerPreviewAlbum[] = [];
  const failures: AlbumFetchFailure[] = [];
  let singlesFiltered = 0;
  let compilationsFiltered = 0;
  let processed = 0;

  // Fetch album details sequentially — SDK handles rate limiting
  for (const [albumId, { track, artistName }] of albumMap) {
    try {
      const details = await deezerClient.getAlbum(albumId);

      // Filter by record_type
      const recordType = details.record_type?.toLowerCase();
      if (recordType === 'single') {
        singlesFiltered++;
      } else if (recordType === 'compile') {
        compilationsFiltered++;
      } else {
        // Extract year from Date object
        const year = details.release_date
          ? String(details.release_date.getFullYear())
          : null;

        albums.push({
          deezerId: String(details.id),
          title: details.title,
          artist: artistName,
          artistId: String(track.artist.id),
          year,
          coverUrl: details.cover_big || details.cover_medium || null,
          totalTracks: details.nb_tracks ?? 0,
          albumType: details.record_type || 'album',
        });
      }
    } catch (err) {
      // Categorize the failure
      const isDelisted =
        err instanceof DeezerNotFoundError ||
        err instanceof DeezerErrorResponse;

      failures.push({
        albumId,
        title: track.album.title,
        reason: isDelisted ? 'delisted' : 'error',
        message: err instanceof Error ? err.message : String(err),
      });

      // Use fallback data from the track listing
      albums.push({
        deezerId: String(albumId),
        title: track.album.title,
        artist: artistName,
        artistId: String(track.artist.id),
        year: null,
        coverUrl: track.album.cover_big || track.album.cover_medium || null,
        totalTracks: 0,
        albumType: 'album',
      });
    }

    processed++;
    onProgress?.({
      phase: 'albums',
      current: processed,
      total: totalUniqueAlbums,
    });
    if (processed % 20 === 0) {
      console.log(`📀 Processed ${processed}/${totalUniqueAlbums} albums...`);
    }
  }

  // Summary logging for failures (one message, not per-album spam)
  if (failures.length > 0) {
    const delisted = failures.filter(f => f.reason === 'delisted');
    const errors = failures.filter(f => f.reason === 'error');

    const parts = [
      `⚠️  Failed to fetch details for ${failures.length}/${totalUniqueAlbums} albums (using fallback data)`,
    ];
    if (delisted.length > 0) {
      parts.push(`  Delisted/unavailable: ${delisted.length}`);
      // Show a few examples
      const examples = delisted.slice(0, 3).map(f => `"${f.title}"`);
      parts.push(`  Examples: ${examples.join(', ')}`);
    }
    if (errors.length > 0) {
      parts.push(`  Other errors: ${errors.length}`);
      const examples = errors
        .slice(0, 3)
        .map(f => `"${f.title}" (${f.message})`);
      parts.push(`  Examples: ${examples.join(', ')}`);
    }

    console.warn(parts.join('\n'));
  }

  return { albums, singlesFiltered, compilationsFiltered };
}

// ============================================================================
// DB Existence Check (Read-Only)
// ============================================================================

/**
 * Check which preview albums already exist in the local database.
 * Uses a 3-level lookup (same priority as findOrCreateAlbum but read-only):
 *   1. deezerId (unique index — fast batch query)
 *   2. title + artist + year (±1 year fuzzy)
 *   3. title + artist (no year)
 *
 * Mutates the albums in-place, setting `existsInDb` and `dbAlbumId`.
 */
export async function annotateExistingAlbums(
  albums: DeezerPreviewAlbum[]
): Promise<{ matched: number }> {
  if (albums.length === 0) return { matched: 0 };

  let matched = 0;

  // ------------------------------------------------------------------
  // Pass 1: Batch lookup by deezerId (single query, most efficient)
  // ------------------------------------------------------------------
  const deezerIds = albums.map(a => a.deezerId).filter(Boolean);
  const byDeezerId = new Map<string, string>();

  if (deezerIds.length > 0) {
    const existing = await prisma.album.findMany({
      where: { deezerId: { in: deezerIds } },
      select: { id: true, deezerId: true },
    });
    for (const row of existing) {
      if (row.deezerId) byDeezerId.set(row.deezerId, row.id);
    }
  }

  // Apply deezerId matches
  const unmatched: DeezerPreviewAlbum[] = [];
  for (const album of albums) {
    const dbId = byDeezerId.get(album.deezerId);
    if (dbId) {
      album.existsInDb = true;
      album.dbAlbumId = dbId;
      matched++;
    } else {
      unmatched.push(album);
    }
  }

  // ------------------------------------------------------------------
  // Pass 2: title + artist fallback for albums without deezerId match
  // ------------------------------------------------------------------
  // Batch these into a single query using OR conditions
  if (unmatched.length > 0) {
    const orConditions = unmatched.map(album => {
      const yearNum = album.year ? parseInt(album.year, 10) : null;
      const baseCondition = {
        title: { equals: album.title, mode: 'insensitive' as const },
        artists: {
          some: {
            artist: {
              name: { equals: album.artist, mode: 'insensitive' as const },
            },
          },
        },
      };

      // If we have a year, add ±1 year constraint
      if (yearNum && !isNaN(yearNum)) {
        return {
          ...baseCondition,
          releaseDate: {
            gte: new Date(yearNum - 1, 0, 1),
            lt: new Date(yearNum + 2, 0, 1),
          },
        };
      }

      return baseCondition;
    });

    const titleArtistMatches = await prisma.album.findMany({
      where: { OR: orConditions },
      select: {
        id: true,
        title: true,
        releaseDate: true,
        artists: {
          where: { role: 'PRIMARY' },
          select: { artist: { select: { name: true } } },
          take: 1,
        },
      },
    });

    // Match results back to unmatched albums by title+artist (case-insensitive)
    for (const album of unmatched) {
      const match = titleArtistMatches.find(db => {
        const titleMatch = db.title.toLowerCase() === album.title.toLowerCase();
        const artistMatch = db.artists.some(
          aa => aa.artist.name.toLowerCase() === album.artist.toLowerCase()
        );
        return titleMatch && artistMatch;
      });

      if (match) {
        album.existsInDb = true;
        album.dbAlbumId = match.id;
        matched++;
      }
    }
  }

  // Default unmatched to existsInDb = false
  for (const album of albums) {
    if (album.existsInDb === undefined) {
      album.existsInDb = false;
    }
  }

  return { matched };
}

// ============================================================================
// Preview (Read-Only)
// ============================================================================

/**
 * Preview a Deezer playlist's albums without any DB writes.
 * Fetches metadata + tracks, extracts unique albums, filters by type.
 */
export async function previewDeezerPlaylistAlbums(
  playlistId: string,
  options?: { onProgress?: PreviewProgressCallback }
): Promise<DeezerPlaylistPreviewResult> {
  const onProgress = options?.onProgress;
  console.log(`🔍 Previewing Deezer playlist: ${playlistId}`);

  // Fetch playlist + all tracks (SDK handles pagination + rate limiting)
  const { metadata, tracks } = await fetchPlaylistWithTracks(
    playlistId,
    onProgress
  );

  // Extract unique albums with details and filter
  const { albums, singlesFiltered, compilationsFiltered } =
    await extractUniqueAlbumsWithDetails(tracks, onProgress);

  // Total unique albums before filtering
  const uniqueAlbumIds = new Set(
    tracks.filter(t => t.album).map(t => t.album.id)
  );

  console.log(
    `📀 ${uniqueAlbumIds.size} unique albums → ${albums.length} after filtering (${singlesFiltered} singles, ${compilationsFiltered} compilations removed)`
  );

  // Check which albums already exist in the local database
  const { matched } = await annotateExistingAlbums(albums);
  if (matched > 0) {
    console.log(`🔍 ${matched}/${albums.length} albums already in database`);
  }

  const result: DeezerPlaylistPreviewResult = {
    playlist: metadata,
    albums,
    stats: {
      totalTracks: tracks.length,
      uniqueAlbums: uniqueAlbumIds.size,
      albumsAfterFilter: albums.length,
      singlesFiltered,
      compilationsFiltered,
      existingInDb: matched,
    },
  };

  onProgress?.({ phase: 'done', result });

  return result;
}

// ============================================================================
// Import (DB Writes)
// ============================================================================

/**
 * Convert DeezerPreviewAlbum[] to DeezerAlbumData[] for processDeezerAlbums().
 */
function toDeezerAlbumData(albums: DeezerPreviewAlbum[]): DeezerAlbumData[] {
  return albums.map(album => ({
    deezerId: album.deezerId,
    title: album.title,
    artistName: album.artist,
    artistDeezerId: album.artistId,
    coverUrl: album.coverUrl,
    releaseDate: album.year || null,
    albumType: album.albumType,
    totalTracks: album.totalTracks,
  }));
}

/**
 * Import albums from a Deezer playlist into the database.
 * Fetches tracks, extracts unique albums, filters by type,
 * and processes through the processDeezerAlbums() pipeline.
 *
 * processDeezerAlbums() creates records with:
 *   - source: DEEZER, deezerId populated, NO fake spotifyId
 *   - Enrichment queued via findOrCreateAlbum() side effects
 *   - LlamaLog audit trail with correct operation and rootJobId
 */
export async function importDeezerPlaylistAlbums(
  playlistId: string,
  options?: {
    jobId?: string;
    playlistName?: string;
    selectedDeezerIds?: string[];
  }
): Promise<DeezerPlaylistImportResult> {
  console.log(`🚀 Importing Deezer playlist: ${playlistId}`);

  // Use preview to get the filtered album list
  const preview = await previewDeezerPlaylistAlbums(playlistId);

  // If selectedDeezerIds provided, only import those albums
  let albumsToImport = preview.albums;
  if (options?.selectedDeezerIds && options.selectedDeezerIds.length > 0) {
    const selectedSet = new Set(options.selectedDeezerIds);
    albumsToImport = preview.albums.filter(a => selectedSet.has(a.deezerId));
    console.log(
      `🎯 User selected ${albumsToImport.length} of ${preview.albums.length} albums`
    );
  }

  if (albumsToImport.length === 0) {
    return {
      success: true,
      playlist: preview.playlist,
      processing: {
        albumsProcessed: 0,
        artistsProcessed: 0,
        duplicatesSkipped: 0,
        errors: [],
      },
      message: `No albums found in playlist "${preview.playlist.name}"`,
    };
  }

  // Convert to DeezerAlbumData format for the processing pipeline
  const albumData = toDeezerAlbumData(albumsToImport);

  // Process through the Deezer-native pipeline
  const { processDeezerAlbums } = await import('./mappers');

  const stats = await processDeezerAlbums(albumData, {
    jobId: options?.jobId,
    batchId: `deezer_playlist_${playlistId}`,
    playlistName: options?.playlistName ?? preview.playlist.name,
  });

  const message = [
    `Imported from "${preview.playlist.name}":`,
    `${stats.albumsProcessed} albums created,`,
    `${stats.duplicatesSkipped} duplicates skipped`,
    stats.errors.length > 0 ? `, ${stats.errors.length} errors` : '',
  ].join(' ');

  console.log(`✅ ${message}`);

  return {
    success: stats.errors.length === 0,
    playlist: preview.playlist,
    processing: stats,
    message,
  };
}

// ============================================================================
// Utilities
// ============================================================================

/**
 * Extract a Deezer playlist ID from a URL or raw ID string.
 * Handles:
 *   - Raw numeric ID: "867825522"
 *   - Full URL: "https://www.deezer.com/playlist/867825522"
 *   - URL with query params: "https://www.deezer.com/playlist/867825522?utm_source=..."
 *   - Locale URLs: "https://www.deezer.com/en/playlist/867825522"
 */
export function extractDeezerPlaylistId(input: string): string | null {
  const trimmed = input.trim();

  // URL format: https://www.deezer.com/[locale/]playlist/ID
  const urlMatch = trimmed.match(/deezer\.com\/(?:[a-z]{2}\/)?playlist\/(\d+)/);
  if (urlMatch) return urlMatch[1];

  // Raw numeric ID
  if (/^\d+$/.test(trimmed)) return trimmed;

  return null;
}

/**
 * Detect whether a URL/input is a Deezer or Spotify playlist.
 * Returns the source type and extracted ID.
 */
export function detectPlaylistSource(
  input: string
): { source: 'deezer'; id: string } | { source: 'spotify'; id: string } | null {
  const trimmed = input.trim();

  // Check Deezer first (URL-based)
  if (trimmed.includes('deezer.com')) {
    const id = extractDeezerPlaylistId(trimmed);
    return id ? { source: 'deezer', id } : null;
  }

  // Check Spotify (URL, URI, or alphanumeric ID)
  if (
    trimmed.includes('spotify.com') ||
    trimmed.includes('spotify:playlist:')
  ) {
    // Delegate to Spotify's extractor
    const uriMatch = trimmed.match(/spotify:playlist:([a-zA-Z0-9]+)/);
    if (uriMatch) return { source: 'spotify', id: uriMatch[1] };

    const urlMatch = trimmed.match(
      /open\.spotify\.com\/playlist\/([a-zA-Z0-9]+)/
    );
    if (urlMatch) return { source: 'spotify', id: urlMatch[1] };

    return null;
  }

  // Raw numeric ID → assume Deezer
  if (/^\d+$/.test(trimmed)) {
    return { source: 'deezer', id: trimmed };
  }

  // Raw alphanumeric ID → assume Spotify
  if (/^[a-zA-Z0-9]{15,}$/.test(trimmed)) {
    return { source: 'spotify', id: trimmed };
  }

  return null;
}
