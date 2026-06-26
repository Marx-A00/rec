// src/lib/queue/processors/deezer-editorial-processor.ts
/**
 * BullMQ job handler for Deezer editorial releases sync.
 *
 * Follows the same pattern as listenbrainz-processor.ts:
 *   1. Check if scheduler is still enabled (for scheduled jobs)
 *   2. Create SyncJob record
 *   3. Fetch -> filter -> process releases
 *   4. Update SyncJob with results
 */

import { getSchedulerEnabled } from '@/lib/config/app-config';
import { queueLogger } from '@/lib/logger';
import {
  fetchAllGenreReleases,
  filterEditorialReleases,
} from '@/lib/deezer/editorial-sync/api';
import { processEditorialReleases } from '@/lib/deezer/editorial-sync/mapper';
import type { DeezerEditorialSyncJobData } from '@/lib/deezer/editorial-sync/types';
import { prisma } from '@/lib/prisma';

export async function handleDeezerSyncEditorialReleases(
  data: DeezerEditorialSyncJobData,
  jobId?: string
): Promise<unknown> {
  // 1. Safety check: skip if scheduler was disabled after this job was queued
  if (data.source === 'scheduled') {
    const enabled = await getSchedulerEnabled('deezer-editorial');
    if (!enabled) {
      queueLogger.info({ jobId }, 'Deezer Editorial scheduler disabled, skipping job');
      return { success: true, skipped: true, reason: 'scheduler_disabled' };
    }
  }

  // 2. Create SyncJob record for tracking
  let syncJob = null;
  if (jobId) {
    syncJob = await prisma.syncJob.create({
      data: {
        jobId,
        jobType: 'DEEZER_EDITORIAL_RELEASES',
        status: 'RUNNING',
        triggeredBy: data.source,
        metadata: {
          maxReleases: data.maxReleases,
          genres: data.genres,
          filterDeluxe: data.filterDeluxe,
          requestId: data.requestId,
        },
      },
    });
  }

  try {
    // 3. Fetch from Deezer editorial API
    queueLogger.info({ genres: data.genres, maxReleases: data.maxReleases }, 'Deezer Editorial fetching releases');

    let releases = await fetchAllGenreReleases(data.genres, data.maxReleases);

    queueLogger.info({ count: releases.length }, 'Deezer Editorial fetched releases');

    // 4. Optional filtering of suspicious titles
    if (data.filterDeluxe) {
      const beforeFilter = releases.length;
      releases = filterEditorialReleases(releases, { filterDeluxe: true });
      queueLogger.debug({ filtered: beforeFilter - releases.length, remaining: releases.length }, 'Deezer Editorial filtered suspicious titles');
    }

    // 5. Process into database
    const result = await processEditorialReleases(releases, jobId);

    // 6. Update SyncJob with results
    if (syncJob) {
      await prisma.syncJob.update({
        where: { id: syncJob.id },
        data: {
          status: 'COMPLETED',
          completedAt: new Date(),
          durationMs: result.duration,
          albumsCreated: result.albumsCreated,
          albumsUpdated: result.albumsUpdated,
          albumsSkipped: result.albumsSkipped,
          artistsCreated: result.artistsCreated,
          metadata: {
            maxReleases: data.maxReleases,
            genres: data.genres,
            filterDeluxe: data.filterDeluxe,
            totalFetched: releases.length,
            totalProcessed: releases.length,
            errors: result.errors,
          },
        },
      });
    }

    queueLogger.info(
      { albumsCreated: result.albumsCreated, albumsUpdated: result.albumsUpdated, albumsSkipped: result.albumsSkipped, artistsCreated: result.artistsCreated, duration: result.duration },
      'Deezer Editorial sync complete'
    );

    if (result.errors.length > 0) {
      queueLogger.warn({ errorCount: result.errors.length }, 'Deezer Editorial sync had errors');
    }

    return {
      ...result,
      syncJobId: syncJob?.id,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);

    queueLogger.error({ error: message }, 'Deezer Editorial sync failed');

    // Update SyncJob on failure
    if (syncJob) {
      await prisma.syncJob.update({
        where: { id: syncJob.id },
        data: {
          status: 'FAILED',
          completedAt: new Date(),
          errorMessage: message,
        },
      });
    }

    throw error;
  }
}
