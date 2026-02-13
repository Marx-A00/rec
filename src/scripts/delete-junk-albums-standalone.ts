/**
 * Delete junk albums with genre-like names.
 *
 * These are albums that have genre keywords as their title (e.g., "Hip Hop, Nu Skool")
 * and have zero user relationships (no collections, no recommendations).
 *
 * Usage:
 *   npx tsx src/scripts/delete-junk-albums-standalone.ts
 *
 * Options:
 *   --dry-run   Show what would be deleted without making changes
 */

import { PrismaClient } from '@prisma/client';

const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');

const prisma = new PrismaClient();

async function deleteJunkAlbums() {
  console.log('=== Delete Junk Genre-Named Albums ===\n');

  if (dryRun) {
    console.log('*** DRY RUN MODE - No changes will be made ***\n');
  }

  console.log('Finding junk albums with genre-like names...\n');

  // These are albums that have genre keywords as their title
  // and have zero user relationships (no collections, no recommendations)
  const junkAlbums = await prisma.$queryRaw<
    { id: string; title: string; source: string }[]
  >`
    SELECT a.id, a.title, a.source::text FROM albums a
    WHERE (
      a.title ~* '^(Hip[- ]?Hop|Electronic|Indie|Rock|Pop|Alternative|Jazz|Soul|Metal|R&B)[,\\s/&]'
      OR a.title ~* '[,\\s/&](Hip[- ]?Hop|Electronic|Indie|Rock|Pop|Alternative|Jazz|Soul|Metal)[,\\s/&]?'
      OR a.title ~* '^(Urban|Uplifting).*(Pop|Rock|Hip|Indie|Electronic)'
    )
    AND a.id NOT IN (SELECT album_id FROM "CollectionAlbum")
    AND a.id NOT IN (SELECT basis_album_id FROM "Recommendation")
    AND a.id NOT IN (SELECT recommended_album_id FROM "Recommendation")
  `;

  if (junkAlbums.length === 0) {
    console.log('No junk albums found. Database is clean!');
    return;
  }

  console.log(`Found ${junkAlbums.length} junk albums:\n`);

  // Show all albums that will be deleted
  for (const album of junkAlbums) {
    console.log(`  - "${album.title}" [${album.source}]`);
  }

  if (dryRun) {
    console.log(`\n*** Would delete ${junkAlbums.length} junk albums ***`);
    return;
  }

  console.log(`\nDeleting ${junkAlbums.length} junk albums...\n`);

  const ids = junkAlbums.map(a => a.id);

  // Delete related records first (tracks, album_artists, enrichment_logs)
  const tracksDeleted = await prisma.$executeRaw`
    DELETE FROM tracks WHERE album_id = ANY(${ids}::uuid[])
  `;
  console.log(`  Deleted ${tracksDeleted} tracks`);

  const artistLinksDeleted = await prisma.$executeRaw`
    DELETE FROM album_artists WHERE album_id = ANY(${ids}::uuid[])
  `;
  console.log(`  Deleted ${artistLinksDeleted} album-artist links`);

  const logsDeleted = await prisma.$executeRaw`
    DELETE FROM llama_logs WHERE album_id = ANY(${ids}::uuid[])
  `;
  console.log(`  Deleted ${logsDeleted} llama logs`);

  // Delete the albums
  const albumsDeleted = await prisma.$executeRaw`
    DELETE FROM albums WHERE id = ANY(${ids}::uuid[])
  `;
  console.log(`  Deleted ${albumsDeleted} albums`);

  console.log(`\n=== Summary ===`);
  console.log(`Junk albums deleted: ${albumsDeleted}`);
}

async function main() {
  try {
    await deleteJunkAlbums();
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
