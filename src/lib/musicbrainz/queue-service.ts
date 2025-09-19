// src/lib/musicbrainz/queue-service.ts
/**
 * Queue-integrated MusicBrainz service
 * Maintains the same interface as the original service but uses BullMQ for rate limiting
 */

import { QueueEvents, Worker } from 'bullmq';
import { getMusicBrainzQueue, processMusicBrainzJob, JOB_TYPES } from '../queue';
import { createRedisConnection } from '../queue/redis';
import type {
  ArtistSearchResult,
  ReleaseGroupSearchResult,
  RecordingSearchResult,
} from './basic-service';

/**
 * MusicBrainz service with automatic job queue integration
 * All API calls are routed through the queue to ensure 1 req/sec rate limiting
 */
export class QueuedMusicBrainzService {
  private queue = getMusicBrainzQueue();
  private worker: Worker | null = null;
  private isWorkerRunning = false;
  
  // 🎯 THE MISSING PIECE: QueueEvents listener!
  private queueEvents: QueueEvents;
  private pendingJobs = new Map<string, { resolve: Function, reject: Function }>();

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
        connection: createRedisConnection()
      });
      this.setupEventListeners();
      
      // Start the worker when first needed
      this.ensureWorkerRunning();
    }
  }

  // ============================================================================
  // Event Listener Setup (The Missing Piece!)
  // ============================================================================

  /**
   * Set up QueueEvents listeners to catch job completions
   * This is what connects the queue results back to our service
   */
  private setupEventListeners(): void {
    console.log('🔗 Setting up QueueEvents listeners...');

    this.queueEvents.on('completed', ({ jobId, returnvalue }) => {
      console.log(`🎉 QueueEvents: Job ${jobId} completed`);
      
      const pending = this.pendingJobs.get(jobId);
      if (pending) {
        console.log(`✅ Resolving pending job ${jobId}`);
        pending.resolve(returnvalue);
        this.pendingJobs.delete(jobId);
      } else {
        console.log(`⚠️ No pending promise found for job ${jobId}`);
      }
    });

    this.queueEvents.on('failed', ({ jobId, failedReason }) => {
      console.log(`💥 QueueEvents: Job ${jobId} failed: ${failedReason}`);
      
      const pending = this.pendingJobs.get(jobId);
      if (pending) {
        console.log(`❌ Rejecting pending job ${jobId}`);
        pending.reject(new Error(failedReason));
        this.pendingJobs.delete(jobId);
      } else {
        console.log(`⚠️ No pending promise found for failed job ${jobId}`);
      }
    });


    this.queueEvents.on('error', (error) => {
      console.error('❌ QueueEvents error:', error);
    });
  }

  // ============================================================================
  // Public API Methods (Same interface as original service)
  // ============================================================================

  /**
   * Search for artists by name
   * Uses job queue to respect rate limits
   */
  async searchArtists(
    query: string,
    limit = 25,
    offset = 0
  ): Promise<ArtistSearchResult[]> {
    this.ensureInitialized();
    await this.ensureWorkerRunning();

    try {
      const job = await this.queue.addJob(
        JOB_TYPES.MUSICBRAINZ_SEARCH_ARTISTS,
        { query, limit, offset },
        { 
          priority: 1, // Higher priority for direct user requests
          requestId: `search-artists-${Date.now()}`,
        }
      );

      // Use QueueEvents to wait for completion (the proper way!)
      const result = await this.waitForJobViaEvents(job.id!);
      
      if (!result.success) {
        throw new Error(result.error?.message || 'Search failed');
      }

      return result.data || [];

    } catch (error) {
      console.error('Queued MusicBrainz artist search error:', error);
      throw new Error(
        `Failed to search artists: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Search for release groups (albums) by name
   */
  async searchReleaseGroups(
    query: string,
    limit = 25,
    offset = 0
  ): Promise<ReleaseGroupSearchResult[]> {
    this.ensureInitialized();
    await this.ensureWorkerRunning();

    try {
      const job = await this.queue.addJob(
        JOB_TYPES.MUSICBRAINZ_SEARCH_RELEASES,
        { query, limit, offset },
        { 
          priority: 1,
          requestId: `search-releases-${Date.now()}`,
        }
      );

      const result = await this.waitForJobViaEvents(job.id!);
      
      if (!result.success) {
        throw new Error(result.error?.message || 'Search failed');
      }

      return result.data || [];

    } catch (error) {
      console.error('Queued MusicBrainz release search error:', error);
      throw new Error(
        `Failed to search releases: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Search for recordings by name
   */
  async searchRecordings(
    query: string,
    limit = 25,
    offset = 0
  ): Promise<RecordingSearchResult[]> {
    this.ensureInitialized();
    await this.ensureWorkerRunning();

    try {
      const job = await this.queue.addJob(
        JOB_TYPES.MUSICBRAINZ_SEARCH_RECORDINGS,
        { query, limit, offset },
        { 
          priority: 1,
          requestId: `search-recordings-${Date.now()}`,
        }
      );

      const result = await this.waitForJobViaEvents(job.id!);
      
      if (!result.success) {
        throw new Error(result.error?.message || 'Search failed');
      }

      return result.data || [];

    } catch (error) {
      console.error('Queued MusicBrainz recording search error:', error);
      throw new Error(
        `Failed to search recordings: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Get artist by MBID
   */
  async getArtist(mbid: string, includes?: string[]): Promise<any> {
    await this.ensureWorkerRunning();

    try {
      const job = await this.queue.addJob(
        JOB_TYPES.MUSICBRAINZ_LOOKUP_ARTIST,
        { mbid, includes },
        { 
          priority: 1,
          requestId: `lookup-artist-${Date.now()}`,
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
        `Failed to lookup artist: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Get release by MBID
   */
  async getRelease(mbid: string, includes?: string[]): Promise<any> {
    await this.ensureWorkerRunning();

    try {
      const job = await this.queue.addJob(
        JOB_TYPES.MUSICBRAINZ_LOOKUP_RELEASE,
        { mbid, includes },
        { 
          priority: 1,
          requestId: `lookup-release-${Date.now()}`,
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
        `Failed to lookup release: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Get release group by MBID
   */
  async getReleaseGroup(mbid: string, includes?: string[]): Promise<any> {
    await this.ensureWorkerRunning();

    try {
      const job = await this.queue.addJob(
        JOB_TYPES.MUSICBRAINZ_LOOKUP_RELEASE_GROUP,
        { mbid, includes },
        { 
          priority: 1,
          requestId: `lookup-release-group-${Date.now()}`,
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
        `Failed to lookup release group: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Get recording by MBID
   */
  async getRecording(mbid: string, includes?: string[]): Promise<any> {
    await this.ensureWorkerRunning();

    try {
      const job = await this.queue.addJob(
        JOB_TYPES.MUSICBRAINZ_LOOKUP_RECORDING,
        { mbid, includes },
        { 
          priority: 1,
          requestId: `lookup-recording-${Date.now()}`,
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
        `Failed to lookup recording: ${error instanceof Error ? error.message : 'Unknown error'}`
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

    try {
      console.log('🔧 Starting MusicBrainz queue worker...');
      this.worker = this.queue.createWorker(processMusicBrainzJob);
      this.isWorkerRunning = true;
      console.log('✅ MusicBrainz queue worker started');
    } catch (error) {
      console.error('❌ Failed to start MusicBrainz worker:', error);
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
      console.log('✅ MusicBrainz worker stopped');
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
  private async waitForJobViaEvents(jobId: string, timeoutMs = 15000): Promise<any> {
    return new Promise((resolve, reject) => {
      // Store the promise resolvers so QueueEvents can call them
      this.pendingJobs.set(jobId, { resolve, reject });
      
      // Cleanup after timeout
      const timeout = setTimeout(() => {
        if (this.pendingJobs.has(jobId)) {
          this.pendingJobs.delete(jobId);
          reject(new Error(`Job ${jobId} timed out after ${timeoutMs}ms`));
        }
      }, timeoutMs);
      
      // The QueueEvents listener will call resolve/reject when the job completes
      console.log(`⏳ Waiting for job ${jobId} via QueueEvents...`);
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
    console.log('🛑 Shutting down MusicBrainz service...');
    
    // Reject any pending jobs
    this.pendingJobs.forEach(({ reject }, jobId) => {
      reject(new Error('Service shutting down'));
    });
    this.pendingJobs.clear();
    
    // Close QueueEvents listener
    await this.queueEvents.close();
    console.log('✅ QueueEvents closed');
    
    await this.stopWorker();
    await this.queue.close();
    console.log('✅ MusicBrainz service shutdown complete');
  }
}

// ============================================================================
// Singleton Instance
// ============================================================================

let queuedMusicBrainzServiceInstance: QueuedMusicBrainzService | null = null;

/**
 * Get the singleton queued MusicBrainz service instance
 */
export function getQueuedMusicBrainzService(): QueuedMusicBrainzService {
  if (!queuedMusicBrainzServiceInstance) {
    queuedMusicBrainzServiceInstance = new QueuedMusicBrainzService();
  }
  return queuedMusicBrainzServiceInstance;
}

/**
 * Destroy the singleton instance (useful for testing)
 */
export async function destroyQueuedMusicBrainzService(): Promise<void> {
  if (queuedMusicBrainzServiceInstance) {
    await queuedMusicBrainzServiceInstance.shutdown();
    queuedMusicBrainzServiceInstance = null;
  }
}
