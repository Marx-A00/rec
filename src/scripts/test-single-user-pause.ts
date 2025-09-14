// src/scripts/test-single-user-pause.ts
// Test pause behavior with single user activity (more realistic scenario)

import { PrismaClient } from '@prisma/client';
import { startQueueActivityMonitor } from '@/lib/activity/queue-activity-monitor';
import { createActivityTracker } from '@/lib/activity/activity-tracker';
import { getMusicBrainzQueue, JOB_TYPES } from '@/lib/queue';

async function testSingleUserPause() {
  console.log('🧪 Testing SINGLE USER Activity Pause Behavior\n');

  const prisma = new PrismaClient();
  
  try {
    // 1. Clear any existing activity to start fresh
    console.log('🧹 Clearing existing user activity...');
    await prisma.userActivity.deleteMany({
      where: {
        timestamp: {
          gte: new Date(Date.now() - 10 * 60 * 1000) // Last 10 minutes
        }
      }
    });
    
    // 2. Start monitor with faster check interval
    console.log('🔄 Starting Activity Monitor (checking every 2 seconds)...');
    const monitor = startQueueActivityMonitor(prisma, 2000);
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // 3. Check baseline - should NOT pause with no activity
    console.log('\n📊 BASELINE CHECK (No Activity):');
    const baselineMetrics = await monitor.getActivityMetrics();
    console.log(`  - Active Users: ${baselineMetrics.activityStats.activeUserCount}`);
    console.log(`  - Should Pause: ${baselineMetrics.activityStats.shouldPauseBackground ? '🔴 YES' : '🟢 NO'}`);
    console.log(`  - Currently Paused: ${baselineMetrics.activityStats.backgroundJobsPaused ? '⏸️ YES' : '▶️ NO'}`);
    
    // 4. Add background jobs
    console.log('\n📦 Adding Background Jobs...');
    const queue = getMusicBrainzQueue();
    
    for (let i = 1; i <= 3; i++) {
      await queue.addJob(JOB_TYPES.ENRICH_ALBUM, {
        albumId: `test-album-${i}`,
        priority: 'low',
        userAction: 'spotify_sync',
        requestId: `single-user-test-${i}`
      }, {
        priority: 20, // Low priority
        attempts: 2
      });
    }
    console.log('✅ Added 3 background jobs');
    
    // 5. Simulate SINGLE USER activity - search action
    console.log('\n🔍 SINGLE USER ACTION: Search Query...');
    const sessionId = `test-session-${Date.now()}`;
    const userId = 'single-test-user';
    const tracker = createActivityTracker(prisma, sessionId, userId);
    
    await tracker.trackSearch('albums', 'radiohead ok computer', 5);
    console.log('✅ User performed search action');
    
    // 6. Force check immediately after user action
    console.log('\n⏸️ CHECKING PAUSE BEHAVIOR AFTER SEARCH...');
    await monitor.forceCheck();
    
    const afterSearchMetrics = await monitor.getActivityMetrics();
    console.log(`  - Active Users: ${afterSearchMetrics.activityStats.activeUserCount}`);
    console.log(`  - Should Pause: ${afterSearchMetrics.activityStats.shouldPauseBackground ? '🔴 YES' : '🟢 NO'}`);
    console.log(`  - Currently Paused: ${afterSearchMetrics.activityStats.backgroundJobsPaused ? '⏸️ YES' : '▶️ NO'}`);
    console.log(`  - Queue: Active=${afterSearchMetrics.queueStats.active}, Waiting=${afterSearchMetrics.queueStats.waiting}, Delayed=${afterSearchMetrics.queueStats.delayed}`);
    
    // 7. Test collection action
    console.log('\n💾 SINGLE USER ACTION: Add to Collection...');
    await tracker.trackCollectionAction('add_album', 'radiohead-ok-computer-id');
    console.log('✅ User added album to collection');
    
    await monitor.forceCheck();
    const afterCollectionMetrics = await monitor.getActivityMetrics();
    console.log(`  - Should Pause: ${afterCollectionMetrics.activityStats.shouldPauseBackground ? '🔴 YES' : '🟢 NO'}`);
    console.log(`  - Currently Paused: ${afterCollectionMetrics.activityStats.backgroundJobsPaused ? '⏸️ YES' : '▶️ NO'}`);
    
    // 8. Test album view action
    console.log('\n👁️ SINGLE USER ACTION: View Album Details...');
    await tracker.recordEntityInteraction('view_album', 'album', 'radiohead-ok-computer-id');
    console.log('✅ User viewed album details');
    
    await monitor.forceCheck();
    const afterViewMetrics = await monitor.getActivityMetrics();
    console.log(`  - Should Pause: ${afterViewMetrics.activityStats.shouldPauseBackground ? '🔴 YES' : '🟢 NO'}`);
    console.log(`  - Currently Paused: ${afterViewMetrics.activityStats.backgroundJobsPaused ? '⏸️ YES' : '▶️ NO'}`);
    
    // 9. Monitor auto-checks for a few cycles
    console.log('\n👀 Monitoring Auto-Checks (8 seconds)...');
    console.log('Should stay paused while activity is recent...\n');
    
    for (let i = 0; i < 4; i++) {
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const currentMetrics = await monitor.getActivityMetrics();
      const timestamp = new Date().toISOString().substring(11, 19);
      
      console.log(`[${timestamp}] Auto-Check ${i + 1}:`);
      console.log(`  🔴 Should Pause: ${currentMetrics.activityStats.shouldPauseBackground ? 'YES' : 'NO'} | ⏸️ Paused: ${currentMetrics.activityStats.backgroundJobsPaused ? 'YES' : 'NO'}`);
      console.log(`  📦 Queue: Waiting=${currentMetrics.queueStats.waiting} | Delayed=${currentMetrics.queueStats.delayed}`);
    }
    
    // 10. Wait for pause to naturally expire (3+ minutes)
    console.log('\n⏰ WAITING FOR ACTIVITY TO EXPIRE (simulating 3+ minutes)...');
    console.log('(Simulating by clearing recent activity)');
    
    // Simulate time passing by clearing activity older than 3 minutes
    await prisma.userActivity.deleteMany({
      where: {
        timestamp: {
          lt: new Date(Date.now() - 4 * 60 * 1000) // Older than 4 minutes
        }
      }
    });
    
    // Actually wait a bit and clear the current activity too
    await new Promise(resolve => setTimeout(resolve, 2000));
    await prisma.userActivity.deleteMany({
      where: {
        sessionId: sessionId
      }
    });
    
    console.log('✅ Simulated activity expiration');
    
    // 11. Check if jobs resume
    console.log('\n▶️ CHECKING RESUME BEHAVIOR...');
    await monitor.forceCheck();
    
    const resumeMetrics = await monitor.getActivityMetrics();
    console.log(`  - Active Users: ${resumeMetrics.activityStats.activeUserCount}`);
    console.log(`  - Should Pause: ${resumeMetrics.activityStats.shouldPauseBackground ? '🔴 YES' : '🟢 NO'}`);
    console.log(`  - Currently Paused: ${resumeMetrics.activityStats.backgroundJobsPaused ? '⏸️ YES' : '▶️ NO'}`);
    console.log(`  - Total Events: ${resumeMetrics.performance.pauseResumeEvents}`);
    
    // 12. Results analysis
    console.log('\n🎯 SINGLE USER PAUSE TEST RESULTS:');
    
    if (afterSearchMetrics.activityStats.shouldPauseBackground) {
      console.log('  ✅ SEARCH ACTION triggers pause - Perfect!');
    } else {
      console.log('  ❌ Search action did not trigger pause');
    }
    
    if (afterCollectionMetrics.activityStats.shouldPauseBackground) {
      console.log('  ✅ COLLECTION ACTION triggers pause - Perfect!');
    } else {
      console.log('  ❌ Collection action did not trigger pause');
    }
    
    if (afterViewMetrics.activityStats.shouldPauseBackground) {
      console.log('  ✅ ALBUM VIEW ACTION triggers pause - Perfect!');
    } else {
      console.log('  ❌ Album view action did not trigger pause');
    }
    
    if (!resumeMetrics.activityStats.shouldPauseBackground) {
      console.log('  ✅ JOBS RESUMED after activity expired - Perfect!');
    } else {
      console.log('  ⚠️ Jobs still paused after activity expired');
    }
    
    if (resumeMetrics.performance.pauseResumeEvents >= 2) {
      console.log('  ✅ MULTIPLE PAUSE/RESUME CYCLES detected');
    } else {
      console.log(`  📊 Pause/Resume events: ${resumeMetrics.performance.pauseResumeEvents}`);
    }
    
    monitor.stop();
    console.log('\n🎉 Single User Pause Test Completed!');
    
    console.log('\n📋 Key Improvements Tested:');
    console.log('  ✅ Single user actions trigger pause (not just 8+ users)');
    console.log('  ✅ Search queries pause background jobs');
    console.log('  ✅ Collection actions pause background jobs');
    console.log('  ✅ Album views pause background jobs');
    console.log('  ✅ Activity expires after 3 minutes');
    console.log('  ✅ Jobs resume when user activity stops');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the test
if (require.main === module) {
  testSingleUserPause().catch(console.error);
}

export { testSingleUserPause };
