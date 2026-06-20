import type { Job } from 'bullmq';

import { cache, CACHE_KEYS, CACHE_TTLS } from '@/lib/cache';
import { fetchSimilarArtistsFromAPIs } from '@/lib/api/similar-artists-service';

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
    console.log(
      `[similar-artists] Cache hit for ${artistName} (${cached.length} results)`
    );
    return { success: true, cached: true, count: cached.length };
  }

  // Cache miss — fetch from Last.fm + ListenBrainz APIs
  console.log(`[similar-artists] CACHE MISS for "${artistName}" — calling Last.fm + ListenBrainz APIs...`);
  const results = await fetchSimilarArtistsFromAPIs(artistName, mbid);

  if (results.length === 0) {
    console.log(`[similar-artists] No similar artists found for "${artistName}"`);
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
  console.log(`[similar-artists] Cached ${toCache.length} results for "${artistName}" (7-day TTL)`);

  // Queue image fetch jobs for each similar artist
  console.log(`[similar-artists] Queuing ${toCache.length} image fetch jobs...`);
  const queue = getMusicBrainzQueue();
  for (const artist of toCache) {
    await queue.addJob(JOB_TYPES.FETCH_ARTIST_IMAGE, {
      mbid: artist.mbid,
      artistName: artist.name,
      parentJobId: job.id,
    });
  }

  const artistNames = toCache.slice(0, 5).map(a => a.name).join(', ');
  const suffix = toCache.length > 5 ? `, +${toCache.length - 5} more` : '';
  console.log(`[similar-artists] Done for "${artistName}": ${artistNames}${suffix}`);

  return { success: true, cached: false, count: toCache.length };
}
