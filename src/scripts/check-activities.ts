/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck
// Check what activities are actually in the database
import { prisma } from '@/lib/prisma';

async function checkActivities() {
  console.log('\n=== Checking Activity Data ===\n');

  // Check follows
  const followCount = await prisma.userFollow.count();
  console.log(`Total user follows: ${followCount}`);

  if (followCount > 0) {
    const recentFollows = await prisma.userFollow.findMany({
      take: 3,
      orderBy: { createdAt: 'desc' },
      include: {
        follower: { select: { name: true } },
        followed: { select: { name: true } },
      },
    });
    console.log('Recent follows:');
    recentFollows.forEach(f => {
      console.log(
        `  - ${f.follower.name} followed ${f.followed.name} at ${f.createdAt}`
      );
    });
  }

  // Check recommendations (we know these exist)
  const recCount = await prisma.recommendation.count();
  console.log(`\nTotal recommendations: ${recCount}`);

  // Check collection adds
  const collectionAddCount = await prisma.collectionAlbum.count();
  console.log(`\nTotal collection albums: ${collectionAddCount}`);

  if (collectionAddCount > 0) {
    const recentAdds = await prisma.collectionAlbum.findMany({
      take: 3,
      orderBy: { addedAt: 'desc' },
      include: {
        collection: {
          include: {
            user: { select: { name: true } },
          },
        },
        album: { select: { title: true } },
      },
    });
    console.log('Recent collection adds:');
    recentAdds.forEach(ca => {
      console.log(
        `  - ${ca.collection.user.name} added "${ca.album?.title || ca.albumTitle}" at ${ca.addedAt}`
      );
    });
  }

  // Check if profile updates are tracked anywhere
  const usersWithBio = await prisma.user.count({
    where: {
      bio: { not: null },
    },
  });
  console.log(`\nUsers with bio/profile info: ${usersWithBio}`);
  console.log(
    "(Note: Profile updates don't seem to have a separate activity table)"
  );

  await prisma.$disconnect();
}

checkActivities().catch(console.error);
