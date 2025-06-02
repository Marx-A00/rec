// @ts-nocheck
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function cleanupTestData() {
  try {
    console.log('🧹 Starting cleanup of test data...');

    // Delete recommendations for test user
    console.log('Cleaning up recommendations...');
    await prisma.recommendation.deleteMany({
      where: {
        user: {
          email: 'test@example.com',
        },
      },
    });

    // Delete tracks from test albums
    console.log('Cleaning up tracks...');
    await prisma.track.deleteMany({
      where: {
        album: {
          discogsId: {
            in: ['test-123', 'test-456'], // The test album IDs from our test
          },
        },
      },
    });

    // Delete test albums
    console.log('Cleaning up albums...');
    await prisma.album.deleteMany({
      where: {
        discogsId: {
          in: ['test-123', 'test-456'],
        },
      },
    });

    // Delete test user
    console.log('Cleaning up test user...');
    await prisma.user.deleteMany({
      where: {
        email: 'test@example.com',
      },
    });

    console.log('✨ Cleanup completed successfully!');
  } catch (error) {
    console.error('❌ Cleanup failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the cleanup
cleanupTestData();
