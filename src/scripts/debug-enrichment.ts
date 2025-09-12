// src/scripts/debug-enrichment.ts
/**
 * Debug enrichment process by manually triggering enrichment for one album
 */

import { PrismaClient } from '@prisma/client';
import { getMusicBrainzQueue, JOB_TYPES } from '../lib/queue';

const prisma = new PrismaClient();

async function debugEnrichment() {
  console.log('🔍 Debug Album Enrichment Process');
  console.log('=================================\n');
  
  // Get the first album
  const album = await prisma.album.findFirst({
    include: { artists: { include: { artist: true } } }
  });
  
  if (!album) {
    console.log('❌ No albums found in database');
    return;
  }
  
  console.log(`🎵 Testing enrichment for: "${album.title}" by ${album.artists[0]?.artist.name}`);
  console.log(`📊 Current status: ${album.enrichmentStatus}, Data quality: ${album.dataQuality}`);
  console.log(`🔗 Current MusicBrainz ID: ${album.musicbrainzId || 'None'}\n`);
  
  // Queue a new enrichment job
  try {
    const queue = getMusicBrainzQueue();
    
    console.log('🔄 Queueing ENRICH_ALBUM job...');
    const job = await queue.addJob(JOB_TYPES.ENRICH_ALBUM, {
      albumId: album.id,
      priority: 'high',
      userAction: 'manual_debug',
      requestId: `debug-${Date.now()}`
    }, {
      priority: 1, // High priority
      attempts: 1   // Single attempt for cleaner logs
    });
    
    console.log(`✅ Job queued with ID: ${job.id}`);
    console.log('📡 Waiting for job to complete...\n');
    
    // Wait for the job to complete and show the result
    const result = await job.finished();
    
    console.log('🎯 Job completed! Result:');
    console.log(JSON.stringify(result, null, 2));
    
    // Check the album status after enrichment
    const updatedAlbum = await prisma.album.findUnique({
      where: { id: album.id },
      include: { artists: { include: { artist: true } } }
    });
    
    console.log('\n📊 Updated Album Status:');
    console.log(`   MusicBrainz ID: ${updatedAlbum?.musicbrainzId || 'None'}`);
    console.log(`   Enrichment Status: ${updatedAlbum?.enrichmentStatus}`);
    console.log(`   Data Quality: ${updatedAlbum?.dataQuality}`);
    console.log(`   Last Enriched: ${updatedAlbum?.lastEnriched}`);
    
  } catch (error) {
    console.error('❌ Enrichment failed:', error);
  }
  
  await prisma.$disconnect();
}

debugEnrichment()
  .then(() => {
    console.log('\n✅ Debug completed!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Debug failed:', error);
    process.exit(1);
  });
