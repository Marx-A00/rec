import type { Job } from 'bullmq';
import chalk from 'chalk';

import { cache, CACHE_KEYS } from '@/lib/cache';
import { tryFetchSpotifyArtistImage } from '@/lib/spotify/artist-image-helper';
import prisma from '@/lib/prisma';

import type { FetchArtistImageJobData } from '../jobs';

const orange = chalk.hex('#E67E22');
const tag = orange('[CACHE LAYER]');

export async function handleFetchArtistImage(
  job: Job<FetchArtistImageJobData>
) {
  const { artistId, mbid, artistName } = job.data;
  const cacheKey = CACHE_KEYS.spotifyImage(mbid);

  // Check cache
  const cached = await cache.get<{ imageUrl: string }>(cacheKey);
  if (cached !== null) {
    if (cache.isMiss(cached)) {
      console.log(
        `${orange('⚡ CACHE HIT')} ${tag} ${chalk.white('artist-image')} ${chalk.magenta(`["${artistName}"]`)} ${chalk.gray('(no image — sentinel)')}`
      );
      return { success: true, cached: true, imageUrl: null };
    }

    if (artistId) {
      await prisma.artist.updateMany({
        where: { id: artistId, imageUrl: null },
        data: { imageUrl: cached.imageUrl },
      });
    }

    console.log(
      `${orange('⚡ CACHE HIT')} ${tag} ${chalk.white('artist-image')} ${chalk.magenta(`["${artistName}"]`)} ${chalk.gray('(image found)')}`
    );
    return { success: true, cached: true, imageUrl: cached.imageUrl };
  }

  // Cache miss — fetch from Spotify
  console.log(
    `${orange('❄ CACHE MISS')} ${tag} ${chalk.white('artist-image')} ${chalk.magenta(`["${artistName}"]`)} ${chalk.gray('— fetching from Spotify')}`
  );

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
