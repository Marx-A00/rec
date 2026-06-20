import type { Job } from 'bullmq';

import { cache, CACHE_KEYS, CACHE_TTLS } from '@/lib/cache';
import {
  searchLastFmArtists,
  getSimilarArtists,
  getLastFmArtistInfo,
} from '@/lib/lastfm/search';

import type {
  LastFmSearchArtistsJobData,
  LastFmSimilarArtistsJobData,
  LastFmArtistInfoJobData,
} from '../jobs';

export async function handleLastFmSearchArtists(
  job: Job<LastFmSearchArtistsJobData>
) {
  const { query } = job.data;
  const cacheKey = CACHE_KEYS.lastfmSearch(query);

  const cached = await cache.get(cacheKey);
  if (cached !== null) {
    return { success: true, cached: true, data: cached };
  }

  const results = await searchLastFmArtists(query);
  if (results.length > 0) {
    await cache.set(cacheKey, results, CACHE_TTLS.LASTFM);
  }

  return { success: true, cached: false, data: results };
}

export async function handleLastFmSimilarArtists(
  job: Job<LastFmSimilarArtistsJobData>
) {
  const { artistName, mbid, limit } = job.data;
  const key = mbid || artistName;
  const cacheKey = CACHE_KEYS.lastfmSimilar(key);

  const cached = await cache.get(cacheKey);
  if (cached !== null) {
    return { success: true, cached: true, data: cached };
  }

  const results = mbid
    ? await getSimilarArtists(mbid, true, limit)
    : await getSimilarArtists(artistName, false, limit);

  await cache.set(cacheKey, results, CACHE_TTLS.LASTFM);

  return { success: true, cached: false, data: results };
}

export async function handleLastFmArtistInfo(
  job: Job<LastFmArtistInfoJobData>
) {
  const { artistName } = job.data;
  const cacheKey = CACHE_KEYS.lastfmInfo(artistName);

  const cached = await cache.get(cacheKey);
  if (cached !== null) {
    return { success: true, cached: true, data: cached };
  }

  const info = await getLastFmArtistInfo(artistName);
  if (info) {
    await cache.set(cacheKey, info, CACHE_TTLS.LASTFM);
  }

  return { success: true, cached: false, data: info };
}
