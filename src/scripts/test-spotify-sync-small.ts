// src/scripts/test-spotify-sync-small.ts
import { PrismaClient } from '@prisma/client';
import { SpotifyApi } from '@spotify/web-api-ts-sdk';
import { processSpotifyAlbums } from '../lib/spotify/mappers';

const prisma = new PrismaClient();

async function testSmallSpotifySync() {
  try {
    console.log('🎵 Testing Small Spotify Sync (5 albums)');
    console.log('==========================================');

    // Check environment
    if (!process.env.SPOTIFY_CLIENT_ID || !process.env.SPOTIFY_CLIENT_SECRET) {
      console.log('❌ Missing Spotify credentials!');
      return;
    }

    // Create Spotify client
    const spotifyClient = SpotifyApi.withClientCredentials(
      process.env.SPOTIFY_CLIENT_ID!,
      process.env.SPOTIFY_CLIENT_SECRET!
    );

    console.log('🔍 Fetching 5 new releases from Spotify...');
    
    // Fetch just 5 new releases
    const newReleases = await spotifyClient.browse.getNewReleases('US', 5);
    
    console.log(`📀 Found ${newReleases.albums.items.length} new releases:`);
    newReleases.albums.items.forEach((album, i) => {
      console.log(`  ${i + 1}. "${album.name}" by ${album.artists.map(a => a.name).join(', ')}`);
    });

    // Transform to our SpotifyAlbumData format
    const spotifyAlbums = newReleases.albums.items.map(album => ({
      id: album.id,
      name: album.name,
      artists: album.artists.map(artist => ({
        id: artist.id,
        name: artist.name
      })),
      artistIds: album.artists.map(artist => artist.id),
      release_date: album.release_date,
      release_date_precision: album.release_date_precision,
      total_tracks: album.total_tracks,
      images: album.images,
      external_urls: album.external_urls,
      type: album.album_type,
      totalTracks: album.total_tracks
    }));

    console.log('\n🚀 Processing albums through our mappers...');
    
    // Process through our mappers (this should create albums but not tracks)
    const result = await processSpotifyAlbums(spotifyAlbums, 'spotify_sync');
    
    console.log('\n✅ Spotify sync results:');
    console.log(`   Albums processed: ${result.stats.processed}`);
    console.log(`   Albums created: ${result.stats.created}`);
    console.log(`   Duplicates skipped: ${result.stats.duplicatesSkipped}`);
    console.log(`   Errors: ${result.stats.errors}`);

    // Check what was created
    console.log('\n📊 Checking database state...');
    
    const totalAlbums = await prisma.album.count();
    const albumsWithSpotifyIds = await prisma.album.count({
      where: { spotifyId: { not: null } }
    });
    const totalTracks = await prisma.track.count();
    const albumsNeedingEnrichment = await prisma.album.count({
      where: {
        AND: [
          { spotifyId: { not: null } },
          { musicbrainzId: null }
        ]
      }
    });

    console.log(`   Total albums in DB: ${totalAlbums}`);
    console.log(`   Albums with Spotify IDs: ${albumsWithSpotifyIds}`);
    console.log(`   Total tracks in DB: ${totalTracks}`);
    console.log(`   Albums needing enrichment: ${albumsNeedingEnrichment}`);

    if (totalTracks === 0 && albumsWithSpotifyIds > 0) {
      console.log('\n✅ EXPECTED BEHAVIOR: Albums created, no tracks yet (tracks should come from MusicBrainz enrichment)');
    }

    if (albumsNeedingEnrichment > 0) {
      console.log('\n🎯 Next step: Run MusicBrainz enrichment to create tracks');
      console.log('   The worker should process these albums and create tracks from MusicBrainz');
    }

  } catch (error) {
    console.error('❌ Error during small sync test:', error);
  } finally {
    await prisma.$disconnect();
    process.exit(0);
  }
}

if (require.main === module) {
  testSmallSpotifySync();
}
