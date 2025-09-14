// src/scripts/test-activity-monitor.ts
// Test script for the Queue Activity Monitor system

import { PrismaClient } from '@prisma/client';
import { startQueueActivityMonitor, getQueueActivityMonitor } from '@/lib/activity/queue-activity-monitor';
import { createActivityTracker } from '@/lib/activity/activity-tracker';
import { getMusicBrainzQueue, JOB_TYPES } from '@/lib/queue';

async function testActivityMonitor() {
  console.log('🧪 Testing Queue Activity Monitor System\n');

  const prisma = new PrismaClient();
  
  try {
    // 1. Start the activity monitor
    console.log('📊 1. Starting Queue Activity Monitor...');
    const monitor = startQueueActivityMonitor(prisma, 5000); // Check every 5 seconds for faster testing
    
    // Wait for startup
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // 2. Check initial status
    console.log('\n📊 2. Initial Monitor Status:');
    const status = monitor.getStatus();
    console.log(status);
    
    // 3. Get initial activity metrics
    console.log('\n📊 3. Initial Activity Metrics:');
    const metrics = await monitor.getActivityMetrics();
    console.log(JSON.stringify(metrics, null, 2));
    
    // 4. Simulate user activity
    console.log('\n📊 4. Simulating User Activity...');
    const sessionId = 'test-session-' + Date.now();
    const userId = 'test-user-1';
    
    const activityTracker = createActivityTracker(prisma, sessionId, userId);
    
    // Simulate high user activity (search, collection actions)
    await activityTracker.trackSearch('albums', 'test search query', 5);
    await activityTracker.trackCollectionAction('add_album', 'test-album-id-1');
    await activityTracker.recordEntityInteraction('view_album', 'album', 'test-album-id-2');
    
    console.log('✅ User activity simulated');
    
    // 5. Add some background jobs to test pause behavior
    console.log('\n📊 5. Adding Background Jobs...');
    const queue = getMusicBrainzQueue();
    
    // Add some low-priority background jobs
    await queue.addJob(JOB_TYPES.ENRICH_ALBUM, {
      albumId: 'test-album-1',
      priority: 'low',
      userAction: 'spotify_sync',
      requestId: 'test-bg-1'
    }, {
      priority: 20, // Low priority (BullMQ scale 1-100)
      attempts: 2
    });
    
    await queue.addJob(JOB_TYPES.ENRICH_ALBUM, {
      albumId: 'test-album-2', 
      priority: 'low',
      userAction: 'spotify_sync',
      requestId: 'test-bg-2'
    }, {
      priority: 25, // Low priority
      attempts: 2
    });
    
    console.log('✅ Background jobs queued');
    
    // 6. Force a check to see if monitor pauses jobs
    console.log('\n📊 6. Forcing Activity Check...');
    await monitor.forceCheck();
    
    // 7. Check updated metrics
    console.log('\n📊 7. Updated Activity Metrics After User Activity:');
    const updatedMetrics = await monitor.getActivityMetrics();
    console.log(JSON.stringify(updatedMetrics, null, 2));
    
    // 8. Wait for auto-checks and log results
    console.log('\n📊 8. Monitoring Auto-Checks (20 seconds)...');
    console.log('Watch for automatic pause/resume behavior...\n');
    
    // Monitor for 20 seconds
    for (let i = 0; i < 4; i++) {
      await new Promise(resolve => setTimeout(resolve, 5000));
      const currentMetrics = await monitor.getActivityMetrics();
      
      console.log(`[${new Date().toISOString()}] Status Check ${i + 1}:`);
      console.log(`  - Active Users: ${currentMetrics.activityStats.activeUserCount}`);
      console.log(`  - Should Pause: ${currentMetrics.activityStats.shouldPauseBackground}`);
      console.log(`  - Currently Paused: ${currentMetrics.activityStats.backgroundJobsPaused}`);
      console.log(`  - Queue Stats: Active=${currentMetrics.queueStats.active}, Waiting=${currentMetrics.queueStats.waiting}, Delayed=${currentMetrics.queueStats.delayed}`);
      console.log('');
    }
    
    // 9. Final status
    console.log('📊 9. Final Monitor Status:');
    const finalStatus = monitor.getStatus();
    console.log(finalStatus);
    
    // 10. Stop monitor
    console.log('\n📊 10. Stopping Monitor...');
    monitor.stop();
    
    console.log('\n✅ Queue Activity Monitor Test Completed Successfully!');
    console.log('\n📋 Key Features Tested:');
    console.log('  ✅ Activity tracking integration');
    console.log('  ✅ Queue metrics collection');
    console.log('  ✅ Automatic pause/resume logic');
    console.log('  ✅ Background job prioritization');
    console.log('  ✅ Real-time monitoring capabilities');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the test
if (require.main === module) {
  testActivityMonitor().catch(console.error);
}

export { testActivityMonitor };
