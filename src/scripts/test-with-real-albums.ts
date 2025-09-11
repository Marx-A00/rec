// src/scripts/test-with-real-albums.ts
/**
 * Test enrichment jobs using real albums from the database
 * This will show real enrichment checking in Bull Board
 */

import { PrismaClient } from '@prisma/client';
import { getMusicBrainzQueue, JOB_TYPES } from '../lib/queue';
import type { CheckAlbumEnrichmentJobData, CheckArtistEnrichmentJobData } from '../lib/queue/jobs';

async function testWithRealAlbums() {
  console.log('🚀 Testing enrichment jobs with real albums from database...');
  console.log('📊 These will show up in Bull Board at: http://localhost:3000/admin/queuedash');
  
  const prisma = new PrismaClient();
  const queue = getMusicBrainzQueue();
  
  try {
    // Get some real albums from the database
    const existingAlbums = await prisma.album.findMany({
      take: 3,
      include: {
        artists: {
          include: {
            artist: true,
          }
        }
      }
    });

    console.log(`📀 Found ${existingAlbums.length} albums in database`);

    if (existingAlbums.length === 0) {
      console.log('⚠️  No albums found in database. Creating test albums...');
      
      // Create a test album if none exist
      const testAlbum = await prisma.album.create({
        data: {
          title: 'Test Album for Enrichment',
          releaseDate: new Date('2023-01-01'),
          dataQuality: 'LOW',
          enrichmentStatus: 'PENDING',
          // Don't set musicbrainzId so it needs enrichment
        }
      });

      const testArtist = await prisma.artist.create({
        data: {
          name: 'Test Artist for Enrichment',
          dataQuality: 'LOW',
          enrichmentStatus: 'PENDING',
          // Don't set musicbrainzId so it needs enrichment
        }
      });

      // Link them
      await prisma.albumArtist.create({
        data: {
          albumId: testAlbum.id,
          artistId: testArtist.id,
          role: 'PRIMARY',
        }
      });

      console.log(`✅ Created test album: ${testAlbum.id} and artist: ${testArtist.id}`);
      
      // Re-fetch with relations
      const albumWithArtists = await prisma.album.findUnique({
        where: { id: testAlbum.id },
        include: {
          artists: {
            include: {
              artist: true,
            }
          }
        }
      });

      if (albumWithArtists) {
        existingAlbums.push(albumWithArtists);
      }
    }

    console.log('\n📝 Adding CHECK_ALBUM_ENRICHMENT jobs for real albums...');

    // Add check jobs for real albums
    for (const [index, album] of existingAlbums.entries()) {
      const jobData: CheckAlbumEnrichmentJobData = {
        albumId: album.id,
        source: index === 0 ? 'collection_add' : index === 1 ? 'recommendation_create' : 'search',
        priority: index === 0 ? 'high' : 'medium',
        requestId: `test-real-album-${Date.now()}-${index}`,
      };

      const job = await queue.addJob(JOB_TYPES.CHECK_ALBUM_ENRICHMENT, jobData, {
        priority: jobData.priority === 'high' ? 10 : 5,
        attempts: 3,
        removeOnComplete: false,
        removeOnFail: false,
      });

      console.log(`  ✅ Added check job for album "${album.title}":`, {
        jobId: job.id,
        albumId: album.id,
        source: jobData.source,
        currentDataQuality: album.dataQuality,
        currentEnrichmentStatus: album.enrichmentStatus,
        needsEnrichment: !album.musicbrainzId || !album.lastEnriched || album.dataQuality === 'LOW',
      });

      // Also add artist check jobs for this album's artists
      for (const albumArtist of album.artists) {
        const artistJobData: CheckArtistEnrichmentJobData = {
          artistId: albumArtist.artist.id,
          source: 'collection_add',
          priority: 'medium',
          requestId: `test-real-artist-${Date.now()}-${albumArtist.artist.id.substring(0, 8)}`,
        };

        const artistJob = await queue.addJob(JOB_TYPES.CHECK_ARTIST_ENRICHMENT, artistJobData, {
          priority: 5,
          attempts: 3,
          removeOnComplete: false,
          removeOnFail: false,
        });

        console.log(`    🎤 Added check job for artist "${albumArtist.artist.name}":`, {
          jobId: artistJob.id,
          artistId: albumArtist.artist.id,
          currentDataQuality: albumArtist.artist.dataQuality,
          needsEnrichment: !albumArtist.artist.musicbrainzId || !albumArtist.artist.lastEnriched,
        });
      }

      await new Promise(resolve => setTimeout(resolve, 100));
    }

    // Get queue stats
    const stats = await queue.getStats();
    console.log('\n📊 Current Queue Stats:');
    console.log(`  Waiting: ${stats.waiting}`);
    console.log(`  Active: ${stats.active}`);
    console.log(`  Completed: ${stats.completed}`);
    console.log(`  Failed: ${stats.failed}`);

    console.log('\n🎯 Real enrichment check jobs added successfully!');
    console.log('📊 View them in Bull Board: http://localhost:3000/admin/queuedash');
    console.log('\n💡 These jobs will:');
    console.log('  1. ✅ Successfully fetch albums/artists from database');
    console.log('  2. 🧠 Apply our smart enrichment logic');
    console.log('  3. 🎵 Queue actual ENRICH jobs if needed');
    console.log('  4. ❌ Skip albums that are already well-enriched');

  } catch (error) {
    console.error('❌ Failed to test with real albums:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run if executed directly
if (require.main === module) {
  testWithRealAlbums()
    .then(() => {
      console.log('\n✨ Real album enrichment test completed!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Test failed:', error);
      process.exit(1);
    });
}

export { testWithRealAlbums };
