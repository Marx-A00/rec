// @ts-nocheck - Minor type issues with BullMQ, needs cleanup
// src/lib/queue/debug-job.ts
/**
 * Debug script to investigate job completion behavior
 */

import { getMusicBrainzQueue } from './musicbrainz-queue';
import { JOB_TYPES } from './jobs';

async function debugJobCompletion() {
  console.log('🔍 Starting job completion debug investigation...\n');

  const queue = getMusicBrainzQueue();
  
  // CRITICAL: Start the worker!
  console.log('🔧 Starting worker...');
  const worker = queue.createWorker(require('./musicbrainz-processor').processMusicBrainzJob);
  console.log('✅ Worker started');
  
  try {
    // 1. Check queue connection
    console.log('📋 1. Queue Connection Test');
    const stats = await queue.getStats();
    console.log('Queue stats:', stats);
    
    // 2. Check existing jobs
    console.log('\n📋 2. Existing Jobs in Queue');
    const waiting = await queue.getQueue().getWaiting();
    const active = await queue.getQueue().getActive();
    const completed = await queue.getQueue().getCompleted();
    const failed = await queue.getQueue().getFailed();
    
    console.log(`Waiting: ${waiting.length}, Active: ${active.length}, Completed: ${completed.length}, Failed: ${failed.length}`);
    
    // 3. Check the last few completed jobs
    if (completed.length > 0) {
      console.log('\n📋 3. Last Completed Jobs Analysis');
      const lastCompleted = completed.slice(-3); // Last 3 jobs
      
      for (const job of lastCompleted) {
        console.log(`\nJob ID: ${job.id}`);
        console.log(`  - Name: ${job.name}`);
        console.log(`  - Finished: ${job.finishedOn ? new Date(job.finishedOn) : 'Not finished'}`);
        console.log(`  - Return value exists: ${!!job.returnvalue}`);
        console.log(`  - Return value type: ${typeof job.returnvalue}`);
        console.log(`  - Return value sample:`, JSON.stringify(job.returnvalue, null, 2)?.substring(0, 200) + '...');
        console.log(`  - Failed reason: ${job.failedReason || 'None'}`);
        console.log(`  - Progress: ${job.progress}`);
      }
    }
    
    // 4. Add a test job and track it step by step
    console.log('\n📋 4. Live Job Tracking Test');
    console.log('Adding a test job...');
    
    const testJob = await queue.addJob(
      JOB_TYPES.MUSICBRAINZ_SEARCH_ARTISTS,
      { query: 'Debug Test', limit: 1, offset: 0 },
      { 
        priority: 10, // High priority
        requestId: `debug-test-${Date.now()}`,
      }
    );
    
    console.log(`Test job added: ID=${testJob.id}`);
    
    // Track this job for 10 seconds
    for (let i = 0; i < 50; i++) { // 50 * 200ms = 10 seconds
      const job = await queue.getQueue().getJob(testJob.id!);
      
      if (job) {
        const status = {
          processedOn: !!job.processedOn,
          finishedOn: !!job.finishedOn,
          failedReason: job.failedReason,
          returnValue: !!job.returnvalue,
          progress: job.progress
        };
        
        console.log(`  [${i * 200}ms] Job status:`, status);
        
        if (job.finishedOn) {
          console.log(`  ✅ Job completed! Return value:`, JSON.stringify(job.returnvalue, null, 2));
          break;
        }
        
        if (job.failedReason) {
          console.log(`  ❌ Job failed: ${job.failedReason}`);
          break;
        }
      } else {
        console.log(`  [${i * 200}ms] Job not found`);
      }
      
      await new Promise(resolve => setTimeout(resolve, 200));
    }
    
    // 5. Test different ways to get job results
    console.log('\n📋 5. Alternative Job Result Retrieval Methods');
    
    if (testJob.id) {
      // Method 1: Direct job lookup
      const directJob = await queue.getQueue().getJob(testJob.id);
      console.log('Direct lookup result:', {
        found: !!directJob,
        finished: directJob?.finishedOn,
        hasReturn: !!directJob?.returnvalue
      });
      
      // Method 2: Queue events (if we can attach listeners)
      console.log('Queue events test - adding event listeners...');
      
      // Add temporary listeners
      const queueInstance = queue.getQueue();
      
      queueInstance.on('completed', (job) => {
        console.log(`🎉 Event: Job ${job.id} completed`);
      });
      
      queueInstance.on('failed', (job, err) => {
        console.log(`💥 Event: Job ${job.id} failed:`, err.message);
      });
    }
    
    console.log('\n✅ Debug investigation complete');
    
  } catch (error) {
    console.error('❌ Debug investigation failed:', error);
  } finally {
    await queue.close();
    console.log('🧹 Queue closed');
    process.exit(0);
  }
}

debugJobCompletion().catch(console.error);
