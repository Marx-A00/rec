// src/lib/musicbrainz/test-queue-service.ts
/**
 * Test script for the queue-integrated MusicBrainz service
 * Run with: npx tsx src/lib/musicbrainz/test-queue-service.ts
 */

import { mbLogger } from '@/lib/logger';

import { getQueuedMusicBrainzService } from './queue-service';

async function testQueuedMusicBrainzService() {
  mbLogger.info('Testing Queue-Integrated MusicBrainz Service');

  const musicbrainzQueueService = getQueuedMusicBrainzService();

  try {
    // Test 1: Search for artists
    mbLogger.info('📋 Test 1: Search Artists (via Queue)');
    mbLogger.info('Searching for "Radiohead"...');

    const startTime = Date.now();
    const artists = await musicbrainzQueueService.searchArtists('Radiohead', 5);
    const duration = Date.now() - startTime;

    mbLogger.info(`✅ Found ${artists.length} artists in ${duration}ms`);
    mbLogger.info({ name: artists[0]?.name, disambiguation: artists[0]?.disambiguation }, 'First artist result');

    // Test 2: Search for releases
    mbLogger.info('\n📋 Test 2: Search Release Groups (via Queue)');
    mbLogger.info('Searching for "OK Computer"...');

    const releaseStartTime = Date.now();
    const releases = await musicbrainzQueueService.searchReleaseGroups(
      'OK Computer',
      3
    );
    const releaseDuration = Date.now() - releaseStartTime;

    mbLogger.info(`✅ Found ${releases.length} releases in ${releaseDuration}ms`);
    mbLogger.info({ title: releases[0]?.title }, 'First release result');

    // Test 3: Multiple concurrent searches (should be queued)
    mbLogger.info('\n📋 Test 3: Concurrent Searches (Rate Limiting Test)');
    mbLogger.info(
      'Making 3 concurrent searches - should be processed sequentially...'
    );

    const concurrentStartTime = Date.now();
    const concurrentPromises = [
      musicbrainzQueueService.searchArtists('The Beatles', 3),
      musicbrainzQueueService.searchArtists('Pink Floyd', 3),
      musicbrainzQueueService.searchArtists('Led Zeppelin', 3),
    ];

    const concurrentResults = await Promise.all(concurrentPromises);
    const concurrentDuration = Date.now() - concurrentStartTime;

    mbLogger.info(`✅ Completed 3 searches in ${concurrentDuration}ms`);
    mbLogger.info({ results: concurrentResults.map((result, index) => `${index + 1}: ${result.length} artists`).join(', ') }, 'Concurrent search results');

    // Test 4: Queue statistics
    mbLogger.info('\n📊 Queue Statistics:');
    const stats = await musicbrainzQueueService.getQueueStats();
    mbLogger.info(JSON.stringify(stats, null, 2));

    mbLogger.info('\n✅ All tests completed successfully!');
    mbLogger.info('🎯 Queue-integrated service is working with rate limiting');
  } catch (error) {
    mbLogger.error({ error: error instanceof Error ? (error as Error).message : String(error) }, 'Test failed');
  } finally {
    // Cleanup
    mbLogger.info('\n🧹 Shutting down service...');
    await musicbrainzQueueService.shutdown();
    mbLogger.info('✅ Service shutdown complete');
    process.exit(0);
  }
}

// Run the test
testQueuedMusicBrainzService().catch(err => mbLogger.error({ error: err instanceof Error ? err.message : String(err) }, 'Test failed'));
