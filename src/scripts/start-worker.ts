// src/scripts/start-worker.ts
/**
 * Starts a persistent BullMQ worker for processing MusicBrainz jobs
 * This should run continuously in the background
 */

import { getMusicBrainzQueue } from '@/lib/queue';
import { processMusicBrainzJob } from '@/lib/queue/processors';
import {
  initializeSpotifyScheduler,
  shutdownSpotifyScheduler,
} from '@/lib/spotify/scheduler';

async function startWorker() {
  console.log('🔄 Starting persistent MusicBrainz worker...');

  try {
    const musicBrainzQueue = getMusicBrainzQueue();

    // Create the worker
    const worker = musicBrainzQueue.createWorker(processMusicBrainzJob);

    console.log('✅ MusicBrainz Worker started successfully!');
    console.log('📊 Monitoring queue: musicbrainz');
    console.log('⚡ Rate limited to 1 request per second');
    console.log('🎯 Bull Board: http://localhost:3001/admin/queues');

    // Start Spotify automated scheduler
    console.log('');
    console.log('🎵 Starting Spotify automated scheduler...');
    const spotifyStarted = await initializeSpotifyScheduler();
    if (spotifyStarted) {
      console.log('✅ Spotify scheduler started successfully!');
      console.log(
        '📅 Automated syncing: New releases (hourly), Featured playlists (3-hourly)'
      );
    } else {
      console.log('⚠️  Spotify scheduler not started (missing credentials)');
    }

    console.log('');
    console.log('💡 Press Ctrl+C to stop worker and scheduler');

    // Keep the process alive
    process.on('SIGINT', async () => {
      console.log('\\n🛑 Stopping worker and scheduler...');
      shutdownSpotifyScheduler();
      await worker.close();
      console.log('✅ Worker and scheduler stopped gracefully');
      process.exit(0);
    });

    process.on('SIGTERM', async () => {
      console.log('\\n🛑 Stopping worker and scheduler...');
      shutdownSpotifyScheduler();
      await worker.close();
      console.log('✅ Worker and scheduler stopped gracefully');
      process.exit(0);
    });
  } catch (error) {
    console.error('❌ Failed to start worker:', error);
    process.exit(1);
  }
}

// Start the worker
startWorker().catch(error => {
  console.error('❌ Worker startup failed:', error);
  process.exit(1);
});

// Keep the process alive
setInterval(() => {
  // Just keep alive, worker handles jobs automatically
}, 1000);
