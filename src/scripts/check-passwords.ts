// Check if users have passwords
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Check a few users
  const users = await prisma.user.findMany({
    select: {
      id: true,
      email: true,
      hashedPassword: true,
    },
    take: 10,
  });

  console.log('\n=== Sample Users ===');
  for (const user of users) {
    console.log(
      `${user.email}: ${user.hashedPassword ? '✅ Has password' : '❌ NO PASSWORD'}`
    );
  }

  // Count statistics
  const totalUsers = await prisma.user.count();
  const usersWithPassword = await prisma.user.count({
    where: {
      hashedPassword: {
        not: null,
      },
    },
  });

  console.log('\n=== Statistics ===');
  console.log(`Total users: ${totalUsers}`);
  console.log(`Users with password: ${usersWithPassword}`);
  console.log(`Users WITHOUT password: ${totalUsers - usersWithPassword}`);

  if (totalUsers - usersWithPassword > 0) {
    console.log('\n⚠️  Some users are missing passwords!');
    console.log("This means they won't be able to log in.");

    // Check if we have the old production database backup
    console.log('\n=== Checking for password data ===');
    console.log(
      'Looking for production database backup with password hashes...'
    );
  }
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
  });
