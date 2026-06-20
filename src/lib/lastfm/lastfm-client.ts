// src/lib/lastfm/lastfm-client.ts
/**
 * Last.fm user data client methods.
 * Typed methods for user-scoped endpoints (getInfo, getTopArtists, etc.)
 */

import { lastfmFetch, type LastfmResult } from './lastfm-base';
import type {
  LastfmPeriod,
  LastfmUserInfo,
  LastfmUserInfoResponse,
  LastfmTopArtistCached,
  LastfmTopArtistsResponse,
  LastfmTopAlbumCached,
  LastfmTopAlbumsResponse,
  LastfmRecentTrackCached,
  LastfmRecentTracksResponse,
  LastfmLovedTrackCached,
  LastfmLovedTracksResponse,
  LastfmImage,
} from './types';

// ============================================================================
// Helpers
// ============================================================================

function extractBestImageFromLastfm(
  images?: LastfmImage[]
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
// User Info
// ============================================================================

export async function getUserInfo(
  username: string
): Promise<LastfmResult<LastfmUserInfo>> {
  const result = await lastfmFetch<LastfmUserInfoResponse>('user.getinfo', {
    user: username,
  });

  if (!result.success) return result;

  const u = result.data.user;
  return {
    success: true,
    data: {
      username: u.name,
      realname: u.realname || undefined,
      url: u.url,
      country: u.country || undefined,
      playcount: parseInt(u.playcount, 10) || 0,
      artistCount: u.artist_count ? parseInt(u.artist_count, 10) : undefined,
      albumCount: u.album_count ? parseInt(u.album_count, 10) : undefined,
      trackCount: u.track_count ? parseInt(u.track_count, 10) : undefined,
      imageUrl: extractBestImageFromLastfm(u.image),
      registeredAt: parseInt(u.registered.unixtime, 10),
    },
  };
}

// ============================================================================
// Top Artists
// ============================================================================

export async function getTopArtists(
  username: string,
  period: LastfmPeriod = 'overall',
  limit: number = 20
): Promise<LastfmResult<LastfmTopArtistCached[]>> {
  const result = await lastfmFetch<LastfmTopArtistsResponse>(
    'user.gettopartists',
    {
      user: username,
      period,
      limit: String(limit),
    }
  );

  if (!result.success) return result;

  const artists = result.data?.topartists?.artist || [];

  if (!Array.isArray(artists)) {
    return { success: true, data: [] };
  }

  return {
    success: true,
    data: artists.map(a => ({
      name: a.name,
      playcount: parseInt(a.playcount, 10) || 0,
      mbid: a.mbid,
      rank: parseInt(a['@attr']?.rank, 10) || 0,
      imageUrl: extractBestImageFromLastfm(a.image),
    })),
  };
}

// ============================================================================
// Top Albums
// ============================================================================

export async function getTopAlbums(
  username: string,
  period: LastfmPeriod = 'overall',
  limit: number = 20
): Promise<LastfmResult<LastfmTopAlbumCached[]>> {
  const result = await lastfmFetch<LastfmTopAlbumsResponse>(
    'user.gettopalbums',
    {
      user: username,
      period,
      limit: String(limit),
    }
  );

  if (!result.success) return result;

  const albums = result.data?.topalbums?.album || [];

  if (!Array.isArray(albums)) {
    return { success: true, data: [] };
  }

  return {
    success: true,
    data: albums.map(a => ({
      name: a.name,
      artistName: a.artist.name,
      artistMbid: a.artist.mbid,
      playcount: parseInt(a.playcount, 10) || 0,
      mbid: a.mbid,
      rank: parseInt(a['@attr']?.rank, 10) || 0,
      imageUrl: extractBestImageFromLastfm(a.image),
    })),
  };
}

// ============================================================================
// Recent Tracks
// ============================================================================

export async function getRecentTracks(
  username: string,
  limit: number = 50,
  from?: number,
  to?: number
): Promise<LastfmResult<LastfmRecentTrackCached[]>> {
  const params: Record<string, string> = {
    user: username,
    limit: String(limit),
    extended: '0',
  };

  if (from !== undefined) params.from = String(from);
  if (to !== undefined) params.to = String(to);

  const result = await lastfmFetch<LastfmRecentTracksResponse>(
    'user.getrecenttracks',
    params
  );

  if (!result.success) return result;

  const tracks = result.data?.recenttracks?.track || [];

  if (!Array.isArray(tracks)) {
    return { success: true, data: [] };
  }

  return {
    success: true,
    data: tracks.map(t => ({
      name: t.name,
      artistName: t.artist['#text'],
      artistMbid: t.artist.mbid,
      albumName: t.album['#text'],
      albumMbid: t.album.mbid,
      playedAt: t.date ? parseInt(t.date.uts, 10) : null,
      nowPlaying: t['@attr']?.nowplaying === 'true',
      imageUrl: extractBestImageFromLastfm(t.image),
    })),
  };
}

// ============================================================================
// Loved Tracks
// ============================================================================

export async function getLovedTracks(
  username: string,
  limit: number = 50
): Promise<LastfmResult<LastfmLovedTrackCached[]>> {
  const result = await lastfmFetch<LastfmLovedTracksResponse>(
    'user.getlovedtracks',
    {
      user: username,
      limit: String(limit),
    }
  );

  if (!result.success) return result;

  const tracks = result.data?.lovedtracks?.track || [];

  if (!Array.isArray(tracks)) {
    return { success: true, data: [] };
  }

  return {
    success: true,
    data: tracks.map(t => ({
      name: t.name,
      artistName: t.artist.name,
      artistMbid: t.artist.mbid,
      mbid: t.mbid,
      lovedAt: parseInt(t.date.uts, 10),
      imageUrl: extractBestImageFromLastfm(t.image),
    })),
  };
}
