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

/**
 * Get album details from local database or external sources.
 *
 * IMPORTANT: Source inference is DEPRECATED. Always pass explicit source:
 * - No source or 'local': Check local database first (default behavior)
 * - 'musicbrainz': Fetch from MusicBrainz API
 * - 'discogs': Fetch from Discogs API
 */
export async function getAlbumDetails(
  id: string,
  options?: { source?: 'musicbrainz' | 'discogs' | 'local' }
): Promise<Album> {
  if (!id) {
    throw new Error('Album ID is required');
  }

  console.log(
    `Fetching album details for ID: ${id}, source: ${options?.source || 'auto (local first)'}`
  );

  const explicitSource = options?.source;

  // ALWAYS check local database first when no explicit source is provided
  // This ensures Spotify-sourced albums (which have UUIDs) are found
  if (!explicitSource || explicitSource === 'local') {
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

    if (dbAlbum) {
      const year = dbAlbum.releaseDate
        ? new Date(dbAlbum.releaseDate).getFullYear()
        : undefined;

      const album: Album = {
        id: dbAlbum.id,
        title: dbAlbum.title,
        source: 'local',
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

    // If explicit source is 'local' and not found, throw
    if (explicitSource === 'local') {
      throw new Error('Album not found in local database');
    }
    // If no explicit source and not found locally, throw (no more inference)
    throw new Error(
      'Album not found. Please specify a source (?source=local|musicbrainz|discogs)'
    );
  }

  // MusicBrainz Release Group path - ONLY when explicitly requested
  if (explicitSource === 'musicbrainz') {
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
        source: 'musicbrainz',
        artists:
          mb['artist-credit']?.map((ac: unknown) => {
            const credit = ac as {
              artist?: { id?: string; name?: string };
              name?: string;
            };
            return {
              id: credit.artist?.id || '',
              name: credit.artist?.name || credit.name || 'Unknown Artist',
            };
          }) || [],
        subtitle: mb['primary-type'] || undefined,
        releaseDate: mb['first-release-date'] || undefined,
        year,
        genre: Array.isArray((mb as { tags?: { name: string }[] }).tags)
          ? (mb as { tags: { name: string }[] }).tags
              .map(t => t.name)
              .filter(Boolean)
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
      const releases: {
        id?: string;
        status?: string;
        title?: string;
        'track-count'?: number;
      }[] = Array.isArray((mb as { releases?: unknown[] }).releases)
        ? (
            mb as {
              releases: {
                id?: string;
                status?: string;
                title?: string;
                'track-count'?: number;
              }[];
            }
          ).releases
        : [];

      const officialReleases = releases.filter(
        r => (r.status || '').toLowerCase() === 'official'
      );
      const releasesToConsider =
        officialReleases.length > 0 ? officialReleases : releases;

      const representativeRelease =
        releasesToConsider
          .map(r => {
            const title = (r.title || '').toLowerCase();
            const isDeluxe =
              /deluxe|special|expanded|limited|collector|anniversary|remaster|bonus/i.test(
                title
              );
            const trackCount = r['track-count'] || 9999;
            return { release: r, isDeluxe, trackCount };
          })
          .sort((a, b) => {
            if (a.isDeluxe !== b.isDeluxe) return a.isDeluxe ? 1 : -1;
            return a.trackCount - b.trackCount;
          })[0]?.release || releases[0];

      if (representativeRelease?.id) {
        try {
          const releaseWithTracks = await mbQueued.getRelease(
            representativeRelease.id,
            ['recordings']
          );

          type MBTrack = {
            id?: string;
            title?: string;
            length?: number;
            recording?: { id?: string; title?: string; length?: number };
          };
          type MBMedia = {
            position?: number;
            tracks?: MBTrack[];
          };

          const releaseData = releaseWithTracks as { media?: MBMedia[] };
          const media: MBMedia[] = Array.isArray(releaseData.media)
            ? releaseData.media
            : [];

          const orderedTracks: {
            id: string;
            title: string;
            duration: number;
            trackNumber: number;
          }[] = [];

          const primaryDisc = media.find(m => m.position === 1) || media[0];

          if (primaryDisc) {
            const tracks = Array.isArray(primaryDisc.tracks)
              ? primaryDisc.tracks
              : [];
            let seq = 1;
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

          if (orderedTracks.length > 0) {
            album.tracks = orderedTracks;
          }
        } catch (e) {
          console.warn('Failed to fetch MB release with recordings:', e);
        }
      }

      return album;
    } catch (err) {
      console.error('MusicBrainz release-group fetch failed:', err);
      throw new Error('Album not found in MusicBrainz');
    }
  }

  // Discogs path - ONLY when explicitly requested
  if (explicitSource === 'discogs') {
    try {
      const albumDetails: DiscogsMaster = await db.getMaster(id);
      console.log(`Found master release: ${albumDetails.title}`);
      return mapDiscogsMasterToAlbum(albumDetails);
    } catch {
      console.log(`Not a master release, trying as regular release`);
      try {
        const releaseDetails: DiscogsRelease = await db.getRelease(id);
        console.log(`Found regular release: ${releaseDetails.title}`);
        return mapDiscogsReleaseToAlbum(releaseDetails);
      } catch (releaseError) {
        console.error('Error fetching release details:', releaseError);
        throw new Error('Album not found in Discogs');
      }
    }
  }

  // Should not reach here, but just in case
  throw new Error(
    'Album not found. Please specify a source (?source=local|musicbrainz|discogs)'
  );
}
