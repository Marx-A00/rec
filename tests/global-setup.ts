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

    // Clear existing test users first
    await prisma.user.deleteMany({
      where: {
        email: {
          contains: 'PLAYWRIGHT_TEST',
        },
      },
    });

    // Create multiple recognizable test users
    const hashedPassword = await bcrypt.hash('TestPassword123!', 10);

    const testUsers = [
      {
        email: 'PLAYWRIGHT_TEST_existing@example.com',
        name: '🎭 PLAYWRIGHT TEST - Existing User',
        hashedPassword: hashedPassword,
      },
      {
        email: 'PLAYWRIGHT_TEST_duplicate@example.com',
        name: '🎭 PLAYWRIGHT TEST - Duplicate User',
        hashedPassword: hashedPassword,
      },
      {
        email: 'PLAYWRIGHT_TEST_sample@example.com',
        name: '🎭 PLAYWRIGHT TEST - Sample User',
        hashedPassword: hashedPassword,
      },
    ];

    for (const userData of testUsers) {
      await prisma.user.create({
        data: userData,
      });
      console.log(`Created test user: ${userData.name}`);
    }

    // Verify the users exist
    const userCount = await prisma.user.count();
    const testUserCount = await prisma.user.count({
      where: {
        email: {
          contains: 'PLAYWRIGHT_TEST',
        },
      },
    });

    console.log('Total users in database:', userCount);
    console.log('Test users created:', testUserCount);

    // Show which database we're actually using
    const dbUrl = process.env.DATABASE_URL || '';
    if (dbUrl.includes('onamogqceorcnecvcame')) {
      console.log('✅ USING TEST DATABASE (onamogqceorcnecvcame)');
    } else if (dbUrl.includes('uqsmqujtpebvytzqfmzr')) {
      console.log(
        '❌ USING REAL DATABASE (uqsmqujtpebvytzqfmzr) - THIS IS WRONG!'
      );
    } else {
      console.log('⚠️  UNKNOWN DATABASE:', dbUrl.substring(0, 50));
    }
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
