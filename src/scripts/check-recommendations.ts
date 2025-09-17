// Check if recommendations exist in database
import { prisma } from '@/lib/prisma';

async function checkRecommendations() {
  console.log('\n=== Checking Recommendations in Database ===\n');

  // Count total recommendations
  const totalCount = await prisma.recommendation.count();
  console.log(`Total recommendations in database: ${totalCount}`);

  if (totalCount === 0) {
    console.log('\n❌ No recommendations found in database!');
    console.log('You need to create some recommendations first.');
    await prisma.$disconnect();
    return;
  }

  // Get first 5 recommendations with details
  const recommendations = await prisma.recommendation.findMany({
    take: 5,
    orderBy: { createdAt: 'desc' },
    include: {
      user: true,
      basisAlbum: {
        include: {
          artists: {
            include: {
              artist: true
            }
          }
        }
      },
      recommendedAlbum: {
        include: {
          artists: {
            include: {
              artist: true
            }
          }
        }
      }
    }
  });

  console.log('\n=== First 5 Recommendations ===\n');
  recommendations.forEach((rec, idx) => {
    console.log(`${idx + 1}. Recommendation ID: ${rec.id}`);
    console.log(`   User: ${rec.user?.name || 'Unknown'} (${rec.user?.id})`);
    console.log(`   Score: ${rec.score}`);
    console.log(`   Created: ${rec.createdAt}`);
    console.log(`   Basis Album: ${rec.basisAlbum?.title || 'Unknown'}`);
    console.log(`   Recommended Album: ${rec.recommendedAlbum?.title || 'Unknown'}`);
    console.log('');
  });

  // Check user-specific recommendations
  const userId = 'cmfmo8b6900019dwpsf9dsn35';
  const userRecs = await prisma.recommendation.findMany({
    where: { userId },
    include: {
      basisAlbum: true,
      recommendedAlbum: true
    }
  });

  console.log(`\n=== Recommendations for user ${userId} ===`);
  console.log(`Found ${userRecs.length} recommendations`);
  if (userRecs.length > 0) {
    userRecs.slice(0, 3).forEach(rec => {
      console.log(`- ${rec.basisAlbum?.title} → ${rec.recommendedAlbum?.title} (score: ${rec.score})`);
    });
  }

  await prisma.$disconnect();
}

checkRecommendations().catch(console.error);