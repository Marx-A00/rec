// scripts/test-lastfm.ts
/**
 * Test script for Last.fm API service
 */

import { config } from 'dotenv';
config({ path: '.env.local' });

import { searchLastFmArtists, getLastFmArtistInfo } from '../src/lib/lastfm/search';

async function testLastFm() {
  console.log('🧪 Testing Last.fm API Service\n');

  // Test 1: Search for artists
  console.log('Test 1: Searching for "Pink Floyd"...');
  const searchResults = await searchLastFmArtists('Pink Floyd');

  if (searchResults.length > 0) {
    console.log(`✅ Found ${searchResults.length} results:`);
    searchResults.forEach((result, idx) => {
      console.log(`\n   ${idx + 1}. ${result.name}`);
      console.log(`      Listeners: ${result.listeners?.toLocaleString() || 'N/A'}`);
      console.log(`      Match: ${result.match || 'N/A'}`);
      console.log(`      Image: ${result.imageUrl || 'No image'}`);
      console.log(`      MBID: ${result.mbid || 'N/A'}`);
    });
  } else {
    console.log('❌ No results found');
  }

  console.log('\n---\n');

  // Test 2: Get artist info
  console.log('Test 2: Getting detailed info for "Radiohead"...');
  const artistInfo = await getLastFmArtistInfo('Radiohead');

  if (artistInfo) {
    console.log(`✅ Found artist info:`);
    console.log(`   Name: ${artistInfo.name}`);
    console.log(`   Listeners: ${artistInfo.listeners?.toLocaleString() || 'N/A'}`);
    console.log(`   Image: ${artistInfo.imageUrl || 'No image'}`);
    console.log(`   MBID: ${artistInfo.mbid || 'N/A'}`);
  } else {
    console.log('❌ No artist info found');
  }

  console.log('\n---\n');

  // Test 3: Test with non-existent artist
  console.log('Test 3: Searching for non-existent artist...');
  const emptyResults = await searchLastFmArtists('zxcvbnmasdfghjklqwertyuiop123456');
  console.log(`✅ Empty results handled gracefully: ${emptyResults.length} results`);

  console.log('\n✅ All tests completed!');
}

testLastFm().catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});
