// src/app/api/admin/queue/test-jobs/route.ts
/**
 * POST /api/admin/queue/test-jobs
 *
 * Generates a batch of test jobs directly into the BullMQ queue.
 * Used by the Queue Dashboard "Send Test Jobs" button.
 *
 * Body (all optional):
 *   count: number (default 10, max 100)
 *   includeSlow: boolean (default false)
 *   includeFail: boolean (default false)
 */

import { NextRequest, NextResponse } from 'next/server';

import { auth } from '@/../auth';
import { isAdmin } from '@/lib/permissions';
import { getMusicBrainzQueue } from '@/lib/queue/musicbrainz-queue';
import { JOB_TYPES, PRIORITY_TIERS } from '@/lib/queue/jobs';
import type { JobType, MusicBrainzJobData } from '@/lib/queue/jobs';

// ============================================================================
// Sample data
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
];

const FAKE_UUIDS = Array.from(
  { length: 15 },
  (_, i) => `00000000-0000-4000-a000-${String(i).padStart(12, '0')}`
);

const FAKE_MBIDS = [
  'a74b1b7f-71a5-4011-9441-d0b5e4122711',
  'f22942a1-6f70-4f48-866e-238cb2308fbd',
  'c8b03190-306c-4120-bb0b-6f2ebfc06ea9',
  '8bfac288-ccc5-448d-9573-c33ea2aa5c30',
  'a7f7df4a-77d8-4f12-8acd-5c60c93f4de8',
];

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

// ============================================================================
// Job generators
// ============================================================================

type JobSpec = {
  type: JobType;
  data: MusicBrainzJobData;
  priority: number;
  delay?: number;
};

const generators: Array<() => JobSpec> = [
  // MusicBrainz searches
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

  // MusicBrainz lookups
  () => ({
    type: JOB_TYPES.MUSICBRAINZ_LOOKUP_ARTIST,
    data: { mbid: pick(FAKE_MBIDS), includes: ['release-groups'] },
    priority: PRIORITY_TIERS.USER,
  }),
  () => ({
    type: JOB_TYPES.MUSICBRAINZ_LOOKUP_RELEASE,
    data: { mbid: pick(FAKE_MBIDS), includes: ['recordings'] },
    priority: PRIORITY_TIERS.USER,
  }),

  // Enrichment checks
  () => ({
    type: JOB_TYPES.CHECK_ALBUM_ENRICHMENT,
    data: {
      albumId: pick(FAKE_UUIDS),
      source: 'manual' as const,
      priority: 'medium' as const,
    },
    priority: PRIORITY_TIERS.ENRICHMENT,
  }),
  () => ({
    type: JOB_TYPES.CHECK_ARTIST_ENRICHMENT,
    data: {
      artistId: pick(FAKE_UUIDS),
      source: 'search' as const,
      priority: 'low' as const,
    },
    priority: PRIORITY_TIERS.ENRICHMENT,
  }),

  // Enrichment jobs
  () => ({
    type: JOB_TYPES.ENRICH_ALBUM,
    data: {
      albumId: pick(FAKE_UUIDS),
      source: 'collection_add' as const,
      priority: 'high' as const,
    },
    priority: PRIORITY_TIERS.ENRICHMENT,
  }),
  () => ({
    type: JOB_TYPES.ENRICH_ARTIST,
    data: {
      artistId: pick(FAKE_UUIDS),
      source: 'recommendation_create' as const,
    },
    priority: PRIORITY_TIERS.ENRICHMENT,
  }),

  // Cache jobs
  () => ({
    type: JOB_TYPES.CACHE_ALBUM_COVER_ART,
    data: { albumId: pick(FAKE_UUIDS) },
    priority: PRIORITY_TIERS.BACKGROUND,
  }),
  () => ({
    type: JOB_TYPES.CACHE_ARTIST_IMAGE,
    data: { artistId: pick(FAKE_UUIDS) },
    priority: PRIORITY_TIERS.BACKGROUND,
  }),

  // Discogs
  () => ({
    type: JOB_TYPES.DISCOGS_SEARCH_ARTIST,
    data: { artistId: pick(FAKE_UUIDS), artistName: pick(ARTISTS) },
    priority: PRIORITY_TIERS.ENRICHMENT,
  }),
  () => ({
    type: JOB_TYPES.DISCOGS_SEARCH_ALBUM,
    data: {
      albumId: pick(FAKE_UUIDS),
      albumTitle: pick(ALBUMS),
      artistName: pick(ARTISTS),
      limit: 5,
    },
    priority: PRIORITY_TIERS.ENRICHMENT,
  }),

  // Uncover
  () => ({
    type: JOB_TYPES.UNCOVER_CREATE_DAILY_CHALLENGE,
    data: { source: 'manual' as const },
    priority: PRIORITY_TIERS.ADMIN,
  }),
];

function makeSlowJob(seconds: number): JobSpec {
  return {
    type: JOB_TYPES.MUSICBRAINZ_SEARCH_ARTISTS,
    data: {
      query: `Slow test (${seconds}s)`,
      slowProcessing: true,
      delaySeconds: seconds,
    } as unknown as MusicBrainzJobData,
    priority: PRIORITY_TIERS.BACKGROUND,
  };
}

function makeDelayedJob(): JobSpec {
  const sec = 10 + Math.floor(Math.random() * 50);
  return {
    type: JOB_TYPES.MUSICBRAINZ_SEARCH_RELEASES,
    data: { query: `Delayed: ${pick(ALBUMS)} (${sec}s)`, limit: 5 },
    priority: PRIORITY_TIERS.BACKGROUND,
    delay: sec * 1000,
  };
}

function makeFailJob(): JobSpec {
  return {
    type: JOB_TYPES.MUSICBRAINZ_LOOKUP_ARTIST,
    data: { mbid: 'not-a-valid-mbid' },
    priority: PRIORITY_TIERS.USER,
  };
}

// ============================================================================
// Route handler
// ============================================================================

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user || !isAdmin(session.user.role)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const count = Math.min(Math.max(Number(body.count) || 10, 1), 100);
  const includeSlow = Boolean(body.includeSlow);
  const includeFail = Boolean(body.includeFail);

  try {
    const queue = getMusicBrainzQueue();
    const jobs: JobSpec[] = [];

    // Random mix of job types
    for (let i = 0; i < count; i++) {
      jobs.push(pick(generators)());
    }

    // Sprinkle in delayed jobs (~15% of count)
    const delayedCount = Math.max(2, Math.floor(count * 0.15));
    for (let i = 0; i < delayedCount; i++) {
      jobs.push(makeDelayedJob());
    }

    // Optional slow jobs
    if (includeSlow) {
      jobs.push(makeSlowJob(10));
      jobs.push(makeSlowJob(20));
    }

    // Optional fail jobs
    if (includeFail) {
      jobs.push(makeFailJob());
      jobs.push({
        type: JOB_TYPES.ENRICH_ALBUM,
        data: { albumId: 'nonexistent-id', source: 'manual' as const },
        priority: PRIORITY_TIERS.ENRICHMENT,
      });
    }

    // Shuffle
    for (let i = jobs.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [jobs[i], jobs[j]] = [jobs[j], jobs[i]];
    }

    // Queue them all
    for (const job of jobs) {
      await queue.addJob(job.type, job.data, {
        priority: job.priority,
        delay: job.delay,
        silent: true,
      });
    }

    // Build breakdown
    const breakdown: Record<string, number> = {};
    for (const job of jobs) {
      breakdown[job.type] = (breakdown[job.type] || 0) + 1;
    }

    return NextResponse.json({
      success: true,
      message: `Queued ${jobs.length} test jobs`,
      total: jobs.length,
      breakdown,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: `Failed to create test jobs: ${error instanceof Error ? error.message : 'Unknown error'}`,
      },
      { status: 500 }
    );
  }
}
