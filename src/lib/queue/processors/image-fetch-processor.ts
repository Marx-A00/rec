import type { Job } from 'bullmq';

import { cache, CACHE_KEYS } from '@/lib/cache';
import { tryFetchSpotifyArtistImage } from '@/lib/spotify/artist-image-helper';
import prisma from '@/lib/prisma';
import { queueLogger } from '@/lib/logger';

import type { FetchArtistImageJobData } from '../jobs';

export async function handleFetchArtistImage(
  job: Job<FetchArtistImageJobData>
) {
  const { artistId, mbid, artistName } = job.data;
  const cacheKey = CACHE_KEYS.spotifyImage(mbid);

  // Check cache
  const cached = await cache.get<{ imageUrl: string }>(cacheKey);
  if (cached !== null) {
    if (cache.isMiss(cached)) {
      queueLogger.debug({ artistName, mbid, cacheHit: true, sentinel: true }, 'Artist image cache hit (sentinel)');
      return { success: true, cached: true, imageUrl: null };
    }

    if (artistId) {
      await prisma.artist.updateMany({
        where: { id: artistId, imageUrl: null },
        data: { imageUrl: cached.imageUrl },
      });
    }

    queueLogger.debug({ artistName, mbid, cacheHit: true }, 'Artist image cache hit');
    return { success: true, cached: true, imageUrl: cached.imageUrl };
  }

  // Cache miss — fetch from Spotify
  queueLogger.debug({ artistName, mbid }, 'Artist image cache miss, fetching from Spotify');

  const result = await tryFetchSpotifyArtistImage(artistName, mbid);

  if (result && artistId) {
    await prisma.artist.updateMany({
      where: { id: artistId, imageUrl: null },
      data: { imageUrl: result.imageUrl },
    });
  }

  return {
    success: true,
    cached: false,
    imageUrl: result?.imageUrl ?? null,
  };
}
