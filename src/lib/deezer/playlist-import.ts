// src/lib/deezer/playlist-import.ts
/**
 * Deezer playlist import service for the Uncover game.
 * Supports both preview (read-only) and full import workflows.
 *
 * Deezer's public API requires NO authentication for playlist access,
 * making it ideal for importing editorial/decade playlists that Spotify
 * blocks in Development Mode (since Nov 2024 API changes).
 *
 * Preview: Fetches playlist metadata + album list without DB writes.
 * Import: Fetches albums and processes through processDeezerAlbums() pipeline
 *         (proper DEEZER source, deezerId fields, MusicBrainz enrichment queueing).
 */

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
// Deezer API Types (response shapes)
// ============================================================================

interface DeezerPlaylistResponse {
  id: number;
  title: string;
  description: string;
  creator: { name: string; id: number };
  picture_big: string;
  picture_medium: string;
  nb_tracks: number;
  link: string;
  tracks: {
    data: DeezerTrackItem[];
    total: number;
    next?: string;
  };
  error?: { type: string; message: string; code: number };
}

interface DeezerTrackItem {
  id: number;
  title: string;
  artist: {
    id: number;
    name: string;
  };
  album: {
    id: number;
    title: string;
    cover_big: string;
    cover_medium: string;
    type: string;
  };
}

interface DeezerAlbumResponse {
  id: number;
  title: string;
  artist: { id: number; name: string };
  cover_big: string;
  cover_medium: string;
  release_date: string;
  nb_tracks: number;
  record_type: string; // "album", "single", "ep", "compile"
  link: string;
  error?: { type: string; message: string; code: number };
}

// ============================================================================
// Deezer API Helpers
// ============================================================================

const DEEZER_API_BASE = 'https://api.deezer.com';

/**
 * Fetch from Deezer public API. No auth required.
 */
async function deezerFetch<T>(path: string): Promise<T> {
  const res = await fetch(`${DEEZER_API_BASE}${path}`);

  if (!res.ok) {
    throw new Error(`Deezer API error: ${res.status} ${res.statusText}`);
  }

  const data = (await res.json()) as T & {
    error?: { type: string; message: string; code: number };
  };

  // Deezer returns 200 with error object instead of HTTP error codes
  if (data.error) {
    throw new Error(
      `Deezer API error: ${data.error.type} — ${data.error.message} (code: ${data.error.code})`
    );
  }

  return data;
}

// ============================================================================
// Playlist Fetching
// ============================================================================

/**
 * Fetch playlist metadata and first page of tracks.
 */
async function fetchPlaylistData(
  playlistId: string
): Promise<DeezerPlaylistResponse> {
  return deezerFetch<DeezerPlaylistResponse>(`/playlist/${playlistId}`);
}

/**
 * Fetch ALL tracks from a playlist, handling pagination.
 * Deezer paginates via `next` URL in the response.
 */
async function fetchAllPlaylistTracks(
  playlistId: string
): Promise<DeezerTrackItem[]> {
  const allTracks: DeezerTrackItem[] = [];

  // First page comes from the playlist endpoint
  const playlist = await fetchPlaylistData(playlistId);
  allTracks.push(...playlist.tracks.data);

  // Follow pagination
  let nextUrl = playlist.tracks.next;
  while (nextUrl) {
    const res = await fetch(nextUrl);
    if (!res.ok) break;

    const page = (await res.json()) as {
      data: DeezerTrackItem[];
      next?: string;
    };
    allTracks.push(...page.data);
    nextUrl = page.next;

    console.log(
      `📄 Fetched ${allTracks.length} of ${playlist.nb_tracks} tracks`
    );
  }

  return allTracks;
}

// ============================================================================
// Album Detail Fetching
// ============================================================================

/**
 * Fetch album details from Deezer to get release_date and record_type.
 * The playlist endpoint only gives us basic album info (id, title, cover).
 */
async function fetchAlbumDetails(
  albumId: number
): Promise<DeezerAlbumResponse> {
  return deezerFetch<DeezerAlbumResponse>(`/album/${albumId}`);
}

// ============================================================================
// Album Extraction
// ============================================================================

/**
 * Extract unique albums from playlist track items.
 * Deduplicates by Deezer album ID. Fetches album details for metadata.
 */
async function extractUniqueAlbumsWithDetails(
  tracks: DeezerTrackItem[]
): Promise<{
  albums: DeezerPreviewAlbum[];
  singlesFiltered: number;
  compilationsFiltered: number;
}> {
  // Deduplicate by album ID
  const albumMap = new Map<
    number,
    { track: DeezerTrackItem; artistName: string }
  >();

  for (const track of tracks) {
    if (!track.album || albumMap.has(track.album.id)) continue;
    albumMap.set(track.album.id, {
      track,
      artistName: track.artist.name,
    });
  }

  console.log(
    `📀 Found ${albumMap.size} unique albums from ${tracks.length} tracks`
  );

  // Fetch album details in batches to get release_date and record_type
  // Deezer has no documented rate limit for public API, but be respectful
  const entries = Array.from(albumMap.entries());
  const albums: DeezerPreviewAlbum[] = [];
  let singlesFiltered = 0;
  let compilationsFiltered = 0;

  // Process in batches of 10 concurrent requests
  const BATCH_SIZE = 10;
  for (let i = 0; i < entries.length; i += BATCH_SIZE) {
    const batch = entries.slice(i, i + BATCH_SIZE);

    const batchResults = await Promise.allSettled(
      batch.map(async ([albumId, { track, artistName }]) => {
        try {
          const details = await fetchAlbumDetails(albumId);

          // Filter by record_type
          const recordType = details.record_type?.toLowerCase();
          if (recordType === 'single') {
            singlesFiltered++;
            return null;
          }
          if (recordType === 'compile') {
            compilationsFiltered++;
            return null;
          }

          return {
            deezerId: String(details.id),
            title: details.title,
            artist: artistName,
            artistId: String(track.artist.id),
            year: details.release_date
              ? details.release_date.split('-')[0]
              : null,
            coverUrl: details.cover_big || details.cover_medium || null,
            totalTracks: details.nb_tracks,
            albumType: details.record_type || 'album',
          } satisfies DeezerPreviewAlbum;
        } catch (err) {
          // If album detail fetch fails, include it with basic info
          console.warn(
            `⚠️  Failed to fetch details for album ${albumId}, using basic info`
          );
          return {
            deezerId: String(albumId),
            title: track.album.title,
            artist: artistName,
            artistId: String(track.artist.id),
            year: null,
            coverUrl: track.album.cover_big || track.album.cover_medium || null,
            totalTracks: 0,
            albumType: 'album',
          } satisfies DeezerPreviewAlbum;
        }
      })
    );

    for (const result of batchResults) {
      if (result.status === 'fulfilled' && result.value !== null) {
        albums.push(result.value);
      }
    }

    if (i + BATCH_SIZE < entries.length) {
      console.log(
        `📀 Processed ${Math.min(i + BATCH_SIZE, entries.length)}/${entries.length} albums...`
      );
    }
  }

  return { albums, singlesFiltered, compilationsFiltered };
}

// ============================================================================
// Preview (Read-Only)
// ============================================================================

/**
 * Preview a Deezer playlist's albums without any DB writes.
 * Fetches metadata + tracks, extracts unique albums, filters by type.
 */
export async function previewDeezerPlaylistAlbums(
  playlistId: string
): Promise<DeezerPlaylistPreviewResult> {
  console.log(`🔍 Previewing Deezer playlist: ${playlistId}`);

  // Fetch playlist metadata
  const playlistData = await fetchPlaylistData(playlistId);

  const metadata: DeezerPlaylistMetadata = {
    playlistId: String(playlistData.id),
    name: playlistData.title,
    description: playlistData.description || null,
    creator: playlistData.creator.name,
    image: playlistData.picture_big || playlistData.picture_medium || null,
    trackCount: playlistData.nb_tracks,
    deezerUrl: playlistData.link,
  };

  console.log(`📋 Playlist "${metadata.name}" — ${metadata.trackCount} tracks`);

  // Fetch all tracks (handles pagination)
  const allTracks = await fetchAllPlaylistTracks(playlistId);

  // Extract unique albums with details and filter
  const { albums, singlesFiltered, compilationsFiltered } =
    await extractUniqueAlbumsWithDetails(allTracks);

  // Total unique albums before filtering
  const uniqueAlbumIds = new Set(
    allTracks.filter(t => t.album).map(t => t.album.id)
  );

  console.log(
    `📀 ${uniqueAlbumIds.size} unique albums → ${albums.length} after filtering (${singlesFiltered} singles, ${compilationsFiltered} compilations removed)`
  );

  return {
    playlist: metadata,
    albums,
    stats: {
      totalTracks: allTracks.length,
      uniqueAlbums: uniqueAlbumIds.size,
      albumsAfterFilter: albums.length,
      singlesFiltered,
      compilationsFiltered,
    },
  };
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
