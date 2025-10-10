// src/lib/activity/queue-activity-monitor.ts
// Automatic queue pause/resume service based on user activity

import { PrismaClient } from '@prisma/client';
import chalk from 'chalk';

import { getMusicBrainzQueue } from '@/lib/queue';

import { QueuePriorityManager } from './queue-priority-manager';
import { ActivityTracker } from './activity-tracker';

export interface ActivityBasedQueueMetrics {
  queueStats: {
    active: number;
    waiting: number;
    delayed: number;
    completed: number;
    failed: number;
  };
  activityStats: {
    activeUserCount: number;
    shouldPauseBackground: boolean;
    backgroundJobsPaused: boolean;
    recentlyActiveAlbums: string[];
    recentlyActiveArtists: string[];
  };
  performance: {
    lastCheckTime: Date;
    monitorUptime: number;
    pauseResumeEvents: number;
  };
}

export class QueueActivityMonitor {
  private static instance: QueueActivityMonitor | null = null;
  private prisma: PrismaClient;
  private priorityManager: QueuePriorityManager;
  private monitorInterval: NodeJS.Timeout | null = null;
  private isRunning: boolean = false;
  private lastCheckTime: Date = new Date();
  private backgroundJobsPaused: boolean = false;
  private startTime: Date = new Date();
  private pauseResumeEventCount: number = 0;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
    this.priorityManager = new QueuePriorityManager(prisma);
  }

  /**
   * Get singleton instance
   */
  static getInstance(prisma: PrismaClient): QueueActivityMonitor {
    if (!QueueActivityMonitor.instance) {
      QueueActivityMonitor.instance = new QueueActivityMonitor(prisma);
    }
    return QueueActivityMonitor.instance;
  }

  /**
   * Start monitoring user activity and managing queue state
   */
  start(checkIntervalMs: number = 15000): void {
    if (this.isRunning) {
      console.log('🔄 QueueActivityMonitor already running');
      return;
    }

    console.log(
      `🚀 Starting QueueActivityMonitor (checking every ${checkIntervalMs / 1000}s)`
    );
    this.isRunning = true;
    this.startTime = new Date();
    this.lastCheckTime = new Date();

    this.monitorInterval = setInterval(async () => {
      try {
        await this.checkAndManageQueueState();
      } catch (error) {
        console.error('❌ Error in queue activity monitor:', error);
      }
    }, checkIntervalMs);
  }

  /**
   * Stop the activity monitor
   */
  stop(): void {
    if (this.monitorInterval) {
      clearInterval(this.monitorInterval);
      this.monitorInterval = null;
    }

    this.isRunning = false;
    console.log('⏹️ QueueActivityMonitor stopped');
  }

  /**
   * Check user activity and manage queue state accordingly
   */
  private async checkAndManageQueueState(): Promise<void> {
    const shouldPause = await this.priorityManager.shouldPauseBackgroundJobs();

    if (shouldPause && !this.backgroundJobsPaused) {
      await this.pauseBackgroundJobs();
    } else if (!shouldPause && this.backgroundJobsPaused) {
      await this.resumeBackgroundJobs();
    }

    // Log status every few minutes for debugging
    const timeSinceLastLog = Date.now() - this.lastCheckTime.getTime();
    if (timeSinceLastLog > 120000) {
      // 2 minutes
      await this.logQueueStatus();
      this.lastCheckTime = new Date();
    }
  }

  /**
   * Pause low-priority background jobs during high user activity
   */
  private async pauseBackgroundJobs(): Promise<void> {
    try {
      const queue = getMusicBrainzQueue();
      const metrics = await queue.getMetrics();

      // Get all waiting jobs and delay low-priority ones
      const waitingJobs = await queue.getQueue().getWaiting();
      const lowPriorityJobs = waitingJobs.filter(
        (job: any) => (job.opts.priority || 50) <= 30 // Low priority in BullMQ scale (1-100)
      );

      if (lowPriorityJobs.length > 0) {
        console.log(
          `⏸️ Pausing ${lowPriorityJobs.length} low-priority background jobs`
        );

        for (const job of lowPriorityJobs) {
          // Delay by 60 seconds to let user activity settle
          await job.moveToDelayed(Date.now() + 60000);
        }
      }

      this.backgroundJobsPaused = true;
      this.pauseResumeEventCount++;

      // Log activity summary
      console.log(
        `🔄 Queue paused - Active: ${metrics.stats.active}, Waiting: ${metrics.stats.waiting}, Delayed: ${metrics.stats.delayed}`
      );
    } catch (error) {
      console.error('❌ Failed to pause background jobs:', error);
    }
  }

  /**
   * Resume background jobs when user activity settles
   */
  private async resumeBackgroundJobs(): Promise<void> {
    try {
      const queue = getMusicBrainzQueue();

      // Get delayed jobs and promote low-priority background ones
      const delayedJobs = await queue.getQueue().getDelayed();
      const backgroundJobs = delayedJobs.filter(
        (job: any) =>
          (job.opts.priority || 50) <= 30 && // Low priority jobs
          (job.data.source === 'spotify_sync' || job.data.source === 'manual') // Background sources
      );

      if (backgroundJobs.length > 0) {
        console.log(`▶️ Resuming ${backgroundJobs.length} background jobs`);

        for (const job of backgroundJobs) {
          await job.promote();
        }
      }

      this.backgroundJobsPaused = false;
      this.pauseResumeEventCount++;

      const metrics = await queue.getMetrics();
      console.log(
        `🔄 Queue resumed - Active: ${metrics.stats.active}, Waiting: ${metrics.stats.waiting}, Delayed: ${metrics.stats.delayed}`
      );
    } catch (error) {
      console.error('❌ Failed to resume background jobs:', error);
    }
  }

  /**
   * Log current queue status for monitoring
   */
  private async logQueueStatus(): Promise<void> {
    try {
      const activeUserCount =
        (await this.priorityManager.shouldPauseBackgroundJobs())
          ? 'HIGH'
          : 'NORMAL';

      const queue = getMusicBrainzQueue();
      const metrics = await queue.getMetrics();

      // Build pretty formatted log
      const border = chalk.gray('─'.repeat(60));
      const activityColor = activeUserCount === 'HIGH' ? chalk.red : chalk.green;
      const pausedColor = this.backgroundJobsPaused ? chalk.yellow : chalk.green;

      console.log('\n' + border);
      console.log(chalk.bold.cyan('📊 Queue Activity Monitor Status'));
      console.log(border);

      console.log(chalk.bold('\n  Activity Level:'));
      console.log(`    ${activityColor(activeUserCount)}`);

      console.log(chalk.bold('\n  Background Jobs:'));
      console.log(`    ${pausedColor(this.backgroundJobsPaused ? '⏸️  PAUSED' : '▶️  RUNNING')}`);

      console.log(chalk.bold('\n  Queue Stats:'));
      console.log(`    ${chalk.blue('Active:')}    ${chalk.white(metrics.stats.active)}`);
      console.log(`    ${chalk.yellow('Waiting:')}   ${chalk.white(metrics.stats.waiting)}`);
      console.log(`    ${chalk.magenta('Delayed:')}   ${chalk.white(metrics.stats.delayed)}`);
      console.log(`    ${chalk.green('Completed:')} ${chalk.white(metrics.stats.completed)}`);
      console.log(`    ${chalk.red('Failed:')}    ${chalk.white(metrics.stats.failed)}`);

      console.log('\n' + border + '\n');
    } catch (error) {
      console.error('❌ Failed to log queue status:', error);
    }
  }

  /**
   * Get current monitor status
   */
  getStatus() {
    return {
      isRunning: this.isRunning,
      backgroundJobsPaused: this.backgroundJobsPaused,
      lastCheckTime: this.lastCheckTime,
      uptime: this.isRunning ? Date.now() - this.startTime.getTime() : 0,
      pauseResumeEvents: this.pauseResumeEventCount,
    };
  }

  /**
   * Get comprehensive activity-based queue metrics
   */
  async getActivityMetrics(): Promise<ActivityBasedQueueMetrics> {
    const queue = getMusicBrainzQueue();
    const metrics = await queue.getMetrics();

    // Get activity data
    const activeUserCount = await ActivityTracker.getActiveUserCount(
      this.prisma
    );
    const shouldPause = await this.priorityManager.shouldPauseBackgroundJobs();
    const recentAlbums = await ActivityTracker.getRecentlyActiveEntities(
      this.prisma,
      'album',
      10
    );
    const recentArtists = await ActivityTracker.getRecentlyActiveEntities(
      this.prisma,
      'artist',
      10
    );

    return {
      queueStats: {
        active: metrics.stats.active,
        waiting: metrics.stats.waiting,
        delayed: metrics.stats.delayed,
        completed: metrics.stats.completed,
        failed: metrics.stats.failed,
      },
      activityStats: {
        activeUserCount,
        shouldPauseBackground: shouldPause,
        backgroundJobsPaused: this.backgroundJobsPaused,
        recentlyActiveAlbums: recentAlbums,
        recentlyActiveArtists: recentArtists,
      },
      performance: {
        lastCheckTime: this.lastCheckTime,
        monitorUptime: this.isRunning
          ? Date.now() - this.startTime.getTime()
          : 0,
        pauseResumeEvents: this.pauseResumeEventCount,
      },
    };
  }

  /**
   * Force a check of queue state (useful for testing)
   */
  async forceCheck(): Promise<void> {
    await this.checkAndManageQueueState();
  }
}

/**
 * Initialize and start the queue activity monitor
 * Call this in your app startup (e.g., in worker or server initialization)
 */
export function startQueueActivityMonitor(
  prisma: PrismaClient,
  checkIntervalMs: number = 15000
): QueueActivityMonitor {
  const monitor = QueueActivityMonitor.getInstance(prisma);
  monitor.start(checkIntervalMs);
  return monitor;
}

/**
 * Get the singleton monitor instance
 */
export function getQueueActivityMonitor(
  prisma: PrismaClient
): QueueActivityMonitor {
  return QueueActivityMonitor.getInstance(prisma);
}
