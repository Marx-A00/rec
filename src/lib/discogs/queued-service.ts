// src/lib/discogs/queued-service.ts
/**
 * Queue-integrated Discogs service for admin corrections
 * Follows same pattern as QueuedMusicBrainzService
 */

import { QueueEvents } from 'bullmq';
import chalk from 'chalk';

import type { ArtistSearchResult } from '@/lib/correction/artist/types';
import type { CorrectionSearchResult } from '@/lib/correction/types';
import { getMusicBrainzQueue, JOB_TYPES, PRIORITY_TIERS } from '@/lib/queue';
import { createRedisConnection } from '@/lib/queue/redis';
import type { DiscogsMaster } from '@/types/discogs/master';

import { mapDiscogsSearchResultToArtistSearchResult } from './mappers';

// ============================================================================
// Types
// ============================================================================

export interface DiscogsAlbumSearchOptions {
  /** Local database album ID (for logging) */
  albumId: string;
  /** Album title to search */
  albumTitle?: string;
  /** Artist name filter (optional) */
  artistName?: string;
  /** Results per page (default 10) */
  limit?: number;
}

export interface DiscogsAlbumSearchResponse {
  albumId: string;
  action: string;
  resultsCount: number;
  results: CorrectionSearchResult[];
}

export interface DiscogsArtistSearchOptions {
  /** Artist name to search */
  artistName: string;
  /** Results limit (default 10) */
  limit?: number;
}

export interface DiscogsArtistSearchResponse {
  action: string;
  resultsCount: number;
  results: ArtistSearchResult[];
}

// ============================================================================
// QueuedDiscogsService
// ============================================================================

/**
 * Discogs service with automatic job queue integration
 * Uses BullMQ for rate limiting (shares queue with MusicBrainz)
 */
export class QueuedDiscogsService {
  private queue = getMusicBrainzQueue();

  // QueueEvents listener for job completion tracking
  private queueEvents: QueueEvents | null = null;
  private pendingJobs = new Map<
    string,
    { resolve: (value: unknown) => void; reject: (reason?: unknown) => void }
  >();

  constructor() {
    // Lazy initialization - wait for first use
  }

  /**
   * Lazy initialization - only set up connections when needed
   */
  private ensureInitialized() {
    if (!this.queueEvents) {
      this.queueEvents = new QueueEvents('musicbrainz', {
        connection: createRedisConnection(),
      });
      this.setupEventListeners();
    }
  }

  /**
   * Set up QueueEvents listeners to catch job completions
   */
  private setupEventListeners(): void {
    if (!this.queueEvents) return;

    this.queueEvents.on('completed', ({ jobId, returnvalue }) => {
      const result =
        typeof returnvalue === 'string' ? JSON.parse(returnvalue) : returnvalue;

      const pending = this.pendingJobs.get(jobId);
      if (pending) {
        console.log(
          chalk.green('[QueuedDiscogsService] Job ' + jobId + ' completed')
        );
        pending.resolve(result);
        this.pendingJobs.delete(jobId);
      }
    });

    this.queueEvents.on('failed', ({ jobId, failedReason }) => {
      const pending = this.pendingJobs.get(jobId);
      if (pending) {
        console.log(
          chalk.red(
            '[QueuedDiscogsService] Job ' + jobId + ' failed: ' + failedReason
          )
        );
        pending.reject(new Error(failedReason));
        this.pendingJobs.delete(jobId);
      }
    });

    this.queueEvents.on('error', error => {
      console.error('[QueuedDiscogsService] QueueEvents error:', error);
    });
  }

  // ============================================================================
  // Public API
  // ============================================================================

  /**
   * Search Discogs for albums (masters) by title
   * Returns results in CorrectionSearchResult format
   */
  async searchAlbums(
    options: DiscogsAlbumSearchOptions
  ): Promise<DiscogsAlbumSearchResponse> {
    this.ensureInitialized();

    const { albumId, albumTitle, artistName, limit = 10 } = options;

    console.log(
      chalk.cyan(
        '[QueuedDiscogsService] Queuing album search for "' + albumTitle + '"'
      )
    );

    try {
      const job = await this.queue.addJob(
        JOB_TYPES.DISCOGS_SEARCH_ALBUM,
        {
          albumId,
          albumTitle,
          artistName,
          limit,
          requestId: 'discogs-album-search-' + Date.now(),
        },
        {
          priority: PRIORITY_TIERS.ADMIN,
          requestId: 'discogs-album-search-' + albumId,
        }
      );

      const result = await this.waitForJobViaEvents(job.id!);

      return result as DiscogsAlbumSearchResponse;
    } catch (error) {
      console.error('[QueuedDiscogsService] Album search failed:', error);
      throw new Error(
        'Failed to search Discogs albums: ' +
          (error instanceof Error ? error.message : 'Unknown error')
      );
    }
  }

  /**
   * Search Discogs for artists by name
   * Returns results in ArtistSearchResult format for correction UI
   *
   * Uses existing DISCOGS_SEARCH_ARTIST job type. Task 3 modified
   * the handler to return searchResults array for correction use.
   *
   * NOTE: Unlike album search which calls getMaster for each result,
   * artist search results contain enough data for display without
   * additional API calls.
   */
  async searchArtists(
    options: DiscogsArtistSearchOptions
  ): Promise<DiscogsArtistSearchResponse> {
    this.ensureInitialized();

    const { artistName, limit = 10 } = options;

    console.log(
      chalk.cyan(
        '[QueuedDiscogsService] Queuing artist search for "' + artistName + '"'
      )
    );

    try {
      // Use existing DISCOGS_SEARCH_ARTIST job type
      // Task 3 modified handler to return searchResults array
      const job = await this.queue.addJob(
        JOB_TYPES.DISCOGS_SEARCH_ARTIST,
        {
          // Job requires artistId for logging - use dummy for admin search
          artistId: 'admin-search-' + Date.now(),
          artistName,
          requestId: 'discogs-artist-search-' + Date.now(),
        },
        {
          priority: PRIORITY_TIERS.ADMIN,
          requestId: 'discogs-artist-search-' + artistName,
        }
      );

      const result = (await this.waitForJobViaEvents(job.id!)) as {
        searchResults?: Array<{ id: number; title: string; thumb?: string }>;
        action?: string;
        resultsCount?: number;
      };

      // Extract search results from job result (now returned by Task 3 modification)
      const searchResults = result.searchResults || [];

      // Map to ArtistSearchResult format
      const mappedResults = searchResults
        .slice(0, limit)
        .map(r => mapDiscogsSearchResultToArtistSearchResult(r));

      return {
        action: 'search_complete',
        resultsCount: mappedResults.length,
        results: mappedResults,
      };
    } catch (error) {
      console.error('[QueuedDiscogsService] Artist search failed:', error);
      throw new Error(
        'Failed to search Discogs artists: ' +
          (error instanceof Error ? error.message : 'Unknown error')
      );
    }
  }

  /**
   * Fetch a Discogs master by ID
   * Returns full master data including tracklist and images
   */
  async getMaster(
    masterId: string,
    priority: number = PRIORITY_TIERS.ADMIN
  ): Promise<DiscogsMaster> {
    this.ensureInitialized();

    console.log(
      chalk.cyan(
        '[QueuedDiscogsService] Queuing master fetch for ID ' + masterId
      )
    );

    try {
      const job = await this.queue.addJob(
        JOB_TYPES.DISCOGS_GET_MASTER,
        {
          masterId,
          requestId: 'discogs-master-' + masterId + '-' + Date.now(),
        },
        {
          priority,
          requestId: 'discogs-master-' + masterId,
        }
      );

      const result = await this.waitForJobViaEvents(job.id!);
      return result as DiscogsMaster;
    } catch (error) {
      console.error('[QueuedDiscogsService] Master fetch failed:', error);
      throw new Error(
        'Failed to fetch Discogs master: ' +
          (error instanceof Error ? error.message : 'Unknown error')
      );
    }
  }

  // ============================================================================
  // Utility Methods
  // ============================================================================

  /**
   * Wait for job completion using QueueEvents
   */
  private async waitForJobViaEvents(
    jobId: string,
    timeoutMs = 30000
  ): Promise<unknown> {
    return new Promise((resolve, reject) => {
      this.pendingJobs.set(jobId, {
        resolve: resolve as (value: unknown) => void,
        reject,
      });

      setTimeout(() => {
        if (this.pendingJobs.has(jobId)) {
          this.pendingJobs.delete(jobId);
          reject(
            new Error('Job ' + jobId + ' timed out after ' + timeoutMs + 'ms')
          );
        }
      }, timeoutMs);

      console.log(
        chalk.yellow('[QueuedDiscogsService] Waiting for job ' + jobId + '...')
      );
    });
  }

  /**
   * Graceful shutdown
   */
  async shutdown(): Promise<void> {
    console.log('[QueuedDiscogsService] Shutting down...');

    this.pendingJobs.forEach(({ reject }) => {
      reject(new Error('Service shutting down'));
    });
    this.pendingJobs.clear();

    if (this.queueEvents) {
      await this.queueEvents.close();
      this.queueEvents = null;
    }

    console.log('[QueuedDiscogsService] Shutdown complete');
  }
}

// ============================================================================
// Singleton Instance (HMR-safe)
// ============================================================================

const globalForDiscogs = globalThis as unknown as {
  queuedDiscogsServiceInstance: QueuedDiscogsService | undefined;
};

/**
 * Get the singleton queued Discogs service instance
 * HMR-safe: Uses globalThis to persist instance across hot reloads
 */
export function getQueuedDiscogsService(): QueuedDiscogsService {
  if (!globalForDiscogs.queuedDiscogsServiceInstance) {
    globalForDiscogs.queuedDiscogsServiceInstance = new QueuedDiscogsService();
  }
  return globalForDiscogs.queuedDiscogsServiceInstance;
}

/**
 * Destroy the singleton instance (useful for testing)
 */
export async function destroyQueuedDiscogsService(): Promise<void> {
  if (globalForDiscogs.queuedDiscogsServiceInstance) {
    await globalForDiscogs.queuedDiscogsServiceInstance.shutdown();
    globalForDiscogs.queuedDiscogsServiceInstance = undefined;
  }
}
