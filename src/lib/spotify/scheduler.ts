// src/lib/spotify/scheduler.ts
/**
 * Automated scheduler for Spotify sync jobs
 * Handles periodic syncing of new releases using tag:new search API
 */

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
  },
};

class SpotifyScheduler {
  private config: SpotifyScheduleConfig;
  private isRunning = false;

  constructor(config: SpotifyScheduleConfig = DEFAULT_SCHEDULE_CONFIG) {
    this.config = config;
  }

  /**
   * Start the automated scheduler
   */
  async start() {
    if (this.isRunning) {
      console.log('🔄 Spotify scheduler is already running');
      return;
    }

    console.log('🚀 Starting Spotify automated scheduler...');
    this.isRunning = true;

    // Remove any existing schedules to prevent duplicates
    await this.removeExistingSchedules();

    // Schedule new releases sync
    if (this.config.newReleases.enabled) {
      await this.scheduleNewReleases();
    }

    console.log('✅ Spotify scheduler started successfully');
    this.logScheduleInfo();
  }

  /**
   * Stop the automated scheduler
   */
  async stop() {
    if (!this.isRunning) {
      console.log('⏸️  Spotify scheduler is not running');
      return;
    }

    console.log('🛑 Stopping Spotify automated scheduler...');

    // Remove repeatable jobs from BullMQ
    await this.removeExistingSchedules();

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
      // Tag-based filtering for Spotify Search API
      genreTags: this.config.newReleases.genreTags,
      year: this.config.newReleases.year || new Date().getFullYear(),
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

    console.log(
      `📅 Scheduled new releases sync every ${this.config.newReleases.intervalMinutes} minutes (BullMQ repeatable job)`
    );
    if (jobData.genreTags && jobData.genreTags.length > 0) {
      console.log(`   Genre filters: ${jobData.genreTags.join(', ')}`);
    }
  }

  /**
   * Remove existing repeatable job schedules
   */
  private async removeExistingSchedules() {
    try {
      const queue = getMusicBrainzQueue();
      const repeatableJobs = await queue.getQueue().getRepeatableJobs();

      // Remove Spotify new releases schedules
      for (const job of repeatableJobs) {
        if (job.key.includes('spotify-new-releases-schedule')) {
          await queue.getQueue().removeRepeatableByKey(job.key);
          console.log(`  🗑️  Removed existing schedule: ${job.key}`);
        }
      }
    } catch (error) {
      console.warn('⚠️  Failed to remove existing schedules:', error);
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
      };

      const job = await queue.addJob(
        JOB_TYPES.SPOTIFY_SYNC_NEW_RELEASES,
        jobData,
        {
          priority: 3, // Medium priority for manual jobs
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
   * Manually trigger a new releases sync
   */
  async triggerSync() {
    console.log('🔄 Manually triggering new releases sync...');
    await this.queueNewReleasesSync();
    console.log('✅ Manual sync triggered successfully');
  }
}

// Global scheduler instance
export const spotifyScheduler = new SpotifyScheduler();

/**
 * Initialize Spotify scheduler with environment-based configuration
 */
export async function initializeSpotifyScheduler() {
  // Check if we have Spotify credentials
  if (!process.env.SPOTIFY_CLIENT_ID || !process.env.SPOTIFY_CLIENT_SECRET) {
    console.log('⚠️  Spotify credentials not found, scheduler will not start');
    return false;
  }

  // Parse genre tags from comma-separated env var
  const genreTags = process.env.SPOTIFY_NEW_RELEASES_GENRE_TAGS
    ? process.env.SPOTIFY_NEW_RELEASES_GENRE_TAGS.split(',').map(t => t.trim())
    : undefined;

  // Parse year from env var (defaults to current year)
  const year = process.env.SPOTIFY_NEW_RELEASES_YEAR
    ? parseInt(process.env.SPOTIFY_NEW_RELEASES_YEAR)
    : new Date().getFullYear();

  // Load configuration from environment variables
  const config: SpotifyScheduleConfig = {
    newReleases: {
      enabled: process.env.SPOTIFY_SYNC_NEW_RELEASES !== 'false',
      intervalMinutes: parseInt(
        process.env.SPOTIFY_NEW_RELEASES_INTERVAL_MINUTES || '10080' // Default: 7 days
      ),
      limit: parseInt(process.env.SPOTIFY_NEW_RELEASES_LIMIT || '50'),
      country: process.env.SPOTIFY_COUNTRY || 'US',
      genreTags,
      year,
    },
  };

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
