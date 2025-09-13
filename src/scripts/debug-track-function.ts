// src/scripts/debug-track-function.ts
import { PrismaClient } from '@prisma/client';
import { musicBrainzService } from '../lib/musicbrainz';

const prisma = new PrismaClient();

async function debugTrackFunction() {
  try {
    console.log('🔍 Debug: Direct processMusicBrainzTracksForAlbum Test');
    console.log('===================================================');

    // Get Dark Matter album
    const album = await prisma.album.findFirst({
      where: { title: 'Dark Matter' },
      select: { id: true, title: true, musicbrainzId: true }
    });

    if (!album?.musicbrainzId) {
      console.log('❌ Dark Matter album not found');
      return;
    }

    console.log(`📀 Testing album: "${album.title}" (${album.id})`);

    // Get the same data the enrichment function would get
    const mbData = await musicBrainzService.getReleaseGroup(album.musicbrainzId, ['artists', 'releases']);
    const primaryRelease = mbData.releases[0];
    const releaseWithTracks = await musicBrainzService.getRelease(primaryRelease.id, [
      'recordings', 'artist-credits', 'isrcs', 'url-rels'
    ]);

    console.log(`✅ Got release data with ${releaseWithTracks.media?.length || 0} media`);

    // Now test the exact function that should create tracks
    console.log('\n🛠️ Calling processMusicBrainzTracksForAlbum directly...');
    
    // Import and call the function directly
    // But first, let me copy the function logic here to debug step by step
    
    console.log(`🎵 Processing tracks for album ${album.id} from MusicBrainz release`);
    
    // Get existing tracks for this album from our database
    const existingTracks = await prisma.track.findMany({
      where: { albumId: album.id },
      select: {
        id: true,
        title: true,
        trackNumber: true,
        discNumber: true,
        durationMs: true,
        musicbrainzId: true
      }
    });

    console.log(`📊 Existing tracks in DB: ${existingTracks.length}`);

    let tracksProcessed = 0;
    let tracksMatched = 0;
    let tracksUpdated = 0;

    // Process each disc/medium
    for (const medium of releaseWithTracks.media || []) {
      const discNumber = medium.position || 1;
      console.log(`💿 Processing disc ${discNumber} with ${medium.tracks?.length || 0} tracks`);
      
      // Process each track on this disc
      for (const mbTrack of medium.tracks || []) {
        try {
          const trackNumber = mbTrack.position;
          const mbRecording = mbTrack.recording;
          
          if (!mbRecording) {
            console.log(`⚠️ No recording data for track ${trackNumber}`);
            continue;
          }

          console.log(`🎵 Processing track ${trackNumber}: "${mbRecording.title}"`);

          // Since existingTracks is empty (pure approach), this should go to the "else" clause
          const matchingTrack = existingTracks.find(track => 
            track.trackNumber === trackNumber && track.discNumber === discNumber
          );

          if (matchingTrack) {
            console.log(`🔗 Found matching track: "${matchingTrack.title}"`);
            // Update logic here...
          } else {
            // NEW: Create missing track from MusicBrainz data
            console.log(`🆕 Creating new track: "${mbRecording.title}" (${trackNumber})`);
            
            try {
              const newTrack = await (prisma.track as any).create({
                data: {
                  albumId: album.id,
                  title: mbRecording.title,
                  trackNumber,
                  discNumber,
                  durationMs: mbRecording.length ? mbRecording.length * 1000 : null,
                  explicit: false, // MusicBrainz doesn't provide explicit flag
                  previewUrl: null, // No preview URL from MusicBrainz
                  musicbrainzId: mbRecording.id,
                  youtubeUrl: null, // We'll extract this separately
                  dataQuality: 'HIGH',
                  enrichmentStatus: 'COMPLETED',
                  lastEnriched: new Date()
                }
              });
              
              console.log(`✅ Created track: "${newTrack.title}" (${newTrack.id})`);
              tracksMatched++;
              tracksUpdated++;
              
            } catch (trackError) {
              console.error(`❌ Failed to create track "${mbRecording.title}":`, trackError);
            }
          }
          
          tracksProcessed++;
        } catch (error) {
          console.error(`❌ Error processing track ${mbTrack.position}:`, error);
        }
      }
    }

    console.log(`\n📊 Track processing complete:`);
    console.log(`   Processed: ${tracksProcessed}`);
    console.log(`   Matched: ${tracksMatched}`);
    console.log(`   Updated: ${tracksUpdated}`);

    // Check final result
    const finalTrackCount = await prisma.track.count({ where: { albumId: album.id } });
    console.log(`\n🎯 Final tracks in DB for this album: ${finalTrackCount}`);

  } catch (error) {
    console.error('❌ Debug failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

debugTrackFunction();
