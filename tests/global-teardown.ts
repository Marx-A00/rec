import path from 'path';

import { FullConfig } from '@playwright/test';
import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';

async function globalTeardown(config: FullConfig) {
  // Load test environment variables
  const envPath = path.resolve(__dirname, '../.env.test');
  dotenv.config({ path: envPath });

  const prisma = new PrismaClient({
    datasources: {
      db: {
        url: process.env.DATABASE_URL,
      },
    },
  });

  try {
    await prisma.$connect();
    console.log('\n🧹 Cleaning up test data...');

    // Delete all test users and their related data
    // The cascade delete should handle related records, but let's be thorough

    // First, find all test user IDs (check both cases for safety)
    const testUsers = await prisma.user.findMany({
      where: {
        OR: [
          { email: { contains: 'playwright_test' } },
          { email: { contains: 'PLAYWRIGHT_TEST' } },
          { username: { contains: '🎭 PLAYWRIGHT TEST' } },
        ],
      },
      select: { id: true, email: true },
    });

    if (testUsers.length === 0) {
      console.log('No test users to clean up');
      return;
    }

    const testUserIds = testUsers.map(u => u.id);
    console.log(`Found ${testUsers.length} test users to clean up`);

    // Delete related data in order (respecting foreign key constraints)

    // Delete user follows
    await prisma.userFollow.deleteMany({
      where: {
        OR: [
          { followerId: { in: testUserIds } },
          { followedId: { in: testUserIds } },
        ],
      },
    });

    // Delete recommendations
    await prisma.recommendation.deleteMany({
      where: { userId: { in: testUserIds } },
    });

    // Delete collection albums first, then collections
    const testCollections = await prisma.collection.findMany({
      where: { userId: { in: testUserIds } },
      select: { id: true },
    });
    const collectionIds = testCollections.map(c => c.id);

    if (collectionIds.length > 0) {
      await prisma.collectionAlbum.deleteMany({
        where: { collectionId: { in: collectionIds } },
      });
      await prisma.collection.deleteMany({
        where: { id: { in: collectionIds } },
      });
    }

    // Delete user settings
    await prisma.userSettings.deleteMany({
      where: { userId: { in: testUserIds } },
    });

    // Delete accounts (OAuth connections)
    await prisma.account.deleteMany({
      where: { userId: { in: testUserIds } },
    });

    // Delete sessions
    await prisma.session.deleteMany({
      where: { userId: { in: testUserIds } },
    });

    // Finally, delete the test users
    const deleted = await prisma.user.deleteMany({
      where: {
        OR: [
          { email: { contains: 'playwright_test' } },
          { email: { contains: 'PLAYWRIGHT_TEST' } },
          { username: { contains: '🎭 PLAYWRIGHT TEST' } },
        ],
      },
    });

    console.log(`✅ Cleaned up ${deleted.count} test users and their data`);
  } catch (error) {
    console.error('Error during test cleanup:', error);
    // Don't throw - we don't want cleanup failures to fail the test run
  } finally {
    await prisma.$disconnect();
  }
}

export default globalTeardown;
