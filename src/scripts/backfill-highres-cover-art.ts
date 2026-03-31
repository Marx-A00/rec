/**
 * Backfill high-resolution cover art for existing albums.
 *
 * For albums with a MusicBrainz ID, fetches the full-resolution original
 * from Cover Art Archive, deletes the old Cloudflare image, and re-uploads.
 *
 * Usage:
 *   pnpm tsx src/scripts/backfill-highres-cover-art.ts
 *   pnpm tsx src/scripts/backfill-highres-cover-art.ts --dry-run
 *   pnpm tsx src/scripts/backfill-highres-cover-art.ts --limit 10
 *   pnpm tsx src/scripts/backfill-highres-cover-art.ts --source caa        # only CAA-sourced albums
 *   pnpm tsx src/scripts/backfill-highres-cover-art.ts --source spotify    # only Spotify-sourced albums
 *   pnpm tsx src/scripts/backfill-highres-cover-art.ts --source discogs    # only Discogs-sourced albums
 *
 * Requires:
 *   - DATABASE_URL in environment (or .env via Prisma)
 *   - CLOUDFLARE_ACCOUNT_ID, CLOUDFLARE_API_TOKEN for image upload/delete
 *   - CLOUDFLARE_IMAGES_DELIVERY_URL or CLOUDFLARE_IMAGES_ACCOUNT_HASH
 */

import { PrismaClient } from '@prisma/client';

import { getCAAUrl } from '@/lib/cover-art-archive';

const prisma = new PrismaClient();

// ─── Config ─────────────────────────────────────────────────────

const DELAY_BETWEEN_ALBUMS_MS = 1500; // 1.5s per album (HEAD + delete + upload)
const BATCH_SIZE = 50;
const BATCH_PAUSE_MS = 5_000; // 5s between batches

// ─── CLI args ───────────────────────────────────────────────────

const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const limitIdx = args.indexOf('--limit');
const limit = limitIdx !== -1 ? parseInt(args[limitIdx + 1], 10) : undefined;
const sourceIdx = args.indexOf('--source');
const sourceFilter = sourceIdx !== -1 ? args[sourceIdx + 1] : undefined;

// ─── Helpers ────────────────────────────────────────────────────

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function classifySource(coverArtUrl: string | null): string {
  if (!coverArtUrl) return 'none';
  if (coverArtUrl.includes('front-250') || coverArtUrl.includes('front-500'))
    return 'caa';
  if (coverArtUrl.match(/-\d+\.jpg/) && coverArtUrl.includes('coverartarchive'))
    return 'caa';
  if (coverArtUrl.includes('scdn.co') || coverArtUrl.includes('spotify'))
    return 'spotify';
  if (coverArtUrl.includes('discogs')) return 'discogs';
  if (coverArtUrl.includes('deezer')) return 'deezer';
  return 'other';
}

async function verifyUrl(url: string): Promise<boolean> {
  try {
    const response = await fetch(url, {
      method: 'HEAD',
      redirect: 'follow',
    });
    return response.ok;
  } catch {
    return false;
  }
}

// ─── Main ───────────────────────────────────────────────────────

interface BackfillStats {
  total: number;
  processed: number;
  upgraded: number;
  skipped: number;
  failed: number;
  noMbid: number;
  headFailed: number;
  errors: Array<{ albumId: string; title: string; error: string }>;
}

async function backfill() {
  // Lazy-import Cloudflare functions to avoid env var issues at module level
  const { deleteImage, cacheAlbumArt } = await import(
    '@/lib/cloudflare-images'
  );

  console.log('');
  console.log('═══════════════════════════════════════════════════');
  console.log('  Backfill High-Resolution Cover Art');
  console.log('═══════════════════════════════════════════════════');
  console.log('');
  console.log(`  Options:`);
  console.log(`    --dry-run: ${dryRun}`);
  console.log(`    --limit:   ${limit ?? 'none'}`);
  console.log(`    --source:  ${sourceFilter ?? 'all'}`);
  console.log('');

  // Fetch all albums that have a Cloudflare image (or coverArtUrl) and a MusicBrainz ID
  const albums = await prisma.album.findMany({
    where: {
      musicbrainzId: { not: null },
    },
    select: {
      id: true,
      title: true,
      coverArtUrl: true,
      cloudflareImageId: true,
      musicbrainzId: true,
    },
    orderBy: { createdAt: 'asc' },
  });

  // Filter by source if requested
  const filtered = sourceFilter
    ? albums.filter(a => classifySource(a.coverArtUrl) === sourceFilter)
    : albums;

  // Apply limit
  const toProcess = limit ? filtered.slice(0, limit) : filtered;

  const stats: BackfillStats = {
    total: toProcess.length,
    processed: 0,
    upgraded: 0,
    skipped: 0,
    failed: 0,
    noMbid: 0,
    headFailed: 0,
    errors: [],
  };

  console.log(`  Found ${albums.length} albums with MusicBrainz IDs`);
  if (sourceFilter) {
    console.log(
      `  Filtered to ${filtered.length} from source: ${sourceFilter}`
    );
  }
  console.log(`  Processing ${toProcess.length} albums`);
  console.log('');

  if (toProcess.length === 0) {
    console.log('  Nothing to do!');
    return;
  }

  // Source breakdown
  const breakdown: Record<string, number> = {};
  for (const album of toProcess) {
    const source = classifySource(album.coverArtUrl);
    breakdown[source] = (breakdown[source] || 0) + 1;
  }
  console.log('  Source breakdown:');
  for (const [source, count] of Object.entries(breakdown)) {
    console.log(`    ${source}: ${count}`);
  }
  console.log('');

  for (let i = 0; i < toProcess.length; i++) {
    const album = toProcess[i];
    const progress = `[${i + 1}/${stats.total}]`;
    const mbid = album.musicbrainzId!;

    // Build high-res CAA URL (full-res original, no size suffix)
    const highResUrl = getCAAUrl(mbid);

    // Check if this URL is already what we have
    if (album.coverArtUrl === highResUrl) {
      console.log(`  ${progress} SKIP  "${album.title}" (already high-res)`);
      stats.skipped++;
      stats.processed++;
      continue;
    }

    // HEAD-request to verify the high-res URL exists
    const isValid = await verifyUrl(highResUrl);
    if (!isValid) {
      console.log(
        `  ${progress} HEAD✗ "${album.title}" (CAA returned 404, keeping existing)`
      );
      stats.headFailed++;
      stats.processed++;
      continue;
    }

    if (dryRun) {
      const currentSource = classifySource(album.coverArtUrl);
      console.log(
        `  ${progress} WOULD "${album.title}" [${currentSource}] → CAA full-res`
      );
      stats.upgraded++;
      stats.processed++;
    } else {
      try {
        // Delete old Cloudflare image if it exists
        if (album.cloudflareImageId && album.cloudflareImageId !== 'none') {
          try {
            await deleteImage(album.cloudflareImageId);
          } catch (deleteErr) {
            // Not fatal — image may already be gone
            const msg =
              deleteErr instanceof Error
                ? deleteErr.message
                : String(deleteErr);
            if (!msg.includes('not found')) {
              console.log(
                `  ${progress} WARN  Delete failed for "${album.title}": ${msg}`
              );
            }
          }
        }

        // Upload new high-res image
        const result = await cacheAlbumArt(highResUrl, album.id, album.title);

        if (result) {
          // Update database
          await prisma.album.update({
            where: { id: album.id },
            data: {
              coverArtUrl: highResUrl,
              cloudflareImageId: result.id,
            },
          });

          console.log(`  ${progress} OK    "${album.title}" → ${result.id}`);
          stats.upgraded++;
        } else {
          console.log(
            `  ${progress} FAIL  "${album.title}" (upload returned null)`
          );
          stats.failed++;
          stats.errors.push({
            albumId: album.id,
            title: album.title,
            error: 'cacheAlbumArt returned null',
          });
        }
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        console.log(`  ${progress} ERROR "${album.title}": ${errorMsg}`);
        stats.failed++;
        stats.errors.push({
          albumId: album.id,
          title: album.title,
          error: errorMsg,
        });
      }
    }

    stats.processed++;

    // Rate limiting
    if (i < toProcess.length - 1) {
      if ((i + 1) % BATCH_SIZE === 0) {
        console.log(
          `\n  --- Batch pause (${BATCH_PAUSE_MS / 1000}s) after ${i + 1} items ---\n`
        );
        await sleep(BATCH_PAUSE_MS);
      } else {
        await sleep(DELAY_BETWEEN_ALBUMS_MS);
      }
    }
  }

  // ─── Summary ────────────────────────────────────────────────

  console.log('');
  console.log('═══════════════════════════════════════════════════');
  console.log('  Summary');
  console.log('═══════════════════════════════════════════════════');
  console.log(`  Total:       ${stats.total}`);
  console.log(`  Processed:   ${stats.processed}`);
  console.log(`  Upgraded:    ${stats.upgraded}`);
  console.log(`  Skipped:     ${stats.skipped} (already high-res)`);
  console.log(`  HEAD failed: ${stats.headFailed} (CAA 404, kept existing)`);
  console.log(`  Failed:      ${stats.failed}`);
  if (dryRun) {
    console.log('');
    console.log('  ⚠  DRY RUN — no changes were made');
  }

  if (stats.errors.length > 0) {
    console.log('');
    console.log('  Failed albums:');
    for (const err of stats.errors) {
      console.log(`    - ${err.title}: ${err.error}`);
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
