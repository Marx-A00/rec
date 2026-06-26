// src/lib/deezer/editorial-sync/scheduler.ts
/**
 * Automated scheduler for Deezer editorial releases sync.
 *
 * Follows the same pattern as src/lib/listenbrainz/scheduler.ts:
 *   - BullMQ repeatable jobs (persists in Redis across restarts)
 *   - Database-backed enabled/disabled state (survives Redis clears)
 *   - Reconciliation on boot (cleans orphaned jobs if DB says disabled)
 */

import { deezerLogger } from '@/lib/logger';
import {
  getDeezerEditorialConfig,
  getSchedulerEnabled,
  setSchedulerEnabled,
} from '@/lib/config/app-config';
import { getMusicBrainzQueue, JOB_TYPES } from '@/lib/queue';

import type {
  DeezerEditorialSyncJobData,
  DeezerEditorialScheduleConfig,
} from './types';

// ============================================================================
// Defaults
// ============================================================================

export const DEFAULT_DEEZER_EDITORIAL_CONFIG: DeezerEditorialScheduleConfig = {
  enabled: false,
  intervalMinutes: 10080, // 7 days
  maxReleases: 100,
  genres: ['0'], // All genres
  filterDeluxe: true,
};

const REPEATABLE_JOB_KEY = 'deezer-editorial-releases-schedule';

// ============================================================================
// Scheduler class
// ============================================================================

class DeezerEditorialScheduler {
  private config: DeezerEditorialScheduleConfig;
  isRunning = false;

  constructor(
    config: DeezerEditorialScheduleConfig = DEFAULT_DEEZER_EDITORIAL_CONFIG
  ) {
    this.config = config;
  }

  /**
   * Start the scheduler.
   * Persists enabled=true to the database.
   */
  async start() {
    if (this.isRunning) {
      deezerLogger.debug('Deezer Editorial scheduler is already running');
      return;
    }

    this.isRunning = true;

    // Persist enabled state to database
    await setSchedulerEnabled('deezer-editorial', true);

    // Remove existing schedules to prevent duplicates
    await this.removeExistingSchedules();

    // Schedule editorial releases sync
    if (this.config.enabled) {
      await this.scheduleSync();
    }
  }

  /**
   * Stop the scheduler.
   * Persists enabled=false to the database.
   */
  async stop() {
    deezerLogger.info('Stopping Deezer Editorial scheduler');

    await setSchedulerEnabled('deezer-editorial', false);
    await this.removeExistingSchedules();
    await this.drainQueuedJobs();

    this.isRunning = false;

    deezerLogger.info('Deezer Editorial scheduler stopped');
  }

  /**
   * Update scheduler configuration. Restarts if already running.
   */
  async updateConfig(newConfig: Partial<DeezerEditorialScheduleConfig>) {
    const wasRunning = this.isRunning;

    if (wasRunning) {
      await this.stop();
    }

    this.config = { ...this.config, ...newConfig };

    if (wasRunning) {
      await this.start();
    }
  }

  /**
   * Get current scheduler status.
   */
  async getStatus() {
    const queue = getMusicBrainzQueue();
    const repeatableJobs = await queue.getQueue().getRepeatableJobs();
    const deezerJobs = repeatableJobs.filter(job =>
      job.key.includes(REPEATABLE_JOB_KEY)
    );

    return {
      isRunning: this.isRunning,
      config: this.config,
      activeSchedules: deezerJobs.map(job => job.id),
    };
  }

  /**
   * Manually trigger an editorial releases sync.
   * Re-reads config from DB so manual triggers respect current values.
   */
  async triggerSync() {
    deezerLogger.info('Manually triggering Deezer Editorial releases sync');

    // Re-read config from DB > defaults
    this.config = await readDeezerEditorialConfig();

    await this.queueSync('manual');

    deezerLogger.info('Deezer Editorial manual sync triggered');
  }

  // --------------------------------------------------------------------------
  // Private
  // --------------------------------------------------------------------------

  private async scheduleSync() {
    const intervalMs = this.config.intervalMinutes * 60 * 1000;
    const queue = getMusicBrainzQueue();

    const jobData: DeezerEditorialSyncJobData = {
      maxReleases: this.config.maxReleases,
      genres: this.config.genres,
      filterDeluxe: this.config.filterDeluxe,
      source: 'scheduled',
      requestId: `scheduled_deezer_editorial_${Date.now()}`,
    };

    await queue.addJob(JOB_TYPES.DEEZER_SYNC_EDITORIAL_RELEASES, jobData, {
      repeat: { every: intervalMs },
      jobId: REPEATABLE_JOB_KEY,
      priority: 3,
      attempts: 3,
      backoff: { type: 'exponential', delay: 5000 },
      removeOnComplete: 10,
      removeOnFail: 5,
      silent: true,
    });
  }

  async removeExistingSchedules() {
    try {
      const queue = getMusicBrainzQueue();
      const repeatableJobs = await queue.getQueue().getRepeatableJobs();

      for (const job of repeatableJobs) {
        if (job.key.includes(REPEATABLE_JOB_KEY)) {
          await queue.getQueue().removeRepeatableByKey(job.key);
        }
      }
    } catch (error) {
      deezerLogger.warn({ error: error instanceof Error ? error.message : 'Unknown error' }, 'Failed to remove existing Deezer Editorial schedules');
    }
  }

  private async drainQueuedJobs() {
    try {
      const queue = getMusicBrainzQueue();
      const q = queue.getQueue();

      const delayed = await q.getDelayed();
      const waiting = await q.getWaiting();
      const allJobs = [...delayed, ...waiting];

      let removed = 0;
      for (const job of allJobs) {
        if (
          job.name === JOB_TYPES.DEEZER_SYNC_EDITORIAL_RELEASES &&
          job.data?.source === 'scheduled'
        ) {
          await job.remove();
          removed++;
        }
      }

      if (removed > 0) {
        deezerLogger.info({ removed }, 'Drained queued Deezer Editorial sync jobs');
      }
    } catch (error) {
      deezerLogger.warn({ error: error instanceof Error ? error.message : 'Unknown error' }, 'Failed to drain queued Deezer Editorial jobs');
    }
  }

  private async queueSync(source: 'manual' | 'graphql') {
    const queue = getMusicBrainzQueue();

    const jobData: DeezerEditorialSyncJobData = {
      maxReleases: this.config.maxReleases,
      genres: this.config.genres,
      filterDeluxe: this.config.filterDeluxe,
      source,
      requestId: `${source}_deezer_editorial_${Date.now()}`,
    };

    await queue.addJob(JOB_TYPES.DEEZER_SYNC_EDITORIAL_RELEASES, jobData, {
      priority: 3,
      attempts: 3,
      backoff: { type: 'exponential', delay: 5000 },
      removeOnComplete: 10,
      removeOnFail: 5,
    });
  }
}

// ============================================================================
// Singleton instance
// ============================================================================

export const deezerEditorialScheduler = new DeezerEditorialScheduler();

// ============================================================================
// Config reader (DB > hardcoded default)
// ============================================================================

/**
 * Read Deezer Editorial sync config from DB, falling back to hardcoded defaults.
 */
async function readDeezerEditorialConfig(): Promise<DeezerEditorialScheduleConfig> {
  let dbConfig = null;
  try {
    dbConfig = await getDeezerEditorialConfig();
  } catch (error) {
    deezerLogger.warn({ error: error instanceof Error ? error.message : 'Unknown error' }, 'Failed to read Deezer Editorial config from DB, using defaults');
  }

  return {
    enabled: true, // Populated by caller based on DB state
    intervalMinutes:
      dbConfig?.intervalMinutes ??
      DEFAULT_DEEZER_EDITORIAL_CONFIG.intervalMinutes,
    maxReleases:
      dbConfig?.maxReleases ?? DEFAULT_DEEZER_EDITORIAL_CONFIG.maxReleases,
    genres: dbConfig?.genres ?? DEFAULT_DEEZER_EDITORIAL_CONFIG.genres,
    filterDeluxe:
      dbConfig?.filterDeluxe ?? DEFAULT_DEEZER_EDITORIAL_CONFIG.filterDeluxe,
  };
}

// ============================================================================
// Worker lifecycle hooks
// ============================================================================

/**
 * Initialize Deezer Editorial scheduler on worker boot.
 * Reads enabled state from DB and reconciles with BullMQ.
 */
export async function initializeDeezerEditorialScheduler(): Promise<boolean> {
  // Read enabled state from database (source of truth)
  let dbEnabled = false;
  try {
    dbEnabled = await getSchedulerEnabled('deezer-editorial');
  } catch (error) {
    deezerLogger.warn({ error: error instanceof Error ? error.message : 'Unknown error' }, 'Failed to read Deezer Editorial scheduler state from DB, defaulting to disabled');
    return false;
  }

  // Check BullMQ for existing repeatable jobs
  let bullmqHasJobs = false;
  try {
    const queue = getMusicBrainzQueue();
    const repeatableJobs = await queue.getQueue().getRepeatableJobs();
    bullmqHasJobs = repeatableJobs.some(job =>
      job.key.includes(REPEATABLE_JOB_KEY)
    );
  } catch (error) {
    deezerLogger.warn({ error: error instanceof Error ? error.message : 'Unknown error' }, 'Failed to check BullMQ for Deezer Editorial jobs');
  }

  // Reconcile DB state with BullMQ state
  if (!dbEnabled) {
    if (bullmqHasJobs) {
      // DB says off but orphaned jobs exist — clean them up
      await deezerEditorialScheduler.removeExistingSchedules();
    }
    return false;
  }

  // DB says enabled — load config and start
  const config = await readDeezerEditorialConfig();
  await deezerEditorialScheduler.updateConfig(config);
  await deezerEditorialScheduler.start();
  return true;
}

/**
 * Gracefully shutdown the scheduler.
 */
export async function shutdownDeezerEditorialScheduler(): Promise<void> {
  await deezerEditorialScheduler.stop();
}
