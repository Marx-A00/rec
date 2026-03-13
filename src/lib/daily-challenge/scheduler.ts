/**
 * Uncover Daily Challenge Scheduler
 *
 * Uses BullMQ repeatable jobs to create the daily challenge
 * at 7 AM Central Time every day. This ensures challenges are
 * created even if nobody visits the game page.
 */

import { getMusicBrainzQueue } from '@/lib/queue';
import { JOB_TYPES } from '@/lib/queue/jobs';
import type { UncoverCreateDailyChallengeJobData } from '@/lib/queue/jobs';
import {
  getCentralToday,
  formatDateUTC,
} from '@/lib/daily-challenge/date-utils';

/**
 * Initialize the daily challenge scheduler.
 *
 * Sets up a BullMQ repeatable job that fires every day at 7 AM Central Time.
 * Also ensures today's challenge exists immediately on startup, so there's
 * no gap between a fresh start (or truncate) and the next 7 AM cron tick.
 */
export async function initializeUncoverScheduler(): Promise<boolean> {
  try {
    const queue = getMusicBrainzQueue();

    // 1. Ensure today's challenge exists right now (idempotent — skips if already created)
    // Use Central time so a late-night worker restart doesn't skip to tomorrow
    const centralToday = getCentralToday();
    const centralDateStr = formatDateUTC(centralToday);

    const immediateJobData: UncoverCreateDailyChallengeJobData = {
      source: 'scheduled',
      date: centralToday.toISOString(),
      requestId: `uncover_bootstrap_${Date.now()}`,
    };

    await queue.addJob(
      JOB_TYPES.UNCOVER_CREATE_DAILY_CHALLENGE,
      immediateJobData,
      {
        jobId: `uncover-bootstrap-${centralDateStr}`,
        priority: 1,
        attempts: 3,
        backoff: { type: 'exponential', delay: 10000 },
        removeOnComplete: 1,
        removeOnFail: 1,
        silent: true,
      }
    );

    // 2. Set up the recurring cron for 7 AM Central daily
    const cronJobData: UncoverCreateDailyChallengeJobData = {
      source: 'scheduled',
      requestId: `uncover_daily_${Date.now()}`,
    };

    // Cron: "0 7 * * *" = at minute 0 of hour 7, every day
    // With timezone America/Chicago = 7 AM Central (handles DST)
    await queue.addJob(JOB_TYPES.UNCOVER_CREATE_DAILY_CHALLENGE, cronJobData, {
      repeat: {
        pattern: '0 7 * * *',
        tz: 'America/Chicago',
      },
      jobId: 'uncover-daily-challenge-schedule',
      priority: 1,
      attempts: 3,
      backoff: { type: 'exponential', delay: 10000 },
      removeOnComplete: 7,
      removeOnFail: 7,
      silent: true,
    });

    return true;
  } catch (error) {
    console.error('Failed to initialize Uncover scheduler:', error);
    return false;
  }
}

/**
 * Shut down the scheduler by removing the repeatable job definition.
 */
export async function shutdownUncoverScheduler(): Promise<void> {
  try {
    const queue = getMusicBrainzQueue().getQueue();
    const repeatableJobs = await queue.getRepeatableJobs();

    for (const job of repeatableJobs) {
      if (job.id === 'uncover-daily-challenge-schedule') {
        await queue.removeRepeatableByKey(job.key);
        console.log('🛑 Uncover daily challenge scheduler stopped');
      }
    }
  } catch (error) {
    console.error('Failed to shut down Uncover scheduler:', error);
  }
}
