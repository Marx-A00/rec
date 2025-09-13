// src/scripts/test-album-enrichment-with-tracks.ts
import { PrismaClient } from '@prisma/client';
import { getMusicBrainzQueue } from '../lib/queue/musicbrainz-queue';

const prisma = new PrismaClient();

async function testAlbumEnrichmentWithTracks() {
  try {
    console.log('🎵 Testing Album Enrichment → Track Creation');
    console.log('=============================================');

    // Find albums that need enrichment
    const albumsToEnrich = await prisma.album.findMany({
      where: {
        AND: [
          { spotifyId: { not: null } },
          { musicbrainzId: null }
        ]
      },
      select: {
        id: true,
        title: true,
        _count: {
          select: {
            tracks: true
          }
        }
      },
      take: 3 // Test with just 3 albums
    });

    if (albumsToEnrich.length === 0) {
      console.log('❌ No albums found that need enrichment');
      return;
    }

    console.log(`📀 Found ${albumsToEnrich.length} albums to test:`);
    albumsToEnrich.forEach((album, i) => {
      console.log(`  ${i + 1}. "${album.title}" (${album._count.tracks} tracks)`);
    });

    console.log('\n🔄 Queuing enrichment jobs...');
    
    const queue = getMusicBrainzQueue();
    const jobIds: string[] = [];
    
    for (const album of albumsToEnrich) {
      const jobData = {
        albumId: album.id,
        priority: 'high' as const,
        userAction: 'manual' as const,
        requestId: `track_creation_test_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      };

      const job = await queue.addJob('enrichment:album', jobData, {
        priority: 1, // Highest priority
        attempts: 3,
        backoff: { type: 'exponential' as const, delay: 2000 },
      });
      
      jobIds.push(job.id!);
      console.log(`  ✅ Queued: "${album.title}" (job ${job.id})`);
    }
    
    console.log('\n⏳ Jobs queued! The worker should process these soon...');
    console.log('📊 Expected results:');
    console.log('   - Albums should get MusicBrainz IDs');
    console.log('   - Tracks should be CREATED from MusicBrainz data');
    console.log('   - Track-artist relationships should be established');
    console.log('   - YouTube URLs should be extracted if available');
    
    console.log('\n🔍 Monitor progress:');
    console.log('   - Check Bull Board dashboard for job status');
    console.log('   - Run: npx tsx -e "import { PrismaClient } from \'@prisma/client\'; const p = new PrismaClient(); p.track.count().then(c => console.log(`Tracks: ${c}`)); p.$disconnect();"');
    
    console.log('\n🎯 Job IDs to track:', jobIds.join(', '));

  } catch (error) {
    console.error('❌ Error during enrichment test:', error);
  } finally {
    await prisma.$disconnect();
    process.exit(0);
  }
}

if (require.main === module) {
  testAlbumEnrichmentWithTracks();
}
