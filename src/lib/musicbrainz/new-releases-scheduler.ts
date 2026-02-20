// src/lib/musicbrainz/new-releases-scheduler.ts
/**
 * Automated scheduler for MusicBrainz new releases sync
 * Handles periodic fetching of newly released albums using date-based search
 *
 * Scheduler enabled/disabled state is persisted in the database (AppConfig table)
 * so it survives Redis clears and worker restarts.
 */

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
      console.log('🔄 MusicBrainz scheduler is already running');
      return;
    }

    console.log('🚀 Starting MusicBrainz automated scheduler...');
    this.isRunning = true;

    // Persist enabled state to database (survives Redis clears + worker restarts)
    await setSchedulerEnabled('musicbrainz', true);

    // Remove any existing schedules to prevent duplicates
    await this.removeExistingSchedules();

    // Schedule new releases sync
    if (this.config.newReleases.enabled) {
      await this.scheduleNewReleases();
    }

    console.log('✅ MusicBrainz scheduler started successfully');
    this.logScheduleInfo();
  }

  /**
   * Stop the automated scheduler.
   * Persists enabled=false to the database.
   */
  async stop() {
    if (!this.isRunning) {
      console.log('⏸️  MusicBrainz scheduler is not running');
      return;
    }

    console.log('🛑 Stopping MusicBrainz automated scheduler...');

    // Persist disabled state to database
    await setSchedulerEnabled('musicbrainz', false);

    // Remove repeatable jobs from BullMQ
    await this.removeExistingSchedules();

    this.isRunning = false;

    console.log('✅ MusicBrainz scheduler stopped successfully');
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

    console.log('🔧 MusicBrainz scheduler configuration updated');
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
    });

    console.log(
      `📅 Scheduled MusicBrainz new releases sync every ${this.config.newReleases.intervalMinutes} minutes (${Math.round(this.config.newReleases.intervalMinutes / 1440)} days) - BullMQ repeatable job`
    );
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

      console.log(
        `🎵 Queued manual MusicBrainz new releases sync (Job ID: ${job.id})`
      );
      console.log(`   Date range: ${fromDate} to ${toDate}`);
      console.log(`   Genres: ${this.config.newReleases.genres.join(', ')}`);
    } catch (error) {
      console.error('❌ Failed to queue MusicBrainz new releases sync:', error);
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
          console.log(`  🗑️  Removed existing schedule: ${job.key}`);
        }
      }
    } catch (error) {
      console.warn('⚠️  Failed to remove existing schedules:', error);
    }
  }

  /**
   * Log current schedule information
   */
  private logScheduleInfo() {
    console.log('\n📋 MusicBrainz Sync Schedule:');

    if (this.config.newReleases.enabled) {
      console.log(
        `  🎵 New Releases: Every ${this.config.newReleases.intervalMinutes} minutes (${Math.round(this.config.newReleases.intervalMinutes / 1440)} days)`
      );
      console.log(
        `     Limit: ${this.config.newReleases.limit}, Date Range: ${this.config.newReleases.dateRangeDays} days`
      );
      console.log(`     Genres: ${this.config.newReleases.genres.join(', ')}`);
    } else {
      console.log('  🎵 New Releases: Disabled');
    }

    console.log('');
  }

  /**
   * Manually trigger a sync (for testing or immediate needs).
   * Always works regardless of whether the scheduler is enabled.
   */
  async triggerSync() {
    console.log('🔄 Manually triggering MusicBrainz new releases sync...');
    await this.queueNewReleasesSync();
    console.log('✅ Manual sync triggered successfully');
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
    console.log(
      `📡 MusicBrainz scheduler DB state: ${dbEnabled ? 'enabled' : 'disabled'}`
    );
  } catch (error) {
    console.warn(
      '⚠️  Failed to read MusicBrainz scheduler state from DB, defaulting to disabled:',
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
      job.key.includes('musicbrainz-new-releases-schedule')
    );
  } catch (error) {
    console.warn('⚠️  Failed to check BullMQ for MusicBrainz jobs:', error);
  }

  // Reconcile DB state with BullMQ state
  if (!dbEnabled) {
    if (bullmqHasJobs) {
      console.log(
        '🧹 Cleaning up orphaned MusicBrainz BullMQ jobs (DB says disabled)'
      );
      await musicBrainzScheduler.removeExistingSchedules();
    }
    console.log('⏸️  MusicBrainz scheduler disabled (DB)');
    return false;
  }

  // DB says enabled — load config from env vars and start
  const config = readMusicBrainzConfigFromEnv();
  await musicBrainzScheduler.updateConfig(config);

  if (!bullmqHasJobs) {
    console.log(
      '🔄 Recreating MusicBrainz BullMQ jobs (DB says enabled, jobs missing)'
    );
  }

  await musicBrainzScheduler.start();
  return true;
}

/**
 * Gracefully shutdown the scheduler
 */
export async function shutdownMusicBrainzScheduler() {
  await musicBrainzScheduler.stop();
}
