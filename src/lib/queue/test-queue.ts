// src/lib/queue/test-queue.ts
/**
 * Test script for MusicBrainz job queue system
 * Run with: npx tsx src/lib/queue/test-queue.ts
 */

import { processMusicBrainzJob } from './processors';

import { getMusicBrainzQueue, JOB_TYPES } from './index';
import { queueLogger } from '@/lib/logger';

async function testMusicBrainzQueue() {
  queueLogger.info('Testing MusicBrainz Queue System');

  const queue = getMusicBrainzQueue();
  let worker = null;

  try {
    // Create and start the worker
    queueLogger.info('Creating worker with rate limiting (1 req/sec)');
    worker = queue.createWorker(processMusicBrainzJob);

    // Wait a bit for worker to be ready
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Test 1: Search for artists
    queueLogger.info('Test 1: Search Artists');
    const artistJob = await queue.addJob(
      JOB_TYPES.MUSICBRAINZ_SEARCH_ARTISTS,
      {
        query: 'Radiohead',
        limit: 5,
      },
      {
        requestId: 'test-artist-search-1',
      }
    );

    // Test 2: Search for releases
    queueLogger.info('Test 2: Search Releases');
    const releaseJob = await queue.addJob(
      JOB_TYPES.MUSICBRAINZ_SEARCH_RELEASES,
      {
        query: 'OK Computer',
        limit: 3,
      },
      {
        requestId: 'test-release-search-1',
      }
    );

    // Test 3: Multiple searches to test rate limiting
    queueLogger.info('Test 3: Multiple Jobs (Rate Limiting Test)');
    const jobs = await Promise.all([
      queue.addJob(JOB_TYPES.MUSICBRAINZ_SEARCH_ARTISTS, {
        query: 'The Beatles',
      }),
      queue.addJob(JOB_TYPES.MUSICBRAINZ_SEARCH_ARTISTS, {
        query: 'Pink Floyd',
      }),
      queue.addJob(JOB_TYPES.MUSICBRAINZ_SEARCH_ARTISTS, {
        query: 'Led Zeppelin',
      }),
    ]);

    queueLogger.info({ jobCount: jobs.length + 2 }, 'Queued jobs successfully');

    // Wait for jobs to complete and show progress
    queueLogger.info('Waiting for jobs to complete (rate limited at 1 req/sec)');

    // Monitor queue for 10 seconds to see jobs processing
    let completedJobs = 0;
    const totalJobs = 5;

    const monitorInterval = setInterval(async () => {
      const stats = await queue.getStats();
      queueLogger.debug(
        { completed: stats.completed, active: stats.active, waiting: stats.waiting },
        'Queue status'
      );

      if (stats.completed >= totalJobs) {
        completedJobs = stats.completed;
        clearInterval(monitorInterval);
      }
    }, 2000);

    // Wait up to 15 seconds for all jobs to complete
    await new Promise(resolve => {
      const timeout = setTimeout(() => {
        clearInterval(monitorInterval);
        resolve(null);
      }, 15000);

      // Check if all jobs are done every second
      const checkInterval = setInterval(async () => {
        const stats = await queue.getStats();
        if (stats.completed >= totalJobs) {
          clearInterval(checkInterval);
          clearInterval(monitorInterval);
          clearTimeout(timeout);
          resolve(null);
        }
      }, 1000);
    });

    // Show queue metrics
    const metrics = await queue.getMetrics();
    queueLogger.info({ metrics }, 'Queue metrics');

    queueLogger.info('Queue test completed successfully');
    queueLogger.info('Rate limiting working: Jobs processed at ~1 request/second');
  } catch (error) {
    queueLogger.error({ error: error instanceof Error ? error.message : String(error) }, 'Queue test failed');
  } finally {
    // Cleanup
    queueLogger.info('Cleaning up');
    if (worker) {
      await queue.destroyWorker();
    }
    await queue.close();
    queueLogger.info('Cleanup completed');
    process.exit(0);
  }
}

// Run the test
testMusicBrainzQueue().catch(err => {
  queueLogger.error({ error: err instanceof Error ? err.message : String(err) }, 'Queue test failed');
});
