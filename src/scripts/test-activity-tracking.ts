#!/usr/bin/env tsx
// src/scripts/test-activity-tracking.ts
// Test script for user activity tracking system

import { PrismaClient } from '@prisma/client';
import { createActivityTracker } from '@/lib/activity/activity-tracker';
import { createQueuePriorityManager } from '@/lib/activity/queue-priority-manager';
import { randomUUID } from 'crypto';

const prisma = new PrismaClient();

async function testActivityTracking() {
  console.log('🧪 Testing User Activity Tracking System...\n');

  // Simulate a user session
  const sessionId = `test-session-${Date.now()}`;
  const userId = null; // Anonymous user for this test
  const requestId = randomUUID();

  // Create activity tracker and priority manager
  const activityTracker = createActivityTracker(prisma, sessionId, userId, requestId);
  const priorityManager = createQueuePriorityManager(prisma);

  try {
    // Test 1: Browse Activity (Low Priority)
    console.log('📊 Test 1: Browse Activity - Viewing Trending Albums');
    await activityTracker.trackBrowse('trending', undefined, {
      contentType: 'albums',
      limit: 5
    });
    console.log('✅ Browse activity tracked');

    // Test 2: Entity Interaction (Medium Priority Boost)
    console.log('\n🔍 Test 2: Entity Interaction - Viewing Specific Album');
    const albumId = '4db0ad5e-70d4-4093-84a5-f99cc8d882af'; // The Downward Spiral
    
    await activityTracker.recordEntityInteraction(
      'view_album',
      'album',
      albumId,
      'query'
    );
    console.log(`✅ Entity interaction tracked for album: ${albumId.substring(0, 8)}...`);

    // Test 3: Collection Action (High Priority)
    console.log('\n🎵 Test 3: Collection Action - Adding Album');
    await activityTracker.trackCollectionAction('add_album', albumId, {
      source: 'manual',
      userAction: 'collection_add'
    });
    console.log('✅ Collection action tracked');

    // Test 4: Check Priority Calculation
    console.log('\n⚡ Test 4: Priority Calculation for Enrichment Job');
    
    const { priority, boost, recommendedDelay } = await priorityManager.calculateJobPriority(
      'collection_add',
      albumId,
      'album',
      userId,
      sessionId
    );

    console.log('🎯 Priority Calculation Results:');
    console.log(`  Final Priority: ${priority}/10`);
    console.log(`  Boosts:`, {
      actionImportance: boost.actionImportance,
      userActivity: boost.userActivity,
      entityRelevance: boost.entityRelevance,
      systemLoad: boost.systemLoad,
    });
    console.log(`  Recommended Delay: ${recommendedDelay ? `${recommendedDelay}ms` : 'none'}`);

    // Test 5: Get Job Options for BullMQ
    console.log('\n📋 Test 5: BullMQ Job Options');
    const jobOptions = await priorityManager.getJobOptions(
      'collection_add',
      albumId,
      'album',
      userId,
      sessionId
    );

    console.log('🔧 Job Options:', {
      priority: jobOptions.priority,
      delay: jobOptions.delay,
      attempts: jobOptions.attempts,
      backoff: jobOptions.backoff,
    });

    // Test 6: Check Activity Context
    console.log('\n📈 Test 6: User Activity Context');
    const activityContext = await activityTracker.getUserActivityContext();
    
    console.log('👤 Activity Context:', {
      isActivelyBrowsing: activityContext.isActivelyBrowsing,
      recentlyViewedEntities: activityContext.recentlyViewedEntities.length,
      sessionDurationMinutes: Math.round(activityContext.sessionDuration / (1000 * 60))
    });

    // Test 7: System Activity Overview
    console.log('\n🌐 Test 7: System Activity Overview');
    const activeUserCount = await activityTracker.constructor.getActiveUserCount(prisma);
    const shouldPause = await priorityManager.shouldPauseBackgroundJobs();
    
    console.log('🔄 System Status:', {
      activeUsers: activeUserCount,
      shouldPauseBackgroundJobs: shouldPause
    });

    // Test 8: Recently Active Entities
    console.log('\n🔥 Test 8: Recently Active Entities');
    const recentAlbums = await activityTracker.constructor.getRecentlyActiveEntities(
      prisma,
      'album',
      10 // Last 10 minutes
    );
    
    console.log(`📀 Recently Active Albums (last 10 min): ${recentAlbums.length}`);
    recentAlbums.forEach((id, index) => {
      console.log(`  ${index + 1}. ${id.substring(0, 8)}...`);
    });

    // Test 9: View Activity Records in Database
    console.log('\n💾 Test 9: Activity Records in Database');
    const activityRecords = await prisma.userActivity.findMany({
      where: { sessionId },
      orderBy: { timestamp: 'desc' },
      take: 5
    });

    console.log(`📊 Activity Records for Session (${activityRecords.length} total):`);
    activityRecords.forEach((record, index) => {
      console.log(`  ${index + 1}. ${record.operation} - ${record.operationType} (${record.albumIds.length} albums, ${record.artistIds.length} artists)`);
    });

    console.log('\n🎉 Activity Tracking Test Complete!');
    console.log('\n💡 Next Steps:');
    console.log('   1. Run GraphQL queries to see live activity tracking');
    console.log('   2. Monitor job priorities in Bull Board dashboard');
    console.log('   3. Check activity records with: SELECT * FROM user_activities;');

  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the test
testActivityTracking().catch(console.error);
