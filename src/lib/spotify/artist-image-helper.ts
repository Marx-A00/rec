// src/lib/spotify/artist-image-helper.ts
/**
 * Shared helper for fetching artist images from Spotify.
 * Results are cached in Redis to avoid redundant API calls.
 */

import { cache, CACHE_KEYS, CACHE_TTLS } from '@/lib/cache';

import { searchSpotifyArtists } from './search';

interface ArtistImageResult {
  imageUrl: string;
  spotifyId: string;
}

/**
 * Try to fetch an artist image from Spotify by searching for the artist name.
 * Checks Redis cache first; caches hits (and misses) to avoid repeat lookups.
 */
export async function tryFetchSpotifyArtistImage(
  artistName: string,
  mbid?: string
): Promise<ArtistImageResult | null> {
  const cacheKey = mbid
    ? CACHE_KEYS.spotifyImage(mbid)
    : CACHE_KEYS.spotifyImage(artistName);

  try {
    // Check cache
    const cached = await cache.get<ArtistImageResult>(cacheKey);
    if (cached !== null) {
      if (cache.isMiss(cached)) return null;
      return cached;
    }

    // Cache miss — hit Spotify
    const results = await searchSpotifyArtists(artistName);
    if (results.length > 0 && results[0].imageUrl) {
      const result: ArtistImageResult = {
        imageUrl: results[0].imageUrl,
        spotifyId: results[0].spotifyId,
      };
      await cache.set(cacheKey, result, CACHE_TTLS.SPOTIFY_IMAGE);
      return result;
    }

    // No image found — cache sentinel to prevent repeat lookups
    await cache.setMiss(cacheKey, CACHE_TTLS.SPOTIFY_IMAGE);
    return null;
  } catch {
    return null;
  }
}
