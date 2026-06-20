// src/lib/lastfm/cache-transformer.ts
/**
 * Transforms messy Last.fm API responses into clean cached JSON shapes.
 * Parses string numbers, extracts #text keys, removes @attr metadata.
 */

import type {
  LastfmTopArtistsResponse,
  LastfmTopAlbumsResponse,
  LastfmRecentTracksResponse,
  LastfmTopArtistCached,
  LastfmTopAlbumCached,
  LastfmRecentTrackCached,
  LastfmImage,
} from './types';

// ============================================================================
// Helpers
// ============================================================================

function extractBestImageUrl(images?: LastfmImage[]): string | undefined {
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
// Transformers
// ============================================================================

export function transformTopArtists(
  response: LastfmTopArtistsResponse
): LastfmTopArtistCached[] {
  const artists = response?.topartists?.artist;
  if (!artists || !Array.isArray(artists)) return [];

  return artists
    .filter(a => a.name && a.name.trim() !== '')
    .map(a => ({
      name: a.name,
      playcount: parseInt(a.playcount, 10) || 0,
      mbid: a.mbid,
      rank: parseInt(a['@attr']?.rank, 10) || 0,
      imageUrl: extractBestImageUrl(a.image),
    }));
}

export function transformTopAlbums(
  response: LastfmTopAlbumsResponse
): LastfmTopAlbumCached[] {
  const albums = response?.topalbums?.album;
  if (!albums || !Array.isArray(albums)) return [];

  return albums
    .filter(a => a.name && a.name.trim() !== '')
    .map(a => ({
      name: a.name,
      artistName: a.artist.name,
      artistMbid: a.artist.mbid,
      playcount: parseInt(a.playcount, 10) || 0,
      mbid: a.mbid,
      rank: parseInt(a['@attr']?.rank, 10) || 0,
      imageUrl: extractBestImageUrl(a.image),
    }));
}

export function transformRecentTracks(
  response: LastfmRecentTracksResponse
): LastfmRecentTrackCached[] {
  const tracks = response?.recenttracks?.track;
  if (!tracks || !Array.isArray(tracks)) return [];

  return tracks
    .filter(t => t.name && t.name.trim() !== '')
    .map(t => ({
      name: t.name,
      artistName: t.artist['#text'],
      artistMbid: t.artist.mbid,
      albumName: t.album['#text'],
      albumMbid: t.album.mbid,
      playedAt: t.date ? parseInt(t.date.uts, 10) : null,
      nowPlaying: t['@attr']?.nowplaying === 'true',
      imageUrl: extractBestImageUrl(t.image),
    }));
}
