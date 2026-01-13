// src/lib/musicbrainz/new-releases-scheduler.ts
/**
 * Automated scheduler for MusicBrainz new releases sync
 * Handles periodic fetching of newly released albums using date-based search
 */

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
  private isRunning = false;

  constructor(config: MusicBrainzScheduleConfig = DEFAULT_SCHEDULE_CONFIG) {
    this.config = config;
  }

  /**
   * Start the automated scheduler
   */
  async start() {
    if (this.isRunning) {
      console.log('🔄 MusicBrainz scheduler is already running');
      return;
    }

    console.log('🚀 Starting MusicBrainz automated scheduler...');
    this.isRunning = true;

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
   * Stop the automated scheduler
   */
  async stop() {
    if (!this.isRunning) {
      console.log('⏸️  MusicBrainz scheduler is not running');
      return;
    }

    console.log('🛑 Stopping MusicBrainz automated scheduler...');

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
    // This persists in Redis and survives worker restarts
    await queue.addJob(JOB_TYPES.MUSICBRAINZ_SYNC_NEW_RELEASES, jobData, {
      repeat: {
        every: intervalMs,
      },
      jobId: 'musicbrainz-new-releases-schedule', // Prevents duplicates
      priority: 5, // Low priority for scheduled background jobs
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
          priority: 5, // Low priority for manual jobs
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
  private async removeExistingSchedules() {
    try {
      const queue = getMusicBrainzQueue();
      const repeatableJobs = await queue.getQueue().getRepeatableJobs();

      // Remove MusicBrainz-related schedules
      // Check the key field which contains 'musicbrainz-new-releases-schedule'
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
   * Manually trigger a sync (for testing or immediate needs)
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
 * Initialize MusicBrainz scheduler with environment-based configuration
 */
export async function initializeMusicBrainzScheduler() {
  // Load configuration from environment variables
  const config: MusicBrainzScheduleConfig = {
    newReleases: {
      enabled: process.env.MUSICBRAINZ_SYNC_NEW_RELEASES !== 'false',
      intervalMinutes: parseInt(
        process.env.MUSICBRAINZ_NEW_RELEASES_INTERVAL_MINUTES || '10080' // Default: 1 week
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
