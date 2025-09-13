// src/scripts/test-spotify-mappers.ts
/**
 * Test script for Spotify data mappers
 * Tests transformation from cached Spotify data → Database records → Enrichment queue
 */

import { prisma } from '../lib/prisma';
import { 
  processCachedSpotifyData, 
  processSpotifyAlbums,
  parseSpotifyDate,
  mapAlbumType,
  parseArtistNames,
  transformSpotifyAlbum 
} from '../lib/spotify/mappers';
import type { SpotifyAlbumData } from '../lib/spotify/types';

// ============================================================================
// Test Data
// ============================================================================

const MOCK_SPOTIFY_ALBUMS: SpotifyAlbumData[] = [
  {
    id: 'spotify_test_1',
    name: 'Test Album 1',
    artists: 'Test Artist 1, Test Artist 2',
    artistIds: ['spotify_artist_1', 'spotify_artist_2'],
    releaseDate: '2025-01-15',
    image: 'https://example.com/image1.jpg',
    spotifyUrl: 'https://spotify.com/album/test1',
    type: 'album',
    totalTracks: 12
  },
  {
    id: 'spotify_test_2', 
    name: 'Test Single',
    artists: 'Solo Artist',
    artistIds: ['spotify_artist_3'],
    releaseDate: '2025',
    image: null,
    spotifyUrl: 'https://spotify.com/album/test2',
    type: 'single',
    totalTracks: 1
  }
];

// ============================================================================
// Test Functions
// ============================================================================

async function testUtilityFunctions() {
  console.log('\n🧪 Testing utility functions...\n');

  // Test date parsing
  console.log('📅 Date parsing tests:');
  const dateTests = ['2025-01-15', '2025-01', '2025', 'invalid', ''];
  for (const dateStr of dateTests) {
    const result = parseSpotifyDate(dateStr);
    console.log(`  "${dateStr}" → ${result.date?.toISOString().split('T')[0] || 'null'} (${result.precision})`);
  }

  // Test album type mapping
  console.log('\n🎵 Album type mapping tests:');
  const typeTests = ['album', 'single', 'compilation', 'ep', 'unknown'];
  for (const type of typeTests) {
    const mapped = mapAlbumType(type);
    console.log(`  "${type}" → "${mapped}"`);
  }

  // Test artist name parsing
  console.log('\n👥 Artist name parsing tests:');
  const artistTests = ['Artist 1, Artist 2', 'Solo Artist', 'A, B, C', ''];
  for (const artistStr of artistTests) {
    const parsed = parseArtistNames(artistStr);
    console.log(`  "${artistStr}" → [${parsed.map(a => `"${a}"`).join(', ')}]`);
  }
}

async function testAlbumTransformation() {
  console.log('\n🎵 Testing album transformation...\n');

  for (const spotifyAlbum of MOCK_SPOTIFY_ALBUMS) {
    console.log(`Transforming: "${spotifyAlbum.name}"`);
    const transformed = transformSpotifyAlbum(spotifyAlbum);
    
    console.log('  Input:', {
      name: spotifyAlbum.name,
      releaseDate: spotifyAlbum.releaseDate,
      type: spotifyAlbum.type,
      totalTracks: spotifyAlbum.totalTracks
    });
    
    console.log('  Output:', {
      title: transformed.title,
      releaseDate: transformed.releaseDate?.toISOString().split('T')[0],
      releaseType: transformed.releaseType,
      trackCount: transformed.trackCount,
      dataQuality: transformed.dataQuality,
      enrichmentStatus: transformed.enrichmentStatus
    });
    console.log('');
  }
}

async function testDatabaseIntegration() {
  console.log('\n💾 Testing database integration...\n');

  try {
    // Clear any existing test data
    await prisma.albumArtist.deleteMany({
      where: {
        album: {
          title: {
            startsWith: 'Test'
          }
        }
      }
    });
    
    await prisma.album.deleteMany({
      where: {
        title: {
          startsWith: 'Test'
        }
      }
    });

    await prisma.artist.deleteMany({
      where: {
        name: {
          startsWith: 'Test'
        }
      }
    });

    console.log('🧹 Cleared existing test data');

    // Process mock albums
    const result = await processSpotifyAlbums(MOCK_SPOTIFY_ALBUMS, 'test_script');
    
    console.log('📊 Processing results:', result.stats);

    // Verify data was created
    const createdAlbums = await prisma.album.findMany({
      where: {
        title: {
          startsWith: 'Test'
        }
      },
      include: {
        artists: {
          include: {
            artist: true
          }
        }
      }
    });

    console.log(`\n✅ Created ${createdAlbums.length} albums:`);
    for (const album of createdAlbums) {
      console.log(`  📀 "${album.title}" (${album.releaseType})`);
      console.log(`     Release: ${album.releaseDate?.toISOString().split('T')[0] || 'Unknown'}`);
      console.log(`     Quality: ${album.dataQuality}, Status: ${album.enrichmentStatus}`);
      console.log(`     Artists: ${album.artists.map(a => a.artist.name).join(', ')}`);
      console.log('');
    }

  } catch (error) {
    console.error('❌ Database integration test failed:', error);
    throw error;
  }
}

async function testCachedDataProcessing() {
  console.log('\n📦 Testing cached data processing...\n');

  try {
    // Check if we have cached Spotify data
    const cached = await prisma.cacheData.findUnique({
      where: { key: 'spotify_trending' }
    });

    if (!cached) {
      console.log('⚠️  No cached Spotify data found. Run the Spotify sync API first:');
      console.log('   curl http://localhost:3000/api/spotify/sync');
      return;
    }

    console.log(`📊 Found cached data from: ${cached.updatedAt.toISOString()}`);
    
    const spotifyData = cached.data as any;
    console.log(`📀 Albums in cache: ${spotifyData.newReleases?.length || 0}`);

    if (spotifyData.newReleases?.length > 0) {
      console.log('\n🎵 Sample albums from cache:');
      for (let i = 0; i < Math.min(3, spotifyData.newReleases.length); i++) {
        const album = spotifyData.newReleases[i];
        console.log(`  ${i + 1}. "${album.name}" by ${album.artists}`);
      }

      // Ask user if they want to process the cached data
      console.log('\n⚠️  This will process cached Spotify data into your database.');
      console.log('   This may create many new album and artist records.');
      console.log('   To proceed, uncomment the line below and run again.\n');
      
      // Uncomment this line to actually process cached data:
      // const result = await processCachedSpotifyData();
      // console.log('✅ Processed cached data:', result.stats);
    }

  } catch (error) {
    console.error('❌ Cached data processing test failed:', error);
  }
}

// ============================================================================
// Main Test Runner
// ============================================================================

async function main() {
  console.log('🚀 Testing Spotify Data Mappers\n');
  console.log('=' .repeat(50));

  try {
    await testUtilityFunctions();
    await testAlbumTransformation();
    await testDatabaseIntegration();
    await testCachedDataProcessing();

    console.log('\n✅ All tests completed successfully!');
    
  } catch (error) {
    console.error('\n❌ Test failed:', error);
    process.exit(1);
  } finally {
    // Clean up all connections
    await prisma.$disconnect();
    
    // Close any queue connections
    try {
      const { getMusicBrainzQueue } = await import('../lib/queue');
      const queue = getMusicBrainzQueue();
      await queue.close();
    } catch (error) {
      // Queue might not be initialized, that's ok
    }
    
    process.exit(0); // Force exit after cleanup
  }
}

// Run tests
main().catch(console.error);
