// Restore user bios from production backup
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Bio data from production backup
const userBios = [
  { email: 'julissamarie1120@gmail.com', bio: 'Artist, Music lover. silly gremlin and lover of ethereal music' },
  { email: 'mnandrade1999@gmail.com', bio: 'LISTENN && 4GET' },
  { email: 'liam1looper@gmail.com', bio: 'pyra fan' },
  { email: 'marcos.andrade.dev@gmail.com', bio: 'uncle pills' },
  { email: 'dev.zellner88@gmail.com', bio: 'Music enthusiast | Sharing vibes and discovering new sounds' },
  { email: 'jamilonealhsct@gmail.com', bio: null },
  { email: 'ashespokeballs@gmail.com', bio: null },
  { email: 'tyler500.beecroft@gmail.com', bio: 'PA Savage' },
  { email: 'abev999@yahoo.com', bio: 'PMB enthusiast' },
  { email: 'jacob.vankampen22@gmail.com', bio: null },
  { email: 'gregabrahams17@gmail.com', bio: null },
  { email: 'kyleikr2013@gmail.com', bio: null },
];

async function main() {
  console.log('📝 Starting bio restoration...\n');

  let successCount = 0;
  let withBioCount = 0;
  let failCount = 0;

  for (const userData of userBios) {
    try {
      const user = await prisma.user.update({
        where: {
          email: userData.email,
        },
        data: {
          bio: userData.bio,
        },
      });

      if (userData.bio) {
        console.log(`✅ Restored bio for ${user.email}: "${userData.bio}"`);
        withBioCount++;
      } else {
        console.log(`📋 ${user.email} has no bio (as expected)`);
      }
      successCount++;
    } catch (error) {
      console.error(`❌ Failed to update ${userData.email}:`, error);
      failCount++;
    }
  }

  console.log('\n=== Bio Restoration Complete ===');
  console.log(`✅ Successfully updated: ${successCount} users`);
  console.log(`📝 Users with bios: ${withBioCount}`);
  console.log(`📋 Users without bios: ${successCount - withBioCount}`);
  if (failCount > 0) {
    console.log(`❌ Failed to update: ${failCount} users`);
  }

  // Verify the restoration
  console.log('\n=== Verifying Bio Data ===');
  const usersWithBios = await prisma.user.count({
    where: {
      bio: {
        not: null,
      },
    },
  });

  const totalUsers = await prisma.user.count();

  console.log(`Users with bios: ${usersWithBios}/${totalUsers}`);

  // Show all users with their bios
  console.log('\n=== Current User Profiles ===');
  const allUsers = await prisma.user.findMany({
    select: {
      email: true,
      bio: true,
    },
    orderBy: {
      email: 'asc',
    },
  });

  for (const user of allUsers) {
    if (user.bio) {
      console.log(`📝 ${user.email}: "${user.bio}"`);
    } else {
      console.log(`   ${user.email}: (no bio)`);
    }
  }
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
  });