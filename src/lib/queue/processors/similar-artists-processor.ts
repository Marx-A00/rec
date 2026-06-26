import type { Job } from 'bullmq';

import { cache, CACHE_KEYS, CACHE_TTLS } from '@/lib/cache';
import { fetchSimilarArtistsFromAPIs } from '@/lib/api/similar-artists-service';
import { queueLogger } from '@/lib/logger';

import { JOB_TYPES, type FetchSimilarArtistsJobData } from '../jobs';
import { getMusicBrainzQueue } from '../index';

interface CachedSimilarArtist {
  name: string;
  mbid: string;
  similarity: number;
  source: string;
}

export async function handleFetchSimilarArtists(
  job: Job<FetchSimilarArtistsJobData>
) {
  const { mbid, artistName } = job.data;
  const cacheKey = CACHE_KEYS.similarArtists(mbid);

  // Check cache
  const cached = await cache.get<CachedSimilarArtist[]>(cacheKey);
  if (cached !== null) {
    queueLogger.debug({ artistName, mbid, cacheHit: true, count: cached.length }, 'Similar artists cache hit');
    return { success: true, cached: true, count: cached.length };
  }

  // Cache miss — fetch from Last.fm + ListenBrainz APIs
  queueLogger.debug({ artistName, mbid }, 'Similar artists cache miss, fetching from APIs');

  const results = await fetchSimilarArtistsFromAPIs(artistName, mbid);

  if (results.length === 0) {
    queueLogger.debug({ artistName, mbid }, 'No similar artists found, caching empty result');
    await cache.set(cacheKey, [], CACHE_TTLS.SIMILAR_ARTISTS);
    return { success: true, cached: false, count: 0 };
  }

  const toCache: CachedSimilarArtist[] = results.map(r => ({
    name: r.name,
    mbid: r.musicbrainzId,
    similarity: r.similarity,
    source: r.source,
  }));

  await cache.set(cacheKey, toCache, CACHE_TTLS.SIMILAR_ARTISTS);

  // Queue image fetch jobs for each similar artist
  const queue = getMusicBrainzQueue();
  for (const artist of toCache) {
    await queue.addJob(JOB_TYPES.FETCH_ARTIST_IMAGE, {
      mbid: artist.mbid,
      artistName: artist.name,
      parentJobId: job.id,
    });
  }

  queueLogger.info({ artistName, mbid, count: toCache.length, imageJobsQueued: toCache.length }, 'Similar artists cached');

  return { success: true, cached: false, count: toCache.length };
}
