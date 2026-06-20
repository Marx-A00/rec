import type { Job } from 'bullmq';

import { cache, CACHE_KEYS, CACHE_TTLS } from '@/lib/cache';
import { fetchSimilarArtists } from '@/lib/listenbrainz/api';

import type { ListenBrainzSimilarArtistsJobData } from '../jobs';

export async function handleListenBrainzSimilarArtists(
  job: Job<ListenBrainzSimilarArtistsJobData>
) {
  const { mbid, algorithm } = job.data;
  const cacheKey = CACHE_KEYS.listenbrainzSimilar(mbid);

  const cached = await cache.get(cacheKey);
  if (cached !== null) {
    return { success: true, cached: true, data: cached };
  }

  const results = await fetchSimilarArtists(mbid, algorithm);
  await cache.set(cacheKey, results, CACHE_TTLS.LISTENBRAINZ);

  return { success: true, cached: false, data: results };
}
