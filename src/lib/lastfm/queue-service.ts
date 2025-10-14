// src/lib/lastfm/queue-service.ts
/**
 * Queue-integrated Last.fm service with rate limiting (5 req/sec)
 * Follows the same pattern as MusicBrainz queue service
 */

import { Queue, Worker, QueueEvents } from 'bullmq';
import chalk from 'chalk';

import { createRedisConnection } from '../queue/redis';

import {
  searchLastFmArtists,
  getLastFmArtistInfo,
  type LastFmSearchResult,
} from './search';

const QUEUE_NAME = 'lastfm';
const RATE_LIMIT_DELAY = 200; // 200ms between jobs = 5 req/sec

/**
 * Format listener count for display (e.g. 896000 -> "896K")
 */
function formatListeners(listeners: string | number): string {
  const num =
    typeof listeners === 'string' ? parseInt(listeners, 10) : listeners;
  if (isNaN(num)) return String(listeners);
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(0)}K`;
  return String(num);
}

export type LastFmJobType = 'search-artists' | 'get-artist-info';

export interface LastFmJobData {
  type: LastFmJobType;
  query: string;
  requestId?: string;
}

export interface LastFmJobResult {
  success: boolean;
  data?: LastFmSearchResult[] | LastFmSearchResult | null;
  error?: string;
}

/**
 * Last.fm service with automatic job queue integration
 * All API calls are routed through the queue to ensure 5 req/sec rate limiting
 */
export class QueuedLastFmService {
  private queue: Queue;
  private worker: Worker | null = null;
  private queueEvents: QueueEvents | null = null;
  private pendingJobs = new Map<
    string,
    { resolve: (value: unknown) => void; reject: (reason?: unknown) => void }
  >();

  constructor() {
    const redisConnection = createRedisConnection();

    // Create queue with rate limiting: 5 req/sec = 200ms delay between jobs
    this.queue = new Queue(QUEUE_NAME, {
      connection: redisConnection,
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 1000,
        },
        removeOnComplete: 100,
        removeOnFail: 50,
      },
    });

    this.queue.on('error', error => {
      console.error('❌ Last.fm Queue Error:', error);
    });
  }

  /**
   * Lazy initialization - only set up connections when actually needed
   */
  private ensureInitialized() {
    if (!this.queueEvents) {
      this.queueEvents = new QueueEvents(QUEUE_NAME, {
        connection: createRedisConnection(),
      });
      this.setupEventListeners();
      this.ensureWorkerRunning();
    }
  }

  /**
   * Set up event listeners for job completion/failure
   */
  private setupEventListeners(): void {
    if (!this.queueEvents) return;

    this.queueEvents.on('completed', ({ jobId, returnvalue }) => {
      const result = returnvalue as unknown as LastFmJobResult | undefined;

      // Extract result info for display
      const resultCount = result?.data
        ? Array.isArray(result.data)
          ? result.data.length
          : 1
        : 0;
      const success = result?.success ?? false;

      // Try to get a preview of the results
      let resultPreview = '';
      if (
        result?.data &&
        Array.isArray(result.data) &&
        result.data.length > 0
      ) {
        const first = result.data[0];
        const preview = first.name
          ? `${first.name}${first.listeners ? ` (${formatListeners(first.listeners)} listeners)` : ''}`
          : first.mbid || '';
        if (preview) {
          resultPreview =
            result.data.length > 1
              ? `"${preview}" + ${result.data.length - 1} more`
              : `"${preview}"`;
        }
      } else if (result?.data && !Array.isArray(result.data)) {
        const preview = result.data.name
          ? `${result.data.name}${result.data.listeners ? ` (${formatListeners(result.data.listeners)} listeners)` : ''}`
          : '';
        if (preview) resultPreview = `"${preview}"`;
      }

      // Green borders for job completion events
      const border = chalk.green('─'.repeat(60));
      console.log('\n' + border);
      console.log(
        `${chalk.bold.green('✅ JOB COMPLETED')} ${chalk.green('[QUEUE EVENTS LAYER]')}`
      );
      console.log(border);
      console.log(`  ${chalk.green('Job ID:')}     ${chalk.white(jobId)}`);
      console.log(
        `  ${chalk.green('Success:')}    ${success ? chalk.green('Yes') : chalk.red('No')}`
      );
      console.log(
        `  ${chalk.green('Results:')}    ${chalk.white(resultCount)}`
      );
      if (resultPreview) {
        console.log(
          `  ${chalk.green('Preview:')}    ${chalk.cyan(resultPreview)}`
        );
      }
      console.log(border + '\n');

      const pending = this.pendingJobs.get(jobId);
      if (pending) {
        console.log(chalk.green(`✅ Resolving pending job ${jobId}`));
        pending.resolve(result);
        this.pendingJobs.delete(jobId);
      } else {
        console.log(
          chalk.yellow(`⚠️ No pending promise found for job ${jobId}`)
        );
      }
    });

    this.queueEvents.on('failed', ({ jobId, failedReason }) => {
      // Red borders for job failure events
      const border = chalk.red('─'.repeat(60));
      console.log('\n' + border);
      console.log(
        `${chalk.bold.red('❌ JOB FAILED')} ${chalk.red('[QUEUE EVENTS LAYER]')}`
      );
      console.log(border);
      console.log(`  ${chalk.red('Job ID:')} ${chalk.white(jobId)}`);
      console.log(`  ${chalk.red('Reason:')} ${chalk.white(failedReason)}`);
      console.log(border + '\n');

      const pending = this.pendingJobs.get(jobId);
      if (pending) {
        console.log(chalk.red(`❌ Rejecting pending job ${jobId}`));
        pending.reject(new Error(failedReason));
        this.pendingJobs.delete(jobId);
      } else {
        console.log(
          chalk.yellow(`⚠️ No pending promise found for failed job ${jobId}`)
        );
      }
    });
  }

  /**
   * Ensure worker is running to process jobs
   */
  private ensureWorkerRunning() {
    if (this.worker) return;

    this.worker = new Worker(
      QUEUE_NAME,
      async job => {
        const { type, query } = job.data;

        try {
          let data: LastFmSearchResult[] | LastFmSearchResult | null;

          if (type === 'search-artists') {
            data = await searchLastFmArtists(query);
          } else if (type === 'get-artist-info') {
            data = await getLastFmArtistInfo(query);
          } else {
            throw new Error(`Unknown job type: ${type}`);
          }

          return {
            success: true,
            data,
          };
        } catch (error: unknown) {
          const errorMessage =
            error instanceof Error ? error.message : 'Unknown error';
          console.error(
            `❌ [Last.fm Worker] Job ${job.id} failed:`,
            errorMessage
          );

          return {
            success: false,
            error: errorMessage,
          };
        }
      },
      {
        connection: createRedisConnection(),
        limiter: {
          max: 4, // Max 4 jobs per second (conservative, below 5 limit)
          duration: 1000, // Per 1 second
        },
        concurrency: 1, // Process one job at a time
      }
    );

    // Blue borders for job processing start
    this.worker.on('active', job => {
      const jobData = job.data as LastFmJobData;
      const queryInfo = jobData.query ? `Query: "${jobData.query}"` : null;

      const border = chalk.blue('─'.repeat(50));

      console.log('\n' + border);
      console.log(
        `${chalk.bold.white('PROCESSING')} ${chalk.blue('[WORKER LAYER]')}`
      );
      console.log(border);
      console.log(`  ${chalk.cyan('Job:')}      ${chalk.white(job.name)}`);
      console.log(`  ${chalk.cyan('ID:')}       ${chalk.white(`#${job.id}`)}`);
      if (queryInfo) {
        console.log(`  ${chalk.cyan('Details:')}  ${chalk.white(queryInfo)}`);
      }
      console.log(border + '\n');
    });

    // Green borders for job completion
    this.worker.on('completed', (job, result: LastFmJobResult) => {
      const jobData = job.data as LastFmJobData;
      const duration = Date.now() - (job.processedOn ?? Date.now());
      const resultCount = result?.data
        ? Array.isArray(result.data)
          ? result.data.length
          : 1
        : 0;

      // Extract job details
      let jobInfo = job.name;
      if (jobData.query) {
        jobInfo = `${job.name} • Query: "${jobData.query}"`;
      }

      const border = chalk.green('─'.repeat(50));

      console.log('\n' + border);
      console.log(
        `${chalk.bold.green('COMPLETED')} ${chalk.green('[WORKER LAYER]')}`
      );
      console.log(border);
      console.log(`  ${chalk.cyan('Job ID:')}   ${chalk.white(job.id)}`);
      console.log(`  ${chalk.cyan('Job:')}      ${chalk.white(jobInfo)}`);
      console.log(
        `  ${chalk.cyan('Duration:')} ${chalk.white(`${duration}ms`)}`
      );
      console.log(`  ${chalk.cyan('Results:')}  ${chalk.white(resultCount)}`);
      console.log(border + '\n');
    });

    // Red borders for job failure
    this.worker.on('failed', (job, err) => {
      const jobData = job?.data as LastFmJobData | undefined;

      // Extract job details
      let jobInfo = job?.name || 'Unknown';
      if (jobData?.query && job) {
        jobInfo = `${job.name} • Query: "${jobData.query}"`;
      }

      const border = chalk.red('─'.repeat(50));

      console.log('\n' + border);
      console.log(`${chalk.bold.red('FAILED')} ${chalk.red('[WORKER LAYER]')}`);
      console.log(border);
      console.log(
        `  ${chalk.cyan('Job ID:')} ${chalk.white(job?.id || 'Unknown')}`
      );
      console.log(`  ${chalk.cyan('Job:')}    ${chalk.white(jobInfo)}`);
      console.log(`  ${chalk.cyan('Error:')}  ${chalk.red(err.message)}`);
      console.log(border + '\n');
    });

    this.worker.on('error', err => {
      console.error('🚨 Last.fm Worker error:', err.message);
    });
  }

  /**
   * Search for artists using the queue
   */
  async searchArtists(query: string): Promise<LastFmSearchResult[]> {
    this.ensureInitialized();

    const job = await this.queue.add(
      'search-artists',
      {
        type: 'search-artists',
        query,
      },
      {
        delay: RATE_LIMIT_DELAY,
      }
    );

    return new Promise((resolve, reject) => {
      this.pendingJobs.set(job.id!, { resolve, reject });

      // Timeout after 10 seconds
      setTimeout(() => {
        if (this.pendingJobs.has(job.id!)) {
          this.pendingJobs.delete(job.id!);
          reject(new Error('Last.fm job timeout'));
        }
      }, 10000);
    }).then((result: unknown) => {
      const typedResult = result as LastFmJobResult;
      if (typedResult.success && Array.isArray(typedResult.data)) {
        return typedResult.data;
      }
      return [];
    });
  }

  /**
   * Get artist info using the queue
   */
  async getArtistInfo(artistName: string): Promise<LastFmSearchResult | null> {
    this.ensureInitialized();

    const job = await this.queue.add(
      'get-artist-info',
      {
        type: 'get-artist-info',
        query: artistName,
      },
      {
        delay: RATE_LIMIT_DELAY,
      }
    );

    return new Promise((resolve, reject) => {
      this.pendingJobs.set(job.id!, { resolve, reject });

      // Timeout after 10 seconds
      setTimeout(() => {
        if (this.pendingJobs.has(job.id!)) {
          this.pendingJobs.delete(job.id!);
          reject(new Error('Last.fm job timeout'));
        }
      }, 10000);
    }).then((result: unknown) => {
      const typedResult = result as LastFmJobResult;
      if (
        typedResult.success &&
        typedResult.data &&
        !Array.isArray(typedResult.data)
      ) {
        return typedResult.data;
      }
      return null;
    });
  }

  /**
   * Clean up resources
   */
  async close() {
    await this.worker?.close();
    await this.queueEvents?.close();
    await this.queue.close();
  }
}

// Singleton instance
let queuedLastFmService: QueuedLastFmService | null = null;

export function getQueuedLastFmService(): QueuedLastFmService {
  if (!queuedLastFmService) {
    queuedLastFmService = new QueuedLastFmService();
  }
  return queuedLastFmService;
}

export async function destroyQueuedLastFmService() {
  if (queuedLastFmService) {
    await queuedLastFmService.close();
    queuedLastFmService = null;
  }
}
