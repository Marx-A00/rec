/**
 * Backfill missing default collections ("My Collection" and "Listen Later")
 * for users who were created before the auto-creation fix in auth.ts.
 *
 * Usage:
 *   npx tsx src/scripts/backfill-default-collections.ts
 *
 * Uses DATABASE_URL from environment (or .env file via Prisma).
 * Safe to run multiple times — only creates missing collections.
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const DEFAULT_COLLECTIONS = [
  {
    name: 'My Collection',
    description: 'My music collection',
    isPublic: false,
  },
  {
    name: 'Listen Later',
    description: 'Albums to listen to later',
    isPublic: false,
  },
];

async function backfill() {
  const users = await prisma.user.findMany({
    select: {
      id: true,
      username: true,
      collections: {
        select: { name: true },
      },
    },
  });

  let created = 0;
  let skipped = 0;

  for (const user of users) {
    const existingNames = new Set(user.collections.map(c => c.name));

    for (const def of DEFAULT_COLLECTIONS) {
      if (existingNames.has(def.name)) {
        skipped++;
        continue;
      }

      await prisma.collection.create({
        data: {
          userId: user.id,
          name: def.name,
          description: def.description,
          isPublic: def.isPublic,
        },
      });

      console.log(`Created "${def.name}" for ${user.username || user.id}`);
      created++;
    }
  }

  console.log(
    `\nDone. Created: ${created}, Skipped (already existed): ${skipped}`
  );
}

backfill()
  .catch(e => {
    console.error('Backfill failed:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
