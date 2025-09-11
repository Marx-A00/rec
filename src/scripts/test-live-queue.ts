// src/scripts/test-live-queue.ts
/**
 * Live test script to add CHECK_ENRICHMENT jobs to the queue
 * These will show up in your Bull Board dashboard immediately!
 */

import { getMusicBrainzQueue, JOB_TYPES } from '../lib/queue';
import type { CheckAlbumEnrichmentJobData, CheckArtistEnrichmentJobData } from '../lib/queue/jobs';
import { randomUUID } from 'crypto';

async function addLiveEnrichmentJobs() {
  console.log('🚀 Adding live enrichment check jobs to queue...');
  console.log('📊 These will show up in Bull Board at: http://localhost:3000/admin/queuedash');
  
  const queue = getMusicBrainzQueue();
  
  // Sample album enrichment checks (simulating real user actions)
  // Using real UUIDs since the database expects UUID format
  const albumChecks: CheckAlbumEnrichmentJobData[] = [
    {
      albumId: randomUUID(),
      source: 'collection_add',
      priority: 'high',
      requestId: `test-collection-add-${Date.now()}`,
    },
    {
      albumId: randomUUID(), 
      source: 'recommendation_create',
      priority: 'high',
      requestId: `test-recommendation-${Date.now()}`,
    },
    {
      albumId: randomUUID(),
      source: 'search',
      priority: 'medium', 
      requestId: `test-search-${Date.now()}`,
    },
    {
      albumId: randomUUID(),
      source: 'browse',
      priority: 'low',
      requestId: `test-browse-${Date.now()}`,
    },
  ];

  // Sample artist enrichment checks
  // Using real UUIDs since the database expects UUID format
  const artistChecks: CheckArtistEnrichmentJobData[] = [
    {
      artistId: randomUUID(),
      source: 'collection_add',
      priority: 'medium',
      requestId: `test-artist-collection-${Date.now()}`,
    },
    {
      artistId: randomUUID(),
      source: 'manual',
      priority: 'low',
      requestId: `test-artist-manual-${Date.now()}`,
    },
  ];

  console.log('📝 Adding CHECK_ALBUM_ENRICHMENT jobs...');
  
  // Add album check jobs
  for (const [index, albumCheck] of albumChecks.entries()) {
    const job = await queue.addJob(JOB_TYPES.CHECK_ALBUM_ENRICHMENT, albumCheck, {
      priority: albumCheck.priority === 'high' ? 10 : albumCheck.priority === 'medium' ? 5 : 1,
      attempts: 3,
      removeOnComplete: false, // Keep for dashboard viewing
      removeOnFail: false,
    });

    console.log(`  ✅ Added album check job ${index + 1}:`, {
      jobId: job.id,
      albumId: albumCheck.albumId,
      source: albumCheck.source,
      priority: albumCheck.priority,
    });

    // Small delay to spread them out
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  console.log('📝 Adding CHECK_ARTIST_ENRICHMENT jobs...');
  
  // Add artist check jobs  
  for (const [index, artistCheck] of artistChecks.entries()) {
    const job = await queue.addJob(JOB_TYPES.CHECK_ARTIST_ENRICHMENT, artistCheck, {
      priority: artistCheck.priority === 'high' ? 10 : artistCheck.priority === 'medium' ? 5 : 1,
      attempts: 3,
      removeOnComplete: false,
      removeOnFail: false,
    });

    console.log(`  ✅ Added artist check job ${index + 1}:`, {
      jobId: job.id,
      artistId: artistCheck.artistId,
      source: artistCheck.source,
      priority: artistCheck.priority,
    });

    await new Promise(resolve => setTimeout(resolve, 100));
  }

  // Get current queue stats
  const stats = await queue.getStats();
  console.log('\n📊 Current Queue Stats:');
  console.log(`  Waiting: ${stats.waiting}`);
  console.log(`  Active: ${stats.active}`);
  console.log(`  Completed: ${stats.completed}`);
  console.log(`  Failed: ${stats.failed}`);

  console.log('\n🎯 Jobs added successfully!');
  console.log('📊 View them in Bull Board: http://localhost:3000/admin/queuedash');
  console.log('🔍 Look for job types:');
  console.log('  - check:album-enrichment');
  console.log('  - check:artist-enrichment');
  console.log('\n💡 If you have workers running, these check jobs will:');
  console.log('  1. Fetch the album/artist from database');
  console.log('  2. Check if enrichment is needed using our smart logic');
  console.log('  3. Queue actual ENRICH jobs if needed');

  return { albumJobs: albumChecks.length, artistJobs: artistChecks.length };
}

// Run if executed directly
if (require.main === module) {
  addLiveEnrichmentJobs()
    .then((result) => {
      console.log(`\n✨ Added ${result.albumJobs} album check jobs and ${result.artistJobs} artist check jobs!`);
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Failed to add jobs:', error);
      process.exit(1);
    });
}

export { addLiveEnrichmentJobs };
