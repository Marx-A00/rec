// src/lib/lastfm/album-import-matcher.ts
/**
 * Service to match Last.fm albums against app database
 * and categorize by import readiness.
 */

import { prisma } from '@/lib/prisma';

import type { LastfmTopAlbumCached } from './types';

interface AlbumRecord {
  id: string;
  title: string;
  musicbrainzId: string | null;
}

interface FetchableAlbum {
  mbid: string;
  name: string;
  artistName: string;
  playcount: number;
}

interface SkippedAlbum {
  name: string;
  artistName: string;
}

export interface AlbumImportResult {
  readyNow: AlbumRecord[];
  canBeFetched: FetchableAlbum[];
  alreadyAdded: AlbumRecord[];
  skipped: SkippedAlbum[];
}

export async function matchAlbumsForImport(
  topAlbums: LastfmTopAlbumCached[],
  collectionId: string
): Promise<AlbumImportResult> {
  const result: AlbumImportResult = {
    readyNow: [],
    canBeFetched: [],
    alreadyAdded: [],
    skipped: [],
  };

  // Separate albums with and without MBIDs
  const withMbid = topAlbums.filter(a => a.mbid && a.mbid.trim() !== '');
  const withoutMbid = topAlbums.filter(a => !a.mbid || a.mbid.trim() === '');

  // Add albums without MBIDs to skipped
  result.skipped = withoutMbid.map(a => ({
    name: a.name,
    artistName: a.artistName,
  }));

  if (withMbid.length === 0) return result;

  const mbids = withMbid.map(a => a.mbid);

  // Batch query: find albums in DB by MBID
  const dbAlbums = await prisma.album.findMany({
    where: { musicbrainzId: { in: mbids } },
    select: { id: true, title: true, musicbrainzId: true },
  });

  const dbAlbumMap = new Map(dbAlbums.map(a => [a.musicbrainzId, a]));

  // Check which DB albums are already in the collection
  const dbAlbumIds = dbAlbums.map(a => a.id);
  const existingInCollection =
    dbAlbumIds.length > 0
      ? await prisma.collectionAlbum.findMany({
          where: {
            collectionId,
            albumId: { in: dbAlbumIds },
          },
          select: { albumId: true },
        })
      : [];

  const inCollectionSet = new Set(existingInCollection.map(ca => ca.albumId));

  // Categorize each album
  for (const album of withMbid) {
    const dbAlbum = dbAlbumMap.get(album.mbid);

    if (dbAlbum) {
      if (inCollectionSet.has(dbAlbum.id)) {
        result.alreadyAdded.push(dbAlbum);
      } else {
        result.readyNow.push(dbAlbum);
      }
    } else {
      result.canBeFetched.push({
        mbid: album.mbid,
        name: album.name,
        artistName: album.artistName,
        playcount: album.playcount,
      });
    }
  }

  return result;
}
