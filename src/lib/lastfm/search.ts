// src/lib/lastfm/search.ts
/**
 * Last.fm API service for fetching artist information and images
 * Follows the pattern established by MusicBrainz service with error handling and logging
 */

const LASTFM_API_URL = 'https://ws.audioscrobbler.com/2.0/';
const TIMEOUT_MS = 5000;

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

/**
 * Extract the best quality image URL from Last.fm image array
 * Preference order: mega > extralarge > large > medium > small
 */
export function extractBestImage(
  images?: LastFmArtistImage[]
): string | undefined {
  if (!images || images.length === 0) return undefined;

  const sizeOrder: LastFmArtistImage['size'][] = [
    'mega',
    'extralarge',
    'large',
    'medium',
    'small',
  ];

  for (const size of sizeOrder) {
    const img = images.find(i => i.size === size);
    if (img && img['#text'] && img['#text'].trim() !== '') {
      return img['#text'];
    }
  }

  return undefined;
}

/**
 * Search for artists on Last.fm
 * Returns empty array on any error to allow graceful degradation
 */
export async function searchLastFmArtists(
  query: string
): Promise<LastFmSearchResult[]> {
  const apiKey = process.env.LASTFM_API_KEY;

  if (!apiKey) {
    console.warn(
      '⚠️ [Last.fm] API key not configured, skipping Last.fm search'
    );
    return [];
  }

  const startTime = Date.now();

  try {
    const params = new URLSearchParams({
      method: 'artist.search',
      artist: query,
      api_key: apiKey,
      format: 'json',
      limit: '5', // Limit to top 5 results for matching
    });

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

    const response = await fetch(`${LASTFM_API_URL}?${params}`, {
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const duration = Date.now() - startTime;
      console.error(
        `❌ [Last.fm] API error: ${response.status} ${response.statusText} (${duration}ms)`
      );
      return [];
    }

    const data = await response.json();
    const duration = Date.now() - startTime;

    // Last.fm wraps results in results.artistmatches.artist
    const artists = data?.results?.artistmatches?.artist || [];

    if (!Array.isArray(artists)) {
      console.warn(
        `⚠️ [Last.fm] Unexpected response format for query "${query}"`
      );
      return [];
    }

    const results: LastFmSearchResult[] = artists.map(
      (artist: LastFmArtist) => {
        const imageUrl = extractBestImage(artist.image);
        console.log(
          `🖼️ [Last.fm] ${artist.name}: imageUrl = "${imageUrl || 'NONE'}"`,
          artist.image
        );
        return {
          name: artist.name,
          mbid: artist.mbid || undefined,
          listeners: artist.listeners
            ? parseInt(artist.listeners, 10)
            : undefined,
          imageUrl,
          match: artist.match ? parseFloat(artist.match) : undefined,
        };
      }
    );

    console.log(
      `✅ [Last.fm] Found ${results.length} artists for "${query}" (${duration}ms)`
    );

    return results;
  } catch (error: unknown) {
    const duration = Date.now() - startTime;

    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        console.error(
          `⏱️ [Last.fm] Request timeout after ${TIMEOUT_MS}ms for query "${query}"`
        );
      } else {
        console.error(`❌ [Last.fm] Error: ${error.message} (${duration}ms)`);
      }
    } else {
      console.error(`❌ [Last.fm] Unknown error during search (${duration}ms)`);
    }

    return []; // Graceful degradation
  }
}

/**
 * Get detailed artist information from Last.fm
 * Useful for fetching high-quality images and listener counts
 */
export async function getLastFmArtistInfo(
  artistName: string
): Promise<LastFmSearchResult | null> {
  const apiKey = process.env.LASTFM_API_KEY;

  if (!apiKey) {
    return null;
  }

  const startTime = Date.now();

  try {
    const params = new URLSearchParams({
      method: 'artist.getinfo',
      artist: artistName,
      api_key: apiKey,
      format: 'json',
    });

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

    const response = await fetch(`${LASTFM_API_URL}?${params}`, {
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const duration = Date.now() - startTime;
      console.error(
        `❌ [Last.fm] getinfo error: ${response.status} ${response.statusText} (${duration}ms)`
      );
      return null;
    }

    const data = await response.json();
    const duration = Date.now() - startTime;

    const artist = data?.artist;

    if (!artist) {
      console.warn(`⚠️ [Last.fm] No artist info found for "${artistName}"`);
      return null;
    }

    const result: LastFmSearchResult = {
      name: artist.name,
      mbid: artist.mbid || undefined,
      listeners: artist.stats?.listeners
        ? parseInt(artist.stats.listeners, 10)
        : undefined,
      imageUrl: extractBestImage(artist.image),
    };

    console.log(
      `✅ [Last.fm] Got artist info for "${artistName}" (${duration}ms)`
    );

    return result;
  } catch (error: unknown) {
    const duration = Date.now() - startTime;

    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        console.error(
          `⏱️ [Last.fm] getinfo timeout after ${TIMEOUT_MS}ms for "${artistName}"`
        );
      } else {
        console.error(
          `❌ [Last.fm] getinfo error: ${error.message} (${duration}ms)`
        );
      }
    }

    return null;
  }
}
