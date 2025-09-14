// src/scripts/test-pause-behavior.ts
// Focused test to verify pause/resume behavior

import { PrismaClient } from '@prisma/client';
import { startQueueActivityMonitor } from '@/lib/activity/queue-activity-monitor';
import { createActivityTracker } from '@/lib/activity/activity-tracker';
import { getMusicBrainzQueue, JOB_TYPES } from '@/lib/queue';

async function testPauseBehavior() {
  console.log('🧪 Testing Queue PAUSE/RESUME Behavior\n');

  const prisma = new PrismaClient();
  
  try {
    // 1. Start monitor with faster check interval
    console.log('🔄 Starting Activity Monitor (checking every 3 seconds)...');
    const monitor = startQueueActivityMonitor(prisma, 3000);
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // 2. Create LOTS of fake user activity to trigger pause threshold (>8 users)
    console.log('👥 Simulating HIGH USER ACTIVITY (10+ users)...');
    
    for (let i = 1; i <= 12; i++) {
      const sessionId = `test-session-${i}-${Date.now()}`;
      const userId = `test-user-${i}`;
      
      const tracker = createActivityTracker(prisma, sessionId, userId);
      
      // Simulate active browsing for each user
      await tracker.trackSearch('albums', `search query ${i}`, 5);
      await tracker.trackBrowse('trending', [`album-${i}`]);
      
      // Small delay to spread out the activity
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    console.log('✅ Simulated 12 active users with recent activity');
    
    // 3. Add background jobs that should get paused
    console.log('\n📦 Adding LOW-PRIORITY Background Jobs...');
    const queue = getMusicBrainzQueue();
    
    const backgroundJobs = [];
    for (let i = 1; i <= 5; i++) {
      const job = await queue.addJob(JOB_TYPES.ENRICH_ALBUM, {
        albumId: `background-album-${i}`,
        priority: 'low',
        userAction: 'spotify_sync', // Background source
        requestId: `bg-test-${i}`
      }, {
        priority: 15, // Very low priority (will be paused)
        attempts: 2
      });
      backgroundJobs.push(job);
    }
    
    console.log(`✅ Added ${backgroundJobs.length} low-priority background jobs`);
    
    // 4. Check current metrics before pause
    console.log('\n📊 BEFORE Pause Check:');
    const beforeMetrics = await monitor.getActivityMetrics();
    console.log(`  - Active Users: ${beforeMetrics.activityStats.activeUserCount}`);
    console.log(`  - Should Pause: ${beforeMetrics.activityStats.shouldPauseBackground}`);
    console.log(`  - Currently Paused: ${beforeMetrics.activityStats.backgroundJobsPaused}`);
    console.log(`  - Queue: Active=${beforeMetrics.queueStats.active}, Waiting=${beforeMetrics.queueStats.waiting}, Delayed=${beforeMetrics.queueStats.delayed}`);
    
    // 5. Force pause check
    console.log('\n⏸️ FORCING PAUSE CHECK...');
    await monitor.forceCheck();
    
    // 6. Check metrics after pause
    console.log('\n📊 AFTER Pause Check:');
    const afterMetrics = await monitor.getActivityMetrics();
    console.log(`  - Active Users: ${afterMetrics.activityStats.activeUserCount}`);
    console.log(`  - Should Pause: ${afterMetrics.activityStats.shouldPauseBackground}`);
    console.log(`  - Currently Paused: ${afterMetrics.activityStats.backgroundJobsPaused}`);
    console.log(`  - Queue: Active=${afterMetrics.queueStats.active}, Waiting=${afterMetrics.queueStats.waiting}, Delayed=${afterMetrics.queueStats.delayed}`);
    console.log(`  - Pause/Resume Events: ${afterMetrics.performance.pauseResumeEvents}`);
    
    // 7. Monitor for automatic checks
    console.log('\n👀 Monitoring Auto-Checks (15 seconds)...');
    console.log('Watch for pause behavior...\n');
    
    for (let i = 0; i < 5; i++) {
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      const currentMetrics = await monitor.getActivityMetrics();
      const timestamp = new Date().toISOString().substring(11, 19); // HH:MM:SS
      
      console.log(`[${timestamp}] Check ${i + 1}:`);
      console.log(`  📊 Users: ${currentMetrics.activityStats.activeUserCount} | Should Pause: ${currentMetrics.activityStats.shouldPauseBackground ? '🔴 YES' : '🟢 NO'} | Paused: ${currentMetrics.activityStats.backgroundJobsPaused ? '⏸️ YES' : '▶️ NO'}`);
      console.log(`  📦 Queue: Active=${currentMetrics.queueStats.active} | Waiting=${currentMetrics.queueStats.waiting} | Delayed=${currentMetrics.queueStats.delayed}`);
      console.log(`  🔄 Events: ${currentMetrics.performance.pauseResumeEvents}`);
      console.log('');
    }
    
    // 8. Test Resume by simulating user inactivity
    console.log('😴 Simulating USER INACTIVITY (clearing recent activity)...');
    
    // Clear recent user activity by waiting or manually clearing the database
    await prisma.userActivity.deleteMany({
      where: {
        timestamp: {
          gte: new Date(Date.now() - 10 * 60 * 1000) // Last 10 minutes
        }
      }
    });
    
    console.log('✅ Cleared recent user activity');
    
    // 9. Force check again to trigger resume
    console.log('\n▶️ FORCING RESUME CHECK...');
    await monitor.forceCheck();
    
    // 10. Final metrics
    console.log('\n📊 FINAL Metrics After Resume:');
    const finalMetrics = await monitor.getActivityMetrics();
    console.log(`  - Active Users: ${finalMetrics.activityStats.activeUserCount}`);
    console.log(`  - Should Pause: ${finalMetrics.activityStats.shouldPauseBackground}`);
    console.log(`  - Currently Paused: ${finalMetrics.activityStats.backgroundJobsPaused}`);
    console.log(`  - Queue: Active=${finalMetrics.queueStats.active}, Waiting=${finalMetrics.queueStats.waiting}, Delayed=${finalMetrics.queueStats.delayed}`);
    console.log(`  - Total Pause/Resume Events: ${finalMetrics.performance.pauseResumeEvents}`);
    
    // 11. Results summary
    console.log('\n🎯 TEST RESULTS:');
    
    if (afterMetrics.activityStats.shouldPauseBackground) {
      console.log('  ✅ HIGH ACTIVITY DETECTED - Pause logic triggered correctly');
    } else {
      console.log('  ❌ High activity not detected - Check threshold logic');
    }
    
    if (afterMetrics.activityStats.backgroundJobsPaused) {
      console.log('  ✅ BACKGROUND JOBS PAUSED - Pause mechanism working');
    } else {
      console.log('  ⚠️ Background jobs not paused - Check pause implementation');
    }
    
    if (!finalMetrics.activityStats.backgroundJobsPaused && finalMetrics.performance.pauseResumeEvents > 0) {
      console.log('  ✅ JOBS RESUMED - Resume mechanism working');
    } else if (finalMetrics.activityStats.backgroundJobsPaused) {
      console.log('  ⚠️ Jobs still paused - Resume may need more time or manual trigger');
    }
    
    if (finalMetrics.performance.pauseResumeEvents >= 2) {
      console.log('  ✅ FULL PAUSE/RESUME CYCLE COMPLETED');
    } else {
      console.log(`  📊 Pause/Resume events: ${finalMetrics.performance.pauseResumeEvents} (expected: 2+)`);
    }
    
    monitor.stop();
    console.log('\n🎉 Pause/Resume Test Completed!');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the test
if (require.main === module) {
  testPauseBehavior().catch(console.error);
}

export { testPauseBehavior };
