import { FullConfig } from '@playwright/test';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

async function globalSetup(config: FullConfig) {
  const prisma = new PrismaClient();

  try {
    // Create a test user for duplicate registration tests
    const hashedPassword = await bcrypt.hash('ExistingPassword123!', 10);

    await prisma.user.upsert({
      where: { email: 'existing@example.com' },
      update: {},
      create: {
        email: 'existing@example.com',
        name: 'Existing User',
        hashedPassword: hashedPassword,
      },
    });

    console.log('Test user created/updated successfully');
  } catch (error) {
    console.error('Error setting up test data:', error);
  } finally {
    await prisma.$disconnect();
  }

  // You can also start a dev server here if needed
  // But since we're using webServer in playwright.config.ts, we don't need to
}

export default globalSetup;
