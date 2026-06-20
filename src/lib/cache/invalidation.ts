import { cache } from './redis-cache';
import { CACHE_KEYS } from './keys';

export async function invalidateAlbumCache(albumId: string): Promise<void> {
  await Promise.all([
    cache.invalidate(CACHE_KEYS.albumDetails(albumId)),
    cache.invalidate(CACHE_KEYS.countAlbumCollections(albumId)),
  ]);
}

export async function invalidateArtistCache(artistId: string): Promise<void> {
  await Promise.all([
    cache.invalidate(CACHE_KEYS.countArtistAlbums(artistId)),
    cache.invalidate(CACHE_KEYS.countArtistTracks(artistId)),
  ]);
}

export async function invalidateCollectionCache(
  collectionId: string,
  userId: string
): Promise<void> {
  await Promise.all([
    cache.invalidate(CACHE_KEYS.countCollectionAlbums(collectionId)),
    cache.invalidate(CACHE_KEYS.userCollections(userId)),
  ]);
}

export async function invalidateUserRecsCache(userId: string): Promise<void> {
  await cache.invalidate(CACHE_KEYS.userRecs(userId));
}
