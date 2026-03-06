// src/lib/spotify/scheduler.ts
/**
 * Automated scheduler for Spotify sync jobs
 * Handles periodic syncing of new releases using tag:new search API
 *
 * Scheduler enabled/disabled state is persisted in the database (AppConfig table)
 * so it survives Redis clears and worker restarts.
 */

import { getSchedulerEnabled, setSchedulerEnabled } from '../config/app-config';
import { getMusicBrainzQueue, JOB_TYPES } from '../queue';
import type { SpotifySyncNewReleasesJobData } from '../queue/jobs';

import { spotifyMetrics } from './error-handling';

export interface SpotifyScheduleConfig {
  newReleases: {
    enabled: boolean;
    intervalMinutes: number;
    limit: number;
    country: string;
    genreTags?: string[]; // Optional genre filtering (e.g., ['rock', 'metal', 'pop'])
    year?: number; // Optional year filter (defaults to current year)
    pages?: number; // Number of pages to fetch (1-4, default: 1)
    minFollowers?: number; // Minimum artist followers to include (e.g., 100000 for 100k+)
  };
}

export const DEFAULT_SCHEDULE_CONFIG: SpotifyScheduleConfig = {
  newReleases: {
    enabled: true,
    intervalMinutes: 10080, // Every week (7 days)
    limit: 50,
    country: 'US',
    genreTags: undefined, // No genre filtering by default
    year: new Date().getFullYear(), // Current year
    pages: 3, // Default to 3 pages (150 albums)
    minFollowers: 100000, // Default to 100k+ followers
  },
};

class SpotifyScheduler {
  private config: SpotifyScheduleConfig;
  isRunning = false;

  constructor(config: SpotifyScheduleConfig = DEFAULT_SCHEDULE_CONFIG) {
    this.config = config;
  }

  /**
   * Start the automated scheduler.
   * Persists enabled=true to the database.
   */
  async start() {
    if (this.isRunning) {
      console.log('🔄 Spotify scheduler is already running');
      return;
    }

    this.isRunning = true;

    // Persist enabled state to database (survives Redis clears + worker restarts)
    await setSchedulerEnabled('spotify', true);

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
    console.log('🛑 Stopping Spotify automated scheduler...');

    // Persist disabled state to database
    await setSchedulerEnabled('spotify', false);

    // Remove repeatable job definitions from BullMQ (prevents future job creation)
    await this.removeExistingSchedules();

    // Drain any already-queued concrete job instances that were spawned
    // before the repeatable definition was removed
    await this.drainQueuedJobs();

    this.isRunning = false;

    console.log('✅ Spotify scheduler stopped successfully');
  }

  /**
   * Update scheduler configuration
   */
  async updateConfig(newConfig: Partial<SpotifyScheduleConfig>) {
    const wasRunning = this.isRunning;

    if (wasRunning) {
      await this.stop();
    }

    this.config = { ...this.config, ...newConfig };

    if (wasRunning) {
      await this.start();
    }

    console.log('🔧 Spotify scheduler configuration updated');
  }

  /**
   * Get current scheduler status
   */
  async getStatus() {
    const queue = getMusicBrainzQueue();
    const repeatableJobs = await queue.getQueue().getRepeatableJobs();
    const spotifyJobs = repeatableJobs.filter(job =>
      job.key.includes('spotify-new-releases-schedule')
    );

    return {
      isRunning: this.isRunning,
      config: this.config,
      activeSchedules: spotifyJobs.map(job => job.id),
      metrics: spotifyMetrics.getMetrics(),
      successRate: spotifyMetrics.getSuccessRate(),
    };
  }

  /**
   * Schedule new releases sync using BullMQ repeatable jobs
   */
  private async scheduleNewReleases() {
    const intervalMs = this.config.newReleases.intervalMinutes * 60 * 1000;
    const queue = getMusicBrainzQueue();

    const jobData: SpotifySyncNewReleasesJobData = {
      limit: this.config.newReleases.limit,
      country: this.config.newReleases.country,
      priority: 'medium',
      source: 'scheduled',
      requestId: `scheduled_new_releases_${Date.now()}`,
      genreTags: this.config.newReleases.genreTags,
      year: this.config.newReleases.year || new Date().getFullYear(),
      pages: this.config.newReleases.pages,
      minFollowers: this.config.newReleases.minFollowers,
    };

    // Use BullMQ repeatable jobs instead of setInterval
    // This persists in Redis and survives worker restarts
    await queue.addJob(JOB_TYPES.SPOTIFY_SYNC_NEW_RELEASES, jobData, {
      repeat: {
        every: intervalMs,
      },
      jobId: 'spotify-new-releases-schedule', // Prevents duplicates
      priority: 3,
      attempts: 3,
      backoff: { type: 'exponential', delay: 5000 },
      removeOnComplete: 10,
      removeOnFail: 5,
    });
  }

  /**
   * Remove existing repeatable job schedules
   */
  async removeExistingSchedules() {
    try {
      const queue = getMusicBrainzQueue();
      const repeatableJobs = await queue.getQueue().getRepeatableJobs();

      // Remove Spotify new releases schedules
      for (const job of repeatableJobs) {
        if (job.key.includes('spotify-new-releases-schedule')) {
          await queue.getQueue().removeRepeatableByKey(job.key);
        }
      }
    } catch (error) {
      console.warn('⚠️  Failed to remove existing schedules:', error);
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
          job.name === JOB_TYPES.SPOTIFY_SYNC_NEW_RELEASES &&
          job.data?.source === 'scheduled'
        ) {
          await job.remove();
          removed++;
        }
      }

      if (removed > 0) {
        console.log(`  🗑️  Drained ${removed} queued Spotify sync job(s)`);
      }
    } catch (error) {
      console.warn('⚠️  Failed to drain queued Spotify jobs:', error);
    }
  }

  /**
   * Queue a new releases sync job (for manual triggering)
   */
  private async queueNewReleasesSync() {
    try {
      const queue = getMusicBrainzQueue();

      const jobData: SpotifySyncNewReleasesJobData = {
        limit: this.config.newReleases.limit,
        country: this.config.newReleases.country,
        priority: 'medium',
        source: 'manual',
        requestId: `manual_new_releases_${Date.now()}`,
        genreTags: this.config.newReleases.genreTags,
        year: this.config.newReleases.year || new Date().getFullYear(),
        pages: this.config.newReleases.pages,
        minFollowers: this.config.newReleases.minFollowers,
      };

      const job = await queue.addJob(
        JOB_TYPES.SPOTIFY_SYNC_NEW_RELEASES,
        jobData,
        {
          priority: 3,
          attempts: 3,
          backoff: { type: 'exponential', delay: 5000 },
          removeOnComplete: 10,
          removeOnFail: 5,
        }
      );

      console.log(`🎵 Queued manual new releases sync (Job ID: ${job.id})`);
    } catch (error) {
      console.error('❌ Failed to queue new releases sync:', error);
    }
  }

  /**
   * Log current schedule information
   */
  private logScheduleInfo() {
    console.log('\n📋 Spotify Sync Schedule:');

    if (this.config.newReleases.enabled) {
      console.log(
        `  🎵 New Releases: Every ${this.config.newReleases.intervalMinutes} minutes`
      );
      console.log(
        `     Limit: ${this.config.newReleases.limit}, Country: ${this.config.newReleases.country}`
      );
      if (this.config.newReleases.genreTags?.length) {
        console.log(
          `     Genres: ${this.config.newReleases.genreTags.join(', ')}`
        );
      }
    } else {
      console.log('  🎵 New Releases: Disabled');
    }

    console.log('');
  }

  /**
   * Manually trigger a new releases sync.
   * Re-reads env config so manual triggers respect current .env values.
   * This always works regardless of whether the scheduler is enabled.
   */
  async triggerSync() {
    console.log('🔄 Manually triggering new releases sync...');

    // Re-read env config so "Sync Now" always uses current .env values
    this.config = {
      newReleases: {
        enabled: true, // Manual trigger always enabled
        intervalMinutes: parseInt(
          process.env.SPOTIFY_NEW_RELEASES_INTERVAL_MINUTES || '10080'
        ),
        limit: parseInt(process.env.SPOTIFY_NEW_RELEASES_LIMIT || '50'),
        country: process.env.SPOTIFY_COUNTRY || 'US',
        genreTags: process.env.SPOTIFY_NEW_RELEASES_GENRE_TAGS
          ? process.env.SPOTIFY_NEW_RELEASES_GENRE_TAGS.split(',').map(t =>
              t.trim()
            )
          : undefined,
        year: parseInt(
          process.env.SPOTIFY_NEW_RELEASES_YEAR ||
            String(new Date().getFullYear())
        ),
        pages: parseInt(process.env.SPOTIFY_NEW_RELEASES_PAGES || '3'),
        minFollowers: parseInt(
          process.env.SPOTIFY_NEW_RELEASES_MIN_FOLLOWERS || '100000'
        ),
      },
    };

    await this.queueNewReleasesSync();
    console.log('✅ Manual sync triggered successfully');
  }
}

// Global scheduler instance
export const spotifyScheduler = new SpotifyScheduler();

/**
 * Read env-based config for the scheduler (limit, pages, country, etc.)
 * The on/off toggle comes from the database, not env vars.
 */
function readSpotifyConfigFromEnv(): SpotifyScheduleConfig {
  const genreTags = process.env.SPOTIFY_NEW_RELEASES_GENRE_TAGS
    ? process.env.SPOTIFY_NEW_RELEASES_GENRE_TAGS.split(',').map(t => t.trim())
    : undefined;

  const year = process.env.SPOTIFY_NEW_RELEASES_YEAR
    ? parseInt(process.env.SPOTIFY_NEW_RELEASES_YEAR)
    : new Date().getFullYear();

  const pages = process.env.SPOTIFY_NEW_RELEASES_PAGES
    ? parseInt(process.env.SPOTIFY_NEW_RELEASES_PAGES)
    : 3;

  const minFollowers = process.env.SPOTIFY_NEW_RELEASES_MIN_FOLLOWERS
    ? parseInt(process.env.SPOTIFY_NEW_RELEASES_MIN_FOLLOWERS)
    : 100000;

  return {
    newReleases: {
      enabled: true, // Populated by caller based on DB state
      intervalMinutes: parseInt(
        process.env.SPOTIFY_NEW_RELEASES_INTERVAL_MINUTES || '10080'
      ),
      limit: parseInt(process.env.SPOTIFY_NEW_RELEASES_LIMIT || '50'),
      country: process.env.SPOTIFY_COUNTRY || 'US',
      genreTags,
      year,
      pages,
      minFollowers,
    },
  };
}

/**
 * Initialize Spotify scheduler on worker boot.
 * Reads enabled state from database and reconciles with BullMQ.
 */
export async function initializeSpotifyScheduler() {
  // Check if we have Spotify credentials
  const spotifyClientId =
    process.env.SPOTIFY_CLIENT_ID || process.env.AUTH_SPOTIFY_ID;
  const spotifyClientSecret =
    process.env.SPOTIFY_CLIENT_SECRET || process.env.AUTH_SPOTIFY_SECRET;

  if (!spotifyClientId || !spotifyClientSecret) {
    return false;
  }

  // Read enabled state from database (source of truth)
  let dbEnabled = false;
  try {
    dbEnabled = await getSchedulerEnabled('spotify');
  } catch (error) {
    console.warn(
      '⚠️  Failed to read Spotify scheduler state from DB, defaulting to disabled:',
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
      job.key.includes('spotify-new-releases-schedule')
    );
  } catch (error) {
    console.warn('⚠️  Failed to check BullMQ for Spotify jobs:', error);
  }

  // Reconcile DB state with BullMQ state
  if (!dbEnabled) {
    if (bullmqHasJobs) {
      // DB says off but orphaned jobs exist — clean them up
      await spotifyScheduler.removeExistingSchedules();
    }
    return false;
  }

  // DB says enabled — load config from env vars and start
  const config = readSpotifyConfigFromEnv();
  await spotifyScheduler.updateConfig(config);

  await spotifyScheduler.start();
  return true;
}

/**
 * Gracefully shutdown the scheduler
 */
export async function shutdownSpotifyScheduler() {
  await spotifyScheduler.stop();
}
