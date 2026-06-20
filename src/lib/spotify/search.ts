// src/lib/spotify/search.ts
/**
 * Spotify search utilities.
 * Delegates to the unified Spotify client singleton.
 * Kept as a module for backwards-compatible imports (searchSpotifyArtists, getArtistsByIds).
 */

import { spotifyClient } from './client';

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

/**
 * Extract the best quality image URL from Spotify image array
 * Preference: largest image
 */
export function extractBestImage(
  images?: SpotifyArtistImage[]
): string | undefined {
  if (!images || images.length === 0) return undefined;

  const sorted = [...images].sort((a, b) => {
    const aSize = (a.width || 0) * (a.height || 0);
    const bSize = (b.width || 0) * (b.height || 0);
    return bSize - aSize;
  });

  return sorted[0]?.url;
}

/**
 * Search for artists on Spotify.
 * Delegates to unified client with graceful degradation.
 */
export async function searchSpotifyArtists(
  query: string
): Promise<SpotifySearchResult[]> {
  try {
    return await spotifyClient.searchArtists(query);
  } catch {
    return [];
  }
}

/**
 * Fetch multiple artists by Spotify IDs in a single batch request.
 * Delegates to unified client with graceful degradation.
 */
export async function getArtistsByIds(artistIds: string[]): Promise<
  Array<{
    id: string;
    name: string;
    followers: number;
    popularity: number;
    genres: string[];
    imageUrl?: string;
  }>
> {
  try {
    return await spotifyClient.getArtistsByIds(artistIds);
  } catch {
    return [];
  }
}
