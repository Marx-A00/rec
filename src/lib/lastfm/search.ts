// src/lib/lastfm/search.ts
/**
 * Last.fm API service for fetching artist information and images.
 * Uses shared lastfm-base.ts for API calls.
 */

import { lastfmFetch } from './lastfm-base';
import type { LastfmImage } from './types';

// ============================================================================
// Exported Interfaces (backward-compatible)
// ============================================================================

export interface LastFmArtistImage {
  size: 'small' | 'medium' | 'large' | 'extralarge' | 'mega';
  '#text': string; // URL
}

export interface LastFmArtist {
  name: string;
  listeners?: string;
  mbid?: string;
  url?: string;
  image?: LastFmArtistImage[];
  match?: string; // Search match score
}

export interface LastFmSearchResult {
  name: string;
  mbid?: string;
  listeners?: number;
  imageUrl?: string;
  match?: number;
}

export interface LastFmSimilarArtist {
  name: string;
  mbid?: string;
  match: string; // 0.0-1.0 float as string
  url: string;
  image?: LastFmArtistImage[];
}

// ============================================================================
// API Response Shapes (internal)
// ============================================================================

interface ArtistSearchResponse {
  results: {
    artistmatches: {
      artist: LastFmArtist[];
    };
  };
}

interface SimilarArtistsResponse {
  similarartists: {
    artist: LastFmSimilarArtist[];
  };
}

interface ArtistInfoResponse {
  artist: {
    name: string;
    mbid?: string;
    url?: string;
    image?: LastfmImage[];
    stats?: {
      listeners?: string;
      playcount?: string;
    };
  };
}

// ============================================================================
// Image Extraction
// ============================================================================

/**
 * Extract the best quality image URL from Last.fm image array.
 * Preference order: mega > extralarge > large > medium > small
 */
export function extractBestImage(
  images?: LastFmArtistImage[] | LastfmImage[]
): string | undefined {
  if (!images || images.length === 0) return undefined;

  const sizeOrder = ['mega', 'extralarge', 'large', 'medium', 'small'];

  for (const size of sizeOrder) {
    const img = images.find(i => i.size === size);
    if (img && img['#text'] && img['#text'].trim() !== '') {
      return img['#text'];
    }
  }

  return undefined;
}

// ============================================================================
// Artist Search
// ============================================================================

/**
 * Search for artists on Last.fm.
 * Returns empty array on any error to allow graceful degradation.
 */
export async function searchLastFmArtists(
  query: string
): Promise<LastFmSearchResult[]> {
  const startTime = Date.now();

  const result = await lastfmFetch<ArtistSearchResponse>('artist.search', {
    artist: query,
    limit: '5',
  });

  const duration = Date.now() - startTime;

  if (!result.success) {
    if (result.error.code === 'missing_api_key') {
      console.warn(
        '⚠️ [Last.fm] API key not configured, skipping Last.fm search'
      );
    } else {
      console.error(
        `❌ [Last.fm] Search error: ${result.error.message} (${duration}ms)`
      );
    }
    return [];
  }

  const artists = result.data?.results?.artistmatches?.artist || [];

  if (!Array.isArray(artists)) {
    console.warn(
      `⚠️ [Last.fm] Unexpected response format for query "${query}"`
    );
    return [];
  }

  const results: LastFmSearchResult[] = artists.map((artist: LastFmArtist) => {
    const imageUrl = extractBestImage(artist.image);
    console.log(
      `🖼️ [Last.fm] ${artist.name}: imageUrl = "${imageUrl || 'NONE'}"`,
      artist.image
    );
    return {
      name: artist.name,
      mbid: artist.mbid || undefined,
      listeners: artist.listeners ? parseInt(artist.listeners, 10) : undefined,
      imageUrl,
      match: artist.match ? parseFloat(artist.match) : undefined,
    };
  });

  console.log(
    `✅ [Last.fm] Found ${results.length} artists for "${query}" (${duration}ms)`
  );

  return results;
}

// ============================================================================
// Similar Artists
// ============================================================================

/**
 * Get similar artists from Last.fm's artist.getSimilar endpoint.
 * Returns empty array on any error for graceful degradation.
 */
export async function getSimilarArtists(
  artistNameOrMbid: string,
  useMbid: boolean = false,
  limit: number = 20
): Promise<LastFmSimilarArtist[]> {
  const startTime = Date.now();

  const params: Record<string, string> = { limit: String(limit) };
  if (useMbid) {
    params.mbid = artistNameOrMbid;
  } else {
    params.artist = artistNameOrMbid;
  }

  const result = await lastfmFetch<SimilarArtistsResponse>(
    'artist.getsimilar',
    params
  );

  const duration = Date.now() - startTime;

  if (!result.success) {
    if (result.error.code === 'missing_api_key') {
      console.warn('[Last.fm] API key not configured, skipping getSimilar');
    } else {
      console.error(
        `[Last.fm] getSimilar error: ${result.error.message} (${duration}ms)`
      );
    }
    return [];
  }

  const artists = result.data?.similarartists?.artist || [];

  if (!Array.isArray(artists)) {
    console.warn('[Last.fm] Unexpected getSimilar response format');
    return [];
  }

  console.log(
    `[Last.fm] Found ${artists.length} similar artists (${duration}ms)`
  );
  return artists;
}

// ============================================================================
// Artist Info
// ============================================================================

/**
 * Get detailed artist information from Last.fm.
 * Useful for fetching high-quality images and listener counts.
 */
export async function getLastFmArtistInfo(
  artistName: string
): Promise<LastFmSearchResult | null> {
  const startTime = Date.now();

  const result = await lastfmFetch<ArtistInfoResponse>('artist.getinfo', {
    artist: artistName,
  });

  const duration = Date.now() - startTime;

  if (!result.success) {
    if (result.error.code !== 'missing_api_key') {
      console.error(
        `❌ [Last.fm] getinfo error: ${result.error.message} (${duration}ms)`
      );
    }
    return null;
  }

  const artist = result.data?.artist;

  if (!artist) {
    console.warn(`⚠️ [Last.fm] No artist info found for "${artistName}"`);
    return null;
  }

  const searchResult: LastFmSearchResult = {
    name: artist.name,
    mbid: artist.mbid || undefined,
    listeners: artist.stats?.listeners
      ? parseInt(artist.stats.listeners, 10)
      : undefined,
    imageUrl: extractBestImage(artist.image as LastFmArtistImage[]),
  };

  console.log(
    `✅ [Last.fm] Got artist info for "${artistName}" (${duration}ms)`
  );

  return searchResult;
}
