#!/usr/bin/env tsx
/**
 * Script to batch cache album cover art to Cloudflare Images
 * Usage: pnpm tsx scripts/cache-album-covers.ts [--limit=N] [--dry-run]
 */

import { prisma } from '@/lib/prisma';
import { getMusicBrainzQueue, JOB_TYPES } from '@/lib/queue';

async function main() {
  const args = process.argv.slice(2);
  const limitArg = args.find(arg => arg.startsWith('--limit='));
  const dryRun = args.includes('--dry-run');
  const limit = limitArg ? parseInt(limitArg.split('=')[1]) : undefined;

  console.log('🎨 Album Cover Art Caching Script');
  console.log('================================');
  if (dryRun) console.log('🔍 DRY RUN MODE - No jobs will be queued\n');

  // Find albums that need caching (no cloudflareImageId and have coverArtUrl)
  const albums = await prisma.album.findMany({
    where: {
      AND: [
        { coverArtUrl: { not: null } },
        {
          OR: [
            { cloudflareImageId: null },
            { cloudflareImageId: '' },
          ],
        },
      ],
    },
    select: {
      id: true,
      title: true,
      coverArtUrl: true,
    },
    take: limit,
  });

  console.log(`📊 Found ${albums.length} albums needing cover art caching`);

  if (albums.length === 0) {
    console.log('✅ All albums already cached!');
    await prisma.$disconnect();
    return;
  }

  if (dryRun) {
    console.log('\n📋 Albums that would be queued:');
    albums.slice(0, 10).forEach((album, i) => {
      console.log(`  ${i + 1}. ${album.title}`);
      console.log(`     URL: ${album.coverArtUrl}`);
    });
    if (albums.length > 10) {
      console.log(`  ... and ${albums.length - 10} more`);
    }
    await prisma.$disconnect();
    return;
  }

  // Queue jobs for batch processing
  const queue = getMusicBrainzQueue();
  let queuedCount = 0;

  console.log('\n📤 Queueing cache jobs...');

  for (const album of albums) {
    try {
      await queue.addJob(
        JOB_TYPES.CACHE_ALBUM_COVER_ART,
        { albumId: album.id },
        {
          priority: 0, // Low priority for batch jobs
          removeOnComplete: 100,
          removeOnFail: 50,
          attempts: 3, // Retry up to 3 times
          backoff: {
            type: 'exponential',
            delay: 2000, // Start with 2s delay, then 4s, then 8s
          },
        }
      );
      queuedCount++;

      if (queuedCount % 100 === 0) {
        console.log(`  ✓ Queued ${queuedCount}/${albums.length} albums`);
      }
    } catch (error) {
      console.error(`  ✗ Failed to queue album ${album.id}:`, error);
    }
  }

  console.log(`\n✅ Successfully queued ${queuedCount} cache jobs`);
  console.log('💡 Monitor progress at http://localhost:3001/admin/queues');

  await prisma.$disconnect();
  await queue.close();
}

main().catch(error => {
  console.error('❌ Script error:', error);
  process.exit(1);
});
