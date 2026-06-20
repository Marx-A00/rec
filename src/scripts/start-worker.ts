// src/scripts/start-worker.ts
/**
 * Starts a persistent BullMQ worker for processing jobs
 * This should run continuously in the background
 */

import { getMusicBrainzQueue } from '@/lib/queue';
import { processMusicBrainzJob } from '@/lib/queue/processors';

async function startWorker() {
  console.log('🔄 Starting persistent worker...');

  try {
    const musicBrainzQueue = getMusicBrainzQueue();

    // Create the worker
    const worker = musicBrainzQueue.createWorker(processMusicBrainzJob);

    console.log('✅ Worker started successfully!');
    console.log('📊 Monitoring queue: musicbrainz');
    console.log('⚡ Rate limited to 1 request per second');
    console.log('🎯 Bull Board: http://localhost:3001/admin/queues');

    console.log('');
    console.log('💡 Press Ctrl+C to stop worker');

    // Keep the process alive
    process.on('SIGINT', async () => {
      console.log('\\n🛑 Stopping worker...');
      await worker.close();
      console.log('✅ Worker stopped gracefully');
      process.exit(0);
    });

    process.on('SIGTERM', async () => {
      console.log('\\n🛑 Stopping worker...');
      await worker.close();
      console.log('✅ Worker stopped gracefully');
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
