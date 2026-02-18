// src/lib/queue/musicbrainz-queue.ts
import { Queue, Worker, Job } from 'bullmq';
import chalk from 'chalk';

import { createRedisConnection } from './redis';
import { getQueueConfig } from './config';
import {
  JOB_TYPES,
  type JobType,
  type MusicBrainzJobData,
  type MusicBrainzJobOptions,
  type JobResult,
  type MusicBrainzQueueMetrics,
  type QueueStats,
} from './jobs';

/**
 * MusicBrainz job queue with 1 request/second rate limiting
 * Ensures all MusicBrainz API calls respect rate limits across the entire application
 */
export class MusicBrainzQueue {
  private queue: Queue;
  private worker: Worker | null = null;
  private readonly queueName = 'musicbrainz';

  constructor() {
    const config = getQueueConfig();
    const redisConnection = createRedisConnection();

    // Create queue with rate limiting
    this.queue = new Queue(this.queueName, {
      connection: redisConnection,
      defaultJobOptions: {
        ...config.bullmq.defaultJobOptions,
        removeOnComplete: 100, // Keep last 100 completed jobs
        removeOnFail: 50, // Keep last 50 failed jobs for debugging
      },
    });

    // Set up error handling
    this.queue.on('error', error => {
      console.error('❌ MusicBrainz Queue Error:', error);
    });
  }

  // ============================================================================
  // Job Management
  // ============================================================================

  /**
   * Add a MusicBrainz job to the queue
   */
  async addJob<T extends MusicBrainzJobData>(
    type: JobType,
    data: T,
    options: MusicBrainzJobOptions = {}
  ): Promise<Job<T, JobResult>> {
    const jobOptions = {
      attempts: options.attempts || 3,
      backoff: options.backoff || {
        type: 'exponential' as const,
        delay: 2000,
      },
      priority: options.priority || 0,
      delay: options.delay || 0,
      removeOnComplete: options.removeOnComplete || 100, // Keep last 100 completed jobs
      removeOnFail: options.removeOnFail || 50, // Keep last 50 failed jobs
      ...options,
    };

    // Add request tracking
    const jobData = {
      ...data,
      requestId: options.requestId || this.generateRequestId(),
    } as T;

    const job = await this.queue.add(type, jobData, jobOptions);

    // Extract query/search parameters for display
    const jobDataAny = jobData as any;
    let queryInfo = '';
    if (jobDataAny.query) {
      queryInfo = `Query: "${jobDataAny.query}"`;
      if (jobDataAny.limit) queryInfo += ` • Limit: ${jobDataAny.limit}`;
      if (jobDataAny.offset) queryInfo += ` • Offset: ${jobDataAny.offset}`;
    } else if (jobDataAny.mbid) {
      queryInfo = `MBID: ${jobDataAny.mbid.substring(0, 8)}...`;
      if (jobDataAny.includes)
        queryInfo += ` • Includes: ${jobDataAny.includes.join(', ')}`;
    } else if (jobDataAny.artistMbid) {
      queryInfo = `Artist MBID: ${jobDataAny.artistMbid.substring(0, 8)}...`;
      if (jobDataAny.limit) queryInfo += ` • Limit: ${jobDataAny.limit}`;
    }

    // Color-coded queue logging (cyan borders for job queuing)
    const border = chalk.cyan('─'.repeat(60));
    console.log('\n' + border);
    console.log(
      `${chalk.bold.white('QUEUING JOB')} ${chalk.cyan('[QUEUE LAYER]')}`
    );
    console.log(border);
    console.log(`  ${chalk.cyan('Job ID:')}     ${chalk.white(job.id)}`);
    console.log(`  ${chalk.cyan('Type:')}       ${chalk.white(type)}`);
    console.log(
      `  ${chalk.cyan('Request ID:')} ${chalk.white(jobData.requestId)}`
    );
    console.log(
      `  ${chalk.cyan('Priority:')}   ${chalk.white(jobOptions.priority)}`
    );
    if (queryInfo) {
      console.log(`  ${chalk.cyan('Details:')}    ${chalk.white(queryInfo)}`);
    }
    console.log(border + '\n');

    return job;
  }

  /**
   * Create and start the worker with rate limiting
   */
  createWorker(
    processor: (job: Job<MusicBrainzJobData, JobResult>) => Promise<JobResult>
  ): Worker {
    if (this.worker) {
      throw new Error('Worker already exists. Call destroyWorker() first.');
    }

    const redisConnection = createRedisConnection();

    this.worker = new Worker(this.queueName, processor, {
      connection: redisConnection,

      // CRITICAL: Rate limiting to 1 request per second
      limiter: {
        max: 1, // Maximum 1 job
        duration: 1000, // per 1000ms (1 second)
      },

      // Concurrency settings
      concurrency: 1, // Process one job at a time

      // Error handling
      maxStalledCount: 3,
      stalledInterval: 30000, // 30 seconds
    });

    // Worker event handlers
    this.worker.on('ready', () => {
      console.log('✅ MusicBrainz Worker ready (Rate limited: 1 req/sec)');
    });

    this.worker.on('active', job => {
      // Extract query info for active job
      const jobData = job.data as any;
      let queryInfo = '';
      if (jobData.query) {
        queryInfo = ` • Query: "${jobData.query}"`;
      } else if (jobData.mbid) {
        queryInfo = ` • MBID: ${jobData.mbid.substring(0, 8)}...`;
      } else if (jobData.artistMbid) {
        queryInfo = ` • Artist MBID: ${jobData.artistMbid.substring(0, 8)}...`;
      }

      console.log(
        `🔄 [Queue] Processing ${job.name} (ID: ${job.id})${queryInfo}`
      );
    });

    this.worker.on('completed', (job, result) => {
      const duration = Date.now() - job.processedOn!;
      const resultCount = result?.data
        ? Array.isArray(result.data)
          ? result.data.length
          : 1
        : 0;

      console.log(
        `✅ Completed ${job.name} (ID: ${job.id}) in ${duration}ms • Results: ${resultCount}`
      );
    });

    this.worker.on('failed', (job, error) => {
      // Extract query info for failed job
      const jobData = job?.data as any;
      let queryInfo = '';
      if (jobData?.query) {
        queryInfo = ` • Query: "${jobData.query}"`;
      } else if (jobData?.mbid) {
        queryInfo = ` • MBID: ${jobData.mbid.substring(0, 8)}...`;
      }

      console.error(
        `❌ Failed ${job?.name} (ID: ${job?.id})${queryInfo}:`,
        error.message
      );
    });

    this.worker.on('stalled', jobId => {
      console.warn(`⚠️ Job ${jobId} stalled`);
    });

    this.worker.on('error', error => {
      console.error('❌ MusicBrainz Worker Error:', error);
    });

    return this.worker;
  }

  // ============================================================================
  // Queue Operations
  // ============================================================================

  /**
   * Get queue statistics
   */
  async getStats(): Promise<QueueStats> {
    const waiting = await this.queue.getWaiting();
    const active = await this.queue.getActive();
    const completed = await this.queue.getCompleted();
    const failed = await this.queue.getFailed();
    const delayed = await this.queue.getDelayed();

    return {
      waiting: waiting.length,
      active: active.length,
      completed: completed.length,
      failed: failed.length,
      delayed: delayed.length,
      paused: (await this.queue.isPaused()) ? 1 : 0,
    };
  }

  /**
   * Get comprehensive queue metrics
   */
  async getMetrics(): Promise<MusicBrainzQueueMetrics> {
    const stats = await this.getStats();
    const completed = await this.queue.getCompleted(0, 0); // Get most recent completed job

    let lastJobProcessed = undefined;
    if (completed.length > 0) {
      const lastJob = completed[0];
      lastJobProcessed = {
        type: lastJob.name as JobType,
        timestamp: new Date(lastJob.finishedOn || Date.now()),
        duration: (lastJob.finishedOn || 0) - (lastJob.processedOn || 0),
        success: lastJob.returnvalue?.success || false,
      };
    }

    return {
      stats,
      rateLimitInfo: {
        maxRequestsPerSecond: 1,
        currentWindowRequests: stats.active,
        windowResetTime: new Date(Date.now() + 1000), // Next second
      },
      lastJobProcessed,
    };
  }

  /**
   * Pause the queue
   */
  async pause(): Promise<void> {
    await this.queue.pause();
    console.log('⏸️ MusicBrainz queue paused');
  }

  /**
   * Resume the queue
   */
  async resume(): Promise<void> {
    await this.queue.resume();
    console.log('▶️ MusicBrainz queue resumed');
  }

  /**
   * Clean up completed and failed jobs
   */
  async cleanup(olderThan: number = 24 * 60 * 60 * 1000): Promise<void> {
    const cutoff = Date.now() - olderThan;

    await this.queue.clean(cutoff, 100, 'completed');
    await this.queue.clean(cutoff, 50, 'failed');

    console.log(
      `🧹 Cleaned up MusicBrainz queue jobs older than ${olderThan}ms`
    );
  }

  // ============================================================================
  // Lifecycle Management
  // ============================================================================

  /**
   * Gracefully close the queue and worker
   */
  async close(): Promise<void> {
    if (this.worker) {
      await this.worker.close();
      this.worker = null;
      console.log('✅ MusicBrainz worker closed');
    }

    await this.queue.close();
    console.log('✅ MusicBrainz queue closed');
  }

  /**
   * Destroy the worker (but keep queue)
   */
  async destroyWorker(): Promise<void> {
    if (this.worker) {
      try {
        await this.worker.close();
      } catch {
        // Worker may already be dead from connection loss — that's fine
      }
      this.worker = null;
      console.log('✅ MusicBrainz worker destroyed');
    }
  }

  // ============================================================================
  // Utility Methods
  // ============================================================================

  /**
   * Generate unique request ID for tracking
   */
  private generateRequestId(): string {
    return `mb_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get the underlying BullMQ queue instance
   */
  getQueue(): Queue {
    return this.queue;
  }

  /**
   * Get the underlying BullMQ worker instance
   */
  getWorker(): Worker | null {
    return this.worker;
  }
}

// ============================================================================
// Singleton Instance
// ============================================================================

let musicbrainzQueueInstance: MusicBrainzQueue | null = null;

/**
 * Get the singleton MusicBrainz queue instance
 */
export function getMusicBrainzQueue(): MusicBrainzQueue {
  if (!musicbrainzQueueInstance) {
    musicbrainzQueueInstance = new MusicBrainzQueue();
  }
  return musicbrainzQueueInstance;
}

/**
 * Destroy the singleton instance (useful for testing)
 */
export async function destroyMusicBrainzQueue(): Promise<void> {
  if (musicbrainzQueueInstance) {
    await musicbrainzQueueInstance.close();
    musicbrainzQueueInstance = null;
  }
}
