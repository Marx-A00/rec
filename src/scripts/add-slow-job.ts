// src/scripts/add-slow-job.ts
/**
 * Add a slow job that takes 10-15 seconds to process
 * Perfect for seeing it in the "Active" tab in Bull Board
 */

import { getMusicBrainzQueue } from '@/lib/queue';

async function addSlowJob() {
  console.log('🐌 Adding SLOW job to MusicBrainz queue...');
  console.log('⏰ This job will take 30 seconds to process');
  console.log('🎯 Perfect for seeing it in Bull Board "Active" tab!');

  try {
    const queue = getMusicBrainzQueue();
    
    // Add a slow job that will be visible in "Active" for a while
    const job = await queue.addJob('search-releases', {
      mockType: 'search-releases',
      query: 'Bladee - The Fool (SLOW PROCESSING)',
      requestId: `slow_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      slowProcessing: true, // Flag for processor to add delay
      delaySeconds: 30, // 30 second processing time
    }, {
      priority: 1, // Normal priority
    });

    console.log(`✅ SLOW job added successfully!`);
    console.log(`🆔 Job ID: ${job.id}`);
    console.log(`🎵 Searching for: ${job.data.query}`);
    console.log(`⏰ Processing time: ~30 seconds`);
    console.log('');
    console.log('🏃‍♂️ Go to Bull Board dashboard: http://localhost:3001/admin/queues');
    console.log('📊 Click on "Active" tab to see the job processing');
    console.log('🔍 You have 30 seconds to see it in action!');

  } catch (error) {
    console.error('❌ Failed to add slow job:', error);
  } finally {
    console.log('✨ Slow job queued. Check Bull Board NOW!');
    process.exit(0);
  }
}

// Run the script
addSlowJob().catch(console.error);
