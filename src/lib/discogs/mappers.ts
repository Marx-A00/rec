import { Album } from '@/types/album';
import { DiscogsMaster } from '@/types/discogs/master';
import { DiscogsRelease } from '@/types/discogs/release';

export function mapDiscogsMasterToAlbum(discogsMaster: DiscogsMaster): Album {
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
    artists: discogsMaster.artists.map(artist => ({
      id: artist.id.toString(),
      name: artist.name,
      anv: artist.anv || undefined,
      role: artist.role || undefined,
      resourceUrl: artist.resource_url || undefined,
      thumbnailUrl: artist.thumbnail_url || undefined,
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
  } as Album & { _discogs?: any; master_id?: number };
}

export function mapDiscogsReleaseToAlbum(
  discogsRelease: DiscogsRelease
): Album {
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
    artists: discogsRelease.artists.map(artist => ({
      id: artist.id.toString(),
      name: artist.name,
      anv: artist.anv || undefined,
      role: artist.role || undefined,
      resourceUrl: artist.resource_url || undefined,
      thumbnailUrl: artist.thumbnail_url || undefined,
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
  } as Album & { _discogs?: any; master_id?: number | null };
}
