// src/scripts/debug-raw-musicbrainz.ts
/**
 * Debug script to inspect RAW MusicBrainz API responses
 * Let's see exactly what the API returns vs what our wrapper gives us
 */

import { musicBrainzService } from '../lib/musicbrainz';

async function debugRawApiResponse() {
  console.log('🔍 Raw MusicBrainz API Response Debug');
  console.log('=======================================\n');
  
  // Test with a simple query that should definitely have artist data
  const query = 'release:"Discovery" AND artist:"Daft Punk"';
  console.log(`📡 Query: ${query}\n`);
  
  try {
    // Get the results through our wrapper
    console.log('🎯 Results through our wrapper:');
    const results = await musicBrainzService.searchReleaseGroups(query, 3);
    
    if (results && results.length > 0) {
      for (const [i, result] of results.entries()) {
        console.log(`\n  Result ${i + 1}:`);
        console.log(`    Title: "${result.title}"`);
        console.log(`    Artist Credit: ${JSON.stringify(result['artist-credit'], null, 2)}`);
        console.log(`    Full Object Keys: ${Object.keys(result).join(', ')}`);
        console.log(`    Full Object: ${JSON.stringify(result, null, 2)}`);
      }
    } else {
      console.log('  ❌ No results returned');
    }
    
    // Now let's try to hit the API directly to see the raw response
    console.log('\n\n🌐 Raw API Response (bypassing our wrapper):');
    
    const directUrl = `https://musicbrainz.org/ws/2/release-group/?query=${encodeURIComponent(query)}&fmt=json&limit=3`;
    console.log(`📍 Direct URL: ${directUrl}`);
    
    const response = await fetch(directUrl, {
      headers: {
        'User-Agent': 'rec-music-app/1.0.0 (your-email@example.com)',
        'Accept': 'application/json'
      }
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const rawData = await response.json();
    console.log(`\n📦 Raw Response Structure:`);
    console.log(`   Top-level keys: ${Object.keys(rawData).join(', ')}`);
    
    if (rawData['release-groups'] && rawData['release-groups'].length > 0) {
      console.log(`\n🎵 First Release Group from Raw API:`);
      const firstReleaseGroup = rawData['release-groups'][0];
      console.log(JSON.stringify(firstReleaseGroup, null, 2));
      
      console.log(`\n🔍 Artist Credit Analysis:`);
      if (firstReleaseGroup['artist-credit']) {
        console.log(`   Has artist-credit: YES`);
        console.log(`   Artist credit type: ${typeof firstReleaseGroup['artist-credit']}`);
        console.log(`   Artist credit length: ${firstReleaseGroup['artist-credit'].length}`);
        console.log(`   Artist credit: ${JSON.stringify(firstReleaseGroup['artist-credit'], null, 2)}`);
      } else {
        console.log(`   Has artist-credit: NO`);
      }
    }
    
  } catch (error) {
    console.error('💥 Error:', error);
  }
}

// Test a few different queries to see if it's query-specific
async function testMultipleQueries() {
  const testQueries = [
    'release:"Discovery" AND artist:"Daft Punk"',
    'Discovery Daft Punk',
    'artist:"Radiohead" AND release:"OK Computer"',
    'Random Access Memories'
  ];
  
  for (const query of testQueries) {
    console.log(`\n${'='.repeat(80)}`);
    console.log(`🎯 Testing Query: "${query}"`);
    console.log(`${'='.repeat(80)}`);
    
    try {
      const results = await musicBrainzService.searchReleaseGroups(query, 1);
      
      if (results && results.length > 0) {
        const result = results[0];
        console.log(`📋 Result Title: "${result.title}"`);
        console.log(`👤 Artist Credit Present: ${result['artist-credit'] ? 'YES' : 'NO'}`);
        
        if (result['artist-credit']) {
          console.log(`👥 Artists: ${result['artist-credit'].map((ac: any) => ac.name || 'Unknown').join(', ')}`);
        } else {
          console.log(`👥 Artists: None found`);
        }
        
        console.log(`🏷️  MusicBrainz ID: ${result.id || 'None'}`);
        console.log(`📅 First Release Date: ${result['first-release-date'] || 'None'}`);
      } else {
        console.log('❌ No results for this query');
      }
      
    } catch (error) {
      console.log(`💥 Query failed: ${error}`);
    }
    
    // Rate limit respect
    await new Promise(resolve => setTimeout(resolve, 1100));
  }
}

async function runFullDebug() {
  await debugRawApiResponse();
  await new Promise(resolve => setTimeout(resolve, 2000));
  await testMultipleQueries();
  
  console.log('\n\n✨ Debug Analysis Complete!');
  console.log('Now we can see:');
  console.log('  1. Whether artist-credit exists in raw API responses');
  console.log('  2. How our wrapper might be modifying the data');
  console.log('  3. If it\'s a query-specific issue');
  console.log('  4. The exact structure of MusicBrainz responses');
}

// Run if executed directly
if (require.main === module) {
  runFullDebug()
    .then(() => {
      console.log('\n🎯 Raw API debug completed!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Debug failed:', error);
      process.exit(1);
    });
}

export { runFullDebug };
