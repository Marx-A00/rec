// src/lib/listenbrainz/scheduler.ts
/**
 * Automated scheduler for ListenBrainz fresh releases sync.
 *
 * Follows the same pattern as src/lib/spotify/scheduler.ts:
 *   - BullMQ repeatable jobs (persists in Redis across restarts)
 *   - Database-backed enabled/disabled state (survives Redis clears)
 *   - Reconciliation on boot (cleans orphaned jobs if DB says disabled)
 */

import {
  getListenBrainzConfig,
  getSchedulerEnabled,
  setSchedulerEnabled,
} from '../config/app-config';
import { getMusicBrainzQueue, JOB_TYPES } from '../queue';

import type {
  ListenBrainzSyncFreshReleasesJobData,
  ListenBrainzScheduleConfig,
} from './types';

// ============================================================================
// Defaults
// ============================================================================

export const DEFAULT_LISTENBRAINZ_CONFIG: ListenBrainzScheduleConfig = {
  enabled: true,
  intervalMinutes: 10080, // 7 days
  days: 14,
  includeFuture: true,
  primaryTypes: ['Album', 'EP', 'Single'],
  minListenCount: 0,
  maxReleases: 0,
  minArtistListeners: 1000,
};

const REPEATABLE_JOB_KEY = 'listenbrainz-fresh-releases-schedule';

// ============================================================================
// Scheduler class
// ============================================================================

class ListenBrainzScheduler {
  private config: ListenBrainzScheduleConfig;
  isRunning = false;

  constructor(
    config: ListenBrainzScheduleConfig = DEFAULT_LISTENBRAINZ_CONFIG
  ) {
    this.config = config;
  }

  /**
   * Start the scheduler.
   * Persists enabled=true to the database.
   */
  async start() {
    if (this.isRunning) {
      console.log('🔄 ListenBrainz scheduler is already running');
      return;
    }

    this.isRunning = true;

    // Persist enabled state to database
    await setSchedulerEnabled('listenbrainz', true);

    // Remove existing schedules to prevent duplicates
    await this.removeExistingSchedules();

    // Schedule fresh releases sync
    if (this.config.enabled) {
      await this.scheduleFreshReleases();
    }
  }

  /**
   * Stop the scheduler.
   * Persists enabled=false to the database.
   */
  async stop() {
    console.log('🛑 Stopping ListenBrainz scheduler...');

    await setSchedulerEnabled('listenbrainz', false);
    await this.removeExistingSchedules();
    await this.drainQueuedJobs();

    this.isRunning = false;

    console.log('✅ ListenBrainz scheduler stopped');
  }

  /**
   * Update scheduler configuration. Restarts if already running.
   */
  async updateConfig(newConfig: Partial<ListenBrainzScheduleConfig>) {
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
    const lbJobs = repeatableJobs.filter(job =>
      job.key.includes(REPEATABLE_JOB_KEY)
    );

    return {
      isRunning: this.isRunning,
      config: this.config,
      activeSchedules: lbJobs.map(job => job.id),
    };
  }

  /**
   * Manually trigger a fresh releases sync.
   * Re-reads config (DB > env) so manual triggers respect current values.
   */
  async triggerSync() {
    console.log('🔄 Manually triggering ListenBrainz fresh releases sync...');

    // Re-read config from DB > env > defaults
    this.config = await readListenBrainzConfig();

    await this.queueFreshReleasesSync('manual');

    console.log('✅ ListenBrainz manual sync triggered');
  }

  // --------------------------------------------------------------------------
  // Private
  // --------------------------------------------------------------------------

  private async scheduleFreshReleases() {
    const intervalMs = this.config.intervalMinutes * 60 * 1000;
    const queue = getMusicBrainzQueue();

    const jobData: ListenBrainzSyncFreshReleasesJobData = {
      days: this.config.days,
      includeFuture: this.config.includeFuture,
      primaryTypes: this.config.primaryTypes,
      minListenCount: this.config.minListenCount,
      maxReleases: this.config.maxReleases,
      minArtistListeners: this.config.minArtistListeners,
      priority: 'medium',
      source: 'scheduled',
      requestId: `scheduled_listenbrainz_${Date.now()}`,
    };

    await queue.addJob(JOB_TYPES.LISTENBRAINZ_SYNC_FRESH_RELEASES, jobData, {
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
      console.warn(
        '⚠️  Failed to remove existing ListenBrainz schedules:',
        error
      );
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
          job.name === JOB_TYPES.LISTENBRAINZ_SYNC_FRESH_RELEASES &&
          job.data?.source === 'scheduled'
        ) {
          await job.remove();
          removed++;
        }
      }

      if (removed > 0) {
        console.log(`  🗑️  Drained ${removed} queued ListenBrainz sync job(s)`);
      }
    } catch (error) {
      console.warn('⚠️  Failed to drain queued ListenBrainz jobs:', error);
    }
  }

  private async queueFreshReleasesSync(source: 'manual' | 'graphql') {
    const queue = getMusicBrainzQueue();

    const jobData: ListenBrainzSyncFreshReleasesJobData = {
      days: this.config.days,
      includeFuture: this.config.includeFuture,
      primaryTypes: this.config.primaryTypes,
      minListenCount: this.config.minListenCount,
      maxReleases: this.config.maxReleases,
      minArtistListeners: this.config.minArtistListeners,
      priority: 'high',
      source,
      requestId: `${source}_listenbrainz_${Date.now()}`,
    };

    await queue.addJob(JOB_TYPES.LISTENBRAINZ_SYNC_FRESH_RELEASES, jobData, {
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

export const listenbrainzScheduler = new ListenBrainzScheduler();

// ============================================================================
// Config reader (DB > env var > hardcoded default)
// ============================================================================

/**
 * Read ListenBrainz sync config with priority: DB > env var > hardcoded default.
 *
 * For each field, uses the DB value if it differs from the Prisma column default,
 * otherwise falls back to the env var, then the hardcoded default.
 */
async function readListenBrainzConfig(): Promise<ListenBrainzScheduleConfig> {
  // Prisma column defaults (used to detect "not set in DB")
  const PRISMA_DEFAULTS = {
    days: 14,
    includeFuture: true,
    maxReleases: 50,
    minListenCount: 0,
    minArtistListeners: 1000,
  };

  // 1. Read DB config
  let dbConfig: typeof PRISMA_DEFAULTS | null = null;
  try {
    dbConfig = await getListenBrainzConfig();
  } catch (error) {
    console.warn(
      '⚠️  Failed to read ListenBrainz config from DB, using env/defaults:',
      error
    );
  }

  // 2. Read env vars
  const envDays = process.env.LISTENBRAINZ_SYNC_DAYS;
  const envIncludeFuture = process.env.LISTENBRAINZ_SYNC_INCLUDE_FUTURE;
  const envMaxReleases = process.env.LISTENBRAINZ_SYNC_MAX_RELEASES;
  const envMinListenCount = process.env.LISTENBRAINZ_SYNC_MIN_LISTEN_COUNT;
  const envMinArtistListeners =
    process.env.LISTENBRAINZ_SYNC_MIN_ARTIST_LISTENERS;

  // 3. Resolve each field: DB (if changed from column default) > env > hardcoded default
  const resolve = <T>(
    dbVal: T | undefined,
    prismaDefault: T,
    envVal: string | undefined,
    parseEnv: (v: string) => T,
    hardDefault: T
  ): T => {
    if (dbVal !== undefined && dbVal !== prismaDefault) return dbVal;
    if (envVal !== undefined) return parseEnv(envVal);
    if (dbVal !== undefined) return dbVal; // DB has value even if it equals default
    return hardDefault;
  };

  const days = resolve(
    dbConfig?.days,
    PRISMA_DEFAULTS.days,
    envDays,
    v => parseInt(v),
    14
  );
  const includeFuture = resolve(
    dbConfig?.includeFuture,
    PRISMA_DEFAULTS.includeFuture,
    envIncludeFuture,
    v => v !== 'false',
    true
  );
  const maxReleases = resolve(
    dbConfig?.maxReleases,
    PRISMA_DEFAULTS.maxReleases,
    envMaxReleases,
    v => parseInt(v),
    50
  );
  const minListenCount = resolve(
    dbConfig?.minListenCount,
    PRISMA_DEFAULTS.minListenCount,
    envMinListenCount,
    v => parseInt(v),
    0
  );
  const minArtistListeners = resolve(
    dbConfig?.minArtistListeners,
    PRISMA_DEFAULTS.minArtistListeners,
    envMinArtistListeners,
    v => parseInt(v),
    0
  );

  // Fields only from env (no DB column)
  const primaryTypes = process.env.LISTENBRAINZ_SYNC_PRIMARY_TYPES
    ? process.env.LISTENBRAINZ_SYNC_PRIMARY_TYPES.split(',').map(t => t.trim())
    : ['Album', 'EP', 'Single'];

  const intervalMinutes = parseInt(
    process.env.LISTENBRAINZ_SYNC_INTERVAL_MINUTES || '10080'
  );

  return {
    enabled: true, // Populated by caller based on DB state
    intervalMinutes,
    days,
    includeFuture,
    primaryTypes,
    minListenCount,
    maxReleases,
    minArtistListeners,
  };
}

// ============================================================================
// Worker lifecycle hooks
// ============================================================================

/**
 * Initialize ListenBrainz scheduler on worker boot.
 * Reads enabled state from DB and reconciles with BullMQ.
 */
export async function initializeListenBrainzScheduler(): Promise<boolean> {
  // Read enabled state from database (source of truth)
  let dbEnabled = false;
  try {
    dbEnabled = await getSchedulerEnabled('listenbrainz');
  } catch (error) {
    console.warn(
      '⚠️  Failed to read ListenBrainz scheduler state from DB, defaulting to disabled:',
      error
    );
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
    console.warn('⚠️  Failed to check BullMQ for ListenBrainz jobs:', error);
  }

  // Reconcile DB state with BullMQ state
  if (!dbEnabled) {
    if (bullmqHasJobs) {
      // DB says off but orphaned jobs exist — clean them up
      await listenbrainzScheduler.removeExistingSchedules();
    }
    return false;
  }

  // DB says enabled — load config (DB > env > defaults) and start
  const config = await readListenBrainzConfig();
  await listenbrainzScheduler.updateConfig(config);
  await listenbrainzScheduler.start();
  return true;
}

/**
 * Gracefully shutdown the scheduler.
 */
export async function shutdownListenBrainzScheduler(): Promise<void> {
  await listenbrainzScheduler.stop();
}
