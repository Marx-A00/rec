// src/scripts/test-queue-dashboard.ts
/**
 * Generate a realistic mix of mock jobs to test the Queue Dashboard UI.
 *
 * Usage:
 *   pnpm queue:mock              # default: 20 jobs across all types
 *   pnpm queue:mock -- --count 50   # custom count
 *   pnpm queue:mock -- --slow       # include extra slow jobs (10-30s)
 *   pnpm queue:mock -- --fail       # include jobs that will intentionally fail
 *   pnpm queue:mock -- --all        # slow + fail + higher count
 *
 * Requires Redis running. Does NOT require the worker — jobs sit in the queue
 * so you can inspect them in the dashboard. Start the worker separately with
 * `pnpm queue:dev` if you want them processed.
 */

import { getMusicBrainzQueue } from '@/lib/queue/musicbrainz-queue';
import { JOB_TYPES, PRIORITY_TIERS } from '@/lib/queue/jobs';
import type { JobType, MusicBrainzJobData } from '@/lib/queue/jobs';

// ============================================================================
// Sample data pools
// ============================================================================

const ARTISTS = [
  'Radiohead',
  'Aphex Twin',
  'Burial',
  'Flying Lotus',
  'Bjork',
  'Boards of Canada',
  'MF DOOM',
  'Portishead',
  'Massive Attack',
  'Deftones',
  'Cocteau Twins',
  'Slowdive',
  'My Bloody Valentine',
  'Sigur Ros',
  'Godspeed You! Black Emperor',
];

const ALBUMS = [
  'OK Computer',
  'Selected Ambient Works',
  'Untrue',
  'Cosmogramma',
  'Homogenic',
  'Music Has the Right to Children',
  'Madvillainy',
  'Dummy',
  'Mezzanine',
  'White Pony',
  'Heaven or Las Vegas',
  'Souvlaki',
  'Loveless',
  'Agaetis byrjun',
  'Lift Your Skinny Fists',
];

const FAKE_UUIDS = Array.from(
  { length: 20 },
  (_, i) => `00000000-0000-4000-a000-${String(i).padStart(12, '0')}`
);

const FAKE_MBIDS = [
  'a74b1b7f-71a5-4011-9441-d0b5e4122711',
  'f22942a1-6f70-4f48-866e-238cb2308fbd',
  'c8b03190-306c-4120-bb0b-6f2ebfc06ea9',
  '8bfac288-ccc5-448d-9573-c33ea2aa5c30',
  'a7f7df4a-77d8-4f12-8acd-5c60c93f4de8',
  'd700b3f5-45af-4d02-95ed-57d301bda93e',
  'e21857d5-3256-4547-afb3-4b6ded592596',
  'b7ffd2af-418f-4be2-bdd1-22f8b48613da',
];

// ============================================================================
// Job template generators
// ============================================================================

type JobTemplate = {
  type: JobType;
  data: MusicBrainzJobData;
  priority: number;
  delay?: number;
};

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function pickUuid(): string {
  return pick(FAKE_UUIDS);
}

function pickMbid(): string {
  return pick(FAKE_MBIDS);
}

const generators: Array<() => JobTemplate> = [
  // --- MusicBrainz searches ---
  () => ({
    type: JOB_TYPES.MUSICBRAINZ_SEARCH_ARTISTS,
    data: { query: pick(ARTISTS), limit: 10 },
    priority: PRIORITY_TIERS.USER,
  }),
  () => ({
    type: JOB_TYPES.MUSICBRAINZ_SEARCH_RELEASES,
    data: { query: pick(ALBUMS), limit: 10 },
    priority: PRIORITY_TIERS.USER,
  }),
  () => ({
    type: JOB_TYPES.MUSICBRAINZ_SEARCH_RECORDINGS,
    data: { query: `${pick(ARTISTS)} ${pick(ALBUMS)}`, limit: 5 },
    priority: PRIORITY_TIERS.USER,
  }),

  // --- MusicBrainz lookups ---
  () => ({
    type: JOB_TYPES.MUSICBRAINZ_LOOKUP_ARTIST,
    data: { mbid: pickMbid(), includes: ['release-groups', 'aliases'] },
    priority: PRIORITY_TIERS.USER,
  }),
  () => ({
    type: JOB_TYPES.MUSICBRAINZ_LOOKUP_RELEASE,
    data: { mbid: pickMbid(), includes: ['recordings', 'artists'] },
    priority: PRIORITY_TIERS.USER,
  }),
  () => ({
    type: JOB_TYPES.MUSICBRAINZ_LOOKUP_RELEASE_GROUP,
    data: { mbid: pickMbid(), includes: ['releases'] },
    priority: PRIORITY_TIERS.USER,
  }),

  // --- Enrichment checks ---
  () => ({
    type: JOB_TYPES.CHECK_ALBUM_ENRICHMENT,
    data: {
      albumId: pickUuid(),
      source: 'manual' as const,
      priority: 'medium' as const,
    },
    priority: PRIORITY_TIERS.ENRICHMENT,
  }),
  () => ({
    type: JOB_TYPES.CHECK_ARTIST_ENRICHMENT,
    data: {
      artistId: pickUuid(),
      source: 'search' as const,
      priority: 'low' as const,
    },
    priority: PRIORITY_TIERS.ENRICHMENT,
  }),

  // --- Enrichment jobs ---
  () => ({
    type: JOB_TYPES.ENRICH_ALBUM,
    data: {
      albumId: pickUuid(),
      source: 'collection_add' as const,
      priority: 'high' as const,
    },
    priority: PRIORITY_TIERS.ENRICHMENT,
  }),
  () => ({
    type: JOB_TYPES.ENRICH_ARTIST,
    data: {
      artistId: pickUuid(),
      source: 'recommendation_create' as const,
      priority: 'medium' as const,
    },
    priority: PRIORITY_TIERS.ENRICHMENT,
  }),

  // --- Cache jobs ---
  () => ({
    type: JOB_TYPES.CACHE_ALBUM_COVER_ART,
    data: { albumId: pickUuid(), priority: 'low' as const },
    priority: PRIORITY_TIERS.BACKGROUND,
  }),
  () => ({
    type: JOB_TYPES.CACHE_ARTIST_IMAGE,
    data: { artistId: pickUuid(), priority: 'low' as const },
    priority: PRIORITY_TIERS.BACKGROUND,
  }),

  // --- Discogs jobs ---
  () => ({
    type: JOB_TYPES.DISCOGS_SEARCH_ARTIST,
    data: { artistId: pickUuid(), artistName: pick(ARTISTS) },
    priority: PRIORITY_TIERS.ENRICHMENT,
  }),
  () => ({
    type: JOB_TYPES.DISCOGS_SEARCH_ALBUM,
    data: {
      albumId: pickUuid(),
      albumTitle: pick(ALBUMS),
      artistName: pick(ARTISTS),
      limit: 5,
    },
    priority: PRIORITY_TIERS.ENRICHMENT,
  }),

  // --- Uncover ---
  () => ({
    type: JOB_TYPES.UNCOVER_CREATE_DAILY_CHALLENGE,
    data: { source: 'manual' as const },
    priority: PRIORITY_TIERS.ADMIN,
  }),
];

/** Slow mock jobs — processed by the slowProcessing handler in the processor */
function makeSlowJob(delaySeconds: number): JobTemplate {
  return {
    type: JOB_TYPES.MUSICBRAINZ_SEARCH_ARTISTS,
    data: {
      query: `Slow test (${delaySeconds}s)`,
      slowProcessing: true,
      delaySeconds,
    } as unknown as MusicBrainzJobData,
    priority: PRIORITY_TIERS.BACKGROUND,
  };
}

/** Delayed jobs — sit in "delayed" state for a while before becoming waiting */
function makeDelayedJob(): JobTemplate {
  const delaySec = 10 + Math.floor(Math.random() * 50); // 10-60s delay
  return {
    type: JOB_TYPES.MUSICBRAINZ_SEARCH_RELEASES,
    data: { query: `Delayed: ${pick(ALBUMS)} (${delaySec}s)`, limit: 5 },
    priority: PRIORITY_TIERS.BACKGROUND,
    delay: delaySec * 1000,
  };
}

// ============================================================================
// Main
// ============================================================================

async function main() {
  const args = process.argv.slice(2);
  const includeAll = args.includes('--all');
  const includeSlow = includeAll || args.includes('--slow');
  const includeFail = includeAll || args.includes('--fail');

  let count = 20;
  const countIdx = args.indexOf('--count');
  if (countIdx !== -1 && args[countIdx + 1]) {
    count = parseInt(args[countIdx + 1], 10) || 20;
  }
  if (includeAll && count === 20) count = 40;

  console.log('🎰 Queue Dashboard Test Generator');
  console.log('─'.repeat(50));
  console.log(`  Jobs to create: ${count}`);
  console.log(`  Include slow:   ${includeSlow}`);
  console.log(`  Include fail:   ${includeFail}`);
  console.log('─'.repeat(50));

  const queue = getMusicBrainzQueue();
  const jobs: JobTemplate[] = [];

  // Fill with random job types
  for (let i = 0; i < count; i++) {
    const gen = pick(generators);
    jobs.push(gen());
  }

  // Sprinkle in slow jobs
  if (includeSlow) {
    jobs.push(makeSlowJob(10));
    jobs.push(makeSlowJob(20));
    jobs.push(makeSlowJob(30));
  }

  // Add some delayed jobs so the "Upcoming" section has content
  const delayedCount = Math.max(3, Math.floor(count * 0.15));
  for (let i = 0; i < delayedCount; i++) {
    jobs.push(makeDelayedJob());
  }

  // Add intentionally-failing jobs (bad UUIDs/MBIDs that will error in the processor)
  if (includeFail) {
    jobs.push({
      type: JOB_TYPES.MUSICBRAINZ_LOOKUP_ARTIST,
      data: { mbid: 'not-a-valid-mbid-lol' },
      priority: PRIORITY_TIERS.USER,
    });
    jobs.push({
      type: JOB_TYPES.ENRICH_ALBUM,
      data: { albumId: 'nonexistent-album-id', source: 'manual' as const },
      priority: PRIORITY_TIERS.ENRICHMENT,
    });
    jobs.push({
      type: JOB_TYPES.DISCOGS_GET_ARTIST,
      data: { artistId: 'bad-id', discogsId: '999999999' },
      priority: PRIORITY_TIERS.ENRICHMENT,
    });
  }

  // Shuffle for realism
  for (let i = jobs.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [jobs[i], jobs[j]] = [jobs[j], jobs[i]];
  }

  console.log(`\n📦 Queuing ${jobs.length} jobs...\n`);

  let queued = 0;
  for (const job of jobs) {
    await queue.addJob(job.type, job.data, {
      priority: job.priority,
      delay: job.delay,
      silent: true,
    });
    queued++;
    // Progress indicator every 10 jobs
    if (queued % 10 === 0) {
      console.log(`  ✓ ${queued}/${jobs.length} queued`);
    }
  }

  console.log(`\n✅ Done! ${queued} jobs queued.`);

  // Print summary by type
  const typeCounts = new Map<string, number>();
  for (const job of jobs) {
    typeCounts.set(job.type, (typeCounts.get(job.type) || 0) + 1);
  }
  console.log('\n📊 Job breakdown:');
  for (const [type, cnt] of [...typeCounts.entries()].sort(
    (a, b) => b[1] - a[1]
  )) {
    console.log(`  ${cnt.toString().padStart(3)}x  ${type}`);
  }

  const stats = await queue.getStats();
  console.log('\n📈 Queue stats:');
  console.log(`  Waiting: ${stats.waiting}`);
  console.log(`  Active:  ${stats.active}`);
  console.log(`  Delayed: ${stats.delayed}`);
  console.log(`  Failed:  ${stats.failed}`);

  console.log('\n💡 Start the worker with: pnpm queue:dev');
  console.log('   View dashboard at:     http://localhost:3000/admin/queue');

  await queue.close();
  process.exit(0);
}

main().catch(err => {
  console.error('❌ Fatal error:', err);
  process.exit(1);
});
