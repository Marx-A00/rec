import { PrismaClient } from '@prisma/client';

import {
  sampleAlbums,
  sampleRecommendations,
  sampleTracks,
  sampleUsers,
} from '../index';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...');

  try {
    // Clear existing data in correct order (respecting foreign key constraints)
    console.log('🧹 Clearing existing data...');
    await prisma.recommendation.deleteMany();
    await prisma.track.deleteMany();
    await prisma.album.deleteMany();
    await prisma.session.deleteMany();
    await prisma.account.deleteMany();
    await prisma.user.deleteMany();

    // Seed users
    console.log('👥 Seeding users...');
    for (const user of sampleUsers) {
      await prisma.user.create({
        data: {
          id: user.id,
          name: user.name,
          email: user.email,
          image: user.image,
          emailVerified: user.emailVerified,
          hashedPassword: user.hashedPassword,
        },
      });
    }
    console.log(`✅ Created ${sampleUsers.length} users`);

    // Seed albums
    console.log('💿 Seeding albums...');
    for (const album of sampleAlbums) {
      await prisma.album.create({
        data: {
          id: album.id,
          discogsId: album.discogsId,
          title: album.title,
          artist: album.artist,
          releaseDate: album.releaseDate,
          genre: album.genre,
          label: album.label,
          imageUrl: album.imageUrl,
          createdAt: album.createdAt,
          updatedAt: album.updatedAt,
        },
      });
    }
    console.log(`✅ Created ${sampleAlbums.length} albums`);

    // Seed tracks
    console.log('🎵 Seeding tracks...');
    for (const track of sampleTracks) {
      await prisma.track.create({
        data: {
          id: track.id,
          title: track.title,
          duration: track.duration,
          trackNumber: track.trackNumber,
          albumId: track.albumId,
        },
      });
    }
    console.log(`✅ Created ${sampleTracks.length} tracks`);

    // Seed recommendations
    console.log('⭐ Seeding recommendations...');
    for (const recommendation of sampleRecommendations) {
      await prisma.recommendation.create({
        data: {
          id: recommendation.id,
          score: recommendation.score,
          userId: recommendation.userId,
          basisAlbumId: recommendation.basisAlbumId,
          recommendedAlbumId: recommendation.recommendedAlbumId,
          createdAt: recommendation.createdAt,
          updatedAt: recommendation.updatedAt,
        },
      });
    }
    console.log(`✅ Created ${sampleRecommendations.length} recommendations`);

    console.log('🎉 Database seeded successfully!');

    // Print some stats
    const stats = await prisma.$transaction([
      prisma.user.count(),
      prisma.album.count(),
      prisma.track.count(),
      prisma.recommendation.count(),
    ]);

    console.log('\n📊 Database Statistics:');
    console.log(`   Users: ${stats[0]}`);
    console.log(`   Albums: ${stats[1]}`);
    console.log(`   Tracks: ${stats[2]}`);
    console.log(`   Recommendations: ${stats[3]}`);
  } catch (error) {
    console.error('❌ Error seeding database:', error);
    throw error;
  }
}

main()
  .catch(e => {
    console.error('❌ Seed script failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    console.log('👋 Disconnected from database');
  });
