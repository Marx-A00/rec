/**
 * Create default UserSettings for users who don't have them.
 *
 * Usage:
 *   npx tsx src/scripts/create-user-settings-standalone.ts
 *
 * Options:
 *   --dry-run   Show what would be done without making changes
 */

import { PrismaClient } from '@prisma/client';

const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');

const prisma = new PrismaClient();

async function createUserSettings() {
  console.log('=== Create Missing User Settings ===\n');

  if (dryRun) {
    console.log('*** DRY RUN MODE - No changes will be made ***\n');
  }

  // Find users without settings
  const users = await prisma.$queryRaw<{ id: string; username: string }[]>`
    SELECT u.id, u.username FROM "User" u
    LEFT JOIN "UserSettings" us ON u.id = us."userId"
    WHERE us.id IS NULL
  `;

  console.log(`Found ${users.length} users without settings\n`);

  if (users.length === 0) {
    console.log('Nothing to do!');
    return;
  }

  // Show who needs settings
  for (const user of users) {
    console.log(`  - ${user.username} (${user.id})`);
  }

  if (dryRun) {
    console.log(`\n*** Would create settings for ${users.length} users ***`);
    return;
  }

  // Create default settings for each user
  console.log('\nCreating settings...\n');

  let created = 0;
  for (const user of users) {
    await prisma.$executeRaw`
      INSERT INTO "UserSettings" (
        id, "userId", theme, language, "profileVisibility",
        "showRecentActivity", "showCollections", "showListenLaterInFeed",
        "showCollectionAddsInFeed", "showOnboardingTour", "emailNotifications",
        "recommendationAlerts", "followAlerts", "defaultCollectionView",
        "autoplayPreviews", "createdAt", "updatedAt"
      ) VALUES (
        gen_random_uuid(), ${user.id}, 'dark', 'en', 'public',
        true, true, true, true, true, true, true, true, 'grid', false,
        NOW(), NOW()
      )
    `;
    console.log(`✓ Created settings for ${user.username}`);
    created++;
  }

  console.log(`\n=== Summary ===`);
  console.log(`Settings created: ${created}`);
}

async function main() {
  try {
    await createUserSettings();
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
