// src/lib/queue/processors/listenbrainz-processor.ts
/**
 * BullMQ job handler for ListenBrainz fresh releases sync.
 *
 * Follows the same pattern as spotify-processor.ts:
 *   1. Check if scheduler is still enabled (for scheduled jobs)
 *   2. Create SyncJob record
 *   3. Fetch → filter → process releases
 *   4. Update SyncJob with results
 */

import { getSchedulerEnabled } from '@/lib/config/app-config';
import { queueLogger } from '@/lib/logger';
import {
  fetchFreshReleases,
  filterByArtistPopularity,
  filterReleases,
} from '@/lib/listenbrainz/api';
import { processListenBrainzReleases } from '@/lib/listenbrainz/mapper';
import type { ListenBrainzSyncFreshReleasesJobData } from '@/lib/listenbrainz/types';
import { prisma } from '@/lib/prisma';

export async function handleListenBrainzSyncFreshReleases(
  data: ListenBrainzSyncFreshReleasesJobData,
  jobId?: string
): Promise<unknown> {
  // 1. Safety check: skip if scheduler was disabled after this job was queued
  if (data.source === 'scheduled') {
    const enabled = await getSchedulerEnabled('listenbrainz');
    if (!enabled) {
      queueLogger.info({ jobId }, 'ListenBrainz scheduler disabled, skipping job');
      return { success: true, skipped: true, reason: 'scheduler_disabled' };
    }
  }

  // 2. Create SyncJob record for tracking
  let syncJob = null;
  if (jobId) {
    syncJob = await prisma.syncJob.create({
      data: {
        jobId,
        jobType: 'LISTENBRAINZ_FRESH_RELEASES',
        status: 'RUNNING',
        triggeredBy: data.source ?? 'scheduled',
        metadata: {
          days: data.days,
          includeFuture: data.includeFuture,
          primaryTypes: data.primaryTypes,
        },
      },
    });
  }

  try {
    // 3. Fetch from ListenBrainz API
    const days = data.days ?? 14;
    const includeFuture = data.includeFuture ?? true;
    const primaryTypes = data.primaryTypes ?? ['Album', 'EP', 'Single'];
    const minListenCount = data.minListenCount ?? 0;
    const maxReleases = data.maxReleases ?? 0;
    const minArtistListeners = data.minArtistListeners ?? 0;

    queueLogger.info({ days, includeFuture }, 'ListenBrainz fetching fresh releases');

    const releases = await fetchFreshReleases({
      days,
      future: includeFuture,
      sort: 'release_date',
    });

    queueLogger.info({ count: releases.length, primaryTypes }, 'ListenBrainz fetched releases, filtering');

    // 4. Filter by primary type and listen count (NOT maxReleases yet — applied after popularity)
    const typeFiltered = filterReleases(releases, {
      primaryTypes,
      minListenCount,
    });

    queueLogger.debug({ remaining: typeFiltered.length, excluded: releases.length - typeFiltered.length }, 'ListenBrainz type/listen filter applied');

    // 5. Filter by artist popularity (if configured)
    let popularityFiltered = typeFiltered;
    if (minArtistListeners > 0) {
      popularityFiltered = await filterByArtistPopularity(
        typeFiltered,
        minArtistListeners
      );
      queueLogger.debug({ remaining: popularityFiltered.length, minArtistListeners }, 'ListenBrainz popularity filter applied');
    }

    // 6. Apply maxReleases cap (after popularity sort, so top artists survive)
    let finalReleases = popularityFiltered;
    if (maxReleases > 0 && finalReleases.length > maxReleases) {
      finalReleases = finalReleases.slice(0, maxReleases);
      queueLogger.debug({ maxReleases }, 'ListenBrainz capped releases');
    }

    // 7. Process into database
    const result = await processListenBrainzReleases(
      finalReleases,
      data.source ?? 'scheduled',
      { jobId, syncJobId: syncJob?.id }
    );

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
            days,
            includeFuture,
            primaryTypes,
            minArtistListeners,
            maxReleases,
            totalFetched: releases.length,
            totalAfterTypeFilter: typeFiltered.length,
            totalAfterPopularityFilter: popularityFiltered.length,
            totalProcessed: finalReleases.length,
            errors: result.errors,
          },
        },
      });
    }

    queueLogger.info(
      { albumsCreated: result.albumsCreated, albumsUpdated: result.albumsUpdated, albumsSkipped: result.albumsSkipped, artistsCreated: result.artistsCreated, duration: result.duration },
      'ListenBrainz sync complete'
    );

    if (result.errors.length > 0) {
      queueLogger.warn({ errorCount: result.errors.length }, 'ListenBrainz sync had errors');
    }

    return {
      ...result,
      syncJobId: syncJob?.id,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);

    queueLogger.error({ error: message }, 'ListenBrainz sync failed');

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
