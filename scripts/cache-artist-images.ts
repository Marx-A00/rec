#!/usr/bin/env ts-node
/**
 * Script to cache artist images from external sources to Cloudflare Images CDN
 *
 * Usage:
 *   ts-node scripts/cache-artist-images.ts [--limit=N] [--dry-run]
 *
 * Options:
 *   --limit=N    Limit number of artists to process (default: all)
 *   --dry-run    Show what would be cached without actually queueing jobs
 */

import { prisma } from '../src/lib/prisma';
import { musicBrainzQueue } from '../src/lib/queue/queue-service';
import { JOB_TYPES, CacheArtistImageJobData } from '../src/lib/queue/jobs';

async function main() {
  const args = process.argv.slice(2);
  const limitArg = args.find(arg => arg.startsWith('--limit='));
  const isDryRun = args.includes('--dry-run');

  const limit = limitArg ? parseInt(limitArg.split('=')[1]) : undefined;

  console.log('🎨 Artist Image Caching Script');
  console.log('================================');
  console.log(`Mode: ${isDryRun ? 'DRY RUN' : 'LIVE'}`);
  console.log(`Limit: ${limit || 'none'}\n`);

  // Find artists that need caching
  // - Have an imageUrl
  // - Don't have cloudflareImageId OR cloudflareImageId is empty string
  const artists = await prisma.artist.findMany({
    where: {
      AND: [
        { imageUrl: { not: null } },
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
      name: true,
      imageUrl: true,
      cloudflareImageId: true,
    },
    take: limit,
  });

  console.log(`Found ${artists.length} artists needing image caching:\n`);

  if (artists.length === 0) {
    console.log('✅ All artists with images are already cached!');
    await prisma.$disconnect();
    return;
  }

  // Show sample
  console.log('Sample artists to cache:');
  artists.slice(0, 5).forEach((artist, i) => {
    console.log(`  ${i + 1}. ${artist.name} (${artist.id})`);
    console.log(`     Image: ${artist.imageUrl?.substring(0, 60)}...`);
  });

  if (artists.length > 5) {
    console.log(`  ... and ${artists.length - 5} more\n`);
  }

  if (isDryRun) {
    console.log('🏃 DRY RUN - No jobs queued');
    await prisma.$disconnect();
    return;
  }

  // Queue caching jobs
  console.log('\n📤 Queueing caching jobs...');

  let queued = 0;
  for (const artist of artists) {
    const jobData: CacheArtistImageJobData = {
      artistId: artist.id,
      priority: 'low',
      requestId: `batch-cache-artist-${artist.id}`,
    };

    await musicBrainzQueue.addJob(
      JOB_TYPES.CACHE_ARTIST_IMAGE,
      jobData,
      {
        priority: 0, // Low priority for batch operations
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
      }
    );

    queued++;

    if (queued % 50 === 0) {
      console.log(`  Queued ${queued}/${artists.length} jobs...`);
    }
  }

  console.log(`\n✅ Successfully queued ${queued} artist image caching jobs`);
  console.log('   Jobs will be processed at ~1 per second due to rate limiting');
  console.log(`   Estimated completion time: ~${Math.ceil(queued / 60)} minutes\n`);

  await prisma.$disconnect();
}

main()
  .catch((error) => {
    console.error('❌ Error:', error);
    process.exit(1);
  });
