// src/lib/queue/musicbrainz-queue.ts
import { Queue, QueueEvents, Worker, Job } from 'bullmq';

import { createRedisConnection } from './redis';
import { queueLogger } from '@/lib/logger';
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
  private queueEvents: QueueEvents | null = null;
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
      queueLogger.error({ error: error instanceof Error ? error.message : String(error) }, 'MusicBrainz queue error');
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

    // Structured queue logging
    if (!options.silent) {
      queueLogger.info(
        {
          jobId: job.id,
          type,
          requestId: 'requestId' in jobData ? jobData.requestId : undefined,
          priority: jobOptions.priority,
          details: queryInfo || undefined,
        },
        'Job queued'
      );
    }

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
      // Ready status logged by the worker service banner
    });

    this.worker.on('active', job => {
      const jobData = job.data as Record<string, unknown>;
      const queryInfo = jobData.query
        ? `Query: "${jobData.query}"`
        : jobData.mbid
          ? `MBID: ${String(jobData.mbid).substring(0, 8)}...`
          : jobData.artistMbid
            ? `Artist MBID: ${String(jobData.artistMbid).substring(0, 8)}...`
            : undefined;

      queueLogger.info(
        { jobId: job.id, jobName: job.name, details: queryInfo },
        'Processing job'
      );
    });

    this.worker.on('completed', (job, result) => {
      const duration = Date.now() - job.processedOn!;
      const resultCount = result?.data
        ? Array.isArray(result.data)
          ? result.data.length
          : 1
        : 0;

      queueLogger.info(
        { jobId: job.id, jobName: job.name, duration, resultCount },
        'Job completed'
      );
    });

    this.worker.on('failed', (job, error) => {
      const jobData = job?.data as Record<string, unknown> | undefined;
      const queryInfo = jobData?.query
        ? `Query: "${jobData.query}"`
        : jobData?.mbid
          ? `MBID: ${String(jobData.mbid).substring(0, 8)}...`
          : undefined;

      queueLogger.error(
        { jobId: job?.id, jobName: job?.name, details: queryInfo, error: error.message },
        'Job failed'
      );
    });

    this.worker.on('stalled', jobId => {
      queueLogger.warn({ jobId }, 'Job stalled');
    });

    this.worker.on('error', error => {
      queueLogger.error({ error: error instanceof Error ? error.message : String(error) }, 'MusicBrainz worker error');
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
    // BullMQ v5+: jobs with priority > 0 are in "prioritized" state,
    // not "waiting". We need to count both for accurate stats.
    const [waiting, active, completed, failed, delayed, prioritized, paused] =
      await Promise.all([
        this.queue.getWaiting(),
        this.queue.getActive(),
        this.queue.getCompleted(),
        this.queue.getFailed(),
        this.queue.getDelayed(),
        this.queue.getJobCountByTypes('prioritized'),
        this.queue.isPaused(),
      ]);

    return {
      waiting: waiting.length + prioritized,
      active: active.length,
      completed: completed.length,
      failed: failed.length,
      delayed: delayed.length,
      paused: paused ? 1 : 0,
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
    queueLogger.info('MusicBrainz queue paused');
  }

  /**
   * Resume the queue
   */
  async resume(): Promise<void> {
    await this.queue.resume();
    queueLogger.info('MusicBrainz queue resumed');
  }

  /**
   * Clean up completed and failed jobs
   */
  async cleanup(olderThan: number = 24 * 60 * 60 * 1000): Promise<void> {
    const cutoff = Date.now() - olderThan;

    await this.queue.clean(cutoff, 100, 'completed');
    await this.queue.clean(cutoff, 50, 'failed');

    queueLogger.info({ olderThanMs: olderThan }, 'Cleaned up MusicBrainz queue jobs');
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
      queueLogger.info('MusicBrainz worker closed');
    }

    if (this.queueEvents) {
      await this.queueEvents.close();
      this.queueEvents = null;
    }

    await this.queue.close();
    queueLogger.info('MusicBrainz queue closed');
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
      queueLogger.info('MusicBrainz worker destroyed');
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

  /**
   * Get QueueEvents instance (lazy, singleton per queue).
   * Required by BullMQ's job.waitUntilFinished() to track job completion via Redis pub/sub.
   */
  getQueueEvents(): QueueEvents {
    if (!this.queueEvents) {
      this.queueEvents = new QueueEvents(this.queueName, {
        connection: createRedisConnection(),
      });
    }
    return this.queueEvents;
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
