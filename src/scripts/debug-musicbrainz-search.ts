// src/scripts/debug-musicbrainz-search.ts
/**
 * Debug script to test MusicBrainz searches and see actual results
 * This will show us what the API returns vs what our matching logic decides
 */

import { musicBrainzService } from '../lib/musicbrainz';

// Test albums from our sample data
const testAlbums = [
  {
    title: "Discovery",
    artist: "Daft Punk",
    releaseDate: "2001-02-26"
  },
  {
    title: "Random Access Memories", 
    artist: "Daft Punk",
    releaseDate: "2013-05-17"
  },
  {
    title: "In Rainbows",
    artist: "Radiohead",
    releaseDate: "2007-10-10"
  },
  {
    title: "OK Computer",
    artist: "Radiohead", 
    releaseDate: "1997-06-16"
  },
  {
    title: "The Dark Side of the Moon",
    artist: "Pink Floyd",
    releaseDate: "1973-03-01"
  }
];

// Simulate the current search query builder
function buildCurrentSearchQuery(album: any): string {
  return `release:"${album.title}" AND artist:"${album.artist}"`;
}

// Alternative search approaches
function buildFlexibleSearchQuery(album: any): string {
  return `${album.title} ${album.artist}`;
}

function buildArtistFirstQuery(album: any): string {
  return `artist:"${album.artist}" AND release:"${album.title}"`;
}

// String similarity function (simplified version)
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

// Test a single album with different search strategies
async function testAlbumSearch(album: any) {
  console.log(`\n🎵 Testing: "${album.title}" by ${album.artist}`);
  console.log('=' .repeat(60));
  
  const searchStrategies = [
    { name: 'Current (Strict)', query: buildCurrentSearchQuery(album) },
    { name: 'Flexible', query: buildFlexibleSearchQuery(album) },
    { name: 'Artist First', query: buildArtistFirstQuery(album) },
  ];
  
  for (const strategy of searchStrategies) {
    console.log(`\n📡 ${strategy.name} Query: "${strategy.query}"`);
    
    try {
      const results = await musicBrainzService.searchReleaseGroups(strategy.query, 5);
      
      if (!results || results.length === 0) {
        console.log('  ❌ No results found');
        continue;
      }
      
      console.log(`  ✅ Found ${results.length} results:`);
      
      for (const [i, result] of results.entries()) {
        // Calculate similarity scores
        const titleSimilarity = calculateStringSimilarity(
          result.title?.toLowerCase() || '', 
          album.title.toLowerCase()
        );
        
        const artistSimilarity = result.artistCredit ? 
          Math.max(...result.artistCredit.map((ac: any) => 
            calculateStringSimilarity(
              ac.name?.toLowerCase() || '', 
              album.artist.toLowerCase()
            )
          )) : 0;
        
        const totalScore = (titleSimilarity * 0.6) + (artistSimilarity * 0.4);
        
        console.log(`    ${i + 1}. "${result.title}" by ${result.artistCredit?.map((ac: any) => ac.name).join(', ') || 'Unknown'}`);
        console.log(`       📊 Title: ${(titleSimilarity * 100).toFixed(1)}%, Artist: ${(artistSimilarity * 100).toFixed(1)}%, Total: ${(totalScore * 100).toFixed(1)}%`);
        console.log(`       🎯 Would match current threshold (80%): ${totalScore > 0.8 ? '✅ YES' : '❌ NO'}`);
        console.log(`       🎯 Would match relaxed threshold (60%): ${totalScore > 0.6 ? '✅ YES' : '❌ NO'}`);
        
        if (result.id) {
          console.log(`       🔗 MusicBrainz ID: ${result.id}`);
        }
        
        if (result['first-release-date']) {
          console.log(`       📅 Release Date: ${result['first-release-date']} (Expected: ${album.releaseDate})`);
        }
      }
      
    } catch (error) {
      console.log(`  💥 Search failed: ${error}`);
    }
    
    // Small delay between searches to be nice to the API
    await new Promise(resolve => setTimeout(resolve, 1100));
  }
}

async function runDebugTests() {
  console.log('🔍 MusicBrainz Album Search Debug Tool');
  console.log('Testing different search strategies for sample albums...\n');
  
  for (const album of testAlbums) {
    await testAlbumSearch(album);
    console.log('\n' + '='.repeat(80));
  }
  
  console.log('\n✨ Debug complete! Now you can see:');
  console.log('  1. Which search strategies work best');
  console.log('  2. What similarity scores we actually get');
  console.log('  3. Whether to adjust thresholds or search queries');
  console.log('  4. The actual MusicBrainz data available');
}

// Run if executed directly
if (require.main === module) {
  runDebugTests()
    .then(() => {
      console.log('\n🎯 Debug session completed!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Debug failed:', error);
      process.exit(1);
    });
}

export { runDebugTests };
