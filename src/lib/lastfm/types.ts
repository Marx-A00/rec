// src/lib/lastfm/types.ts
/**
 * TypeScript interfaces for Last.fm API responses and normalized cached types.
 * API responses use Last.fm's messy format (#text, @attr, string numbers).
 * Cached types are clean, normalized shapes for database storage.
 */

// ============================================================================
// Shared / Common Types
// ============================================================================

export type LastfmPeriod =
  | '7day'
  | '1month'
  | '3month'
  | '6month'
  | '12month'
  | 'overall';

export interface LastfmImage {
  size: 'small' | 'medium' | 'large' | 'extralarge' | 'mega' | '';
  '#text': string; // URL
}

interface LastfmAttr {
  page?: string;
  perPage?: string;
  totalPages?: string;
  total?: string;
  user?: string;
}

// ============================================================================
// API Response Types — user.getInfo
// ============================================================================

export interface LastfmUserInfoResponse {
  user: {
    name: string;
    realname?: string;
    url: string;
    country?: string;
    age?: string;
    gender?: string;
    playcount: string;
    artist_count?: string;
    album_count?: string;
    track_count?: string;
    image: LastfmImage[];
    registered: {
      unixtime: string;
      '#text'?: number;
    };
    type: string;
    subscriber?: string;
    bootstrap?: string;
  };
}

// ============================================================================
// API Response Types — user.getTopArtists
// ============================================================================

export interface LastfmTopArtistApiEntry {
  name: string;
  playcount: string;
  mbid: string;
  url: string;
  streamable?: string;
  image: LastfmImage[];
  '@attr': {
    rank: string;
  };
}

export interface LastfmTopArtistsResponse {
  topartists: {
    artist: LastfmTopArtistApiEntry[];
    '@attr': LastfmAttr;
  };
}

// ============================================================================
// API Response Types — user.getTopAlbums
// ============================================================================

export interface LastfmTopAlbumApiEntry {
  name: string;
  playcount: string;
  mbid: string;
  url: string;
  artist: {
    name: string;
    mbid: string;
    url: string;
  };
  image: LastfmImage[];
  '@attr': {
    rank: string;
  };
}

export interface LastfmTopAlbumsResponse {
  topalbums: {
    album: LastfmTopAlbumApiEntry[];
    '@attr': LastfmAttr;
  };
}

// ============================================================================
// API Response Types — user.getRecentTracks
// ============================================================================

export interface LastfmRecentTrackApiEntry {
  name: string;
  mbid: string;
  url: string;
  artist: {
    '#text': string;
    mbid: string;
  };
  album: {
    '#text': string;
    mbid: string;
  };
  image: LastfmImage[];
  streamable?: string;
  date?: {
    uts: string;
    '#text': string;
  };
  '@attr'?: {
    nowplaying?: string;
  };
}

export interface LastfmRecentTracksResponse {
  recenttracks: {
    track: LastfmRecentTrackApiEntry[];
    '@attr': LastfmAttr & {
      user: string;
    };
  };
}

// ============================================================================
// API Response Types — user.getLovedTracks
// ============================================================================

export interface LastfmLovedTrackApiEntry {
  name: string;
  mbid: string;
  url: string;
  artist: {
    name: string;
    mbid: string;
    url: string;
  };
  image: LastfmImage[];
  date: {
    uts: string;
    '#text': string;
  };
  streamable?: {
    '#text': string;
    fulltrack: string;
  };
}

export interface LastfmLovedTracksResponse {
  lovedtracks: {
    track: LastfmLovedTrackApiEntry[];
    '@attr': LastfmAttr;
  };
}

// ============================================================================
// Normalized / Cached Types (clean shapes for DB storage)
// ============================================================================

export interface LastfmUserInfo {
  username: string;
  realname?: string;
  url: string;
  country?: string;
  playcount: number;
  artistCount?: number;
  albumCount?: number;
  trackCount?: number;
  imageUrl?: string;
  registeredAt: number; // unix timestamp
}

export interface LastfmTopArtistCached {
  name: string;
  playcount: number;
  mbid: string;
  rank: number;
  imageUrl?: string;
}

export interface LastfmTopAlbumCached {
  name: string;
  artistName: string;
  artistMbid: string;
  playcount: number;
  mbid: string;
  rank: number;
  imageUrl?: string;
}

export interface LastfmRecentTrackCached {
  name: string;
  artistName: string;
  artistMbid: string;
  albumName: string;
  albumMbid: string;
  playedAt: number | null; // unix timestamp, null if now playing
  nowPlaying: boolean;
  imageUrl?: string;
}

export interface LastfmLovedTrackCached {
  name: string;
  artistName: string;
  artistMbid: string;
  mbid: string;
  lovedAt: number; // unix timestamp
  imageUrl?: string;
}

// ============================================================================
// Aggregated Cache Shapes (keyed by period for top artists/albums)
// ============================================================================

export type LastfmTopArtistsByPeriod = Partial<
  Record<LastfmPeriod, LastfmTopArtistCached[]>
>;

export type LastfmTopAlbumsByPeriod = Partial<
  Record<LastfmPeriod, LastfmTopAlbumCached[]>
>;
