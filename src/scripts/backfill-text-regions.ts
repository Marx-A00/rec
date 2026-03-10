/**
 * Backfill text regions for existing UncoverChallenge records.
 *
 * Runs Google Cloud Vision text detection on each challenge's album cover
 * and updates the textRegions field with normalized bounding boxes.
 *
 * Usage:
 *   pnpm tsx src/scripts/backfill-text-regions.ts
 *   pnpm tsx src/scripts/backfill-text-regions.ts --skip-existing   # skip challenges that already have textRegions
 *   pnpm tsx src/scripts/backfill-text-regions.ts --dry-run          # preview without updating DB
 *   pnpm tsx src/scripts/backfill-text-regions.ts --limit 5          # process only N challenges
 *
 * Requires:
 *   - DATABASE_URL in environment (or .env via Prisma)
 *   - GOOGLE_APPLICATION_CREDENTIALS or GOOGLE_CLOUD_VISION_CREDENTIALS
 *   - CLOUDFLARE_IMAGES_DELIVERY_URL for Cloudflare image URLs
 */

import { PrismaClient, Prisma } from '@prisma/client';
import { detectAnswerRegions } from '@/lib/vision/text-detection';

const prisma = new PrismaClient();

// ─── Config ─────────────────────────────────────────────────────

const DELAY_BETWEEN_REQUESTS_MS = 2000; // 2s between Cloud Vision API calls
const BATCH_SIZE = 50; // Process in batches
const BATCH_PAUSE_MS = 10_000; // 10s pause between batches

// ─── CLI args ───────────────────────────────────────────────────

const args = process.argv.slice(2);
const skipExisting = args.includes('--skip-existing');
const dryRun = args.includes('--dry-run');
const limitIdx = args.indexOf('--limit');
const limit = limitIdx !== -1 ? parseInt(args[limitIdx + 1], 10) : undefined;

// ─── Helpers ────────────────────────────────────────────────────

function getImageUrl(
  coverArtUrl: string | null,
  cloudflareImageId: string | null
): string | null {
  if (cloudflareImageId) {
    const deliveryUrl = process.env.CLOUDFLARE_IMAGES_DELIVERY_URL;
    if (deliveryUrl) {
      const accountHash = deliveryUrl.split('/').pop();
      return `https://imagedelivery.net/${accountHash}/${cloudflareImageId}/public`;
    }
  }
  return coverArtUrl;
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ─── Main ───────────────────────────────────────────────────────

interface BackfillStats {
  total: number;
  processed: number;
  success: number;
  noText: number;
  failed: number;
  skipped: number;
  errors: Array<{ challengeId: string; albumTitle: string; error: string }>;
}

async function backfill() {
  console.log('');
  console.log('═══════════════════════════════════════════════════');
  console.log('  Backfill Text Regions for Uncover Challenges');
  console.log('═══════════════════════════════════════════════════');
  console.log('');
  console.log(`  Options:`);
  console.log(`    --skip-existing: ${skipExisting}`);
  console.log(`    --dry-run:       ${dryRun}`);
  console.log(`    --limit:         ${limit ?? 'none'}`);
  console.log('');

  // Fetch all challenges with album details
  const whereClause: Prisma.UncoverChallengeWhereInput = {};
  if (skipExisting) {
    whereClause.textRegions = { equals: Prisma.DbNull };
  }

  const challenges = await prisma.uncoverChallenge.findMany({
    where: whereClause,
    include: {
      album: {
        select: {
          id: true,
          title: true,
          coverArtUrl: true,
          cloudflareImageId: true,
          artists: {
            select: {
              artist: {
                select: { name: true },
              },
            },
          },
        },
      },
    },
    orderBy: { date: 'asc' },
    ...(limit ? { take: limit } : {}),
  });

  const stats: BackfillStats = {
    total: challenges.length,
    processed: 0,
    success: 0,
    noText: 0,
    failed: 0,
    skipped: 0,
    errors: [],
  };

  console.log(`  Found ${stats.total} challenge(s) to process`);
  console.log('');

  if (stats.total === 0) {
    console.log('  Nothing to do!');
    return;
  }

  for (let i = 0; i < challenges.length; i++) {
    const challenge = challenges[i];
    const albumTitle = challenge.album.title;
    const artistName =
      challenge.album.artists?.map(a => a.artist.name).join(', ') ?? 'Unknown';
    const imageUrl = getImageUrl(
      challenge.album.coverArtUrl,
      challenge.album.cloudflareImageId
    );

    const dateStr = challenge.date.toISOString().split('T')[0];
    const progress = `[${i + 1}/${stats.total}]`;

    if (!imageUrl) {
      console.log(
        `  ${progress} SKIP  ${dateStr} — ${albumTitle} (no image URL)`
      );
      stats.skipped++;
      stats.processed++;
      continue;
    }

    try {
      const regions = await detectAnswerRegions(
        imageUrl,
        albumTitle,
        artistName
      );

      if (regions === null) {
        console.log(
          `  ${progress} FAIL  ${dateStr} — ${albumTitle} (detection returned null)`
        );
        stats.failed++;
        stats.errors.push({
          challengeId: challenge.id,
          albumTitle,
          error: 'Detection returned null',
        });
      } else if (regions.length === 0) {
        console.log(
          `  ${progress} EMPTY ${dateStr} — ${albumTitle} (no text found)`
        );
        stats.noText++;

        if (!dryRun) {
          await prisma.uncoverChallenge.update({
            where: { id: challenge.id },
            data: { textRegions: [] },
          });
        }
      } else {
        console.log(
          `  ${progress} OK    ${dateStr} — ${albumTitle} (${regions.length} region${regions.length !== 1 ? 's' : ''})`
        );
        stats.success++;

        if (!dryRun) {
          await prisma.uncoverChallenge.update({
            where: { id: challenge.id },
            data: { textRegions: regions as unknown as Prisma.JsonArray },
          });
        }
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.log(
        `  ${progress} ERROR ${dateStr} — ${albumTitle}: ${errorMsg}`
      );
      stats.failed++;
      stats.errors.push({
        challengeId: challenge.id,
        albumTitle,
        error: errorMsg,
      });
    }

    stats.processed++;

    // Rate limiting
    if (i < challenges.length - 1) {
      // Batch pause
      if ((i + 1) % BATCH_SIZE === 0) {
        console.log(
          `\n  --- Batch pause (${BATCH_PAUSE_MS / 1000}s) after ${i + 1} items ---\n`
        );
        await sleep(BATCH_PAUSE_MS);
      } else {
        await sleep(DELAY_BETWEEN_REQUESTS_MS);
      }
    }
  }

  // ─── Summary ────────────────────────────────────────────────

  console.log('');
  console.log('═══════════════════════════════════════════════════');
  console.log('  Summary');
  console.log('═══════════════════════════════════════════════════');
  console.log(`  Total:     ${stats.total}`);
  console.log(`  Processed: ${stats.processed}`);
  console.log(`  Success:   ${stats.success} (text regions found)`);
  console.log(`  No text:   ${stats.noText} (cover has no detectable text)`);
  console.log(`  Failed:    ${stats.failed}`);
  console.log(`  Skipped:   ${stats.skipped}`);
  if (dryRun) {
    console.log('');
    console.log('  ⚠  DRY RUN — no database changes were made');
  }

  if (stats.errors.length > 0) {
    console.log('');
    console.log('  Failed albums:');
    for (const err of stats.errors) {
      console.log(`    - ${err.albumTitle}: ${err.error}`);
    }
  }

  console.log('');
}

backfill()
  .catch(error => {
    console.error('Backfill failed:', error);
    process.exit(1);
  })
  .finally(() => {
    prisma.$disconnect();
  });
