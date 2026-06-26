// src/lib/lastfm/sync-scheduler.ts
/**
 * Last.fm user data sync scheduler.
 * Fan-out pattern: one dispatcher job fans out to per-user sync jobs.
 * Follows the ListenBrainz/MusicBrainz scheduler pattern.
 */

import { getMusicBrainzQueue } from '@/lib/queue';
import { JOB_TYPES, type LastFmSyncUserJobData } from '@/lib/queue/jobs';
import {
  getSchedulerEnabled,
  setSchedulerEnabled,
} from '@/lib/config/app-config';
import { prisma } from '@/lib/prisma';
import { lastfmLogger } from '@/lib/logger';

const REPEATABLE_JOB_KEY = 'lastfm-dispatch-sync';
const DEFAULT_INTERVAL_MINUTES = 10080; // 7 days

function getIntervalMs(): number {
  const envMinutes = process.env.LASTFM_SYNC_INTERVAL_MINUTES;
  const minutes = envMinutes
    ? parseInt(envMinutes, 10)
    : DEFAULT_INTERVAL_MINUTES;
  return (isNaN(minutes) ? DEFAULT_INTERVAL_MINUTES : minutes) * 60 * 1000;
}

class LastfmSyncScheduler {
  private isRunning = false;

  async start(): Promise<void> {
    await setSchedulerEnabled('lastfm', true);
    await this.removeExistingSchedules();
    await this.scheduleDispatcher();
    this.isRunning = true;
    lastfmLogger.info({ scheduler: 'lastfm' }, 'Last.fm scheduler started');
  }

  async stop(): Promise<void> {
    await setSchedulerEnabled('lastfm', false);
    await this.removeExistingSchedules();
    this.isRunning = false;
    lastfmLogger.info({ scheduler: 'lastfm' }, 'Last.fm scheduler stopped');
  }

  async triggerSync(): Promise<void> {
    await this.dispatchSyncJobs();
  }

  async getStatus(): Promise<{
    isRunning: boolean;
    activeSchedules: number;
    config: { intervalMinutes: number };
  }> {
    let activeSchedules = 0;
    try {
      const queue = getMusicBrainzQueue();
      const repeatableJobs = await queue.getQueue().getRepeatableJobs();
      activeSchedules = repeatableJobs.filter(j =>
        j.key.includes(REPEATABLE_JOB_KEY)
      ).length;
    } catch {
      // Queue may not be available
    }

    const intervalMs = getIntervalMs();
    return {
      isRunning: this.isRunning,
      activeSchedules,
      config: { intervalMinutes: intervalMs / 60000 },
    };
  }

  private async scheduleDispatcher(): Promise<void> {
    const queue = getMusicBrainzQueue();
    const intervalMs = getIntervalMs();

    await queue.addJob(
      JOB_TYPES.LASTFM_DISPATCH_SYNC,
      { source: 'scheduled' },
      {
        repeat: { every: intervalMs },
        jobId: REPEATABLE_JOB_KEY,
        priority: 10,
        attempts: 3,
        backoff: { type: 'exponential', delay: 5000 },
        removeOnComplete: 10,
        removeOnFail: 5,
        silent: true,
      }
    );
  }

  private async removeExistingSchedules(): Promise<void> {
    try {
      const queue = getMusicBrainzQueue();
      const repeatableJobs = await queue.getQueue().getRepeatableJobs();
      for (const job of repeatableJobs) {
        if (job.key.includes(REPEATABLE_JOB_KEY)) {
          await queue.getQueue().removeRepeatableByKey(job.key);
        }
      }
    } catch (error) {
      lastfmLogger.warn({ scheduler: 'lastfm', error: error instanceof Error ? error.message : String(error) }, 'Failed to remove existing schedules');
    }
  }

  async dispatchSyncJobs(): Promise<void> {
    lastfmLogger.info({ scheduler: 'lastfm' }, 'Dispatching sync jobs');

    // Find users with Last.fm connected and sync enabled
    const users = await prisma.userSettings.findMany({
      where: {
        lastfmUsername: { not: null },
        lastfmSyncEnabled: true,
      },
      select: {
        userId: true,
        lastfmUsername: true,
      },
    });

    if (users.length === 0) {
      lastfmLogger.info({ scheduler: 'lastfm' }, 'No users with Last.fm connected');
      return;
    }

    // Check which users were synced recently (< 12 hours)
    const twelveHoursAgo = new Date(Date.now() - 12 * 60 * 60 * 1000);
    const recentSyncs = await prisma.userLastfmData.findMany({
      where: {
        userId: { in: users.map(u => u.userId) },
        lastSyncedAt: { gte: twelveHoursAgo },
      },
      select: { userId: true },
    });

    const recentlysynced = new Set(recentSyncs.map(s => s.userId));

    const eligibleUsers = users.filter(
      u => !recentlysynced.has(u.userId) && u.lastfmUsername
    );

    lastfmLogger.info({ scheduler: 'lastfm', eligible: eligibleUsers.length, total: users.length }, 'Users eligible for sync');

    const queue = getMusicBrainzQueue();

    for (let i = 0; i < eligibleUsers.length; i++) {
      const user = eligibleUsers[i];
      const jobData: LastFmSyncUserJobData = {
        userId: user.userId,
        lastfmUsername: user.lastfmUsername!,
      };

      await queue.addJob(JOB_TYPES.LASTFM_SYNC_USER, jobData, {
        priority: 10,
        delay: i * 1000, // Stagger 1 second apart
        attempts: 3,
        backoff: { type: 'exponential', delay: 5000 },
        removeOnComplete: 50,
        removeOnFail: 20,
      });
    }

    lastfmLogger.info({ scheduler: 'lastfm', count: eligibleUsers.length }, 'Enqueued sync jobs');
  }
}

// Singleton instance
export const lastfmScheduler = new LastfmSyncScheduler();

// ============================================================================
// Initialization / Shutdown Functions
// ============================================================================

export async function initializeLastfmScheduler(): Promise<boolean> {
  let dbEnabled = false;
  try {
    dbEnabled = await getSchedulerEnabled('lastfm');
  } catch (error) {
    lastfmLogger.warn({ scheduler: 'lastfm', error: error instanceof Error ? error.message : String(error) }, 'Failed to read DB state, defaulting to disabled');
    return false;
  }

  // Check for orphaned BullMQ jobs
  let bullmqHasJobs = false;
  try {
    const queue = getMusicBrainzQueue();
    const repeatableJobs = await queue.getQueue().getRepeatableJobs();
    bullmqHasJobs = repeatableJobs.some(j =>
      j.key.includes(REPEATABLE_JOB_KEY)
    );
  } catch {
    // Queue may not be available yet
  }

  if (!dbEnabled) {
    if (bullmqHasJobs) {
      await lastfmScheduler.stop();
    }
    lastfmLogger.info({ scheduler: 'lastfm' }, 'Scheduler disabled (DB state)');
    return false;
  }

  // Env var override to disable
  if (process.env.LASTFM_SYNC_ENABLED === 'false') {
    lastfmLogger.info({ scheduler: 'lastfm' }, 'Scheduler disabled (env var)');
    return false;
  }

  await lastfmScheduler.start();
  return true;
}

export async function shutdownLastfmScheduler(): Promise<void> {
  await lastfmScheduler.stop();
}
