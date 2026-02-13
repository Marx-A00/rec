// src/lib/musicbrainz/queue-service.ts
/**
 * Queue-integrated MusicBrainz service
 * Maintains the same interface as the original service but uses BullMQ for rate limiting
 */

import { QueueEvents, Worker } from 'bullmq';
import chalk from 'chalk';

import {
  getMusicBrainzQueue,
  processMusicBrainzJob,
  JOB_TYPES,
  PRIORITY_TIERS,
  type PriorityTier,
} from '../queue';
import { createRedisConnection } from '../queue/redis';

import type {
  ArtistSearchResult,
  ReleaseGroupSearchResult,
  RecordingSearchResult,
} from './basic-service';

/**
 * Queue position information for a specific job
 * Used to show "Your request is #3 in queue" in UI
 */
export interface QueuePositionInfo {
  position: number;
  waitingCount: number;
  activeCount: number;
  estimatedWaitMs: number;
}

/**
 * Queue summary broken down by priority tier
 * Used for admin dashboard monitoring
 */
export interface QueueSummary {
  byPriority: Record<number, number>;
  total: number;
  oldestJobAge: number | null;
}

/**
 * MusicBrainz service with automatic job queue integration
 * All API calls are routed through the queue to ensure 1 req/sec rate limiting
 */
export class QueuedMusicBrainzService {
  private queue = getMusicBrainzQueue();
  private worker: Worker | null = null;
  private isWorkerRunning = false;

  // QueueEvents listener for job completion tracking
  private queueEvents: QueueEvents | null = null;
  private pendingJobs = new Map<
    string,
    { resolve: (value: unknown) => void; reject: (reason?: unknown) => void }
  >();

  constructor() {
    // Don't auto-start everything in constructor - wait for first use
    // This reduces memory usage when service is imported but not used
  }

  /**
   * Lazy initialization - only set up connections when actually needed
   */
  private ensureInitialized() {
    if (!this.queueEvents) {
      // Set up the events listener with explicit connection (fixes deprecation warning)
      this.queueEvents = new QueueEvents('musicbrainz', {
        connection: createRedisConnection(),
      });
      this.setupEventListeners();

      // Start the worker when first needed
      this.ensureWorkerRunning();
    }
  }

  // ============================================================================
  // Event Listener Setup
  // ============================================================================

  /**
   * Set up QueueEvents listeners to catch job completions
   * This is what connects the queue results back to our service
   */
  private setupEventListeners(): void {
    console.log('Setting up QueueEvents listeners...');

    if (!this.queueEvents) return;
    this.queueEvents.on('completed', ({ jobId, returnvalue }) => {
      // Parse returnvalue (BullMQ returns it as string)
      const result =
        typeof returnvalue === 'string' ? JSON.parse(returnvalue) : returnvalue;

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
        const preview = first.name || first.title || first.id || '';
        if (preview) {
          resultPreview =
            result.data.length > 1
              ? '"' + preview + '" + ' + (result.data.length - 1) + ' more'
              : '"' + preview + '"';
        }
      } else if (result?.data && !Array.isArray(result.data)) {
        const preview = result.data.name || result.data.title || '';
        if (preview) resultPreview = '"' + preview + '"';
      }

      // Green borders for job completion events
      const border = chalk.green('-'.repeat(60));
      console.log('\n' + border);
      console.log(
        chalk.bold.green('JOB COMPLETED') +
          ' ' +
          chalk.green('[QUEUE EVENTS LAYER]')
      );
      console.log(border);
      console.log('  ' + chalk.green('Job ID:') + '     ' + chalk.white(jobId));
      console.log(
        '  ' +
          chalk.green('Success:') +
          '    ' +
          (success ? chalk.green('Yes') : chalk.red('No'))
      );
      console.log(
        '  ' +
          chalk.green('Results:') +
          '    ' +
          chalk.white(String(resultCount))
      );
      if (resultPreview) {
        console.log(
          '  ' + chalk.green('Preview:') + '    ' + chalk.cyan(resultPreview)
        );
      }
      console.log(border + '\n');

      const pending = this.pendingJobs.get(jobId);
      if (pending) {
        console.log(chalk.green('Resolving pending job ' + jobId));
        pending.resolve(result);
        this.pendingJobs.delete(jobId);
      }
      // Note: Enrichment jobs don't register pending promises (they're fire-and-forget background jobs)
      // So no warning needed when there's no pending promise for those jobs
    });

    this.queueEvents.on('failed', ({ jobId, failedReason }) => {
      // Red borders for job failure events
      const border = chalk.red('-'.repeat(60));
      console.log('\n' + border);
      console.log(
        chalk.bold.red('JOB FAILED') + ' ' + chalk.red('[QUEUE EVENTS LAYER]')
      );
      console.log(border);
      console.log('  ' + chalk.red('Job ID:') + ' ' + chalk.white(jobId));
      console.log(
        '  ' + chalk.red('Reason:') + ' ' + chalk.white(failedReason)
      );
      console.log(border + '\n');

      const pending = this.pendingJobs.get(jobId);
      if (pending) {
        console.log(chalk.red('Rejecting pending job ' + jobId));
        pending.reject(new Error(failedReason));
        this.pendingJobs.delete(jobId);
      } else {
        console.log(
          chalk.yellow('No pending promise found for failed job ' + jobId)
        );
      }
    });

    this.queueEvents.on('error', error => {
      console.error('QueueEvents error:', error);
    });
  }

  // ============================================================================
  // Public API Methods (Same interface as original service)
  // ============================================================================

  /**
   * Search for artists by name
   * Uses job queue to respect rate limits
   * @param priorityTier - Optional priority tier (defaults to USER)
   */
  async searchArtists(
    query: string,
    limit = 25,
    offset = 0,
    priorityTier: PriorityTier = PRIORITY_TIERS.USER
  ): Promise<ArtistSearchResult[]> {
    this.ensureInitialized();
    await this.ensureWorkerRunning();

    try {
      const job = await this.queue.addJob(
        JOB_TYPES.MUSICBRAINZ_SEARCH_ARTISTS,
        { query, limit, offset },
        {
          priority: priorityTier,
          requestId: 'search-artists-' + Date.now(),
        }
      );

      // Use QueueEvents to wait for completion (the proper way!)
      const result = await this.waitForJobViaEvents(job.id!);

      if (!result.success) {
        throw new Error(result.error?.message || 'Search failed');
      }

      return (result.data as ArtistSearchResult[]) || [];
    } catch (error) {
      console.error('Queued MusicBrainz artist search error:', error);
      throw new Error(
        'Failed to search artists: ' +
          (error instanceof Error ? error.message : 'Unknown error')
      );
    }
  }

  /**
   * Search for release groups (albums) by name
   * @param priorityTier - Optional priority tier (defaults to USER)
   */
  async searchReleaseGroups(
    query: string,
    limit = 25,
    offset = 0,
    priorityTier: PriorityTier = PRIORITY_TIERS.USER
  ): Promise<ReleaseGroupSearchResult[]> {
    this.ensureInitialized();
    await this.ensureWorkerRunning();

    try {
      const job = await this.queue.addJob(
        JOB_TYPES.MUSICBRAINZ_SEARCH_RELEASES,
        { query, limit, offset },
        {
          priority: priorityTier,
          requestId: 'search-releases-' + Date.now(),
        }
      );

      const result = await this.waitForJobViaEvents(job.id!);

      if (!result.success) {
        throw new Error(result.error?.message || 'Search failed');
      }

      return (result.data as ReleaseGroupSearchResult[]) || [];
    } catch (error) {
      console.error('Queued MusicBrainz release search error:', error);
      throw new Error(
        'Failed to search releases: ' +
          (error instanceof Error ? error.message : 'Unknown error')
      );
    }
  }

  /**
   * Search for recordings by name
   * @param priorityTier - Optional priority tier (defaults to USER)
   */
  async searchRecordings(
    query: string,
    limit = 25,
    offset = 0,
    priorityTier: PriorityTier = PRIORITY_TIERS.USER
  ): Promise<RecordingSearchResult[]> {
    this.ensureInitialized();
    await this.ensureWorkerRunning();

    try {
      const job = await this.queue.addJob(
        JOB_TYPES.MUSICBRAINZ_SEARCH_RECORDINGS,
        { query, limit, offset },
        {
          priority: priorityTier,
          requestId: 'search-recordings-' + Date.now(),
        }
      );

      const result = await this.waitForJobViaEvents(job.id!);

      if (!result.success) {
        console.warn(
          'MusicBrainz recording search failed:',
          result.error?.message
        );
        return []; // Return empty array instead of throwing - allow search to continue
      }

      return (result.data as RecordingSearchResult[]) || [];
    } catch (error) {
      console.error('Queued MusicBrainz recording search error:', error);
      // Return empty array instead of throwing - allow search to continue with other sources
      return [];
    }
  }

  /**
   * Get artist by MBID
   * @param priorityTier - Optional priority tier (defaults to USER)
   */
  async getArtist(
    mbid: string,
    includes?: string[],
    priorityTier: PriorityTier = PRIORITY_TIERS.USER
  ): Promise<any> {
    this.ensureInitialized();
    await this.ensureWorkerRunning();

    try {
      const job = await this.queue.addJob(
        JOB_TYPES.MUSICBRAINZ_LOOKUP_ARTIST,
        { mbid, includes },
        {
          priority: priorityTier,
          requestId: 'lookup-artist-' + Date.now(),
        }
      );

      const result = await this.waitForJobViaEvents(job.id!);

      if (!result.success) {
        throw new Error(result.error?.message || 'Lookup failed');
      }

      return result.data;
    } catch (error) {
      console.error('Queued MusicBrainz artist lookup error:', error);
      throw new Error(
        'Failed to lookup artist: ' +
          (error instanceof Error ? error.message : 'Unknown error')
      );
    }
  }

  /**
   * Get release by MBID
   * @param priorityTier - Optional priority tier (defaults to USER)
   */
  async getRelease(
    mbid: string,
    includes?: string[],
    priorityTier: PriorityTier = PRIORITY_TIERS.USER
  ): Promise<any> {
    this.ensureInitialized();
    await this.ensureWorkerRunning();

    try {
      const job = await this.queue.addJob(
        JOB_TYPES.MUSICBRAINZ_LOOKUP_RELEASE,
        { mbid, includes },
        {
          priority: priorityTier,
          requestId: 'lookup-release-' + Date.now(),
        }
      );

      const result = await this.waitForJobViaEvents(job.id!);

      if (!result.success) {
        throw new Error(result.error?.message || 'Lookup failed');
      }

      return result.data;
    } catch (error) {
      console.error('Queued MusicBrainz release lookup error:', error);
      throw new Error(
        'Failed to lookup release: ' +
          (error instanceof Error ? error.message : 'Unknown error')
      );
    }
  }

  /**
   * Get release group by MBID
   * @param priorityTier - Optional priority tier (defaults to USER)
   */
  async getReleaseGroup(
    mbid: string,
    includes?: string[],
    priorityTier: PriorityTier = PRIORITY_TIERS.USER
  ): Promise<any> {
    this.ensureInitialized();
    await this.ensureWorkerRunning();

    try {
      const job = await this.queue.addJob(
        JOB_TYPES.MUSICBRAINZ_LOOKUP_RELEASE_GROUP,
        { mbid, includes },
        {
          priority: priorityTier,
          requestId: 'lookup-release-group-' + Date.now(),
        }
      );

      const result = await this.waitForJobViaEvents(job.id!);

      if (!result.success) {
        throw new Error(result.error?.message || 'Lookup failed');
      }

      return result.data;
    } catch (error) {
      console.error('Queued MusicBrainz release group lookup error:', error);
      throw new Error(
        'Failed to lookup release group: ' +
          (error instanceof Error ? error.message : 'Unknown error')
      );
    }
  }

  /**
   * Browse release groups by artist MBID
   * @param priorityTier - Optional priority tier (defaults to USER)
   */
  async browseReleaseGroupsByArtist(
    artistMbid: string,
    limit = 100,
    offset = 0,
    priorityTier: PriorityTier = PRIORITY_TIERS.USER
  ): Promise<any> {
    this.ensureInitialized();
    await this.ensureWorkerRunning();

    try {
      const job = await this.queue.addJob(
        JOB_TYPES.MUSICBRAINZ_BROWSE_RELEASE_GROUPS_BY_ARTIST,
        { artistMbid, limit, offset },
        {
          priority: priorityTier,
          requestId: 'browse-rg-by-artist-' + Date.now(),
        }
      );

      const result = await this.waitForJobViaEvents(job.id!);
      if (!result.success) {
        throw new Error(result.error?.message || 'Browse failed');
      }
      try {
        const data = result.data as Record<string, unknown> | undefined;
        const releaseGroups = data?.['release-groups'];
        const count = Array.isArray(releaseGroups)
          ? releaseGroups.length
          : (data?.count ?? 'unknown');
        console.log('MB browse RG by artist ' + artistMbid + ': got ' + count);
      } catch {
        // Ignore logging errors
      }
      return result.data;
    } catch (error) {
      console.error(
        'Queued MusicBrainz browse release-groups by artist error:',
        error
      );
      throw new Error(
        'Failed to browse release groups: ' +
          (error instanceof Error ? error.message : 'Unknown error')
      );
    }
  }

  /**
   * Get recording by MBID
   * @param priorityTier - Optional priority tier (defaults to USER)
   */
  async getRecording(
    mbid: string,
    includes?: string[],
    priorityTier: PriorityTier = PRIORITY_TIERS.USER
  ): Promise<any> {
    this.ensureInitialized();
    await this.ensureWorkerRunning();

    try {
      const job = await this.queue.addJob(
        JOB_TYPES.MUSICBRAINZ_LOOKUP_RECORDING,
        { mbid, includes },
        {
          priority: priorityTier,
          requestId: 'lookup-recording-' + Date.now(),
        }
      );

      const result = await this.waitForJobViaEvents(job.id!);

      if (!result.success) {
        throw new Error(result.error?.message || 'Lookup failed');
      }

      return result.data;
    } catch (error) {
      console.error('Queued MusicBrainz recording lookup error:', error);
      throw new Error(
        'Failed to lookup recording: ' +
          (error instanceof Error ? error.message : 'Unknown error')
      );
    }
  }

  // ============================================================================
  // Queue Management Methods
  // ============================================================================

  /**
   * Get queue statistics and metrics
   */
  async getQueueStats() {
    return await this.queue.getStats();
  }

  /**
   * Get comprehensive queue metrics
   */
  async getQueueMetrics() {
    return await this.queue.getMetrics();
  }

  /**
   * Get current queue position for a specific job
   * Useful for showing "Your request is #3 in queue" in UI
   * @param jobId - The BullMQ job ID to look up
   * @returns Position info or null if job not found in queue
   */
  async getQueuePosition(jobId: string): Promise<QueuePositionInfo | null> {
    try {
      const waiting = await this.queue.getQueue().getWaiting();
      const active = await this.queue.getQueue().getActive();

      const position = waiting.findIndex(job => job.id === jobId);

      if (position === -1) {
        // Job not in waiting queue - might be active or completed
        const isActive = active.some(job => job.id === jobId);
        if (isActive) {
          return {
            position: 0, // Currently processing
            waitingCount: waiting.length,
            activeCount: active.length,
            estimatedWaitMs: 0,
          };
        }
        return null; // Job not found
      }

      // Position is 1-indexed for user display
      // Estimated wait = position * 1000ms (1 req/sec rate limit)
      return {
        position: position + 1,
        waitingCount: waiting.length,
        activeCount: active.length,
        estimatedWaitMs: (position + 1) * 1000,
      };
    } catch (error) {
      console.error('Failed to get queue position:', error);
      return null;
    }
  }

  /**
   * Get summary of queue state by priority tier
   * Useful for admin dashboard monitoring and debugging slow responses
   *
   * Priority tiers reference (from 01-01):
   * - ADMIN=1: Highest priority, admin corrections
   * - USER=5: Normal user requests
   * - ENRICHMENT=8: Background enrichment
   * - BACKGROUND=10: Lowest priority background tasks
   */
  async getQueueSummary(): Promise<QueueSummary> {
    const waiting = await this.queue.getQueue().getWaiting();

    const byPriority: Record<number, number> = {};
    let oldestTimestamp: number | null = null;

    for (const job of waiting) {
      const priority = job.opts?.priority ?? 0;
      byPriority[priority] = (byPriority[priority] || 0) + 1;

      if (
        job.timestamp &&
        (!oldestTimestamp || job.timestamp < oldestTimestamp)
      ) {
        oldestTimestamp = job.timestamp;
      }
    }

    return {
      byPriority,
      total: waiting.length,
      oldestJobAge: oldestTimestamp ? Date.now() - oldestTimestamp : null,
    };
  }

  /**
   * Pause the queue (stops processing jobs)
   */
  async pauseQueue() {
    await this.queue.pause();
  }

  /**
   * Resume the queue
   */
  async resumeQueue() {
    await this.queue.resume();
  }

  /**
   * Clean up old completed/failed jobs
   */
  async cleanupQueue(olderThan?: number) {
    await this.queue.cleanup(olderThan);
  }

  // ============================================================================
  // Worker Management
  // ============================================================================

  /**
   * Ensure the worker is running (auto-start if needed)
   */
  private async ensureWorkerRunning(): Promise<void> {
    if (this.isWorkerRunning) {
      return;
    }

    // Don't start worker in web process - only in dedicated worker service
    if (process.env.DISABLE_EMBEDDED_WORKER === 'true') {
      console.log('Embedded worker disabled, using separate worker service');
      return;
    }

    try {
      console.log('Starting MusicBrainz queue worker...');
      this.worker = this.queue.createWorker(processMusicBrainzJob);
      this.isWorkerRunning = true;
      console.log('MusicBrainz queue worker started');
    } catch (error) {
      console.error('Failed to start MusicBrainz worker:', error);
      throw error;
    }
  }

  /**
   * Stop the worker gracefully
   */
  async stopWorker(): Promise<void> {
    if (this.worker && this.isWorkerRunning) {
      await this.queue.destroyWorker();
      this.worker = null;
      this.isWorkerRunning = false;
      console.log('MusicBrainz worker stopped');
    }
  }

  /**
   * Restart the worker
   */
  async restartWorker(): Promise<void> {
    await this.stopWorker();
    await this.ensureWorkerRunning();
  }

  // ============================================================================
  // Utility Methods
  // ============================================================================

  /**
   * Wait for job completion using QueueEvents (the proper BullMQ way!)
   * This uses the Promise + Map pattern recommended by the community
   */
  private async waitForJobViaEvents(
    jobId: string,
    timeoutMs = 30000
  ): Promise<{
    success: boolean;
    data?: unknown;
    error?: { message: string };
  }> {
    return new Promise((resolve, reject) => {
      // Store the promise resolvers so QueueEvents can call them
      this.pendingJobs.set(jobId, {
        resolve: resolve as (value: unknown) => void,
        reject,
      });

      // Cleanup after timeout
      setTimeout(() => {
        if (this.pendingJobs.has(jobId)) {
          this.pendingJobs.delete(jobId);
          reject(
            new Error('Job ' + jobId + ' timed out after ' + timeoutMs + 'ms')
          );
        }
      }, timeoutMs);

      // Yellow borders for waiting events
      const border = chalk.yellow('-'.repeat(60));
      console.log('\n' + border);
      console.log(
        chalk.bold.yellow('WAITING FOR JOB') +
          ' ' +
          chalk.yellow('[QUEUE EVENTS LAYER]')
      );
      console.log(border);
      console.log('  ' + chalk.yellow('Job ID:') + ' ' + chalk.white(jobId));
      console.log(
        '  ' + chalk.yellow('Timeout:') + ' ' + chalk.white(timeoutMs + 'ms')
      );
      console.log(border + '\n');
    });
  }

  /**
   * Check if the worker is currently running
   */
  isWorkerActive(): boolean {
    return this.isWorkerRunning;
  }

  /**
   * Get the underlying queue instance (for monitoring UIs like QueueDash)
   */
  getQueue() {
    return this.queue.getQueue();
  }

  /**
   * Graceful shutdown
   */
  async shutdown(): Promise<void> {
    console.log('Shutting down MusicBrainz service...');

    // Reject any pending jobs
    this.pendingJobs.forEach(({ reject }) => {
      reject(new Error('Service shutting down'));
    });
    this.pendingJobs.clear();

    // Close QueueEvents listener
    if (this.queueEvents) {
      await this.queueEvents.close();
      this.queueEvents = null;
    }
    console.log('QueueEvents closed');

    await this.stopWorker();
    await this.queue.close();
    console.log('MusicBrainz service shutdown complete');
  }
}

// ============================================================================
// Singleton Instance (HMR-safe)
// ============================================================================

// Use globalThis to survive hot module reloads in dev mode
const globalForMusicBrainz = globalThis as unknown as {
  queuedMusicBrainzServiceInstance: QueuedMusicBrainzService | undefined;
};

/**
 * Get the singleton queued MusicBrainz service instance
 * HMR-safe: Uses globalThis to persist instance across hot reloads
 */
export function getQueuedMusicBrainzService(): QueuedMusicBrainzService {
  if (!globalForMusicBrainz.queuedMusicBrainzServiceInstance) {
    globalForMusicBrainz.queuedMusicBrainzServiceInstance =
      new QueuedMusicBrainzService();
  }
  return globalForMusicBrainz.queuedMusicBrainzServiceInstance;
}

/**
 * Destroy the singleton instance (useful for testing)
 */
export async function destroyQueuedMusicBrainzService(): Promise<void> {
  if (globalForMusicBrainz.queuedMusicBrainzServiceInstance) {
    await globalForMusicBrainz.queuedMusicBrainzServiceInstance.shutdown();
    globalForMusicBrainz.queuedMusicBrainzServiceInstance = undefined;
  }
}
