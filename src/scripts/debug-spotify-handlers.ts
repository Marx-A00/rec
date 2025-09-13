// src/scripts/debug-spotify-handlers.ts
/**
 * Debug script to test Spotify job handlers directly
 * This will help us see what's failing in the job processing
 */

import { prisma } from '../lib/prisma';

async function testSpotifyNewReleasesHandler() {
  console.log('🔍 Testing Spotify New Releases Handler directly...\n');

  try {
    // Import the handler function directly
    const { processMusicBrainzJob } = await import('../lib/queue/musicbrainz-processor');
    const { JOB_TYPES } = await import('../lib/queue/jobs');

    // Create mock job data
    const mockJobData = {
      limit: 3,
      country: 'US',
      priority: 'medium' as const,
      source: 'manual' as const,
      requestId: `debug_${Date.now()}`
    };

    console.log('📋 Mock job data:', mockJobData);

    // Create a mock job object
    const mockJob = {
      id: 'debug-job-123',
      name: JOB_TYPES.SPOTIFY_SYNC_NEW_RELEASES,
      data: mockJobData,
      returnvalue: undefined,
      failedReason: undefined,
      getState: async () => 'active' as const
    } as any;

    console.log('🚀 Calling processMusicBrainzJob...\n');

    // Call the processor directly
    const result = await processMusicBrainzJob(mockJob);

    console.log('✅ Handler result:', JSON.stringify(result, null, 2));

    // Check if any albums were created
    const recentAlbums = await prisma.album.findMany({
      where: {
        createdAt: {
          gte: new Date(Date.now() - 2 * 60 * 1000) // Last 2 minutes
        }
      },
      include: {
        artists: {
          include: {
            artist: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 5
    });

    console.log(`\n📀 Found ${recentAlbums.length} albums created in the last 2 minutes:`);
    
    for (const album of recentAlbums) {
      console.log(`  🎵 "${album.title}"`);
      console.log(`     Spotify ID: ${album.spotifyId}`);
      console.log(`     Artists: ${album.artists.map(a => a.artist.name).join(', ')}`);
      console.log(`     Created: ${album.createdAt.toISOString()}`);
      console.log('');
    }

    return result;

  } catch (error) {
    console.error('❌ Handler test failed:', error);
    
    // Log the full error details
    if (error instanceof Error) {
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
    }
    
    throw error;
  }
}

async function testSpotifyMappers() {
  console.log('\n🔧 Testing Spotify mappers directly...\n');

  try {
    // Import mappers
    const { 
      transformSpotifyAlbum, 
      transformSpotifyArtist,
      processSpotifyAlbum 
    } = await import('../lib/spotify/mappers');

    // Mock Spotify album data
    const mockSpotifyAlbum = {
      id: 'test-album-123',
      name: 'Test Album',
      artists: 'Test Artist',
      artistIds: ['test-artist-123'],
      releaseDate: '2024-01-01',
      image: 'https://example.com/image.jpg',
      spotifyUrl: 'https://open.spotify.com/album/test-album-123',
      type: 'album' as const,
      totalTracks: 10
    };

    console.log('📋 Mock Spotify album:', mockSpotifyAlbum);

    // Test transformation
    const transformedAlbum = transformSpotifyAlbum(mockSpotifyAlbum);
    console.log('🔄 Transformed album:', transformedAlbum);

    // Test artist parsing
    const artistNames = ['Test Artist'];
    const spotifyArtistIds = ['test-artist-123'];

    console.log('🎤 Artist names:', artistNames);
    console.log('🆔 Spotify artist IDs:', spotifyArtistIds);

    // Test album creation
    console.log('\n🚀 Creating album and artists...');
    
    const createdAlbum = await processSpotifyAlbum(
      mockSpotifyAlbum,
      'manual'
    );

    console.log('✅ Created album:', {
      id: createdAlbum.id,
      title: createdAlbum.title,
      spotifyId: createdAlbum.spotifyId,
      spotifyUrl: createdAlbum.spotifyUrl
    });

    return createdAlbum;

  } catch (error) {
    console.error('❌ Mapper test failed:', error);
    
    if (error instanceof Error) {
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
    }
    
    throw error;
  }
}

async function main() {
  console.log('🐛 Debugging Spotify Job Handlers\n');
  console.log('=' .repeat(50));

  try {
    // Test 1: Test mappers directly
    await testSpotifyMappers();
    
    // Wait a bit
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Test 2: Test job handler
    await testSpotifyNewReleasesHandler();

    console.log('\n🎉 All debug tests completed!');

  } catch (error) {
    console.error('\n❌ Debug failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
    process.exit(0);
  }
}

main().catch(console.error);
