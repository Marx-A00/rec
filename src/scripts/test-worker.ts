// src/scripts/test-worker.ts
/**
 * Test worker specifically for Bull Board testing
 * Handles slow jobs to demonstrate Active tab functionality
 */

import { getMusicBrainzQueue } from '@/lib/queue';

async function startTestWorker() {
  console.log('🧪 Starting TEST worker for Bull Board demonstration...');
  console.log('🐌 This worker will handle slow jobs properly');
  console.log('📊 Bull Board: http://localhost:3001/admin/queues');
  console.log('');

  try {
    const musicBrainzQueue = getMusicBrainzQueue();
    
    // Create test worker that handles slow processing
    const worker = musicBrainzQueue.createWorker(async (job: any) => {
      const { mockType, query, requestId, slowProcessing, delaySeconds = 10 } = job.data;
      
      console.log(`🎵 TEST WORKER: Processing "${query}" (ID: ${job.id})`);
      
      if (slowProcessing) {
        console.log(`🐌 SLOW PROCESSING: ${delaySeconds}s delay for Bull Board testing`);
        console.log(`🎯 CHECK ACTIVE TAB NOW: http://localhost:3001/admin/queues`);
        
        // Simulate slow processing with progress updates
        for (let i = 1; i <= delaySeconds; i++) {
          await new Promise(resolve => setTimeout(resolve, 1000));
          if (i % 5 === 0) {
            console.log(`⏰ Progress: ${i}/${delaySeconds} seconds...`);
          }
        }
        
        console.log(`✅ SLOW JOB COMPLETED: "${query}" after ${delaySeconds}s`);
        return {
          success: true,
          type: 'SLOW_TEST',
          query,
          processingTime: `${delaySeconds}s`,
          completedAt: new Date().toISOString()
        };
      } else {
        // Fast processing for normal jobs
        const processingTime = Math.floor(Math.random() * 400) + 100;
        await new Promise(resolve => setTimeout(resolve, processingTime));
        
        console.log(`⚡ FAST JOB COMPLETED: "${query}" in ${processingTime}ms`);
        return {
          success: true,
          type: 'FAST_TEST',
          query,
          processingTime: `${processingTime}ms`,
          completedAt: new Date().toISOString()
        };
      }
    });

    console.log('✅ Test worker started successfully!');
    console.log('💡 Now run: pnpm queue:slow (to see slow jobs in Active tab)');
    console.log('💡 Or run: pnpm queue:add (for fast jobs)');
    console.log('');
    console.log('🛑 Press Ctrl+C to stop test worker');

    // Graceful shutdown
    process.on('SIGINT', async () => {
      console.log('\n🛑 Stopping test worker...');
      await worker.close();
      console.log('✅ Test worker stopped');
      process.exit(0);
    });

    // Keep process alive
    await new Promise(() => {});

  } catch (error) {
    console.error('❌ Failed to start test worker:', error);
    process.exit(1);
  }
}

startTestWorker();

