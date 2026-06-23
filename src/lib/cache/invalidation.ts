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

export async function invalidateTasteProfile(userId: string): Promise<void> {
  await cache.invalidate(CACHE_KEYS.userTasteProfile(userId));
}

/** Queue a targeted taste match recompute for a user */
export async function queueTasteMatchRecompute(userId: string): Promise<void> {
  try {
    const { getMusicBrainzQueue } = await import('@/lib/queue');
    const { JOB_TYPES } = await import('@/lib/queue/jobs');
    const queue = getMusicBrainzQueue();
    await queue.addJob(
      JOB_TYPES.COMPUTE_TASTE_MATCHES,
      { source: 'manual' as const, userId },
      { priority: 10, attempts: 2, removeOnComplete: 1, removeOnFail: 1 }
    );
  } catch {
    // Queue may not be available in all environments
  }
}
