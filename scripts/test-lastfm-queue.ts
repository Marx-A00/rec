// scripts/test-lastfm-queue.ts
/**
 * Test script for Last.fm queue service with rate limiting
 */

import { config } from 'dotenv';
config({ path: '.env.local' });

import { getQueuedLastFmService, destroyQueuedLastFmService } from '../src/lib/lastfm/queue-service';

async function testLastFmQueue() {
  console.log('🧪 Testing Last.fm Queue Service with Rate Limiting\n');

  const service = getQueuedLastFmService();

  try {
    // Test 1: Search for artists
    console.log('Test 1: Searching for "Death Grips" via queue...');
    const startTime = Date.now();
    const searchResults = await service.searchArtists('Death Grips');
    const duration = Date.now() - startTime;

    if (searchResults.length > 0) {
      console.log(`✅ Found ${searchResults.length} results in ${duration}ms:`);
      searchResults.slice(0, 3).forEach((result, idx) => {
        console.log(`\n   ${idx + 1}. ${result.name}`);
        console.log(`      Listeners: ${result.listeners?.toLocaleString() || 'N/A'}`);
        console.log(`      Image: ${result.imageUrl ? 'Yes' : 'No'}`);
      });
    } else {
      console.log('❌ No results found');
    }

    console.log('\n---\n');

    // Test 2: Get artist info
    console.log('Test 2: Getting info for "Bladee" via queue...');
    const startTime2 = Date.now();
    const artistInfo = await service.getArtistInfo('Bladee');
    const duration2 = Date.now() - startTime2;

    if (artistInfo) {
      console.log(`✅ Found artist info in ${duration2}ms:`);
      console.log(`   Name: ${artistInfo.name}`);
      console.log(`   Listeners: ${artistInfo.listeners?.toLocaleString() || 'N/A'}`);
      console.log(`   Image: ${artistInfo.imageUrl ? 'Yes' : 'No'}`);
    } else {
      console.log('❌ No artist info found');
    }

    console.log('\n---\n');

    // Test 3: Multiple rapid requests (rate limiting test)
    console.log('Test 3: Making 3 rapid requests to test rate limiting...');
    const startTime3 = Date.now();

    const promises = [
      service.searchArtists('Pink Floyd'),
      service.searchArtists('Radiohead'),
      service.searchArtists('The Beatles'),
    ];

    const results = await Promise.all(promises);
    const duration3 = Date.now() - startTime3;

    console.log(`✅ All 3 requests completed in ${duration3}ms`);
    results.forEach((result, idx) => {
      console.log(`   Request ${idx + 1}: ${result.length} results`);
    });

    if (duration3 < 600) {
      console.log(`   ⚠️ Duration seems too fast (${duration3}ms < 600ms), rate limiting might not be working`);
    } else {
      console.log(`   ✅ Rate limiting working (total duration: ${duration3}ms)`);
    }

    console.log('\n✅ All tests completed!');

  } finally {
    // Clean up
    console.log('\n🧹 Cleaning up queue connections...');
    await destroyQueuedLastFmService();
    process.exit(0);
  }
}

testLastFmQueue().catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});
