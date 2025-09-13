// src/scripts/debug-track-creation.ts
import { PrismaClient } from '@prisma/client';
import { musicBrainzService } from '../lib/musicbrainz';

const prisma = new PrismaClient();

async function debugTrackCreation() {
  try {
    console.log('🔍 Debug: Album Enrichment → Track Creation');
    console.log('===========================================');

    // Get an album that was enriched but has no tracks (pure MusicBrainz approach)
    const album = await prisma.album.findFirst({
      where: {
        AND: [
          { musicbrainzId: { not: null } },
          { tracks: { none: {} } }  // No tracks at all
        ]
      },
      select: {
        id: true,
        title: true,
        musicbrainzId: true,
        _count: {
          select: { tracks: true }
        }
      }
    });

    if (!album) {
      console.log('❌ No enriched albums without tracks found');
      return;
    }

    console.log(`📀 Testing album: "${album.title}"`);
    console.log(`   Album ID: ${album.id}`);
    console.log(`   MusicBrainz ID: ${album.musicbrainzId}`);
    console.log(`   Current tracks: ${album._count.tracks}`);

    if (!album.musicbrainzId) {
      console.log('❌ Album has no MusicBrainz ID');
      return;
    }

    console.log('\n🔍 Fetching MusicBrainz release group...');
    
    const mbData = await musicBrainzService.getReleaseGroup(album.musicbrainzId, ['artists', 'tags', 'releases']);
    
    if (!mbData) {
      console.log('❌ Failed to fetch MusicBrainz data');
      return;
    }

    console.log(`✅ Found MusicBrainz data: "${mbData.title}"`);
    console.log(`   Releases: ${mbData.releases?.length || 0}`);

    if (!mbData.releases || mbData.releases.length === 0) {
      console.log('❌ No releases found for this release group');
      return;
    }

    const primaryRelease = mbData.releases[0];
    console.log(`\n🎵 Fetching tracks for primary release: "${primaryRelease.title}"`);

    const releaseWithTracks = await musicBrainzService.getRelease(primaryRelease.id, [
      'recordings',
      'artist-credits',
      'isrcs',
      'url-rels'
    ]);

    if (!releaseWithTracks) {
      console.log('❌ Failed to fetch release with tracks');
      return;
    }

    console.log(`✅ Fetched release data`);
    console.log(`   Media: ${releaseWithTracks.media?.length || 0}`);

    if (!releaseWithTracks.media || releaseWithTracks.media.length === 0) {
      console.log('❌ No media found in release');
      return;
    }

    let totalMBTracks = 0;
    releaseWithTracks.media.forEach((medium: any, i: number) => {
      const trackCount = medium.tracks?.length || 0;
      totalMBTracks += trackCount;
      console.log(`   Medium ${i + 1}: ${trackCount} tracks`);
    });

    console.log(`\n📊 Total MusicBrainz tracks: ${totalMBTracks}`);

    if (totalMBTracks === 0) {
      console.log('❌ No tracks found in MusicBrainz release data');
      return;
    }

    console.log('\n🛠️  Now manually testing track creation logic...');
    
    // Test track creation directly (simplified version of processMusicBrainzTracksForAlbum)
    let tracksCreated = 0;
    
    for (const medium of releaseWithTracks.media || []) {
      const discNumber = medium.position || 1;
      console.log(`\n💿 Processing disc ${discNumber} with ${medium.tracks?.length || 0} tracks`);
      
      for (const mbTrack of medium.tracks || []) {
        try {
          const trackNumber = mbTrack.position;
          const mbRecording = mbTrack.recording;
          
          if (!mbRecording) {
            console.log(`   ⏭️  Skipping track ${trackNumber} (no recording data)`);
            continue;
          }
          
          console.log(`   🆕 Creating track ${trackNumber}: "${mbRecording.title}"`);
          
          const newTrack = await (prisma.track as any).create({
            data: {
              albumId: album.id,
              title: mbRecording.title,
              trackNumber,
              discNumber,
              durationMs: mbRecording.length ? mbRecording.length * 1000 : null,
              explicit: false,
              previewUrl: null,
              musicbrainzId: mbRecording.id,
              youtubeUrl: null, // TODO: extract from url-rels
              dataQuality: 'HIGH',
              enrichmentStatus: 'COMPLETED',
              lastEnriched: new Date()
            }
          });
          
          tracksCreated++;
          console.log(`   ✅ Created track: "${newTrack.title}"`);
          
        } catch (trackError) {
          console.error(`   ❌ Failed to create track ${mbTrack.position}:`, trackError);
        }
      }
    }
    
    console.log(`\n📊 Manual track creation: ${tracksCreated} tracks created`);

    // Check results
    const tracksAfter = await prisma.track.count({
      where: { albumId: album.id }
    });

    console.log(`\n📊 Tracks created: ${tracksAfter}`);

    if (tracksAfter > 0) {
      console.log('✅ SUCCESS: Tracks were created!');
      
      const sampleTracks = await prisma.track.findMany({
        where: { albumId: album.id },
        take: 3,
        select: {
          title: true,
          trackNumber: true,
          musicbrainzId: true,
          youtubeUrl: true
        }
      });
      
      console.log('\n🎵 Sample tracks:');
      sampleTracks.forEach(track => {
        console.log(`   ${track.trackNumber}. "${track.title}"`);
        console.log(`      MB ID: ${track.musicbrainzId || 'None'}`);
        console.log(`      YouTube: ${track.youtubeUrl || 'None'}`);
      });
    } else {
      console.log('❌ FAILED: No tracks were created');
      console.log('   The processMusicBrainzTracksForAlbum function may have an issue');
    }

  } catch (error) {
    console.error('❌ Error during debugging:', error);
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  debugTrackCreation();
}
