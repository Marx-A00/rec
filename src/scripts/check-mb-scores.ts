#!/usr/bin/env tsx
// src/scripts/check-mb-scores.ts
// Check if MusicBrainz API returns confidence/score fields

import { musicbrainzService } from '@/lib/musicbrainz/basic-service';

async function checkMusicBrainzScores() {
  console.log('🔍 Checking MusicBrainz API Response Structure...\n');

  const mbService = musicbrainzService;

  try {
    console.log('1️⃣ Testing Album Search (Release Group)');
    const albumResults = await mbService.searchReleaseGroups('The Downward Spiral Nine Inch Nails', 3);
    
    if (albumResults.length > 0) {
      console.log(`Found ${albumResults.length} results. First result structure:`);
      console.log(JSON.stringify(albumResults[0], null, 2));
      
      console.log('\n🔍 Checking for score/confidence fields in first result:');
      const firstResult = albumResults[0];
      const possibleScoreFields = ['score', 'confidence', 'quality', 'rating', 'ext:score'];
      
      possibleScoreFields.forEach(field => {
        if (field in firstResult) {
          console.log(`✅ Found "${field}": ${firstResult[field]}`);
        } else {
          console.log(`❌ No "${field}" field`);
        }
      });
    }

    console.log('\n2️⃣ Testing Artist Search');
    const artistResults = await mbService.searchArtists('Nine Inch Nails', 2);
    
    if (artistResults.length > 0) {
      console.log(`\nFound ${artistResults.length} artist results. First result structure:`);
      console.log(JSON.stringify(artistResults[0], null, 2));
      
      console.log('\n🔍 Checking for score/confidence fields in first artist result:');
      const firstArtistResult = artistResults[0];
      const possibleScoreFields = ['score', 'confidence', 'quality', 'rating', 'ext:score'];
      
      possibleScoreFields.forEach(field => {
        if (field in firstArtistResult) {
          console.log(`✅ Found "${field}": ${firstArtistResult[field]}`);
        } else {
          console.log(`❌ No "${field}" field`);
        }
      });
    }

    console.log('\n🎯 Summary:');
    console.log('- MusicBrainz search results analyzed');
    console.log('- Looking for built-in confidence/scoring fields');
    console.log('- Will determine if we can leverage MB scores vs our own Jaccard similarity');

  } catch (error) {
    console.error('❌ Error testing MusicBrainz scores:', error);
  }
}

checkMusicBrainzScores().catch(console.error);
