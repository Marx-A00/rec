import path from 'path';

import { FullConfig } from '@playwright/test';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';

async function globalSetup(config: FullConfig) {
  // Force load test environment variables
  const envPath = path.resolve(__dirname, '../.env.test');
  console.log('Loading env from:', envPath);

  const result = dotenv.config({ path: envPath });
  if (result.error) {
    console.error('Error loading .env.test:', result.error);
  }

  console.log('DATABASE_URL after loading:', process.env.DATABASE_URL);

  // Create Prisma client with explicit database URL
  const prisma = new PrismaClient({
    datasources: {
      db: {
        url: process.env.DATABASE_URL,
      },
    },
  });

  try {
    // Test the connection first
    await prisma.$connect();
    console.log('Successfully connected to database');

    // Clear existing test users first (check both cases for safety)
    await prisma.user.deleteMany({
      where: {
        OR: [
          { email: { contains: 'playwright_test' } },
          { email: { contains: 'PLAYWRIGHT_TEST' } },
        ],
      },
    });

    // Create multiple recognizable test users
    const hashedPassword = await bcrypt.hash('TestPassword123!', 10);

    // Emails must be lowercase - auth.ts does email.toLowerCase() when looking up users
    const testUsers: Array<{
      email: string;
      username: string;
      hashedPassword: string;
      profileUpdatedAt?: Date;
    }> = [
      {
        email: 'playwright_test_existing@example.com',
        username: '🎭 PLAYWRIGHT TEST - Existing User',
        hashedPassword: hashedPassword,
        profileUpdatedAt: new Date(),
      },
      {
        email: 'playwright_test_duplicate@example.com',
        username: '🎭 PLAYWRIGHT TEST - Duplicate User',
        hashedPassword: hashedPassword,
        profileUpdatedAt: new Date(),
      },
      {
        email: 'playwright_test_sample@example.com',
        username: '🎭 PLAYWRIGHT TEST - Sample User',
        hashedPassword: hashedPassword,
        profileUpdatedAt: new Date(),
      },
      {
        // User without profileUpdatedAt — used by complete-profile tests
        email: 'playwright_test_onboarding@example.com',
        username: '🎭 PLAYWRIGHT TEST - Onboarding User',
        hashedPassword: hashedPassword,
      },
    ];

    for (const userData of testUsers) {
      const user = await prisma.user.create({
        data: userData,
      });
      // Create user settings with onboarding tour disabled to prevent tour overlays in tests
      await prisma.userSettings.upsert({
        where: { userId: user.id },
        update: { showOnboardingTour: false },
        create: { userId: user.id, showOnboardingTour: false },
      });
      console.log(`Created test user: ${userData.username}`);
    }

    // Verify the users exist
    const userCount = await prisma.user.count();
    const testUserCount = await prisma.user.count({
      where: {
        email: {
          contains: 'playwright_test',
        },
      },
    });

    console.log('Total users in database:', userCount);
    console.log('Test users created:', testUserCount);

    // --- Seed test recommendation data ---
    // Get the "existing" test user for the recommendation
    const existingUser = await prisma.user.findFirst({
      where: { email: 'playwright_test_existing@example.com' },
    });

    if (existingUser) {
      // Clean up any previous test albums/artists/recommendations
      await prisma.recommendation.deleteMany({
        where: { userId: existingUser.id },
      });
      await prisma.albumArtist.deleteMany({
        where: {
          album: { title: { startsWith: '🎭 TEST ALBUM' } },
        },
      });
      await prisma.album.deleteMany({
        where: { title: { startsWith: '🎭 TEST ALBUM' } },
      });
      await prisma.artist.deleteMany({
        where: { name: '🎭 TEST ARTIST' },
      });

      // Create a test artist
      const testArtist = await prisma.artist.create({
        data: {
          name: '🎭 TEST ARTIST',
          source: 'USER_SUBMITTED',
        },
      });

      // Create two test albums (source + recommended)
      const srcAlbum = await prisma.album.create({
        data: {
          title: '🎭 TEST ALBUM - Source',
          releaseDate: new Date('2020-01-01'),
          source: 'USER_SUBMITTED',
          coverArtUrl: 'https://placehold.co/300x300/1a1a2e/ffffff?text=SRC',
          artists: {
            create: {
              artistId: testArtist.id,
              role: 'primary',
              position: 0,
            },
          },
        },
      });

      const recAlbum = await prisma.album.create({
        data: {
          title: '🎭 TEST ALBUM - Recommended',
          releaseDate: new Date('2021-06-15'),
          source: 'USER_SUBMITTED',
          coverArtUrl: 'https://placehold.co/300x300/2e1a2e/ffffff?text=REC',
          artists: {
            create: {
              artistId: testArtist.id,
              role: 'primary',
              position: 0,
            },
          },
        },
      });

      // Create the recommendation
      await prisma.recommendation.create({
        data: {
          userId: existingUser.id,
          basisAlbumId: srcAlbum.id,
          recommendedAlbumId: recAlbum.id,
          score: 85,
        },
      });

      console.log('Created test recommendation: Source → Recommended (score: 85)');
    }

    console.log('✅ Test users ready in dev database');
  } catch (error) {
    console.error('Error setting up test data:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }

  // You can also start a dev server here if needed
  // But since we're using webServer in playwright.config.ts, we don't need to
}

export default globalSetup;
