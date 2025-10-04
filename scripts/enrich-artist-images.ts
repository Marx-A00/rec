#!/usr/bin/env tsx
/**
 * Re-enrich existing artists to fetch images from Discogs/Wikimedia
 *
 * This script queues artist enrichment jobs to:
 * 1. Fetch images from Discogs (if discogsId exists)
 * 2. Fallback to Wikimedia Commons
 * 3. Auto-cache to Cloudflare CDN
 *
 * Usage:
 *   tsx scripts/enrich-artist-images.ts [--limit=N] [--dry-run] [--force]
 *
 * Options:
 *   --limit=N    Limit number of artists to process (default: all)
 *   --dry-run    Show what would be queued without actually queueing
 *   --force      Re-enrich even artists that already have images
 */

import { prisma } from '../src/lib/prisma';
import { getMusicBrainzQueue } from '../src/lib/queue';
import { JOB_TYPES, EnrichArtistJobData } from '../src/lib/queue/jobs';

async function main() {
  const args = process.argv.slice(2);
  const limitArg = args.find(arg => arg.startsWith('--limit='));
  const isDryRun = args.includes('--dry-run');
  const force = args.includes('--force');

  const limit = limitArg ? parseInt(limitArg.split('=')[1]) : undefined;

  console.log('🎨 Artist Image Enrichment Script');
  console.log('==================================');
  console.log(`Mode: ${isDryRun ? 'DRY RUN' : 'LIVE'}`);
  console.log(`Force: ${force ? 'Yes (re-enrich all)' : 'No (skip if has image)'}`);
  console.log(`Limit: ${limit || 'none'}\n`);

  // Build query based on force flag
  const whereClause = force
    ? { musicbrainzId: { not: null } } // All artists with MBID
    : {
        AND: [
          { musicbrainzId: { not: null } },
          {
            OR: [
              { imageUrl: null },
              { imageUrl: '' },
            ],
          },
        ],
      };

  // Find artists needing enrichment
  const artists = await prisma.artist.findMany({
    where: whereClause,
    select: {
      id: true,
      name: true,
      musicbrainzId: true,
      discogsId: true,
      imageUrl: true,
    },
    take: limit,
  });

  console.log(`Found ${artists.length} artists needing image enrichment:\n`);

  if (artists.length === 0) {
    console.log('✅ No artists need enrichment!');
    await prisma.$disconnect();
    return;
  }

  // Show sample
  console.log('Sample artists:');
  artists.slice(0, 5).forEach((artist, i) => {
    console.log(`  ${i + 1}. ${artist.name}`);
    console.log(`     Has Discogs ID: ${artist.discogsId ? 'Yes' : 'No'}`);
    console.log(`     Current image: ${artist.imageUrl ? 'Yes' : 'No'}`);
  });

  if (artists.length > 5) {
    console.log(`  ... and ${artists.length - 5} more\n`);
  }

  console.log('\n💡 Tip: Run backfill-discogs-ids.ts first to get Discogs IDs!\n');

  if (isDryRun) {
    console.log('🏃 DRY RUN - No jobs will be queued');
    await prisma.$disconnect();
    return;
  }

  // Queue enrichment jobs
  console.log('📤 Queueing artist enrichment jobs...\n');

  const queue = getMusicBrainzQueue();
  let queued = 0;

  for (const artist of artists) {
    const jobData: EnrichArtistJobData = {
      artistId: artist.id,
      priority: 'medium',
      requestId: `backfill-enrich-${artist.id}`,
    };

    await queue.addJob(
      JOB_TYPES.ENRICH_ARTIST,
      jobData,
      {
        priority: 5, // Medium priority
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
      }
    );

    queued++;

    if (queued % 10 === 0) {
      console.log(`  Queued ${queued}/${artists.length} jobs...`);
    }
  }

  console.log(`\n✅ Successfully queued ${queued} artist enrichment jobs`);
  console.log('   Jobs will process at ~1 per second due to rate limiting');
  console.log(`   Estimated completion time: ~${Math.ceil(queued / 60)} minutes`);
  console.log('\n📋 Each enrichment will:');
  console.log('   1. Fetch artist image from Discogs (if has discogsId)');
  console.log('   2. Fallback to Wikimedia Commons');
  console.log('   3. Auto-queue Cloudflare caching job\n');

  await prisma.$disconnect();
}

main()
  .catch((error) => {
    console.error('❌ Error:', error);
    process.exit(1);
  });
