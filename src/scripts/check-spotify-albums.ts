// src/scripts/check-spotify-albums.ts
import { prisma } from '../lib/prisma';

async function main() {
  console.log('🔍 Checking for albums with Spotify IDs...\n');

  try {
    // Check for any albums with Spotify IDs
    const albumsWithSpotifyIds = await prisma.album.findMany({
      where: {
        spotifyId: {
          not: null
        }
      },
      select: {
        id: true,
        title: true,
        spotifyId: true,
        spotifyUrl: true,
        createdAt: true
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 10
    });

    console.log(`📀 Found ${albumsWithSpotifyIds.length} albums with Spotify IDs:`);
    albumsWithSpotifyIds.forEach(album => {
      console.log(`  🎵 "${album.title}"`);
      console.log(`     Spotify ID: ${album.spotifyId}`);
      console.log(`     Created: ${album.createdAt.toISOString()}`);
      console.log('');
    });

    // Check for recent albums (last 10 minutes)
    const recentAlbums = await prisma.album.findMany({
      where: {
        createdAt: {
          gte: new Date(Date.now() - 10 * 60 * 1000)
        }
      },
      select: {
        id: true,
        title: true,
        spotifyId: true,
        spotifyUrl: true,
        createdAt: true
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 10
    });

    console.log(`\n⏰ Found ${recentAlbums.length} albums created in the last 10 minutes:`);
    recentAlbums.forEach(album => {
      console.log(`  🎵 "${album.title}"`);
      console.log(`     Spotify ID: ${album.spotifyId || 'null'}`);
      console.log(`     Created: ${album.createdAt.toISOString()}`);
      console.log('');
    });

    // Check total album count
    const totalAlbums = await prisma.album.count();
    console.log(`📊 Total albums in database: ${totalAlbums}`);

    // Check for specific test albums
    const testAlbums = await prisma.album.findMany({
      where: {
        OR: [
          { title: { contains: 'Test' } },
          { title: { contains: 'THE TORTURED POETS DEPARTMENT' } },
          { title: { contains: 'Dark Matter' } },
          { title: { contains: 'HERicane' } }
        ]
      },
      select: {
        id: true,
        title: true,
        spotifyId: true,
        createdAt: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    console.log(`\n🔍 Found ${testAlbums.length} test/duplicate albums:`);
    testAlbums.forEach(album => {
      console.log(`  🎵 "${album.title}"`);
      console.log(`     Spotify ID: ${album.spotifyId || 'null'}`);
      console.log(`     Created: ${album.createdAt.toISOString()}`);
      console.log('');
    });

  } catch (error) {
    console.error('❌ Database check failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch(console.error);
