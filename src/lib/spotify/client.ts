// src/lib/spotify/client.ts
/**
 * Unified Spotify client singleton.
 * All Spotify API calls should go through this module.
 * Handles token refresh (via SDK) and 429 retry with exponential backoff.
 */

import { SpotifyApi, type Market, type MaxInt } from '@spotify/web-api-ts-sdk';

import { cache, CACHE_KEYS, CACHE_TTLS } from '@/lib/cache';

import {
  withSpotifyRetry,
  DEFAULT_RETRY_CONFIG,
  type RetryConfig,
} from './error-handling';
import { extractBestImage } from './search';
import type { SpotifySearchResult } from './search';

const globalForSpotify = global as unknown as { spotifyClient: SpotifyClient };

class SpotifyClient {
  private sdk: SpotifyApi;
  private retryConfig: RetryConfig;

  constructor(retryConfig: RetryConfig = DEFAULT_RETRY_CONFIG) {
    const clientId = process.env.SPOTIFY_CLIENT_ID;
    const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      throw new Error(
        'SPOTIFY_CLIENT_ID and SPOTIFY_CLIENT_SECRET must be set'
      );
    }

    this.sdk = SpotifyApi.withClientCredentials(clientId, clientSecret);
    this.retryConfig = retryConfig;
  }

  /**
   * Search for artists by name.
   * Returns up to `limit` results with image URLs extracted.
   */
  async searchArtists(
    query: string,
    limit: MaxInt<50> = 5
  ): Promise<SpotifySearchResult[]> {
    const cacheKey = CACHE_KEYS.spotifySearch(query);
    const cached = await cache.get<SpotifySearchResult[]>(cacheKey);
    if (cached !== null) return cached;

    const results = await withSpotifyRetry(
      async () => {
        const response = await this.sdk.search(query, ['artist'], undefined, limit);
        const artists = response.artists?.items ?? [];

        return artists.map(artist => ({
          name: artist.name,
          spotifyId: artist.id,
          imageUrl: extractBestImage(
            artist.images as { url: string; height: number; width: number }[]
          ),
          popularity: artist.popularity,
          genres: artist.genres,
        }));
      },
      `Spotify searchArtists("${query}")`,
      this.retryConfig
    );

    if (results.length > 0) {
      await cache.set(cacheKey, results, CACHE_TTLS.SPOTIFY_SEARCH);
    }

    return results;
  }

  /**
   * Fetch multiple artists by their Spotify IDs (batch, max 50 per call).
   */
  async getArtistsByIds(
    artistIds: string[]
  ): Promise<
    Array<{
      id: string;
      name: string;
      followers: number;
      popularity: number;
      genres: string[];
      imageUrl?: string;
    }>
  > {
    if (artistIds.length === 0) return [];

    const results: Array<{
      id: string;
      name: string;
      followers: number;
      popularity: number;
      genres: string[];
      imageUrl?: string;
    }> = [];

    // Spotify allows max 50 per request
    for (let i = 0; i < artistIds.length; i += 50) {
      const batch = artistIds.slice(i, i + 50);
      const artists = await withSpotifyRetry(
        async () => this.sdk.artists.get(batch),
        `Spotify getArtistsByIds(${batch.length} ids)`,
        this.retryConfig
      );

      for (const artist of artists) {
        if (artist) {
          results.push({
            id: artist.id,
            name: artist.name,
            followers: artist.followers?.total ?? 0,
            popularity: artist.popularity ?? 0,
            genres: artist.genres ?? [],
            imageUrl: extractBestImage(
              artist.images as {
                url: string;
                height: number;
                width: number;
              }[]
            ),
          });
        }
      }
    }

    return results;
  }

  /**
   * Search for albums by query.
   */
  async searchAlbums(query: string, limit: MaxInt<50> = 20) {
    return withSpotifyRetry(
      async () => {
        const response = await this.sdk.search(query, ['album'], undefined, limit);
        return response.albums?.items ?? [];
      },
      `Spotify searchAlbums("${query}")`,
      this.retryConfig
    );
  }

  /**
   * Get tracks for an album.
   */
  async getAlbumTracks(albumId: string, market: Market = 'US', limit: MaxInt<50> = 50) {
    return withSpotifyRetry(
      async () => {
        const response = await this.sdk.albums.tracks(albumId, market, limit);
        return response.items;
      },
      `Spotify getAlbumTracks(${albumId})`,
      this.retryConfig
    );
  }

  /**
   * Access the underlying SDK for advanced operations
   * (e.g. search with tag:new).
   * Callers should wrap with withSpotifyRetry themselves.
   */
  get raw(): SpotifyApi {
    return this.sdk;
  }
}

export function getSpotifyClient(): SpotifyClient {
  if (!globalForSpotify.spotifyClient) {
    globalForSpotify.spotifyClient = new SpotifyClient();
  }
  return globalForSpotify.spotifyClient;
}

/** @deprecated Use getSpotifyClient() instead — lazy initialization avoids build-time crashes when env vars are missing */
export const spotifyClient = new Proxy({} as SpotifyClient, {
  get(_, prop) {
    return (getSpotifyClient() as unknown as Record<string | symbol, unknown>)[prop];
  },
});

export { SpotifyClient };
