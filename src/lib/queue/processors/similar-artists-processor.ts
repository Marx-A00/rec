import type { Job } from 'bullmq';
import chalk from 'chalk';

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

const border = () => chalk.blue('─'.repeat(60));
const tag = chalk.blue('[CACHE LAYER]');

export async function handleFetchSimilarArtists(
  job: Job<FetchSimilarArtistsJobData>
) {
  const { mbid, artistName } = job.data;
  const cacheKey = CACHE_KEYS.similarArtists(mbid);

  // Check cache
  const cached = await cache.get<CachedSimilarArtist[]>(cacheKey);
  if (cached !== null) {
    console.log(border());
    console.log(
      `${chalk.blue('⚡ CACHE HIT')} ${tag} ${chalk.white('similar-artists')} ${chalk.magenta(`["${artistName}"]`)} ${chalk.gray(`(${cached.length} results)`)}`
    );
    console.log(border());
    return { success: true, cached: true, count: cached.length };
  }

  // Cache miss — fetch from Last.fm + ListenBrainz APIs
  console.log(border());
  console.log(
    `${chalk.blue('❄ CACHE MISS')} ${tag} ${chalk.white('similar-artists')} ${chalk.magenta(`["${artistName}"]`)}`
  );
  console.log(`  ${chalk.blue('Action:')}  ${chalk.white('Fetching from Last.fm + ListenBrainz APIs...')}`);
  console.log(border());

  const results = await fetchSimilarArtistsFromAPIs(artistName, mbid);

  if (results.length === 0) {
    console.log(border());
    console.log(
      `${chalk.blue('📭 NO RESULTS')} ${tag} ${chalk.white('similar-artists')} ${chalk.magenta(`["${artistName}"]`)} ${chalk.gray('— caching empty result')}`
    );
    console.log(border());
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

  const artistNames = toCache.slice(0, 5).map(a => a.name).join(', ');
  const suffix = toCache.length > 5 ? `, +${toCache.length - 5} more` : '';

  console.log(border());
  console.log(
    `${chalk.blue('💾 CACHED')} ${tag} ${chalk.white('similar-artists')} ${chalk.magenta(`["${artistName}"]`)}`
  );
  console.log(`  ${chalk.blue('Results:')} ${chalk.white(String(toCache.length))} ${chalk.gray('(7-day TTL)')}`);
  console.log(`  ${chalk.blue('Artists:')} ${chalk.white(artistNames + suffix)}`);
  console.log(`  ${chalk.blue('Images:')}  ${chalk.white(`${toCache.length} fetch jobs queued`)}`);
  console.log(border());

  return { success: true, cached: false, count: toCache.length };
}
