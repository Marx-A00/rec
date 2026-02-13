import { Album } from '@/types/album';
import { DiscogsMaster } from '@/types/discogs/master';
import { DiscogsRelease } from '@/types/discogs/release';

export function mapDiscogsMasterToAlbum(discogsMaster: DiscogsMaster): Album {
  interface DiscogsMetadata {
    type: 'master' | 'release';
    uri?: string | null;
    resource_url?: string | null;
  }
  // Convert duration string (MM:SS) to seconds
  const convertDurationToSeconds = (duration: string): number => {
    if (!duration) return 0;
    const parts = duration.split(':');
    if (parts.length === 2) {
      const minutes = parseInt(parts[0], 10);
      const seconds = parseInt(parts[1], 10);
      return minutes * 60 + seconds;
    }
    return 0;
  };

  // Map tracks
  const tracks =
    discogsMaster.tracklist?.map((track, index) => ({
      id: `${discogsMaster.id}-${index}`,
      title: track.title,
      duration: convertDurationToSeconds(track.duration),
      trackNumber: parseInt(track.position) || index + 1,
    })) || [];

  // Calculate total duration
  const totalDuration = tracks.reduce((sum, track) => sum + track.duration, 0);

  // Get best image
  const image = discogsMaster.images?.[0] || null;

  return {
    id: discogsMaster.id.toString(),
    title: discogsMaster.title,
    source: 'discogs',
    artists: discogsMaster.artists.map(artist => ({
      id: artist.id.toString(),
      name: artist.name,
      anv: artist.anv || undefined,
      role: artist.role || undefined,
      resource_url: artist.resource_url || undefined,
      thumbnail_url: artist.thumbnail_url || undefined,
    })),
    releaseDate: discogsMaster.year?.toString() || '',
    year: discogsMaster.year,
    genre: discogsMaster.genres || [],
    label: '', // Masters don't have labels, releases do
    image: {
      url: image?.uri || 'https://via.placeholder.com/400x400?text=No+Image',
      width: image?.width || 400,
      height: image?.height || 400,
      alt: `${discogsMaster.title} cover`,
    },
    tracks,
    metadata: {
      totalDuration,
      numberOfTracks: tracks.length,
      format: 'Digital', // Default for masters
    },
    // Preserve Discogs metadata for ID extraction
    _discogs: {
      type: 'master',
      uri: discogsMaster.uri,
      resource_url: discogsMaster.resource_url,
    },
    // Store the main release ID as master_id for consistency
    master_id: discogsMaster.id,
  } as Album & { _discogs?: DiscogsMetadata; master_id?: number };
}

export function mapDiscogsReleaseToAlbum(
  discogsRelease: DiscogsRelease
): Album {
  interface DiscogsMetadata {
    type: 'master' | 'release';
    uri?: string | null;
    resource_url?: string | null;
  }
  // Convert duration string (MM:SS) to seconds
  const convertDurationToSeconds = (duration: string): number => {
    if (!duration) return 0;
    const parts = duration.split(':');
    if (parts.length === 2) {
      const minutes = parseInt(parts[0], 10);
      const seconds = parseInt(parts[1], 10);
      return minutes * 60 + seconds;
    }
    return 0;
  };

  // Map tracks
  const tracks =
    discogsRelease.tracklist?.map((track, index) => ({
      id: `${discogsRelease.id}-${index}`,
      title: track.title,
      duration: convertDurationToSeconds(track.duration),
      trackNumber: parseInt(track.position) || index + 1,
    })) || [];

  // Calculate total duration
  const totalDuration = tracks.reduce((sum, track) => sum + track.duration, 0);

  // Get best image (prioritize larger images)
  const bestImage =
    discogsRelease.images?.reduce((best, current) => {
      if (!best) return current;
      const bestSize = (best.width || 0) * (best.height || 0);
      const currentSize = (current.width || 0) * (current.height || 0);
      return currentSize > bestSize ? current : best;
    }) || null;

  // Get format information
  const formatStrings =
    discogsRelease.formats?.map(format => {
      const descriptions = format.descriptions?.join(', ') || '';
      return descriptions ? `${format.name} (${descriptions})` : format.name;
    }) || [];

  // Get label information
  const labelNames = discogsRelease.labels?.map(label => label.name) || [];

  return {
    id: discogsRelease.id.toString(),
    title: discogsRelease.title,
    source: 'discogs',
    artists: discogsRelease.artists.map(artist => ({
      id: artist.id.toString(),
      name: artist.name,
      anv: artist.anv || undefined,
      role: artist.role || undefined,
      resource_url: artist.resource_url || undefined,
      thumbnail_url: artist.thumbnail_url || undefined,
    })),
    releaseDate:
      discogsRelease.released || discogsRelease.year?.toString() || '',
    year: discogsRelease.year,
    genre: discogsRelease.genres || [],
    label: labelNames.join(', '),
    image: {
      url:
        bestImage?.uri || 'https://via.placeholder.com/400x400?text=No+Image',
      width: bestImage?.width || 400,
      height: bestImage?.height || 400,
      alt: `${discogsRelease.title} cover`,
    },
    tracks,
    metadata: {
      totalDuration,
      numberOfTracks: tracks.length,
      format: formatStrings.join(', ') || 'Unknown',
    },
    // Preserve Discogs metadata for ID extraction
    _discogs: {
      type: 'release',
      uri: discogsRelease.uri,
      resource_url: discogsRelease.resource_url,
    },
    // Store the master ID if available - this is key for preferring master IDs!
    master_id: discogsRelease.master_id,
  } as Album & { _discogs?: DiscogsMetadata; master_id?: number | null };
}

// ============================================================================
// Correction Search Mapper
// ============================================================================

import type {
  CorrectionSearchResult,
  CorrectionArtistCredit,
} from '@/lib/correction/types';

/**
 * Map a Discogs Master to CorrectionSearchResult format
 * Used by queue handler and QueuedDiscogsService for correction search results
 */
export function mapMasterToCorrectionSearchResult(
  master: DiscogsMaster
): CorrectionSearchResult {
  // Map artist credits
  const artistCredits: CorrectionArtistCredit[] = master.artists.map(a => ({
    mbid: a.id.toString(),
    name: a.name,
  }));

  // Build primary artist name from all artists
  const primaryArtistName =
    master.artists.map(a => a.name).join(', ') || 'Unknown Artist';

  // Merge genres + styles per CONTEXT.md
  const genres = [...(master.genres || []), ...(master.styles || [])];

  // Get cover art (first image)
  const coverImage = master.images?.[0];

  return {
    releaseGroupMbid: master.id.toString(),
    title: master.title,
    disambiguation: undefined,
    artistCredits,
    primaryArtistName,
    firstReleaseDate: master.year?.toString(),
    primaryType: 'Album',
    secondaryTypes: genres.length > 0 ? genres : [],
    mbScore: 100, // Discogs has no relevance score
    coverArtUrl: coverImage?.uri || null,
    source: 'discogs',
  };
}

// ============================================================================
// Artist Correction Search Mapper
// ============================================================================

import type { ArtistSearchResult } from '@/lib/correction/artist/types';

/**
 * Discogs search result structure (from disconnect library)
 * Search returns minimal data: id, title (name), thumb, resource_url
 */
interface DiscogsArtistSearchResult {
  id: number;
  title: string;
  thumb?: string;
  resource_url?: string;
  type?: string;
}

/**
 * Map Discogs artist search result to ArtistSearchResult format
 * Used by QueuedDiscogsService for correction search results
 *
 * NOTE: Discogs search results are minimal (id, title, thumb)
 * Many fields like country, area, beginDate don't exist in search results
 */
export function mapDiscogsSearchResultToArtistSearchResult(
  searchResult: DiscogsArtistSearchResult,
  score?: number
): ArtistSearchResult {
  // Discogs title may include disambiguation in parentheses: "Artist Name (2)"
  // We preserve it as-is for now; disambiguation field is separate in UI
  const name = searchResult.title;

  return {
    artistMbid: searchResult.id.toString(), // Use Discogs ID as identifier
    name: name,
    sortName: name, // Discogs doesn't have sort names
    disambiguation: undefined, // Discogs doesn't have disambiguation in search
    type: undefined, // Discogs doesn't categorize Person/Group in search
    country: undefined, // Not in search results
    area: undefined, // Not in search results
    beginDate: undefined, // Not in search results
    endDate: undefined, // Not in search results
    ended: undefined, // Not in search results
    gender: undefined, // Not in search results
    mbScore: score !== undefined ? Math.round(score * 100) : 100, // Convert 0-1 to 0-100
    topReleases: undefined, // Don't fetch releases for search results (too slow)
    source: 'discogs',
  };
}
