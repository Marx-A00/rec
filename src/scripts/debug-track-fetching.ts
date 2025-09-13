// src/scripts/debug-track-fetching.ts
import { PrismaClient } from '@prisma/client';
import { SpotifyApi } from '@spotify/web-api-ts-sdk';

const prisma = new PrismaClient();

async function debugTrackFetching() {
  try {
    console.log('🔍 Debug: Track Fetching Issue');
    console.log('=====================================');

    // Get one of the recently created albums
    const album = await prisma.album.findFirst({
      where: {
        spotifyId: {
          not: null
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      select: {
        id: true,
        title: true,
        spotifyId: true,
        trackCount: true,
        createdAt: true
      }
    });

    if (!album || !album.spotifyId) {
      console.log('❌ No albums with Spotify IDs found');
      return;
    }

    console.log(`📀 Testing album: "${album.title}"`);
    console.log(`   Spotify ID: ${album.spotifyId}`);
    console.log(`   Expected tracks: ${album.trackCount}`);
    console.log(`   Created: ${album.createdAt}`);

    // Check environment variables
    console.log('\n🔑 Environment Check:');
    console.log(`   SPOTIFY_CLIENT_ID: ${process.env.SPOTIFY_CLIENT_ID ? '✓ Set' : '❌ Missing'}`);
    console.log(`   SPOTIFY_CLIENT_SECRET: ${process.env.SPOTIFY_CLIENT_SECRET ? '✓ Set' : '❌ Missing'}`);

    if (!process.env.SPOTIFY_CLIENT_ID || !process.env.SPOTIFY_CLIENT_SECRET) {
      console.log('❌ Missing Spotify credentials!');
      return;
    }

    // Test Spotify API connection
    console.log('\n🎵 Testing Spotify API...');
    const spotifyClient = SpotifyApi.withClientCredentials(
      process.env.SPOTIFY_CLIENT_ID!,
      process.env.SPOTIFY_CLIENT_SECRET!
    );

    console.log('🔗 Spotify client created, fetching tracks...');
    
    const albumTracks = await spotifyClient.albums.tracks(album.spotifyId!, 'US', 50);
    
    console.log(`✅ Fetched ${albumTracks.items.length} tracks for "${album.title}"`);
    
    if (albumTracks.items.length > 0) {
      console.log('\n🎵 Sample tracks:');
      albumTracks.items.slice(0, 3).forEach((track, i) => {
        console.log(`   ${i + 1}. "${track.name}" (#${track.track_number})`);
        console.log(`      Duration: ${track.duration_ms}ms`);
        console.log(`      Artists: ${track.artists.map(a => a.name).join(', ')}`);
      });
    }

    // Check if tracks exist in our database for this album
    const existingTracks = await prisma.track.count({
      where: {
        albumId: album.id
      }
    });

    console.log(`\n📊 Database tracks for this album: ${existingTracks}`);

    if (existingTracks === 0 && albumTracks.items.length > 0) {
      console.log('🚨 ISSUE FOUND: Spotify has tracks but our database doesn\'t!');
      console.log('   This suggests the track creation failed during album processing.');
    }

  } catch (error) {
    console.error('❌ Error during debugging:', error);
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  debugTrackFetching();
}
