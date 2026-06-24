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

import chalk from 'chalk';

import { getSchedulerEnabled } from '@/lib/config/app-config';
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
      console.log(
        chalk.yellow(
          `⏸️  Deezer Editorial scheduler disabled, skipping job ${jobId}`
        )
      );
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
    console.log(
      chalk.cyan(
        `[Deezer Editorial] Fetching releases (genres: ${data.genres.join(', ')}, max: ${data.maxReleases})`
      )
    );

    let releases = await fetchAllGenreReleases(data.genres, data.maxReleases);

    console.log(
      chalk.cyan(`[Deezer Editorial] Fetched ${releases.length} releases`)
    );

    // 4. Optional filtering of suspicious titles
    if (data.filterDeluxe) {
      const beforeFilter = releases.length;
      releases = filterEditorialReleases(releases, { filterDeluxe: true });
      console.log(
        chalk.cyan(
          `[Deezer Editorial] Filtered ${beforeFilter - releases.length} suspicious titles (${releases.length} remaining)`
        )
      );
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

    console.log(
      chalk.green(
        `[Deezer Editorial] Sync complete: ${result.albumsCreated} created, ${result.albumsUpdated} updated, ${result.albumsSkipped} skipped, ${result.artistsCreated} artists created (${result.duration}ms)`
      )
    );

    if (result.errors.length > 0) {
      console.warn(
        chalk.yellow(
          `[Deezer Editorial] ${result.errors.length} errors during sync`
        )
      );
    }

    return {
      ...result,
      syncJobId: syncJob?.id,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);

    console.error(chalk.red(`[Deezer Editorial] Sync failed: ${message}`));

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
