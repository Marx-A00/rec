// src/lib/spotify/search.ts
/**
 * Spotify API service for fetching artist information and images
 * Uses Client Credentials flow for authentication
 */

const SPOTIFY_API_URL = 'https://api.spotify.com/v1';
const SPOTIFY_TOKEN_URL = 'https://accounts.spotify.com/api/token';
const TIMEOUT_MS = 5000;

export interface SpotifyArtistImage {
  url: string;
  height: number;
  width: number;
}

export interface SpotifyArtist {
  id: string;
  name: string;
  images: SpotifyArtistImage[];
  genres: string[];
  popularity: number;
  external_urls: {
    spotify: string;
  };
}

export interface SpotifySearchResult {
  name: string;
  spotifyId: string;
  imageUrl?: string;
  popularity?: number;
  genres?: string[];
}

let cachedAccessToken: string | null = null;
let tokenExpiry: number = 0;

/**
 * Get Spotify access token using Client Credentials flow
 */
async function getAccessToken(): Promise<string> {
  // Return cached token if still valid (with 5 min buffer)
  if (cachedAccessToken && Date.now() < tokenExpiry - 300000) {
    return cachedAccessToken;
  }

  const clientId = process.env.AUTH_SPOTIFY_ID;
  const clientSecret = process.env.AUTH_SPOTIFY_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error('Spotify credentials not configured');
  }

  const response = await fetch(SPOTIFY_TOKEN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
    },
    body: 'grant_type=client_credentials',
  });

  if (!response.ok) {
    throw new Error(`Spotify auth failed: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  cachedAccessToken = data.access_token;
  tokenExpiry = Date.now() + data.expires_in * 1000;

  if (!cachedAccessToken) {
    throw new Error('No access token received from Spotify');
  }

  return cachedAccessToken;
}

/**
 * Extract the best quality image URL from Spotify image array
 * Preference: largest image
 */
export function extractBestImage(images?: SpotifyArtistImage[]): string | undefined {
  if (!images || images.length === 0) return undefined;

  // Sort by size (largest first)
  const sorted = [...images].sort((a, b) => {
    const aSize = (a.width || 0) * (a.height || 0);
    const bSize = (b.width || 0) * (b.height || 0);
    return bSize - aSize;
  });

  return sorted[0]?.url;
}

/**
 * Search for artists on Spotify
 * Returns artist info with high-quality images
 */
export async function searchSpotifyArtists(query: string): Promise<SpotifySearchResult[]> {
  const startTime = Date.now();

  try {
    const accessToken = await getAccessToken();

    const params = new URLSearchParams({
      q: query,
      type: 'artist',
      limit: '5', // Top 5 results for matching
    });

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

    const response = await fetch(`${SPOTIFY_API_URL}/search?${params}`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const duration = Date.now() - startTime;
      console.error(`❌ [Spotify] API error: ${response.status} ${response.statusText} (${duration}ms)`);
      return [];
    }

    const data = await response.json();
    const duration = Date.now() - startTime;

    const artists = data?.artists?.items || [];

    if (!Array.isArray(artists)) {
      console.warn(`⚠️ [Spotify] Unexpected response format for query "${query}"`);
      return [];
    }

    const results: SpotifySearchResult[] = artists.map((artist: SpotifyArtist) => {
      const imageUrl = extractBestImage(artist.images);
      return {
        name: artist.name,
        spotifyId: artist.id,
        imageUrl,
        popularity: artist.popularity,
        genres: artist.genres,
      };
    });

    return results;
  } catch (error: unknown) {
    const duration = Date.now() - startTime;

    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        console.error(`⏱️ [Spotify] Request timeout after ${TIMEOUT_MS}ms for query "${query}"`);
      } else {
        console.error(`❌ [Spotify] Error: ${error.message} (${duration}ms)`);
      }
    } else {
      console.error(`❌ [Spotify] Unknown error during search (${duration}ms)`);
    }

    return []; // Graceful degradation
  }
}
