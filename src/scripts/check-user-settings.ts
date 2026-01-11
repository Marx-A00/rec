// Check user settings in database
import { prisma } from '@/lib/prisma';

async function checkUserSettings() {
  const userId = 'cmfmo8b6900019dwpsf9dsn35'; // Your user ID

  console.log(`\n=== Checking UserSettings for user ${userId} ===\n`);

  // Check if settings exist
  const settings = await prisma.userSettings.findUnique({
    where: { userId },
  });

  if (!settings) {
    console.log('❌ No UserSettings record found for this user');
    console.log('Settings will be created on first dashboard interaction');
  } else {
    console.log('✅ UserSettings found:');
    console.log(`  ID: ${settings.id}`);
    console.log(`  Theme: ${settings.theme}`);
    console.log(`  Language: ${settings.language}`);
    console.log(
      `  Dashboard Layout: ${settings.dashboardLayout ? 'Yes' : 'No'}`
    );

    if (settings.dashboardLayout) {
      console.log('\nDashboard Layout:');
      console.log(JSON.stringify(settings.dashboardLayout, null, 2));
    }

    console.log(`\n  Created: ${settings.createdAt}`);
    console.log(`  Updated: ${settings.updatedAt}`);
  }

  // Check all UserSettings records
  console.log('\n=== All UserSettings Records ===');
  const allSettings = await prisma.userSettings.findMany({
    select: {
      id: true,
      userId: true,
      user: {
        select: { username: true, email: true },
      },
      dashboardLayout: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  console.log(`Total UserSettings records: ${allSettings.length}`);
  allSettings.forEach(s => {
    console.log(`- User: ${s.user.username} (${s.user.email})`);
    console.log(`  Has Dashboard Layout: ${s.dashboardLayout ? 'Yes' : 'No'}`);
    console.log(`  Last Updated: ${s.updatedAt}`);
  });

  await prisma.$disconnect();
}

checkUserSettings().catch(console.error);
