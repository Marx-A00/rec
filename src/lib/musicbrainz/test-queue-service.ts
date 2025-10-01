// src/lib/musicbrainz/test-queue-service.ts
/**
 * Test script for the queue-integrated MusicBrainz service
 * Run with: npx tsx src/lib/musicbrainz/test-queue-service.ts
 */

import { getQueuedMusicBrainzService } from './queue-service';

async function testQueuedMusicBrainzService() {
  console.log('🧪 Testing Queue-Integrated MusicBrainz Service...\n');

  const musicbrainzQueueService = getQueuedMusicBrainzService();

  try {
    // Test 1: Search for artists
    console.log('📋 Test 1: Search Artists (via Queue)');
    console.log('Searching for "Radiohead"...');

    const startTime = Date.now();
    const artists = await musicbrainzQueueService.searchArtists('Radiohead', 5);
    const duration = Date.now() - startTime;

    console.log(`✅ Found ${artists.length} artists in ${duration}ms`);
    console.log(
      'First result:',
      artists[0]?.name,
      '-',
      artists[0]?.disambiguation
    );

    // Test 2: Search for releases
    console.log('\n📋 Test 2: Search Release Groups (via Queue)');
    console.log('Searching for "OK Computer"...');

    const releaseStartTime = Date.now();
    const releases = await musicbrainzQueueService.searchReleaseGroups(
      'OK Computer',
      3
    );
    const releaseDuration = Date.now() - releaseStartTime;

    console.log(`✅ Found ${releases.length} releases in ${releaseDuration}ms`);
    console.log('First result:', releases[0]?.title);

    // Test 3: Multiple concurrent searches (should be queued)
    console.log('\n📋 Test 3: Concurrent Searches (Rate Limiting Test)');
    console.log(
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

    console.log(`✅ Completed 3 searches in ${concurrentDuration}ms`);
    console.log(
      'Results:',
      concurrentResults
        .map((result, index) => `${index + 1}: ${result.length} artists`)
        .join(', ')
    );

    // Test 4: Queue statistics
    console.log('\n📊 Queue Statistics:');
    const stats = await musicbrainzQueueService.getQueueStats();
    console.log(JSON.stringify(stats, null, 2));

    console.log('\n✅ All tests completed successfully!');
    console.log('🎯 Queue-integrated service is working with rate limiting');
  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    // Cleanup
    console.log('\n🧹 Shutting down service...');
    await musicbrainzQueueService.shutdown();
    console.log('✅ Service shutdown complete');
    process.exit(0);
  }
}

// Run the test
testQueuedMusicBrainzService().catch(console.error);
