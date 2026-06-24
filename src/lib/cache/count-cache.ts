import prisma from '@/lib/prisma';

import { cache } from './redis-cache';
import { CACHE_KEYS, CACHE_TTLS } from './keys';

export async function getArtistAlbumCount(artistId: string): Promise<number> {
  const key = CACHE_KEYS.countArtistAlbums(artistId);
  const cached = await cache.get<number>(key);
  if (cached !== null) return cached;

  const count = await prisma.albumArtist.count({ where: { artistId } });
  await cache.set(key, count, CACHE_TTLS.COUNT);
  return count;
}

export async function getArtistTrackCount(artistId: string): Promise<number> {
  const key = CACHE_KEYS.countArtistTracks(artistId);
  const cached = await cache.get<number>(key);
  if (cached !== null) return cached;

  const count = await prisma.trackArtist.count({ where: { artistId } });
  await cache.set(key, count, CACHE_TTLS.COUNT);
  return count;
}

export async function getAlbumCollectionCount(
  albumId: string
): Promise<number> {
  const key = CACHE_KEYS.countAlbumCollections(albumId);
  const cached = await cache.get<number>(key);
  if (cached !== null) return cached;

  const count = await prisma.collectionAlbum.count({ where: { albumId } });
  await cache.set(key, count, CACHE_TTLS.COUNT);
  return count;
}

export async function getCollectionAlbumCount(
  collectionId: string
): Promise<number> {
  const key = CACHE_KEYS.countCollectionAlbums(collectionId);
  const cached = await cache.get<number>(key);
  if (cached !== null) return cached;

  const count = await prisma.collectionAlbum.count({ where: { collectionId } });
  await cache.set(key, count, CACHE_TTLS.COUNT);
  return count;
}

export async function invalidateArtistCounts(artistId: string): Promise<void> {
  await cache.invalidate(CACHE_KEYS.countArtistAlbums(artistId));
  await cache.invalidate(CACHE_KEYS.countArtistTracks(artistId));
}

export async function invalidateAlbumCounts(albumId: string): Promise<void> {
  await cache.invalidate(CACHE_KEYS.countAlbumCollections(albumId));
}

export async function invalidateCollectionCounts(
  collectionId: string
): Promise<void> {
  await cache.invalidate(CACHE_KEYS.countCollectionAlbums(collectionId));
}
