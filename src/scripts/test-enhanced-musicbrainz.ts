// src/scripts/test-musicbrainz.ts
/**
 * Test script for MusicBrainz service with error handling and monitoring
 */

import { musicBrainzService } from '@/lib/musicbrainz/musicbrainz-service';

async function testMusicBrainzService() {
  console.log('🧪 Testing MusicBrainz Service\n');

  // Test 1: Successful search
  console.log('📋 Test 1: Successful Artist Search');
  try {
    const artists = await musicBrainzService.searchArtists('Radiohead', 5);
    console.log(`✅ Found ${artists.length} artists`);
    if (artists.length > 0) {
      console.log(`   Top result: ${artists[0].name} (${artists[0].id})`);
    }
  } catch (error) {
    console.error('❌ Test 1 failed:', error);
  }

  console.log('');

  // Test 2: Search for non-existent artist (should handle gracefully)
  console.log('📋 Test 2: Non-existent Artist Search');
  try {
    const artists = await musicBrainzService.searchArtists('NonExistentArtistXYZ123', 5);
    console.log(`✅ Search completed, found ${artists.length} artists (expected: 0)`);
  } catch (error) {
    console.error('❌ Test 2 failed:', error);
  }

  console.log('');

  // Test 3: Safe search with fallback
  console.log('📋 Test 3: Safe Search with Special Characters');
  try {
    const artists = await musicBrainzService.safeSearchArtists('Sigur Rós', 3);
    console.log(`✅ Safe search completed, found ${artists.length} artists`);
    if (artists.length > 0) {
      console.log(`   Top result: ${artists[0].name}`);
    }
  } catch (error) {
    console.error('❌ Test 3 failed:', error);
  }

  console.log('');

  // Test 4: MBID lookup
  console.log('📋 Test 4: Artist MBID Lookup');
  try {
    // Radiohead's MBID
    const artist = await musicBrainzService.getArtist('a74b1b7f-71a5-4011-9441-d0b5e4122711');
    console.log(`✅ Artist lookup successful: ${artist.name}`);
  } catch (error) {
    console.error('❌ Test 4 failed:', error);
  }

  console.log('');

  // Test 5: Invalid MBID (should handle 404 gracefully)
  console.log('📋 Test 5: Invalid MBID Lookup');
  try {
    await musicBrainzService.getArtist('00000000-0000-0000-0000-000000000000');
    console.log('❌ This should have failed!');
  } catch (error) {
    console.log('✅ Invalid MBID handled correctly:', error.message);
  }

  console.log('');

  // Test 6: Batch search
  console.log('📋 Test 6: Batch Artist Search');
  try {
    const queries = ['The Beatles', 'Led Zeppelin', 'Pink Floyd'];
    const results = await musicBrainzService.batchSearchArtists(queries, 2, 1200);
    console.log(`✅ Batch search completed for ${queries.length} queries`);
    results.forEach(result => {
      if (result.error) {
        console.log(`   ❌ ${result.query}: ${result.error}`);
      } else {
        console.log(`   ✅ ${result.query}: ${result.results.length} results`);
      }
    });
  } catch (error) {
    console.error('❌ Test 6 failed:', error);
  }

  console.log('');

  // Test 7: Health check
  console.log('📋 Test 7: Service Health Check');
  try {
    const health = musicBrainzService.getHealthStatus();
    const metrics = musicBrainzService.getMetrics();
    
    console.log('✅ Health Status:');
    console.log(`   Healthy: ${health.healthy}`);
    console.log(`   Degraded: ${health.degraded}`);
    console.log(`   Success Rate: ${metrics.successRate}%`);
    console.log(`   Total Requests: ${metrics.requests}`);
    console.log(`   Successful: ${metrics.successes}`);
    console.log(`   Failed: ${metrics.failures}`);
    console.log(`   Rate Limits: ${metrics.rateLimits}`);
    console.log(`   Timeouts: ${metrics.timeouts}`);
    console.log(`   Not Found: ${metrics.notFound}`);
    console.log(`   Service Unavailable: ${metrics.serviceUnavailable}`);
    console.log(`   Consecutive Failures: ${metrics.consecutiveFailures}`);
  } catch (error) {
    console.error('❌ Test 7 failed:', error);
  }

  console.log('\n🎉 Enhanced MusicBrainz Service test completed!');
  console.log('\n📊 Final Metrics Summary:');
  const finalMetrics = musicBrainzService.getMetrics();
  console.log(`   Total API calls: ${finalMetrics.requests}`);
  console.log(`   Success rate: ${finalMetrics.successRate}%`);
  console.log(`   Service health: ${musicBrainzService.isHealthy() ? 'Healthy' : 'Degraded'}`);
}

// Run the test
testMusicBrainzService()
  .then(() => {
    console.log('\n✅ All tests completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Test suite failed:', error);
    process.exit(1);
  });
