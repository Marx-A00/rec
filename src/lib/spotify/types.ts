// src/lib/spotify/types.ts
/**
 * TypeScript interfaces for Spotify API data and transformations
 */

// ============================================================================
// Raw Spotify API Response Types (from our cache)
// ============================================================================

export interface SpotifyAlbumData {
  id: string;                    // Spotify album ID
  name: string;                  // Album title
  artists: string;               // "Artist 1, Artist 2" (joined string)
  artistIds: string[];           // ["spotify_artist_1", "spotify_artist_2"]
  releaseDate: string;           // "2025-01-15" or "2025" or "2025-01"
  image: string | null;          // Cover art URL
  spotifyUrl: string;            // Spotify web URL
  type: string;                  // "album", "single", "compilation"
  totalTracks: number;           // Track count
}

export interface SpotifyPlaylistData {
  id: string;
  name: string;
  description: string;
  image: string | null;
  tracksTotal: number;
  spotifyUrl: string;
  owner: string;
}

export interface SpotifyTrackData {
  id: string;                    // Spotify track ID
  name: string;                  // Track title
  track_number: number;          // Track position on album
  disc_number: number;           // Disc number (for multi-disc albums)
  duration_ms: number | null;    // Track duration in milliseconds
  explicit: boolean;             // Explicit content flag
  preview_url: string | null;    // 30-second preview URL
  artists: Array<{              // Track artists (can differ from album artists)
    id: string;
    name: string;
    type: string;
    uri: string;
    href: string;
    external_urls: {
      spotify: string;
    };
  }>;
  external_urls: {
    spotify: string;             // Spotify web URL for track
  };
  href: string;                  // Spotify API URL
  type: string;                  // Always "track"
  uri: string;                   // Spotify URI
  is_local: boolean;             // Local file flag
  is_playable?: boolean;         // Playability status
}

export interface SpotifyArtistData {
  id: string;
  name: string;
  popularity: number;
  followers: number;
  genres: string[];
  image: string | null;
  spotifyUrl: string;
}

export interface SpotifyCacheData {
  newReleases: SpotifyAlbumData[];
  featuredPlaylists: SpotifyPlaylistData[];
  topCharts: any[];              // Complex nested structure
  popularArtists: any[];         // Complex nested structure
  recommendations: any[];
  fetchedAt: string;
}

// ============================================================================
// Transformation Input/Output Types
// ============================================================================

export interface AlbumCreationData {
  title: string;
  releaseDate: Date | null;
  releaseType: string;
  trackCount: number | null;
  coverArtUrl: string | null;
  spotifyId?: string;            // Store original Spotify ID for reference
  spotifyUrl?: string;
  // Enrichment fields (start empty)
  dataQuality: 'LOW' | 'MEDIUM' | 'HIGH';
  enrichmentStatus: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED';
  lastEnriched: Date | null;
}

export interface ArtistCreationData {
  name: string;
  spotifyId?: string;
  spotifyUrl?: string;
  // Enrichment fields (start empty)
  dataQuality: 'LOW' | 'MEDIUM' | 'HIGH';
  enrichmentStatus: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED';
  lastEnriched: Date | null;
}

export interface TrackCreationData {
  title: string;
  trackNumber: number;
  discNumber: number;
  durationMs: number | null;
  explicit: boolean;
  previewUrl: string | null;
  spotifyId?: string;
  spotifyUrl?: string;
  // Album relationship (required)
  albumId: string;
  // Artist relationships
  artists: Array<{
    artistId: string;
    role: string;        // 'primary', 'featured', 'composer', etc.
    position: number;    // Order of appearance
  }>;
  // Enrichment fields (start empty)
  dataQuality: 'LOW' | 'MEDIUM' | 'HIGH';
  enrichmentStatus: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED';
  lastEnriched: Date | null;
}

export interface AlbumArtistRelationData {
  albumId: string;
  artistId: string;
  role: string;                  // 'primary', 'featured', etc.
  position: number;              // Order in artist list
}

// ============================================================================
// Processing Result Types
// ============================================================================

export interface ProcessedSpotifyAlbum {
  album: AlbumCreationData;
  artists: ArtistCreationData[];
  relationships: Omit<AlbumArtistRelationData, 'albumId' | 'artistId'>[];
  enrichmentJobs: {
    albumId?: string;            // Set after DB creation
    artistIds?: string[];        // Set after DB creation
    source: 'spotify_sync';
    priority: 'medium';
  };
}

export interface SpotifyProcessingResult {
  albums: ProcessedSpotifyAlbum[];
  stats: {
    albumsProcessed: number;
    artistsProcessed: number;
    duplicatesSkipped: number;
    errors: string[];
  };
}

// ============================================================================
// Utility Types
// ============================================================================

export type SpotifyAlbumType = 'album' | 'single' | 'compilation';

// MusicBrainz-aligned release types (primary types)
export type MusicBrainzReleaseType = 'album' | 'single' | 'ep' | 'broadcast' | 'other';

// MusicBrainz secondary types (can be combined with primary)
export type MusicBrainzSecondaryType = 
  | 'audio drama' | 'audiobook' | 'compilation' | 'demo' | 'dj-mix' 
  | 'field recording' | 'interview' | 'live' | 'mixtape/street' 
  | 'remix' | 'soundtrack' | 'spokenword';

// MusicBrainz release status
export type MusicBrainzReleaseStatus = 
  | 'official' | 'promotion' | 'bootleg' | 'pseudo-release' | 'withdrawn' | 'cancelled';

// For backward compatibility with our current schema
export type PrismaReleaseType = 'ALBUM' | 'SINGLE' | 'COMPILATION' | 'EP' | 'OTHER';

export interface DateParseResult {
  date: Date | null;
  precision: 'day' | 'month' | 'year' | 'invalid';
}
