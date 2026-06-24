/**
 * Taste Match Scheduler
 *
 * Uses BullMQ repeatable jobs to recompute taste matches
 * every 12 hours. Also fires an immediate job on startup
 * so matches are fresh after a deploy or worker restart.
 */

import { getMusicBrainzQueue } from '@/lib/queue';
import { JOB_TYPES, PRIORITY_TIERS } from '@/lib/queue/jobs';
import type { ComputeTasteMatchesJobData } from '@/lib/queue/jobs';

const TWELVE_HOURS_MS = 12 * 60 * 60 * 1000;

/**
 * Initialize the taste match scheduler.
 *
 * 1. Queues an immediate job so matches are current right after startup.
 * 2. Sets up a repeatable job that fires every 12 hours.
 */
export async function initializeTasteMatchScheduler(): Promise<boolean> {
  try {
    const queue = getMusicBrainzQueue();

    // 1. Fire an immediate computation on startup
    const immediateJobData: ComputeTasteMatchesJobData = {
      source: 'scheduled',
    };

    await queue.addJob(JOB_TYPES.COMPUTE_TASTE_MATCHES, immediateJobData, {
      jobId: `taste-match-bootstrap-${Date.now()}`,
      priority: PRIORITY_TIERS.BACKGROUND,
      attempts: 3,
      backoff: { type: 'exponential', delay: 10000 },
      removeOnComplete: 1,
      removeOnFail: 1,
      silent: true,
    });

    // 2. Set up repeatable job every 12 hours
    const repeatJobData: ComputeTasteMatchesJobData = {
      source: 'scheduled',
    };

    await queue.addJob(JOB_TYPES.COMPUTE_TASTE_MATCHES, repeatJobData, {
      repeat: { every: TWELVE_HOURS_MS },
      jobId: 'taste-match-schedule',
      priority: PRIORITY_TIERS.BACKGROUND,
      attempts: 3,
      backoff: { type: 'exponential', delay: 10000 },
      removeOnComplete: 7,
      removeOnFail: 7,
      silent: true,
    });

    return true;
  } catch (error) {
    console.error('Failed to initialize taste match scheduler:', error);
    return false;
  }
}

/**
 * Shut down the scheduler by removing the repeatable job definition.
 */
export async function shutdownTasteMatchScheduler(): Promise<void> {
  try {
    const queue = getMusicBrainzQueue().getQueue();
    const repeatableJobs = await queue.getRepeatableJobs();

    for (const job of repeatableJobs) {
      if (job.id === 'taste-match-schedule') {
        await queue.removeRepeatableByKey(job.key);
        console.log('Taste match scheduler stopped');
      }
    }
  } catch (error) {
    console.error('Failed to shut down taste match scheduler:', error);
  }
}
