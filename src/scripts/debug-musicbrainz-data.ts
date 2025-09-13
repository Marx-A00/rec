// src/scripts/debug-musicbrainz-data.ts
import { PrismaClient } from '@prisma/client';
import { musicBrainzService } from '../lib/musicbrainz';

const prisma = new PrismaClient();

async function debugMusicBrainzData() {
  try {
    console.log('🔍 Debug: MusicBrainz Album Data Structure');
    console.log('==========================================');

    // Get Dark Matter album (we know it has a MusicBrainz ID)
    const album = await prisma.album.findFirst({
      where: { title: 'Dark Matter' },
      select: { id: true, title: true, musicbrainzId: true }
    });

    if (!album?.musicbrainzId) {
      console.log('❌ Dark Matter album not found or no MusicBrainz ID');
      return;
    }

    console.log(`📀 Testing album: "${album.title}"`);
    console.log(`   MusicBrainz ID: ${album.musicbrainzId}`);

    // Test the exact same call our enrichment makes
    console.log('\n🔍 Step 1: getReleaseGroup with [\'artists\', \'releases\']');
    const mbData = await musicBrainzService.getReleaseGroup(album.musicbrainzId, ['artists', 'releases']);
    
    if (!mbData) {
      console.log('❌ No MusicBrainz data returned');
      return;
    }

    console.log(`✅ Got MusicBrainz data: "${mbData.title}"`);
    console.log(`   Releases count: ${mbData.releases?.length || 0}`);
    
    if (mbData.releases && mbData.releases.length > 0) {
      console.log('\n📋 Releases:');
      mbData.releases.slice(0, 3).forEach((release: any, i: number) => {
        console.log(`   ${i + 1}. "${release.title}" (${release.id})`);
        console.log(`      Status: ${release.status || 'Unknown'}`);
      });
      
      // Test the getRelease call for tracks
      const primaryRelease = mbData.releases[0];
      console.log(`\n🔍 Step 2: getRelease for "${primaryRelease.title}" with track data`);
      
      const releaseWithTracks = await musicBrainzService.getRelease(primaryRelease.id, [
        'recordings',      // Get all track data
        'artist-credits', // Track-level artist info
        'isrcs',          // Track ISRCs
        'url-rels'        // Track URLs (YouTube, etc.)
      ]);
      
      if (releaseWithTracks?.media) {
        const totalTracks = releaseWithTracks.media.reduce((sum: number, medium: any) => 
          sum + (medium.tracks?.length || 0), 0);
        console.log(`✅ Release has ${totalTracks} tracks across ${releaseWithTracks.media.length} media`);
        
        // Show sample tracks
        if (releaseWithTracks.media[0]?.tracks) {
          console.log('\n🎵 Sample tracks:');
          releaseWithTracks.media[0].tracks.slice(0, 3).forEach((track: any) => {
            console.log(`   ${track.position}. "${track.recording?.title || track.title}"`);
            console.log(`      Recording ID: ${track.recording?.id}`);
            console.log(`      Duration: ${track.recording?.length ? track.recording.length + 'ms' : 'Unknown'}`);
          });
        }
        
        console.log('\n🎯 TRACK DATA IS AVAILABLE - Issue must be in processMusicBrainzTracksForAlbum');
      } else {
        console.log('❌ No media/tracks in release data');
      }
    } else {
      console.log('❌ No releases found in release group data');
      console.log('🔍 This is why tracks are not being created!');
    }

  } catch (error) {
    console.error('❌ Debug failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

debugMusicBrainzData();
