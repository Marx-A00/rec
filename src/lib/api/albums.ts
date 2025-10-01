import { Client } from 'disconnect';

import { getQueuedMusicBrainzService } from '@/lib/musicbrainz/queue-service';
import { prisma } from '@/lib/prisma';
import {
  mapDiscogsMasterToAlbum,
  mapDiscogsReleaseToAlbum,
} from '@/lib/discogs/mappers';
import { Album } from '@/types/album';
import { DiscogsMaster } from '@/types/discogs/master';
import { DiscogsRelease } from '@/types/discogs/release';

// Create a client with consumer key and secret from environment variables
const db = new Client({
  userAgent: 'RecProject/1.0 +https://github.com/Marx-A00/rec',
  consumerKey: process.env.CONSUMER_KEY,
  consumerSecret: process.env.CONSUMER_SECRET,
}).database();

function isUuid(id: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
    id
  );
}

export async function getAlbumDetails(
  id: string,
  options?: { source?: 'musicbrainz' | 'discogs' | 'local' }
): Promise<Album> {
  if (!id) {
    throw new Error('Album ID is required');
  }

  console.log(`Fetching album details for ID: ${id}`);

  const preferredSource = options?.source;

  // Local database path (authoritative when available)
  if (preferredSource === 'local') {
    const dbAlbum = await prisma.album.findUnique({
      where: { id },
      include: {
        artists: {
          include: { artist: true },
          orderBy: { position: 'asc' },
        },
        tracks: {
          orderBy: [{ discNumber: 'asc' }, { trackNumber: 'asc' }],
        },
      },
    });

    if (!dbAlbum) {
      throw new Error('Album not found');
    }

    const year = dbAlbum.releaseDate
      ? new Date(dbAlbum.releaseDate).getFullYear()
      : undefined;

    const album: Album = {
      id: dbAlbum.id,
      title: dbAlbum.title,
      artists:
        dbAlbum.artists?.map(a => ({
          id: a.artist.id,
          name: a.artist.name,
        })) || [],
      subtitle: dbAlbum.releaseType || undefined,
      releaseDate: dbAlbum.releaseDate
        ? new Date(dbAlbum.releaseDate).toISOString()
        : undefined,
      year,
      genre: Array.isArray(dbAlbum.genres) ? dbAlbum.genres : [],
      label: dbAlbum.label || undefined,
      image: {
        url: dbAlbum.coverArtUrl || '',
        width: 1200,
        height: 1200,
        alt: dbAlbum.title,
      },
      tracks:
        dbAlbum.tracks?.map(t => ({
          id: t.id,
          title: t.title,
          duration: Math.max(0, Math.floor((t.durationMs || 0) / 1000)),
          trackNumber: t.trackNumber,
        })) || [],
      metadata: {
        format: dbAlbum.releaseType || undefined,
        totalDuration: dbAlbum.durationMs || undefined,
        numberOfTracks: dbAlbum.trackCount || undefined,
      },
    };

    return album;
  }

  // MusicBrainz Release Group path (explicit or UUID)
  if (preferredSource === 'musicbrainz' || isUuid(id)) {
    try {
      const mbQueued = getQueuedMusicBrainzService();
      const mb = await mbQueued.getReleaseGroup(id, [
        'artists',
        'tags',
        'releases',
      ]);

      const year = (() => {
        const d = mb['first-release-date'];
        if (!d) return undefined;
        const y = parseInt(String(d).split('-')[0]);
        return Number.isNaN(y) ? undefined : y;
      })();

      const imageUrl = `https://coverartarchive.org/release-group/${id}/front-1200`;

      const album: Album = {
        id,
        title: mb.title,
        artists:
          mb['artist-credit']?.map((ac: any) => ({
            id: ac.artist?.id || '',
            name: ac.artist?.name || ac.name || 'Unknown Artist',
          })) || [],
        subtitle: mb['primary-type'] || undefined,
        releaseDate: mb['first-release-date'] || undefined,
        year,
        genre: Array.isArray((mb as any).tags)
          ? (mb as any).tags.map((t: any) => t.name).filter(Boolean)
          : [],
        label: undefined,
        image: {
          url: imageUrl,
          width: 1200,
          height: 1200,
          alt: `${mb.title}`,
        },
        tracks: [],
        metadata: {
          format: mb['primary-type'] || undefined,
        },
      };

      // Try to populate tracks from a representative release in the group
      const releases: any[] = Array.isArray((mb as any).releases)
        ? (mb as any).releases
        : [];
      const representativeRelease =
        releases.find(r => (r.status || '').toLowerCase() === 'official') ||
        releases[0];

      if (representativeRelease?.id) {
        try {
          const releaseWithTracks = await mbQueued.getRelease(
            representativeRelease.id,
            ['recordings']
          );

          const media: any[] = Array.isArray((releaseWithTracks as any).media)
            ? (releaseWithTracks as any).media
            : [];

          const orderedTracks: {
            id: string;
            title: string;
            duration: number;
            trackNumber: number;
          }[] = [];

          let seq = 1;
          for (const m of media) {
            const tracks: any[] = Array.isArray(m.tracks) ? m.tracks : [];
            for (const t of tracks) {
              const lenMs =
                (typeof t.length === 'number' && t.length) ||
                (typeof t.recording?.length === 'number' &&
                  t.recording.length) ||
                0;
              orderedTracks.push({
                id:
                  t.id ||
                  t.recording?.id ||
                  `${representativeRelease.id}-${seq}`,
                title: t.title || t.recording?.title || `Track ${seq}`,
                duration: Math.max(0, Math.floor(lenMs / 1000)),
                trackNumber: seq,
              });
              seq += 1;
            }
          }

          // Fallback: if media/tracks not present, keep existing empty list
          if (orderedTracks.length > 0) {
            album.tracks = orderedTracks;
          }
        } catch (e) {
          console.warn('Failed to fetch MB release with recordings:', e);
        }
      }

      return album;
    } catch (err) {
      console.warn(
        'MusicBrainz release-group fetch failed, falling back:',
        err
      );
      // Fall through to Discogs path as ultimate fallback
    }
  }

  // Discogs path (explicit or numeric)
  if (preferredSource === 'discogs' || /^\d+$/.test(id)) {
    // Try to get the master release details first
    try {
      const albumDetails: DiscogsMaster = await db.getMaster(id);
      console.log(`Found master release: ${albumDetails.title}`);

      // Use the mapper to convert DiscogsMaster to Album
      const album = mapDiscogsMasterToAlbum(albumDetails);
      return album;
    } catch {
      console.log(`Not a master release, trying as regular release`);

      // If not a master, try as a regular release
      try {
        const releaseDetails: DiscogsRelease = await db.getRelease(id);
        console.log(`Found regular release: ${releaseDetails.title}`);

        // Use the mapper to convert DiscogsRelease to Album
        const album = mapDiscogsReleaseToAlbum(releaseDetails);
        return album;
      } catch (releaseError) {
        console.error('Error fetching release details:', releaseError);
        throw new Error('Album not found');
      }
    }
  }

  // Fallback detection: only attempt Discogs when the ID is numeric
  if (/^\d+$/.test(id)) {
    try {
      const albumDetails: DiscogsMaster = await db.getMaster(id);
      const album = mapDiscogsMasterToAlbum(albumDetails);
      return album;
    } catch {
      try {
        const releaseDetails: DiscogsRelease = await db.getRelease(id);
        const album = mapDiscogsReleaseToAlbum(releaseDetails);
        return album;
      } catch (releaseError) {
        console.error('Error fetching release details:', releaseError);
        throw new Error('Album not found');
      }
    }
  }

  throw new Error('Album not found');
}
