// scripts/backfill-listen-later.ts
import prisma from '@/lib/prisma';

async function main() {
  const users = await prisma.user.findMany({
    select: { id: true, name: true },
  });
  console.log(`Found ${users.length} users`);

  for (const user of users) {
    const existing = await prisma.collection.findFirst({
      where: { userId: user.id, name: 'Listen Later' },
      select: { id: true },
    });
    if (existing) {
      console.log(
        `✅ ${user.name || user.id}: already has Listen Later (${existing.id})`
      );
      continue;
    }
    const created = await prisma.collection.create({
      data: { userId: user.id, name: 'Listen Later', isPublic: false },
      select: { id: true },
    });
    console.log(
      `➕ ${user.name || user.id}: created Listen Later (${created.id})`
    );
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
    console.log('Done.');
  })
  .catch(async e => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
