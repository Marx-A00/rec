// src/scripts/quick-test-musicbrainz.ts
/**
 * Quick test to see exactly what MusicBrainz returns for one specific search
 */

import { musicBrainzService } from '../lib/musicbrainz';

async function quickTest() {
  console.log('🔍 Quick MusicBrainz Test');
  console.log('=========================\n');
  
  const query = 'release:"Discovery" AND artist:"Daft Punk"';
  console.log(`📡 Query: ${query}\n`);
  
  try {
    const results = await musicBrainzService.searchReleaseGroups(query, 2);
    
    console.log(`📦 Results Count: ${results?.length || 0}`);
    
    if (results && results.length > 0) {
      const first = results[0];
      console.log('\n🎵 First Result Full Object:');
      console.log(JSON.stringify(first, null, 2));
      
      console.log('\n🎯 Specific Fields:');
      console.log(`  Title: "${first.title}"`);
      console.log(`  ID: ${first.id}`);
      console.log(`  Artist Credit Type: ${typeof first.artistCredit}`);
      console.log(`  Artist Credit: ${JSON.stringify(first.artistCredit, null, 2)}`);
      
      if (first.artistCredit && Array.isArray(first.artistCredit)) {
        console.log(`  Artist Credit Length: ${first.artistCredit.length}`);
        first.artistCredit.forEach((ac, i) => {
          console.log(`    [${i}] Name: "${ac.name}", Artist: ${JSON.stringify(ac.artist, null, 2)}`);
        });
      }
    }
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

quickTest()
  .then(() => {
    console.log('\n✅ Quick test completed!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Test failed:', error);
    process.exit(1);
  });
