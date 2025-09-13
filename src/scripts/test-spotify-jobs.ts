// src/scripts/test-spotify-jobs.ts
/**
 * Test script for Spotify sync job processors
 * Tests the complete flow: Queue job → Worker processes → Database records → Enrichment jobs
 */

import { getMusicBrainzQueue, JOB_TYPES } from '../lib/queue';
import { prisma } from '../lib/prisma';
import type { 
  SpotifySyncNewReleasesJobData, 
  SpotifySyncFeaturedPlaylistsJobData 
} from '../lib/queue/jobs';

// ============================================================================
// Test Functions
// ============================================================================

async function testSpotifyNewReleasesJob() {
  console.log('\n🎵 Testing Spotify New Releases Job...\n');

  try {
    const queue = getMusicBrainzQueue();

    // Create job data
    const jobData: SpotifySyncNewReleasesJobData = {
      limit: 5,           // Small limit for testing
      country: 'US',
      priority: 'medium',
      source: 'manual',
      requestId: `test_new_releases_${Date.now()}`
    };

    console.log('📋 Queueing Spotify new releases sync job...');
    console.log('Job data:', jobData);

    // Queue the job
    const job = await queue.addJob(
      JOB_TYPES.SPOTIFY_SYNC_NEW_RELEASES, 
      jobData,
      {
        priority: 5, // Medium priority
        attempts: 3,
        backoff: { type: 'exponential', delay: 2000 }
      }
    );

    console.log(`✅ Job queued with ID: ${job.id}`);
    console.log(`🔍 Monitor progress at: http://localhost:3001/bull-board`);
    
    // Wait a bit for the job to be processed
    console.log('⏳ Waiting for job to be processed...');
    console.log('💡 Check Bull Board for real-time progress: http://localhost:3001/bull-board');
    
    // Wait for the job to complete (with timeout)
    let attempts = 0;
    const maxAttempts = 30; // 30 seconds max wait
    
    while (attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second
      
      const jobState = await job.getState();
      console.log(`   Status: ${jobState} (attempt ${attempts + 1}/${maxAttempts})`);
      
      if (jobState === 'completed') {
        const result = job.returnvalue;
        console.log('🎉 Job completed successfully!');
        return result;
      } else if (jobState === 'failed') {
        const error = job.failedReason;
        throw new Error(`Job failed: ${error}`);
      }
      
      attempts++;
    }
    
    throw new Error('Job timed out after 30 seconds');

  } catch (error) {
    console.error('❌ Spotify new releases job test failed:', error);
    throw error;
  }
}

async function testSpotifyFeaturedPlaylistsJob() {
  console.log('\n🎧 Testing Spotify Featured Playlists Job...\n');

  try {
    const queue = getMusicBrainzQueue();

    // Create job data
    const jobData: SpotifySyncFeaturedPlaylistsJobData = {
      limit: 3,               // Small limit for testing
      country: 'US',
      extractAlbums: true,    // Extract albums from playlist tracks
      priority: 'medium',
      source: 'manual',
      requestId: `test_playlists_${Date.now()}`
    };

    console.log('📋 Queueing Spotify featured playlists sync job...');
    console.log('Job data:', jobData);

    // Queue the job
    const job = await queue.addJob(
      JOB_TYPES.SPOTIFY_SYNC_FEATURED_PLAYLISTS, 
      jobData,
      {
        priority: 5, // Medium priority
        attempts: 3,
        backoff: { type: 'exponential', delay: 2000 }
      }
    );

    console.log(`✅ Job queued with ID: ${job.id}`);
    console.log(`🔍 Monitor progress at: http://localhost:3001/bull-board`);
    
    // Wait for the job to be processed
    console.log('⏳ Waiting for job to be processed...');
    console.log('💡 Check Bull Board for real-time progress: http://localhost:3001/bull-board');
    
    // Wait for the job to complete (with timeout)
    let attempts = 0;
    const maxAttempts = 30; // 30 seconds max wait
    
    while (attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second
      
      const jobState = await job.getState();
      console.log(`   Status: ${jobState} (attempt ${attempts + 1}/${maxAttempts})`);
      
      if (jobState === 'completed') {
        const result = job.returnvalue;
        console.log('🎉 Job completed successfully!');
        return result;
      } else if (jobState === 'failed') {
        const error = job.failedReason;
        throw new Error(`Job failed: ${error}`);
      }
      
      attempts++;
    }
    
    throw new Error('Job timed out after 30 seconds');

  } catch (error) {
    console.error('❌ Spotify featured playlists job test failed:', error);
    throw error;
  }
}

async function checkDatabaseResults() {
  console.log('\n💾 Checking database results...\n');

  try {
    // Count albums created in the last 5 minutes
    const recentAlbums = await prisma.album.findMany({
      where: {
        createdAt: {
          gte: new Date(Date.now() - 5 * 60 * 1000) // Last 5 minutes
        }
      },
      include: {
        artists: {
          include: {
            artist: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 10 // Show latest 10
    });

    console.log(`📀 Found ${recentAlbums.length} albums created in the last 5 minutes:`);
    
    for (const album of recentAlbums) {
      console.log(`  🎵 "${album.title}" (${album.releaseType})`);
      console.log(`     Artists: ${album.artists.map(a => a.artist.name).join(', ')}`);
      console.log(`     Quality: ${album.dataQuality}, Status: ${album.enrichmentStatus}`);
      console.log(`     Created: ${album.createdAt.toISOString()}`);
      console.log('');
    }

    // Count artists created in the last 5 minutes
    const recentArtists = await prisma.artist.findMany({
      where: {
        createdAt: {
          gte: new Date(Date.now() - 5 * 60 * 1000)
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 10
    });

    console.log(`👥 Found ${recentArtists.length} artists created in the last 5 minutes:`);
    
    for (const artist of recentArtists) {
      console.log(`  🎤 "${artist.name}"`);
      console.log(`     Quality: ${artist.dataQuality}, Status: ${artist.enrichmentStatus}`);
      console.log(`     Created: ${artist.createdAt.toISOString()}`);
      console.log('');
    }

    return {
      albumsCreated: recentAlbums.length,
      artistsCreated: recentArtists.length
    };

  } catch (error) {
    console.error('❌ Database check failed:', error);
    throw error;
  }
}

async function checkQueueStatus() {
  console.log('\n⚡ Checking queue status...\n');

  try {
    const queue = getMusicBrainzQueue();
    
    // Get queue stats
    const waiting = await queue.getWaiting();
    const active = await queue.getActive();
    const completed = await queue.getCompleted();
    const failed = await queue.getFailed();

    console.log('📊 Queue Statistics:');
    console.log(`  ⏳ Waiting: ${waiting.length}`);
    console.log(`  🔄 Active: ${active.length}`);
    console.log(`  ✅ Completed: ${completed.length}`);
    console.log(`  ❌ Failed: ${failed.length}`);

    // Show recent completed jobs
    if (completed.length > 0) {
      console.log('\n🎯 Recent completed jobs:');
      for (const job of completed.slice(-5)) {
        console.log(`  ${job.name} (${job.id}) - ${job.finishedOn ? new Date(job.finishedOn).toISOString() : 'Unknown time'}`);
      }
    }

    // Show any failed jobs
    if (failed.length > 0) {
      console.log('\n❌ Failed jobs:');
      for (const job of failed.slice(-3)) {
        console.log(`  ${job.name} (${job.id}) - ${job.failedReason}`);
      }
    }

    return {
      waiting: waiting.length,
      active: active.length,
      completed: completed.length,
      failed: failed.length
    };

  } catch (error) {
    console.error('❌ Queue status check failed:', error);
    throw error;
  }
}

// ============================================================================
// Main Test Runner
// ============================================================================

async function main() {
  console.log('🚀 Testing Spotify Job Processors\n');
  console.log('=' .repeat(50));

  try {
    // Check if we have Spotify credentials
    if (!process.env.SPOTIFY_CLIENT_ID || !process.env.SPOTIFY_CLIENT_SECRET) {
      console.log('⚠️  Missing Spotify credentials!');
      console.log('   Set SPOTIFY_CLIENT_ID and SPOTIFY_CLIENT_SECRET in your .env file');
      console.log('   Or run: curl http://localhost:3000/api/spotify/sync to test with existing cache');
      return;
    }

    console.log('✅ Spotify credentials found');
    console.log('🔧 Make sure your worker is running: npx tsx src/scripts/start-worker.ts');
    console.log('🔧 Make sure Bull Board is running: http://localhost:3001/bull-board\n');

    // Test 1: Spotify New Releases
    const newReleasesResult = await testSpotifyNewReleasesJob();
    
    // Wait a bit between tests
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Test 2: Spotify Featured Playlists  
    const playlistsResult = await testSpotifyFeaturedPlaylistsJob();
    
    // Wait for processing to complete
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // Check results
    const dbResults = await checkDatabaseResults();
    const queueStatus = await checkQueueStatus();

    console.log('\n🎉 All tests completed successfully!');
    console.log('\n📊 Summary:');
    console.log(`  🎵 New releases processed: ${newReleasesResult?.albumsProcessed || 0}`);
    console.log(`  🎧 Playlist albums processed: ${playlistsResult?.albumsProcessed || 0}`);
    console.log(`  💾 Albums in database: ${dbResults.albumsCreated}`);
    console.log(`  👥 Artists in database: ${dbResults.artistsCreated}`);
    console.log(`  ⚡ Queue jobs waiting: ${queueStatus.waiting}`);
    
  } catch (error) {
    console.error('\n❌ Test failed:', error);
    process.exit(1);
  } finally {
    // Clean up connections
    await prisma.$disconnect();
    
    try {
      const { getMusicBrainzQueue } = await import('../lib/queue');
      const queue = getMusicBrainzQueue();
      await queue.close();
    } catch (error) {
      // Queue might not be initialized
    }
    
    process.exit(0);
  }
}

// Run tests
main().catch(console.error);
