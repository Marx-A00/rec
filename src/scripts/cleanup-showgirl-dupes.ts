/**
 * Cleanup script for bogus Taylor Swift "The Life of a Showgirl" data:
 * 1. Delete two junk recommendations from bunko boy (self-referencing / same-album recs)
 * 2. Delete associated activity records
 * 3. Delete the duplicate trackless album (f8242924-690b-400d-97a5-7045e9c71ebf)
 *
 * Usage:
 *   npx tsx src/scripts/cleanup-showgirl-dupes.ts
 *
 * Safe to run multiple times — checks for existence before deleting.
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const JUNK_REC_IDS = [
  'cmgvo0uif0002pc3ghmf621dl', // Showgirl(dupe) → Showgirl(real), score 5
  'cmgvo3faj0004pc3gva9xgi17', // Showgirl(dupe) → Showgirl(dupe), score 10 (self-rec)
];

const JUNK_ACTIVITY_IDS = [
  'act-rec-cmgvo0uif0002pc3ghmf621dl',
  'act-rec-cmgvo3faj0004pc3gva9xgi17',
];

const DUPLICATE_ALBUM_ID = 'f8242924-690b-400d-97a5-7045e9c71ebf';

async function cleanup() {
  // 1. Delete activities
  const activities = await prisma.activity.deleteMany({
    where: { id: { in: JUNK_ACTIVITY_IDS } },
  });
  console.log(`Deleted ${activities.count} activity record(s)`);

  // 2. Delete recommendations
  const recs = await prisma.recommendation.deleteMany({
    where: { id: { in: JUNK_REC_IDS } },
  });
  console.log(`Deleted ${recs.count} recommendation(s)`);

  // 3. Delete the duplicate trackless album
  // First check it's still trackless and has no remaining references
  const album = await prisma.album.findUnique({
    where: { id: DUPLICATE_ALBUM_ID },
    include: {
      _count: {
        select: {
          tracks: true,
          collectionAlbums: true,
          basisRecommendations: true,
          targetRecommendations: true,
        },
      },
    },
  });

  if (!album) {
    console.log(`Album ${DUPLICATE_ALBUM_ID} already deleted, skipping`);
    return;
  }

  const refs =
    album._count.tracks +
    album._count.collectionAlbums +
    album._count.basisRecommendations +
    album._count.targetRecommendations;

  if (refs > 0) {
    console.error(
      `Album ${DUPLICATE_ALBUM_ID} still has ${refs} reference(s), skipping deletion:`,
      album._count
    );
    return;
  }

  // Safe to delete — remove artist associations first, then the album
  await prisma.albumArtist.deleteMany({
    where: { albumId: DUPLICATE_ALBUM_ID },
  });
  await prisma.album.delete({ where: { id: DUPLICATE_ALBUM_ID } });
  console.log(
    `Deleted duplicate album: "${album.title}" (${DUPLICATE_ALBUM_ID})`
  );

  console.log('\nCleanup complete.');
}

cleanup()
  .catch(e => {
    console.error('Cleanup failed:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
