// src/scripts/manual-album-test.ts
/**
 * Manually test album enrichment to see what's happening
 */

import { musicBrainzService } from '../lib/musicbrainz';

// Test the exact same logic as the processor
function calculateStringSimilarity(str1: string, str2: string): number {
  const longer = str1.length > str2.length ? str1 : str2;
  const shorter = str1.length > str2.length ? str2 : str1;
  
  if (longer.length === 0) return 1.0;
  
  const editDistance = levenshteinDistance(longer, shorter);
  return (longer.length - editDistance) / longer.length;
}

function levenshteinDistance(str1: string, str2: string): number {
  const matrix = [];
  
  for (let i = 0; i <= str2.length; i++) {
    matrix[i] = [i];
  }
  
  for (let j = 0; j <= str1.length; j++) {
    matrix[0][j] = j;
  }
  
  for (let i = 1; i <= str2.length; i++) {
    for (let j = 1; j <= str1.length; j++) {
      if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }
  
  return matrix[str2.length][str1.length];
}

function findBestAlbumMatch(album: any, searchResults: any[]): { result: any; score: number } | null {
  let bestMatch = null;
  let bestScore = 0;

  for (const result of searchResults) {
    let score = 0;

    // Title similarity (most important)
    if (result.title && album.title) {
      score += calculateStringSimilarity(result.title.toLowerCase(), album.title.toLowerCase()) * 0.6;
    }

    // Artist similarity
    if (result.artistCredit && album.artists && album.artists.length > 0) {
      const resultArtists = result.artistCredit.map((ac: any) => ac.name?.toLowerCase() || '');
      const albumArtists = album.artists.map((a: any) => a.artist?.name?.toLowerCase() || '');
      
      let artistScore = 0;
      for (const albumArtist of albumArtists) {
        for (const resultArtist of resultArtists) {
          artistScore = Math.max(artistScore, calculateStringSimilarity(albumArtist, resultArtist));
        }
      }
      score += artistScore * 0.4;
    }

    if (score > bestScore) {
      bestScore = score;
      bestMatch = { result, score };
    }
  }

  return bestMatch;
}

function buildAlbumSearchQuery(album: any): string {
  const primaryArtist = album.artists[0]?.artist;
  if (!primaryArtist) {
    return `release:"${album.title}"`;
  }
  return `release:"${album.title}" AND artist:"${primaryArtist.name}"`;
}

async function testAlbumEnrichment() {
  console.log('🧪 Manual Album Enrichment Test');
  console.log('================================\n');
  
  // Test album data (simulating what processor gets)
  const testAlbum = {
    title: "Discovery",
    artists: [
      {
        artist: {
          name: "Daft Punk",
          musicbrainzId: "056e4f3e-d505-4dad-8ec1-d04f521cbb56"
        }
      }
    ]
  };
  
  console.log(`🎵 Testing: "${testAlbum.title}" by ${testAlbum.artists[0].artist.name}`);
  
  try {
    // Step 1: Build search query
    const searchQuery = buildAlbumSearchQuery(testAlbum);
    console.log(`📡 Search Query: ${searchQuery}`);
    
    // Step 2: Search MusicBrainz
    const searchResults = await musicBrainzService.searchReleaseGroups(searchQuery, 5);
    console.log(`📦 Search Results: ${searchResults.length} found`);
    
    if (searchResults.length > 0) {
      // Step 3: Find best match
      const bestMatch = findBestAlbumMatch(testAlbum, searchResults);
      
      if (bestMatch) {
        console.log(`🏆 Best Match: "${bestMatch.result.title}" (Score: ${(bestMatch.score * 100).toFixed(1)}%)`);
        console.log(`🎯 Exceeds 80% threshold: ${bestMatch.score > 0.8 ? '✅ YES' : '❌ NO'}`);
        
        if (bestMatch.score > 0.8) {
          console.log(`🔗 MusicBrainz ID: ${bestMatch.result.id}`);
          
          // Step 4: Get detailed data
          console.log('📊 Fetching detailed release group data...');
          const mbData = await musicBrainzService.getReleaseGroup(bestMatch.result.id, ['artists']);
          
          console.log('🎵 Detailed MusicBrainz Data:');
          console.log(JSON.stringify(mbData, null, 2));
          
          console.log('\\n✅ This would be saved to the database!');
        } else {
          console.log('❌ Score too low, would not be saved');
        }
      } else {
        console.log('❌ No matches found');
      }
    } else {
      console.log('❌ No search results');
    }
    
  } catch (error) {
    console.error('💥 Error:', error);
  }
}

testAlbumEnrichment()
  .then(() => {
    console.log('\\n✅ Manual test completed!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Test failed:', error);
    process.exit(1);
  });
