// src/lib/spotify/scheduler.ts
/**
 * Automated scheduler for Spotify sync jobs
 * Handles periodic syncing of new releases and featured playlists
 */

import { getMusicBrainzQueue, JOB_TYPES } from '../queue';
import type {
  SpotifySyncNewReleasesJobData,
  SpotifySyncFeaturedPlaylistsJobData,
} from '../queue/jobs';

import { spotifyMetrics } from './error-handling';

export interface SpotifyScheduleConfig {
  newReleases: {
    enabled: boolean;
    intervalMinutes: number;
    limit: number;
    country: string;
  };
  featuredPlaylists: {
    enabled: boolean;
    intervalMinutes: number;
    limit: number;
    country: string;
    extractAlbums: boolean;
  };
}

export const DEFAULT_SCHEDULE_CONFIG: SpotifyScheduleConfig = {
  newReleases: {
    enabled: true,
    intervalMinutes: 60, // Every hour
    limit: 20,
    country: 'US',
  },
  featuredPlaylists: {
    enabled: true,
    intervalMinutes: 180, // Every 3 hours
    limit: 10,
    country: 'US',
    extractAlbums: true,
  },
};

class SpotifyScheduler {
  private config: SpotifyScheduleConfig;
  private intervals: Map<string, NodeJS.Timeout> = new Map();
  private isRunning = false;

  constructor(config: SpotifyScheduleConfig = DEFAULT_SCHEDULE_CONFIG) {
    this.config = config;
  }

  /**
   * Start the automated scheduler
   */
  start() {
    if (this.isRunning) {
      console.log('🔄 Spotify scheduler is already running');
      return;
    }

    console.log('🚀 Starting Spotify automated scheduler...');
    this.isRunning = true;

    // Schedule new releases sync
    if (this.config.newReleases.enabled) {
      this.scheduleNewReleases();
    }

    // Schedule featured playlists sync
    if (this.config.featuredPlaylists.enabled) {
      this.scheduleFeaturedPlaylists();
    }

    console.log('✅ Spotify scheduler started successfully');
    this.logScheduleInfo();
  }

  /**
   * Stop the automated scheduler
   */
  stop() {
    if (!this.isRunning) {
      console.log('⏸️  Spotify scheduler is not running');
      return;
    }

    console.log('🛑 Stopping Spotify automated scheduler...');

    // Clear all intervals
    for (const [jobType, interval] of this.intervals) {
      clearInterval(interval);
      console.log(`  ✅ Stopped ${jobType} scheduler`);
    }

    this.intervals.clear();
    this.isRunning = false;

    console.log('✅ Spotify scheduler stopped successfully');
  }

  /**
   * Update scheduler configuration
   */
  updateConfig(newConfig: Partial<SpotifyScheduleConfig>) {
    const wasRunning = this.isRunning;

    if (wasRunning) {
      this.stop();
    }

    this.config = { ...this.config, ...newConfig };

    if (wasRunning) {
      this.start();
    }

    console.log('🔧 Spotify scheduler configuration updated');
  }

  /**
   * Get current scheduler status
   */
  getStatus() {
    return {
      isRunning: this.isRunning,
      config: this.config,
      activeJobs: Array.from(this.intervals.keys()),
      metrics: spotifyMetrics.getMetrics(),
      successRate: spotifyMetrics.getSuccessRate(),
    };
  }

  /**
   * Schedule new releases sync
   */
  private scheduleNewReleases() {
    const intervalMs = this.config.newReleases.intervalMinutes * 60 * 1000;

    // Run immediately on start
    this.queueNewReleasesSync();

    // Then schedule recurring
    const interval = setInterval(() => {
      this.queueNewReleasesSync();
    }, intervalMs);

    this.intervals.set('new-releases', interval);

    console.log(
      `📅 Scheduled new releases sync every ${this.config.newReleases.intervalMinutes} minutes`
    );
  }

  /**
   * Schedule featured playlists sync
   */
  private scheduleFeaturedPlaylists() {
    const intervalMs =
      this.config.featuredPlaylists.intervalMinutes * 60 * 1000;

    // Run immediately on start (with slight delay to avoid collision)
    setTimeout(() => {
      this.queueFeaturedPlaylistsSync();
    }, 30000); // 30 second delay

    // Then schedule recurring
    const interval = setInterval(() => {
      this.queueFeaturedPlaylistsSync();
    }, intervalMs);

    this.intervals.set('featured-playlists', interval);

    console.log(
      `📅 Scheduled featured playlists sync every ${this.config.featuredPlaylists.intervalMinutes} minutes`
    );
  }

  /**
   * Queue a new releases sync job
   */
  private async queueNewReleasesSync() {
    try {
      const queue = getMusicBrainzQueue();

      const jobData: SpotifySyncNewReleasesJobData = {
        limit: this.config.newReleases.limit,
        country: this.config.newReleases.country,
        priority: 'medium',
        source: 'scheduled',
        requestId: `scheduled_new_releases_${Date.now()}`,
      };

      const job = await queue.addJob(
        JOB_TYPES.SPOTIFY_SYNC_NEW_RELEASES,
        jobData,
        {
          priority: 3, // Medium priority for scheduled jobs
          attempts: 3,
          backoff: { type: 'exponential', delay: 5000 },
          removeOnComplete: 10 as any, // Keep last 10 completed jobs
          removeOnFail: 5 as any, // Keep last 5 failed jobs for debugging
        }
      );

      console.log(`🎵 Queued scheduled new releases sync (Job ID: ${job.id})`);
    } catch (error) {
      console.error('❌ Failed to queue new releases sync:', error);
    }
  }

  /**
   * Queue a featured playlists sync job
   */
  private async queueFeaturedPlaylistsSync() {
    try {
      const queue = getMusicBrainzQueue();

      const jobData: SpotifySyncFeaturedPlaylistsJobData = {
        limit: this.config.featuredPlaylists.limit,
        country: this.config.featuredPlaylists.country,
        extractAlbums: this.config.featuredPlaylists.extractAlbums,
        priority: 'medium',
        source: 'scheduled',
        requestId: `scheduled_playlists_${Date.now()}`,
      };

      const job = await queue.addJob(
        JOB_TYPES.SPOTIFY_SYNC_FEATURED_PLAYLISTS,
        jobData,
        {
          priority: 3, // Medium priority for scheduled jobs
          attempts: 3,
          backoff: { type: 'exponential', delay: 5000 },
          removeOnComplete: 10 as any,
          removeOnFail: 5 as any,
        }
      );

      console.log(
        `🎧 Queued scheduled featured playlists sync (Job ID: ${job.id})`
      );
    } catch (error) {
      console.error('❌ Failed to queue featured playlists sync:', error);
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
    } else {
      console.log('  🎵 New Releases: Disabled');
    }

    if (this.config.featuredPlaylists.enabled) {
      console.log(
        `  🎧 Featured Playlists: Every ${this.config.featuredPlaylists.intervalMinutes} minutes`
      );
      console.log(
        `     Limit: ${this.config.featuredPlaylists.limit}, Country: ${this.config.featuredPlaylists.country}`
      );
      console.log(
        `     Extract Albums: ${this.config.featuredPlaylists.extractAlbums}`
      );
    } else {
      console.log('  🎧 Featured Playlists: Disabled');
    }

    console.log('');
  }

  /**
   * Manually trigger a sync (for testing or immediate needs)
   */
  async triggerSync(type: 'new-releases' | 'featured-playlists' | 'both') {
    console.log(`🔄 Manually triggering ${type} sync...`);

    if (type === 'new-releases' || type === 'both') {
      await this.queueNewReleasesSync();
    }

    if (type === 'featured-playlists' || type === 'both') {
      await this.queueFeaturedPlaylistsSync();
    }

    console.log('✅ Manual sync triggered successfully');
  }
}

// Global scheduler instance
export const spotifyScheduler = new SpotifyScheduler();

/**
 * Initialize Spotify scheduler with environment-based configuration
 */
export function initializeSpotifyScheduler() {
  // Check if we have Spotify credentials
  if (!process.env.SPOTIFY_CLIENT_ID || !process.env.SPOTIFY_CLIENT_SECRET) {
    console.log('⚠️  Spotify credentials not found, scheduler will not start');
    return false;
  }

  // Load configuration from environment variables
  const config: SpotifyScheduleConfig = {
    newReleases: {
      enabled: process.env.SPOTIFY_SYNC_NEW_RELEASES !== 'false',
      intervalMinutes: parseInt(
        process.env.SPOTIFY_NEW_RELEASES_INTERVAL_MINUTES || '60'
      ),
      limit: parseInt(process.env.SPOTIFY_NEW_RELEASES_LIMIT || '20'),
      country: process.env.SPOTIFY_COUNTRY || 'US',
    },
    featuredPlaylists: {
      enabled: process.env.SPOTIFY_SYNC_FEATURED_PLAYLISTS !== 'false',
      intervalMinutes: parseInt(
        process.env.SPOTIFY_FEATURED_PLAYLISTS_INTERVAL_MINUTES || '180'
      ),
      limit: parseInt(process.env.SPOTIFY_FEATURED_PLAYLISTS_LIMIT || '10'),
      country: process.env.SPOTIFY_COUNTRY || 'US',
      extractAlbums: process.env.SPOTIFY_EXTRACT_ALBUMS !== 'false',
    },
  };

  spotifyScheduler.updateConfig(config);
  spotifyScheduler.start();

  return true;
}

/**
 * Gracefully shutdown the scheduler
 */
export function shutdownSpotifyScheduler() {
  spotifyScheduler.stop();
}
