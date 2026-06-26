// src/lib/musicbrainz/new-releases-scheduler.ts
/**
 * Automated scheduler for MusicBrainz new releases sync
 * Handles periodic fetching of newly released albums using date-based search
 *
 * Scheduler enabled/disabled state is persisted in the database (AppConfig table)
 * so it survives Redis clears and worker restarts.
 */

import { mbLogger } from '@/lib/logger';

import { getSchedulerEnabled, setSchedulerEnabled } from '../config/app-config';
import { getMusicBrainzQueue, JOB_TYPES } from '../queue';
import type { MusicBrainzSyncNewReleasesJobData } from '../queue/jobs';

export interface MusicBrainzScheduleConfig {
  newReleases: {
    enabled: boolean;
    intervalMinutes: number;
    limit: number;
    dateRangeDays: number;
    genres: string[];
  };
}

export const DEFAULT_SCHEDULE_CONFIG: MusicBrainzScheduleConfig = {
  newReleases: {
    enabled: true,
    intervalMinutes: 10080, // 1 week (7 days)
    limit: 50,
    dateRangeDays: 7, // Get releases from the last 7 days
    genres: [
      'rock',
      'pop',
      'hip hop',
      'electronic',
      'indie',
      'metal',
      'alternative',
      'r&b',
      'soul',
      'jazz',
    ],
  },
};

class MusicBrainzScheduler {
  private config: MusicBrainzScheduleConfig;
  isRunning = false;

  constructor(config: MusicBrainzScheduleConfig = DEFAULT_SCHEDULE_CONFIG) {
    this.config = config;
  }

  /**
   * Start the automated scheduler.
   * Persists enabled=true to the database.
   */
  async start() {
    if (this.isRunning) {
      mbLogger.debug('MusicBrainz scheduler is already running');
      return;
    }

    this.isRunning = true;

    // Persist enabled state to database (survives Redis clears + worker restarts)
    await setSchedulerEnabled('musicbrainz', true);

    // Remove any existing schedules to prevent duplicates
    await this.removeExistingSchedules();

    // Schedule new releases sync
    if (this.config.newReleases.enabled) {
      await this.scheduleNewReleases();
    }

    // Detailed schedule info only logged when explicitly requested
  }

  /**
   * Stop the automated scheduler.
   * Persists enabled=false to the database.
   * Always cleans up Redis regardless of in-memory state.
   */
  async stop() {
    mbLogger.info('Stopping MusicBrainz automated scheduler');

    // Persist disabled state to database
    await setSchedulerEnabled('musicbrainz', false);

    // Remove repeatable job definitions from BullMQ (prevents future job creation)
    await this.removeExistingSchedules();

    // Drain any already-queued concrete job instances that were spawned
    // before the repeatable definition was removed
    await this.drainQueuedJobs();

    this.isRunning = false;

    mbLogger.info('MusicBrainz scheduler stopped successfully');
  }

  /**
   * Update scheduler configuration
   */
  async updateConfig(newConfig: Partial<MusicBrainzScheduleConfig>) {
    const wasRunning = this.isRunning;

    if (wasRunning) {
      await this.stop();
    }

    this.config = { ...this.config, ...newConfig };

    if (wasRunning) {
      await this.start();
    }

    mbLogger.info('MusicBrainz scheduler configuration updated');
  }

  /**
   * Get current scheduler status
   */
  async getStatus() {
    const queue = getMusicBrainzQueue();
    const repeatableJobs = await queue.getQueue().getRepeatableJobs();
    const musicBrainzJobs = repeatableJobs.filter(
      job => job.id === 'musicbrainz-new-releases-schedule'
    );

    return {
      isRunning: this.isRunning,
      config: this.config,
      activeSchedules: musicBrainzJobs.map(job => job.id),
    };
  }

  /**
   * Schedule new releases sync using BullMQ repeatable jobs
   */
  private async scheduleNewReleases() {
    const intervalMs = this.config.newReleases.intervalMinutes * 60 * 1000;
    const queue = getMusicBrainzQueue();

    // Calculate date range
    const today = new Date();
    const daysAgo = new Date(
      today.getTime() -
        this.config.newReleases.dateRangeDays * 24 * 60 * 60 * 1000
    );
    const fromDate = daysAgo.toISOString().split('T')[0];
    const toDate = today.toISOString().split('T')[0];

    // Build Lucene query with genre filters
    const genreFilters = this.config.newReleases.genres
      .map(genre => `tag:"${genre}"`)
      .join(' OR ');

    const query = `firstreleasedate:[${fromDate} TO ${toDate}] AND primarytype:Album AND (${genreFilters})`;

    const jobData: MusicBrainzSyncNewReleasesJobData = {
      query,
      limit: this.config.newReleases.limit,
      dateRange: {
        from: fromDate,
        to: toDate,
      },
      genres: this.config.newReleases.genres,
      priority: 'low',
      source: 'scheduled',
      requestId: `scheduled_mb_new_releases_${Date.now()}`,
    };

    // Use BullMQ repeatable jobs instead of setInterval
    await queue.addJob(JOB_TYPES.MUSICBRAINZ_SYNC_NEW_RELEASES, jobData, {
      repeat: {
        every: intervalMs,
      },
      jobId: 'musicbrainz-new-releases-schedule',
      priority: 5,
      attempts: 3,
      backoff: { type: 'exponential', delay: 10000 },
      removeOnComplete: 10,
      removeOnFail: 5,
      silent: true,
    });
  }

  /**
   * Queue a new releases sync job (for manual triggering)
   */
  private async queueNewReleasesSync() {
    try {
      const queue = getMusicBrainzQueue();

      // Calculate date range
      const today = new Date();
      const daysAgo = new Date(
        today.getTime() -
          this.config.newReleases.dateRangeDays * 24 * 60 * 60 * 1000
      );
      const fromDate = daysAgo.toISOString().split('T')[0];
      const toDate = today.toISOString().split('T')[0];

      // Build Lucene query with genre filters
      const genreFilters = this.config.newReleases.genres
        .map(genre => `tag:"${genre}"`)
        .join(' OR ');

      const query = `firstreleasedate:[${fromDate} TO ${toDate}] AND primarytype:Album AND (${genreFilters})`;

      const jobData: MusicBrainzSyncNewReleasesJobData = {
        query,
        limit: this.config.newReleases.limit,
        dateRange: {
          from: fromDate,
          to: toDate,
        },
        genres: this.config.newReleases.genres,
        priority: 'low',
        source: 'manual',
        requestId: `manual_mb_new_releases_${Date.now()}`,
      };

      const job = await queue.addJob(
        JOB_TYPES.MUSICBRAINZ_SYNC_NEW_RELEASES,
        jobData,
        {
          priority: 5,
          attempts: 3,
          backoff: { type: 'exponential', delay: 10000 },
          removeOnComplete: 10,
          removeOnFail: 5,
        }
      );

      mbLogger.info(
        { jobId: job.id, fromDate, toDate, genres: this.config.newReleases.genres },
        'Queued manual MusicBrainz new releases sync'
      );
    } catch (error) {
      mbLogger.error({ error: error instanceof Error ? error.message : 'Unknown error' }, 'Failed to queue MusicBrainz new releases sync');
    }
  }

  /**
   * Remove existing repeatable job schedules
   */
  async removeExistingSchedules() {
    try {
      const queue = getMusicBrainzQueue();
      const repeatableJobs = await queue.getQueue().getRepeatableJobs();

      for (const job of repeatableJobs) {
        if (job.key.includes('musicbrainz-new-releases-schedule')) {
          await queue.getQueue().removeRepeatableByKey(job.key);
        }
      }
    } catch (error) {
      mbLogger.warn({ error: error instanceof Error ? error.message : 'Unknown error' }, 'Failed to remove existing schedules');
    }
  }

  /**
   * Drain already-queued concrete job instances from delayed/waiting queues.
   * removeRepeatableByKey() only removes the repeatable definition — any job
   * instances it already spawned remain in the queue and will execute.
   */
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
          job.name === JOB_TYPES.MUSICBRAINZ_SYNC_NEW_RELEASES &&
          job.data?.source === 'scheduled'
        ) {
          await job.remove();
          removed++;
        }
      }

      if (removed > 0) {
        mbLogger.info({ removed }, 'Drained queued MusicBrainz sync jobs');
      }
    } catch (error) {
      mbLogger.warn({ error: error instanceof Error ? error.message : 'Unknown error' }, 'Failed to drain queued MusicBrainz jobs');
    }
  }

  /**
   * Log current schedule information
   */
  private logScheduleInfo() {
    if (this.config.newReleases.enabled) {
      mbLogger.info(
        {
          intervalMinutes: this.config.newReleases.intervalMinutes,
          intervalDays: Math.round(this.config.newReleases.intervalMinutes / 1440),
          limit: this.config.newReleases.limit,
          dateRangeDays: this.config.newReleases.dateRangeDays,
          genres: this.config.newReleases.genres,
        },
        'MusicBrainz sync schedule: new releases enabled'
      );
    } else {
      mbLogger.info('MusicBrainz sync schedule: new releases disabled');
    }
  }

  /**
   * Manually trigger a sync (for testing or immediate needs).
   * Always works regardless of whether the scheduler is enabled.
   */
  async triggerSync() {
    mbLogger.info('Manually triggering MusicBrainz new releases sync');
    await this.queueNewReleasesSync();
    mbLogger.info('Manual sync triggered successfully');
  }
}

// Global scheduler instance
export const musicBrainzScheduler = new MusicBrainzScheduler();

/**
 * Read env-based config for the scheduler.
 * The on/off toggle comes from the database, not env vars.
 */
function readMusicBrainzConfigFromEnv(): MusicBrainzScheduleConfig {
  return {
    newReleases: {
      enabled: true, // Populated by caller based on DB state
      intervalMinutes: parseInt(
        process.env.MUSICBRAINZ_NEW_RELEASES_INTERVAL_MINUTES || '10080'
      ),
      limit: parseInt(process.env.MUSICBRAINZ_NEW_RELEASES_LIMIT || '50'),
      dateRangeDays: parseInt(
        process.env.MUSICBRAINZ_NEW_RELEASES_DATE_RANGE_DAYS || '7'
      ),
      genres: process.env.MUSICBRAINZ_NEW_RELEASES_GENRES
        ? process.env.MUSICBRAINZ_NEW_RELEASES_GENRES.split(',')
        : [
            'rock',
            'pop',
            'hip hop',
            'electronic',
            'indie',
            'metal',
            'alternative',
            'r&b',
            'soul',
            'jazz',
          ],
    },
  };
}

/**
 * Initialize MusicBrainz scheduler on worker boot.
 * Reads enabled state from database and reconciles with BullMQ.
 */
export async function initializeMusicBrainzScheduler() {
  // Read enabled state from database (source of truth)
  let dbEnabled = false;
  try {
    dbEnabled = await getSchedulerEnabled('musicbrainz');
  } catch (error) {
    mbLogger.warn({ error: error instanceof Error ? error.message : 'Unknown error' }, 'Failed to read MusicBrainz scheduler state from DB, defaulting to disabled');
    return false;
  }

  // Check BullMQ for existing repeatable jobs
  let bullmqHasJobs = false;
  try {
    const queue = getMusicBrainzQueue();
    const repeatableJobs = await queue.getQueue().getRepeatableJobs();
    bullmqHasJobs = repeatableJobs.some(job =>
      job.key.includes('musicbrainz-new-releases-schedule')
    );
  } catch (error) {
    mbLogger.warn({ error: error instanceof Error ? error.message : 'Unknown error' }, 'Failed to check BullMQ for MusicBrainz jobs');
  }

  // Reconcile DB state with BullMQ state
  if (!dbEnabled) {
    if (bullmqHasJobs) {
      await musicBrainzScheduler.removeExistingSchedules();
    }
    return false;
  }

  // DB says enabled — load config from env vars and start
  const config = readMusicBrainzConfigFromEnv();
  await musicBrainzScheduler.updateConfig(config);

  await musicBrainzScheduler.start();
  return true;
}

/**
 * Gracefully shutdown the scheduler
 */
export async function shutdownMusicBrainzScheduler() {
  await musicBrainzScheduler.stop();
}
