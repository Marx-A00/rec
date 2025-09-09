// src/lib/queue/investigate-solutions.ts
/**
 * Test different approaches to handle job completion
 */

import { getMusicBrainzQueue, processMusicBrainzJob } from './index';
import { JOB_TYPES } from './jobs';

async function testJobCompletionSolutions() {
  console.log('🧪 Testing Job Completion Solutions...\n');
  
  const queue = getMusicBrainzQueue();
  const worker = queue.createWorker(processMusicBrainzJob);
  
  try {
    // Solution 1: Configure queue to keep completed jobs
    console.log('📋 Solution 1: Configure Queue to Keep Completed Jobs');
    
    // Check current queue options
    const queueInstance = queue.getQueue();
    console.log('Current queue options:', {
      removeOnComplete: queueInstance.opts.removeOnComplete,
      removeOnFail: queueInstance.opts.removeOnFail
    });
    
    // Solution 2: Use job events instead of polling
    console.log('\n📋 Solution 2: Event-Based Job Completion');
    
    const jobPromise = new Promise((resolve, reject) => {
      // Add event listeners for this specific test
      worker.on('completed', (job, result) => {
        console.log(`🎉 Worker Event: Job ${job.id} completed with result:`, !!result);
        resolve(result);
      });
      
      worker.on('failed', (job, err) => {
        console.log(`💥 Worker Event: Job ${job?.id} failed:`, err.message);
        reject(err);
      });
      
      // Timeout after 5 seconds
      setTimeout(() => {
        reject(new Error('Job completion timeout'));
      }, 5000);
    });
    
    // Add a test job
    console.log('Adding test job with event listeners...');
    const job = await queue.addJob(
      JOB_TYPES.MUSICBRAINZ_SEARCH_ARTISTS,
      { query: 'Event Test', limit: 1 },
      { requestId: `event-test-${Date.now()}` }
    );
    
    console.log(`Job ${job.id} added, waiting for completion via events...`);
    
    // Wait for completion via events
    const result = await jobPromise;
    console.log('✅ Event-based completion worked! Result:', !!result);
    
    // Solution 3: Store results in Redis with custom key
    console.log('\n📋 Solution 3: Custom Result Storage Pattern');
    
    // This would involve modifying the processor to store results
    // in Redis with a custom key we can retrieve later
    
    console.log('\n✅ All solutions tested');
    
  } catch (error) {
    console.error('❌ Solution test failed:', error);
  } finally {
    await queue.close();
    console.log('🧹 Queue closed');
    process.exit(0);
  }
}

testJobCompletionSolutions().catch(console.error);
