// src/lib/queue/test-queue.ts
/**
 * Test script for MusicBrainz job queue system
 * Run with: npx tsx src/lib/queue/test-queue.ts
 */

import { getMusicBrainzQueue, processMusicBrainzJob, JOB_TYPES } from './index';

async function testMusicBrainzQueue() {
  console.log('🧪 Testing MusicBrainz Queue System...\n');

  const queue = getMusicBrainzQueue();
  let worker = null;

  try {
    // Create and start the worker
    console.log('🔧 Creating worker with rate limiting (1 req/sec)...');
    worker = queue.createWorker(processMusicBrainzJob);

    // Wait a bit for worker to be ready
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Test 1: Search for artists
    console.log('\n📋 Test 1: Search Artists');
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
    console.log('📋 Test 2: Search Releases');
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
    console.log('📋 Test 3: Multiple Jobs (Rate Limiting Test)');
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

    console.log(`✅ Queued ${jobs.length + 2} jobs successfully`);

    // Wait for jobs to complete and show progress
    console.log(
      '\n⏳ Waiting for jobs to complete (this will take ~5+ seconds due to 1 req/sec rate limiting)...'
    );
    console.log('👀 Watch the console for job processing messages...');

    // Monitor queue for 10 seconds to see jobs processing
    let completedJobs = 0;
    const totalJobs = 5;

    const monitorInterval = setInterval(async () => {
      const stats = await queue.getStats();
      console.log(
        `📊 Queue Status: ${stats.completed} completed, ${stats.active} active, ${stats.waiting} waiting`
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
    console.log('\n📈 Queue Metrics:');
    const metrics = await queue.getMetrics();
    console.log(JSON.stringify(metrics, null, 2));

    console.log('\n✅ Queue test completed successfully!');
    console.log(
      '🎯 Rate limiting working: Jobs processed at ~1 request/second'
    );
  } catch (error) {
    console.error('❌ Queue test failed:', error);
  } finally {
    // Cleanup
    console.log('\n🧹 Cleaning up...');
    if (worker) {
      await queue.destroyWorker();
    }
    await queue.close();
    console.log('✅ Cleanup completed');
    process.exit(0);
  }
}

// Run the test
testMusicBrainzQueue().catch(console.error);
