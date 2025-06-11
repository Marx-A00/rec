import { Album } from '@/types/album';
import { DiscogsMaster } from '@/types/discogs/master';

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
  };
}
