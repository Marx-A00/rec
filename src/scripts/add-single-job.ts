// src/scripts/add-single-job.ts
/**
 * Simple script to manually add a single job to the MusicBrainz queue
 * Usage: pnpm add-job
 */

import { getMusicBrainzQueue } from '@/lib/queue';

async function addSingleJob() {
  console.log('🎯 Adding single job to MusicBrainz queue...');

  try {
    const queue = getMusicBrainzQueue();
    
    // Add a mock job searching for a Bladee song
    const job = await queue.addJob('search-releases', {
      mockType: 'search-releases',
      query: 'Bladee - Eversince',
      requestId: `single_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    }, {
      priority: 1, // Normal priority
    });

    console.log(`✅ Job added successfully!`);
    console.log(`🆔 Job ID: ${job.id}`);
    console.log(`📝 Job Data:`, job.data);
    console.log(`🎵 Searching for: ${job.data.query}`);
    console.log('');
    console.log('📊 Check Bull Board dashboard: http://localhost:3001/admin/queues');
    console.log('🔍 You should see this job appear in the queue');

  } catch (error) {
    console.error('❌ Failed to add job:', error);
  } finally {
    console.log('✨ Job addition complete. Worker will process it automatically.');
    process.exit(0);
  }
}

// Run the script
addSingleJob().catch(console.error);
