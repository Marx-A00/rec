import { getSimilarArtists as getLastFmSimilarArtists } from '@/lib/lastfm/search';
import { fetchSimilarArtists as getListenBrainzSimilarArtists } from '@/lib/listenbrainz/api';
import { findOrCreateArtist } from '@/lib/artists/find-or-create';
import { cache, CACHE_KEYS, CACHE_TTLS } from '@/lib/cache';
import { JOB_TYPES, PRIORITY_TIERS } from '@/lib/queue/jobs';
import { prisma } from '@/lib/prisma';

export interface SimilarArtistResult {
  musicbrainzId: string;
  name: string;
  similarity: number; // 0.0-1.0 normalized
  source: 'lastfm' | 'listenbrainz' | 'both';
  imageUrl?: string;
  cloudflareImageId?: string;
  localArtistId?: string;
}

/**
 * Fetch similar artists from Last.fm + ListenBrainz, merge, and deduplicate by MBID.
 * Only returns artists that have a valid MBID.
 */
export async function fetchSimilarArtistsFromAPIs(
  artistName: string,
  musicbrainzId?: string,
  limit: number = 20
): Promise<SimilarArtistResult[]> {
  // Check individual API caches before calling
  const lastfmCacheKey = CACHE_KEYS.lastfmSimilar(musicbrainzId || artistName);
  const lbCacheKey = musicbrainzId ? CACHE_KEYS.listenbrainzSimilar(musicbrainzId) : null;

  const [lastfmResults, listenbrainzResults] = await Promise.all([
    cache.get(lastfmCacheKey).then(async (cached) => {
      if (cached !== null) return cached as Awaited<ReturnType<typeof getLastFmSimilarArtists>>;
      const results = await getLastFmSimilarArtists(artistName, false, limit);
      if (results.length > 0) await cache.set(lastfmCacheKey, results, CACHE_TTLS.LASTFM);
      return results;
    }),
    lbCacheKey
      ? cache.get(lbCacheKey).then(async (cached) => {
          if (cached !== null) return cached as Awaited<ReturnType<typeof getListenBrainzSimilarArtists>>;
          const results = await getListenBrainzSimilarArtists(musicbrainzId!);
          await cache.set(lbCacheKey, results, CACHE_TTLS.LISTENBRAINZ);
          return results;
        })
      : Promise.resolve([]),
  ]);

  // Filter out Last.fm results without MBID
  const lastfmWithMbid = lastfmResults.filter(
    r => r.mbid && r.mbid.trim() !== ''
  );

  console.log(
    `[Similar Artists] Last.fm: ${lastfmResults.length} total, ${lastfmWithMbid.length} with MBID`
  );
  console.log(`[Similar Artists] ListenBrainz: ${listenbrainzResults.length}`);

  // Normalize ListenBrainz scores to 0-1 range
  const maxLbScore = Math.max(...listenbrainzResults.map(r => r.score), 1);

  // Build deduplicated map keyed by MBID
  const resultMap = new Map<string, SimilarArtistResult>();

  for (const artist of lastfmWithMbid) {
    const mbid = artist.mbid!;
    resultMap.set(mbid, {
      musicbrainzId: mbid,
      name: artist.name,
      similarity: parseFloat(artist.match),
      source: 'lastfm',
    });
  }

  for (const artist of listenbrainzResults) {
    const mbid = artist.artist_mbid;
    const normalizedScore = artist.score / maxLbScore;

    const existing = resultMap.get(mbid);
    if (existing) {
      existing.similarity = (existing.similarity + normalizedScore) / 2;
      existing.source = 'both';
    } else {
      resultMap.set(mbid, {
        musicbrainzId: mbid,
        name: artist.name,
        similarity: normalizedScore,
        source: 'listenbrainz',
      });
    }
  }

  const merged = Array.from(resultMap.values())
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, limit);

  console.log(`[Similar Artists] Merged ${merged.length} unique results`);
  return merged;
}

/**
 * Sync similar artists to the database for a given seed artist.
 * Replaces all existing rows for the seed artist.
 * Creates local Artist records for any that don't exist and queues
 * full enrichment (with skipSimilarArtistsSync to prevent cascading).
 */
export async function syncSimilarArtists(
  seedArtistId: string,
  artistName: string,
  musicbrainzId?: string,
  limit: number = 20,
  parentJobId?: string
): Promise<{ created: number; updated: number }> {
  const results = await fetchSimilarArtistsFromAPIs(
    artistName,
    musicbrainzId,
    limit
  );

  if (results.length === 0) {
    console.log(`[Similar Artists] No results to sync for ${artistName}`);
    return { created: 0, updated: 0 };
  }

  // Check which similar artists already exist locally
  const mbids = results.map(r => r.musicbrainzId);
  const existingArtists = await prisma.artist.findMany({
    where: { musicbrainzId: { in: mbids } },
    select: { id: true, musicbrainzId: true },
  });

  const existingMbids = new Set(
    existingArtists.map(a => a.musicbrainzId).filter(Boolean)
  );

  // Create local records for missing artists and queue enrichment
  const missingResults = results.filter(
    r => !existingMbids.has(r.musicbrainzId)
  );

  let artistsCreated = 0;

  if (missingResults.length > 0) {
    console.log(
      `[Similar Artists] Creating ${missingResults.length} new artist records...`
    );

    const { getMusicBrainzQueue } = await import('@/lib/queue');
    const queue = getMusicBrainzQueue();

    for (const result of missingResults) {
      try {
        const { artist, created } = await findOrCreateArtist({
          db: prisma,
          identity: {
            name: result.name,
            musicbrainzId: result.musicbrainzId,
          },
          enrichment: 'none',
          caller: 'similar-artists-sync',
        });

        if (created) {
          artistsCreated++;

          // Queue full enrichment with skip flag to prevent cascading
          await queue.addJob(
            JOB_TYPES.CHECK_ARTIST_ENRICHMENT,
            {
              artistId: artist.id,
              source: 'similar-artists-sync',
              priority: 'low',
              skipSimilarArtistsSync: true,
              parentJobId,
            },
            {
              priority: PRIORITY_TIERS.ENRICHMENT,
              attempts: 3,
            }
          );
        }
      } catch (error) {
        console.warn(
          `[Similar Artists] Failed to create artist "${result.name}":`,
          error instanceof Error ? error.message : error
        );
      }
    }

    console.log(
      `[Similar Artists] Created ${artistsCreated} new artists, queued enrichment`
    );
  }

  // Re-lookup all local artist IDs (now includes newly created ones)
  const allLocalArtists = await prisma.artist.findMany({
    where: { musicbrainzId: { in: mbids } },
    select: { id: true, musicbrainzId: true },
  });

  const mbidToLocalId = new Map(
    allLocalArtists.map(a => [a.musicbrainzId!, a.id])
  );

  // Delete existing similarity rows and write fresh ones
  await prisma.artistSimilarity.deleteMany({
    where: { seedArtistId },
  });

  await prisma.artistSimilarity.createMany({
    data: results.map(r => ({
      seedArtistId,
      similarArtistId: mbidToLocalId.get(r.musicbrainzId) || null,
      similarMbid: r.musicbrainzId,
      similarName: r.name,
      similarity: r.similarity,
      source: r.source,
    })),
  });

  console.log(
    `[Similar Artists] Synced ${results.length} similar artists for ${artistName} (${artistsCreated} new)`
  );
  return { created: results.length, updated: 0 };
}
