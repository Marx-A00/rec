/**
 * Script to check and report on tracks missing artist relationships
 * Usage: npx tsx scripts/check-track-artists.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkTrackArtists() {
  console.log('🔍 Checking track artist relationships...\n');

  // Get total tracks
  const totalTracks = await prisma.track.count();
  console.log(`📊 Total tracks in database: ${totalTracks}`);

  // Get tracks with artists
  const tracksWithArtists = await prisma.track.count({
    where: {
      artists: {
        some: {},
      },
    },
  });

  const tracksWithoutArtists = totalTracks - tracksWithArtists;
  const percentWithoutArtists = ((tracksWithoutArtists / totalTracks) * 100).toFixed(2);

  console.log(`✅ Tracks with artists: ${tracksWithArtists}`);
  console.log(`❌ Tracks without artists: ${tracksWithoutArtists} (${percentWithoutArtists}%)\n`);

  if (tracksWithoutArtists > 0) {
    console.log('📋 Sample tracks without artists:');

    const sampleTracks = await prisma.track.findMany({
      where: {
        artists: {
          none: {},
        },
      },
      include: {
        album: {
          include: {
            artists: {
              include: {
                artist: true,
              },
            },
          },
        },
      },
      take: 10,
    });

    sampleTracks.forEach((track, idx) => {
      console.log(`\n${idx + 1}. "${track.title}"`);
      console.log(`   Album: ${track.album?.title || 'Unknown'}`);
      console.log(`   Album Artists: ${track.album?.artists.map(a => a.artist.name).join(', ') || 'None'}`);
      console.log(`   MusicBrainz ID: ${track.musicbrainzId || 'None'}`);
      console.log(`   ISRC: ${track.isrc || 'None'}`);
      console.log(`   Source: ${track.source}`);
      console.log(`   Data Quality: ${track.dataQuality}`);
    });

    // Check how many have MusicBrainz IDs (can be enriched)
    const tracksWithMbId = await prisma.track.count({
      where: {
        artists: {
          none: {},
        },
        musicbrainzId: {
          not: null,
        },
      },
    });

    const tracksWithIsrc = await prisma.track.count({
      where: {
        artists: {
          none: {},
        },
        isrc: {
          not: null,
        },
      },
    });

    console.log('\n\n🎯 Enrichment potential:');
    console.log(`   Tracks with MusicBrainz ID: ${tracksWithMbId} (can fetch from MusicBrainz API)`);
    console.log(`   Tracks with ISRC: ${tracksWithIsrc} (can search by ISRC)`);
    console.log(`   Tracks with album artists: Can copy from album`);

    // Check tracks where album has artists
    const tracksWithAlbumArtists = await prisma.track.count({
      where: {
        artists: {
          none: {},
        },
        album: {
          artists: {
            some: {},
          },
        },
      },
    });

    console.log(`   Tracks where album HAS artists: ${tracksWithAlbumArtists} (easy fix!)\n`);
  }

  await prisma.$disconnect();
}

checkTrackArtists().catch((error) => {
  console.error('Error:', error);
  process.exit(1);
});
