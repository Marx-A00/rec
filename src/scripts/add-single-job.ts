// src/scripts/add-single-job.ts
/**
 * Add a single test job to the queue for quick testing.
 *
 * Usage:
 *   pnpm queue:add                             # random artist search
 *   pnpm queue:add -- --type search-releases   # specific type shorthand
 *   pnpm queue:add -- --query "Bjork"          # custom query
 *   pnpm queue:add -- --type enrich-album      # enrichment job
 */

import { getMusicBrainzQueue } from '@/lib/queue/musicbrainz-queue';
import { JOB_TYPES, PRIORITY_TIERS } from '@/lib/queue/jobs';
import type { JobType, MusicBrainzJobData } from '@/lib/queue/jobs';

const TYPE_SHORTCUTS: Record<
  string,
  { jobType: JobType; makeData: (query: string) => MusicBrainzJobData }
> = {
  'search-artists': {
    jobType: JOB_TYPES.MUSICBRAINZ_SEARCH_ARTISTS,
    makeData: q => ({ query: q, limit: 10 }),
  },
  'search-releases': {
    jobType: JOB_TYPES.MUSICBRAINZ_SEARCH_RELEASES,
    makeData: q => ({ query: q, limit: 10 }),
  },
  'lookup-artist': {
    jobType: JOB_TYPES.MUSICBRAINZ_LOOKUP_ARTIST,
    makeData: () => ({
      mbid: 'a74b1b7f-71a5-4011-9441-d0b5e4122711',
      includes: ['release-groups'],
    }),
  },
  'enrich-album': {
    jobType: JOB_TYPES.ENRICH_ALBUM,
    makeData: () => ({
      albumId: '00000000-0000-4000-a000-000000000001',
      source: 'manual' as const,
    }),
  },
  'enrich-artist': {
    jobType: JOB_TYPES.ENRICH_ARTIST,
    makeData: () => ({
      artistId: '00000000-0000-4000-a000-000000000002',
      source: 'manual' as const,
    }),
  },
  'cache-cover': {
    jobType: JOB_TYPES.CACHE_ALBUM_COVER_ART,
    makeData: () => ({ albumId: '00000000-0000-4000-a000-000000000001' }),
  },
  'discogs-search': {
    jobType: JOB_TYPES.DISCOGS_SEARCH_ARTIST,
    makeData: q => ({
      artistId: '00000000-0000-4000-a000-000000000003',
      artistName: q,
    }),
  },
  uncover: {
    jobType: JOB_TYPES.UNCOVER_CREATE_DAILY_CHALLENGE,
    makeData: () => ({ source: 'manual' as const }),
  },
};

const DEFAULT_QUERIES = [
  'Radiohead',
  'MF DOOM',
  'Bjork',
  'Deftones',
  'Burial',
  'Slowdive',
];

async function main() {
  const args = process.argv.slice(2);

  const typeIdx = args.indexOf('--type');
  const typeName = typeIdx !== -1 ? args[typeIdx + 1] : 'search-artists';

  const queryIdx = args.indexOf('--query');
  const query =
    queryIdx !== -1
      ? args[queryIdx + 1]
      : DEFAULT_QUERIES[Math.floor(Math.random() * DEFAULT_QUERIES.length)];

  const shortcut = TYPE_SHORTCUTS[typeName];
  if (!shortcut) {
    console.error(`❌ Unknown type: ${typeName}`);
    console.error(`   Available: ${Object.keys(TYPE_SHORTCUTS).join(', ')}`);
    process.exit(1);
  }

  const queue = getMusicBrainzQueue();

  console.log(`📦 Adding ${shortcut.jobType} job...`);
  console.log(`   Query/data: ${query}`);

  const job = await queue.addJob(shortcut.jobType, shortcut.makeData(query), {
    priority: PRIORITY_TIERS.USER,
  });

  console.log(`✅ Job queued: ${job.id}`);
  console.log(`   Type: ${job.name}`);

  await queue.close();
  process.exit(0);
}

main().catch(err => {
  console.error('❌ Fatal error:', err);
  process.exit(1);
});
