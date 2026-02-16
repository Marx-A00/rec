// src/lib/spotify/artist-image-helper.ts
/**
 * Shared helper for fetching artist images from Spotify.
 * Used by Tier 2 background workers (MusicBrainz processor,
 * enrichment processor, integration service) where artist images
 * aren't already available from a batch API call.
 */

import { searchSpotifyArtists } from './search';

interface ArtistImageResult {
  imageUrl: string;
  spotifyId: string;
}

/**
 * Try to fetch an artist image from Spotify by searching for the artist name.
 * Returns the image URL and Spotify ID of the best match, or null on failure.
 *
 * This is a best-effort helper — it silently returns null on any error
 * so callers don't need to handle failures.
 */
export async function tryFetchSpotifyArtistImage(
  artistName: string
): Promise<ArtistImageResult | null> {
  try {
    const results = await searchSpotifyArtists(artistName);
    if (results.length > 0 && results[0].imageUrl) {
      return {
        imageUrl: results[0].imageUrl,
        spotifyId: results[0].spotifyId,
      };
    }
    return null;
  } catch {
    return null;
  }
}
