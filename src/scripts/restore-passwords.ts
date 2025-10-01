// Restore hashed passwords from production backup
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Password data from production backup
const userPasswords = [
  {
    email: 'julissamarie1120@gmail.com',
    hashedPassword:
      '$2b$12$rY9YVDUD2KpZSAUflMgCsOoIkPnp2aHvHb1apVG3WA5pN3ehcPoFS',
  },
  {
    email: 'mnandrade1999@gmail.com',
    hashedPassword:
      '$2b$12$Mx84AXqEN7jOLHNe9RgpYe3NiMqVHWiDAd6pJLeYEAfsn9aTL05t6',
  },
  {
    email: 'liam1looper@gmail.com',
    hashedPassword:
      '$2b$12$9p2f6qTltiEgXv6SK04blesKCmmsi/quK5c42/rFnE2z257ynKC5K',
  },
  {
    email: 'marcos.andrade.dev@gmail.com',
    hashedPassword:
      '$2b$12$Z60R8E6aZr2e4xLdmAxyee5mUxtk/3OzEUJWAuENhtSc/q7SK9E.6',
  },
  {
    email: 'dev.zellner88@gmail.com',
    hashedPassword:
      '$2b$12$plwjnP.aa3U6LfXdF7gPmObz1HupFFxT0tO20tZMnsrQCoBeqgW3e',
  },
  {
    email: 'jamilonealhsct@gmail.com',
    hashedPassword:
      '$2b$12$45qtY33aYiMHFilKePdBkOIPPTVMWqr8NtJvF5hlEpLdEh4KZ9o0i',
  },
  {
    email: 'ashespokeballs@gmail.com',
    hashedPassword:
      '$2b$12$QSAN.BAQJKVScrGHgHFs3u0Sybj41o/YknpcYy54T4RAyHpmhO1wy',
  },
  {
    email: 'tyler500.beecroft@gmail.com',
    hashedPassword:
      '$2b$12$yD7g3uzDdz30ja0thh5tiOOkANc73sjWV17uLabir3VmAdaDss2/S',
  },
  {
    email: 'abev999@yahoo.com',
    hashedPassword:
      '$2b$12$nAyQjK7W1s8PTfDElZm/S.u9Z2NotjkTcC19jxdArLEpRMN5v5i9q',
  },
  {
    email: 'jacob.vankampen22@gmail.com',
    hashedPassword:
      '$2b$12$Y.lTmRBibcR/4YGZbESXWOOpJ9qbzXNq5syhB18snI.7kipFlfV4O',
  },
  {
    email: 'gregabrahams17@gmail.com',
    hashedPassword:
      '$2b$12$03cnXcBdgUcpuQeLBHaABez2fQZtJQ/x4NSuLNO9l/1l6k2nbJ9a.',
  },
  {
    email: 'kyleikr2013@gmail.com',
    hashedPassword:
      '$2b$12$gCciJImn4qUR9zjArbxdK.AGjib47Ovs7qrXmzrvXalT85qBVMHbK',
  },
];

async function main() {
  console.log('🔐 Starting password restoration...\n');

  let successCount = 0;
  let failCount = 0;

  for (const userData of userPasswords) {
    try {
      const user = await prisma.user.update({
        where: {
          email: userData.email,
        },
        data: {
          hashedPassword: userData.hashedPassword,
        },
      });

      console.log(`✅ Restored password for: ${user.email}`);
      successCount++;
    } catch (error) {
      console.error(
        `❌ Failed to restore password for ${userData.email}:`,
        error
      );
      failCount++;
    }
  }

  console.log('\n=== Password Restoration Complete ===');
  console.log(`✅ Successfully restored: ${successCount} passwords`);
  if (failCount > 0) {
    console.log(`❌ Failed to restore: ${failCount} passwords`);
  }

  // Verify the restoration
  console.log('\n=== Verifying Restoration ===');
  const usersWithPasswords = await prisma.user.count({
    where: {
      hashedPassword: {
        not: null,
      },
    },
  });

  const totalUsers = await prisma.user.count();

  console.log(`Users with passwords: ${usersWithPasswords}/${totalUsers}`);

  if (usersWithPasswords === totalUsers) {
    console.log('\n🎉 All users now have passwords and can log in!');
  } else {
    console.log(
      `\n⚠️  ${totalUsers - usersWithPasswords} users still missing passwords`
    );
  }
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
  });
