/**
 * Upgrade Spotify album cover art to high-res CAA (Cover Art Archive) originals.
 *
 * Two-phase workflow:
 *   Phase 1 (match):  Search MusicBrainz for Spotify albums without MBIDs,
 *                      write a JSON manifest of matches.
 *   Phase 2 (upload):  Read the manifest, HEAD-check CAA URLs, upload to
 *                       Cloudflare, and update production database.
 *
 * Usage:
 *   pnpm tsx src/scripts/upgrade-spotify-cover-art.ts --phase match [--dry-run] [--limit N]
 *   pnpm tsx src/scripts/upgrade-spotify-cover-art.ts --phase upload [--dry-run] [--limit N]
 *   pnpm tsx src/scripts/upgrade-spotify-cover-art.ts --phase all [--dry-run] [--limit N]
 *
 * Phase 2 / all requires:
 *   PROD_DATABASE_URL="postgresql://..." pnpm tsx src/scripts/upgrade-spotify-cover-art.ts --phase upload
 *   CLOUDFLARE_ACCOUNT_ID, CLOUDFLARE_API_TOKEN, CLOUDFLARE_IMAGES_ACCOUNT_HASH
 */

import * as fs from 'fs';
import * as path from 'path';

import { PrismaClient } from '@prisma/client';

import { getCAAUrl } from '@/lib/cover-art-archive';
import { musicBrainzService } from '@/lib/musicbrainz';
import { analyzeTitle } from '@/lib/musicbrainz/title-utils';
import {
  buildAlbumSearchQuery,
  findBestAlbumMatch,
} from '@/lib/queue/processors/utils';

// ─── Config ─────────────────────────────────────────────────────

const MB_DELAY_MS = 1100; // 1.1s between MusicBrainz requests
const UPLOAD_DELAY_MS = 1500; // 1.5s between Cloudflare uploads
const BATCH_SIZE = 50;
const BATCH_PAUSE_MS = 5_000;
const MATCH_THRESHOLD = 0.8;

const MANIFEST_PATH = path.join(
  __dirname,
  'data',
  'spotify-caa-matches.json'
);

// ─── CLI args ───────────────────────────────────────────────────

const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const limitIdx = args.indexOf('--limit');
const limit = limitIdx !== -1 ? parseInt(args[limitIdx + 1], 10) : undefined;
const phaseIdx = args.indexOf('--phase');
const phase = phaseIdx !== -1 ? args[phaseIdx + 1] : undefined;

if (!phase || !['match', 'upload', 'all'].includes(phase)) {
  console.error('ERROR: --phase is required (match | upload | all)');
  console.error(
    'Usage: pnpm tsx src/scripts/upgrade-spotify-cover-art.ts --phase match [--dry-run] [--limit N]'
  );
  process.exit(1);
}

// ─── Database clients ───────────────────────────────────────────

const snapshotPrisma = new PrismaClient({
  datasources: {
    db: {
      url: 'postgresql://postgres:postgres@localhost:5433/rec_prod_snapshot',
    },
  },
});

// Prod client — only needed for upload phase
let prodPrisma: PrismaClient | null = null;
if (phase === 'upload' || phase === 'all') {
  const prodDbUrl = process.env.PROD_DATABASE_URL;
  if (!prodDbUrl) {
    console.error('ERROR: PROD_DATABASE_URL environment variable is required for upload phase');
    console.error(
      'Usage: PROD_DATABASE_URL="postgresql://..." pnpm tsx src/scripts/upgrade-spotify-cover-art.ts --phase upload'
    );
    process.exit(1);
  }
  prodPrisma = new PrismaClient({
    datasources: { db: { url: prodDbUrl } },
  });
}

// ─── Helpers ────────────────────────────────────────────────────

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
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

/**
 * Strip featuring/with text from a title for cleaner MusicBrainz search.
 * e.g. "Teka (with Peso Pluma)" → "Teka"
 *      "WAHALA (FEAT. OLAMIDE)" → "WAHALA"
 */
function stripFeaturing(title: string): string {
  return title
    .replace(/\s*[\(\[]\s*(?:feat\.?|ft\.?|featuring|with)\s+[^\)\]]+[\)\]]/gi, '')
    .replace(/\s*[-–—]\s*(?:feat\.?|ft\.?|featuring|with)\s+.+$/gi, '')
    .trim();
}

// ─── Manifest types ─────────────────────────────────────────────

interface MatchEntry {
  albumId: string;
  albumTitle: string;
  artistName: string;
  releaseGroupMbid: string;
  mbTitle: string;
  mbArtist: string;
  combinedScore: number;
  mbScore: number;
  jaccardScore: number;
  caaUrl: string;
  currentCoverArtUrl: string | null;
  currentCloudflareImageId: string | null;
  isEdition: boolean;
}

interface UnmatchedEntry {
  albumId: string;
  albumTitle: string;
  artistName: string;
  bestScore: number | null;
  bestMbTitle: string | null;
  reason: string;
}

interface MatchManifest {
  generatedAt: string;
  threshold: number;
  stats: {
    total: number;
    matched: number;
    unmatched: number;
    editionsDetected: number;
  };
  matches: MatchEntry[];
  unmatched: UnmatchedEntry[];
}

// ─── Phase 1: Match ─────────────────────────────────────────────

async function phaseMatch() {
  console.log('');
  console.log('═══════════════════════════════════════════════════');
  console.log('  Phase 1: MusicBrainz Matching');
  console.log('═══════════════════════════════════════════════════');
  console.log('');
  console.log(`  Options:`);
  console.log(`    --dry-run: ${dryRun}`);
  console.log(`    --limit:   ${limit ?? 'none'}`);
  console.log(`    threshold: ${MATCH_THRESHOLD}`);
  console.log('');

  // Query Spotify albums without MusicBrainz IDs
  const albums = await snapshotPrisma.album.findMany({
    where: {
      musicbrainzId: null,
      OR: [
        { coverArtUrl: { contains: 'scdn.co' } },
        { coverArtUrl: { contains: 'spotify' } },
      ],
    },
    select: {
      id: true,
      title: true,
      coverArtUrl: true,
      cloudflareImageId: true,
      releaseType: true,
      artists: {
        select: {
          role: true,
          artist: {
            select: { name: true },
          },
        },
      },
    },
    orderBy: { createdAt: 'asc' },
  });

  const toProcess = limit ? albums.slice(0, limit) : albums;

  console.log(`  Found ${albums.length} Spotify albums without MusicBrainz IDs`);
  console.log(`  Processing ${toProcess.length} albums`);
  console.log('');

  if (toProcess.length === 0) {
    console.log('  Nothing to do!');
    return;
  }

  const matches: MatchEntry[] = [];
  const unmatched: UnmatchedEntry[] = [];
  let editionsDetected = 0;

  for (let i = 0; i < toProcess.length; i++) {
    const album = toProcess[i];
    const progress = `[${i + 1}/${toProcess.length}]`;
    const primaryArtist =
      album.artists.find(a => a.role === 'primary') || album.artists[0];
    const artistName = primaryArtist?.artist?.name || 'Unknown';

    // Analyze title for editions and featuring
    const titleAnalysis = analyzeTitle(album.title);
    if (titleAnalysis.isEditionOrVersion) {
      editionsDetected++;
    }

    // Strip featuring text for cleaner search
    const cleanTitle = stripFeaturing(album.title);
    const searchAlbum = {
      ...album,
      title: cleanTitle,
    };

    try {
      // Step 1: Search with clean title (featuring stripped)
      const searchQuery = buildAlbumSearchQuery(searchAlbum);
      const searchResults = await musicBrainzService.searchReleaseGroups(
        searchQuery,
        5
      );

      // Score against the clean title for better matching
      let bestMatch = findBestAlbumMatch(searchAlbum, searchResults);

      // Step 2: If edition and no good match, try base title
      if (
        !bestMatch &&
        titleAnalysis.isEditionOrVersion
      ) {
        const baseTitle = stripFeaturing(titleAnalysis.baseTitle);
        if (baseTitle !== cleanTitle) {
          console.log(
            `  ${progress} EDITION "${album.title}" → trying base: "${baseTitle}"`
          );
          await sleep(MB_DELAY_MS);

          const baseAlbum = { ...album, title: baseTitle };
          const baseQuery = buildAlbumSearchQuery(baseAlbum);
          const baseResults = await musicBrainzService.searchReleaseGroups(
            baseQuery,
            5
          );
          bestMatch = findBestAlbumMatch(baseAlbum, baseResults);
        }
      }

      // Step 3: If single with no results, retry as album type
      // (some singles are filed as release-groups with type "album" on MB)
      if (
        !bestMatch &&
        album.releaseType?.toLowerCase() === 'single'
      ) {
        await sleep(MB_DELAY_MS);
        const albumTypeSearch = {
          ...searchAlbum,
          releaseType: 'album',
        };
        const retryQuery = buildAlbumSearchQuery(albumTypeSearch);
        const retryResults = await musicBrainzService.searchReleaseGroups(
          retryQuery,
          5
        );
        bestMatch = findBestAlbumMatch(searchAlbum, retryResults);
      }

      if (bestMatch && bestMatch.score >= MATCH_THRESHOLD) {
        const mbArtistName =
          bestMatch.result.artistCredit
            ?.map((ac: { name: string }) => ac.name)
            .join(', ') || 'Unknown';

        const caaUrl = getCAAUrl(bestMatch.result.id);

        matches.push({
          albumId: album.id,
          albumTitle: album.title,
          artistName,
          releaseGroupMbid: bestMatch.result.id,
          mbTitle: bestMatch.result.title,
          mbArtist: mbArtistName,
          combinedScore: bestMatch.score,
          mbScore: bestMatch.mbScore,
          jaccardScore: bestMatch.jaccardScore,
          caaUrl,
          currentCoverArtUrl: album.coverArtUrl,
          currentCloudflareImageId: album.cloudflareImageId,
          isEdition: titleAnalysis.isEditionOrVersion,
        });

        console.log(
          `  ${progress} MATCH "${album.title}" by ${artistName} → "${bestMatch.result.title}" (${(bestMatch.score * 100).toFixed(1)}%)`
        );
      } else {
        const reason =
          !searchResults || searchResults.length === 0
            ? 'no_results'
            : 'below_threshold';

        unmatched.push({
          albumId: album.id,
          albumTitle: album.title,
          artistName,
          bestScore: bestMatch?.score ?? null,
          bestMbTitle: bestMatch?.result?.title ?? null,
          reason,
        });

        const scoreInfo = bestMatch
          ? ` (best: "${bestMatch.result.title}" at ${(bestMatch.score * 100).toFixed(1)}%)`
          : ' (no results)';
        console.log(
          `  ${progress} MISS  "${album.title}" by ${artistName}${scoreInfo}`
        );
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      unmatched.push({
        albumId: album.id,
        albumTitle: album.title,
        artistName,
        bestScore: null,
        bestMbTitle: null,
        reason: `search_error: ${errorMsg}`,
      });
      console.log(
        `  ${progress} ERROR "${album.title}" by ${artistName}: ${errorMsg}`
      );
    }

    // Rate limiting
    if (i < toProcess.length - 1) {
      if ((i + 1) % BATCH_SIZE === 0) {
        console.log(
          `\n  --- Batch pause (${BATCH_PAUSE_MS / 1000}s) after ${i + 1} items ---\n`
        );
        await sleep(BATCH_PAUSE_MS);
      } else {
        await sleep(MB_DELAY_MS);
      }
    }
  }

  // Write manifest
  const manifest: MatchManifest = {
    generatedAt: new Date().toISOString(),
    threshold: MATCH_THRESHOLD,
    stats: {
      total: toProcess.length,
      matched: matches.length,
      unmatched: unmatched.length,
      editionsDetected,
    },
    matches,
    unmatched,
  };

  if (!dryRun) {
    fs.writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2));
    console.log(`\n  Manifest written to: ${MANIFEST_PATH}`);
  }

  // Summary
  console.log('');
  console.log('═══════════════════════════════════════════════════');
  console.log('  Phase 1 Summary');
  console.log('═══════════════════════════════════════════════════');
  console.log(`  Total:      ${toProcess.length}`);
  console.log(`  Matched:    ${matches.length}`);
  console.log(`  Unmatched:  ${unmatched.length}`);
  console.log(`  Editions:   ${editionsDetected}`);
  console.log(
    `  Match rate: ${((matches.length / toProcess.length) * 100).toFixed(1)}%`
  );
  if (dryRun) {
    console.log('');
    console.log('  DRY RUN — no manifest written');
  }
  console.log('');
}

// ─── Phase 2: Upload ────────────────────────────────────────────

async function phaseUpload() {
  // Lazy-import Cloudflare functions
  const { deleteImage, cacheAlbumArt } = await import(
    '@/lib/cloudflare-images'
  );

  console.log('');
  console.log('═══════════════════════════════════════════════════');
  console.log('  Phase 2: CAA Upload');
  console.log('═══════════════════════════════════════════════════');
  console.log('');

  // Read manifest
  if (!fs.existsSync(MANIFEST_PATH)) {
    console.error(`  ERROR: Manifest not found at ${MANIFEST_PATH}`);
    console.error('  Run --phase match first to generate the manifest.');
    process.exit(1);
  }

  const manifest: MatchManifest = JSON.parse(
    fs.readFileSync(MANIFEST_PATH, 'utf-8')
  );

  console.log(`  Manifest from: ${manifest.generatedAt}`);
  console.log(`  Total matches: ${manifest.matches.length}`);
  console.log(`  Options:`);
  console.log(`    --dry-run: ${dryRun}`);
  console.log(`    --limit:   ${limit ?? 'none'}`);
  console.log('');

  const toProcess = limit
    ? manifest.matches.slice(0, limit)
    : manifest.matches;

  if (toProcess.length === 0) {
    console.log('  Nothing to upload!');
    return;
  }

  console.log(`  Processing ${toProcess.length} matches`);
  console.log('');

  const stats = {
    total: toProcess.length,
    processed: 0,
    upgraded: 0,
    headFailed: 0,
    duplicateMbid: 0,
    failed: 0,
    errors: [] as Array<{ albumId: string; title: string; error: string }>,
  };

  for (let i = 0; i < toProcess.length; i++) {
    const match = toProcess[i];
    const progress = `[${i + 1}/${stats.total}]`;

    // HEAD-check CAA URL
    const isValid = await verifyUrl(match.caaUrl);
    if (!isValid) {
      console.log(
        `  ${progress} HEAD  "${match.albumTitle}" (CAA 404, skipping)`
      );
      stats.headFailed++;
      stats.processed++;
      continue;
    }

    // Check for duplicate MusicBrainz ID in prod
    try {
      const existing = await prodPrisma!.album.findUnique({
        where: { musicbrainzId: match.releaseGroupMbid },
        select: { id: true, title: true },
      });

      if (existing && existing.id !== match.albumId) {
        console.log(
          `  ${progress} DUPE  "${match.albumTitle}" — MBID already used by "${existing.title}"`
        );
        stats.duplicateMbid++;
        stats.processed++;
        continue;
      }
    } catch {
      // Album may not exist in prod anymore — will catch on update
    }

    if (dryRun) {
      console.log(
        `  ${progress} WOULD "${match.albumTitle}" by ${match.artistName} → ${match.releaseGroupMbid}`
      );
      stats.upgraded++;
    } else {
      try {
        // Delete old Cloudflare image if exists
        if (
          match.currentCloudflareImageId &&
          match.currentCloudflareImageId !== 'none'
        ) {
          try {
            await deleteImage(match.currentCloudflareImageId);
          } catch (deleteErr) {
            const msg =
              deleteErr instanceof Error
                ? deleteErr.message
                : String(deleteErr);
            if (!msg.includes('not found')) {
              console.log(
                `  ${progress} WARN  Delete failed for "${match.albumTitle}": ${msg}`
              );
            }
          }
        }

        // Upload new high-res image
        const result = await cacheAlbumArt(
          match.caaUrl,
          match.albumId,
          match.albumTitle
        );

        if (result) {
          // Update production database
          await prodPrisma!.album.update({
            where: { id: match.albumId },
            data: {
              musicbrainzId: match.releaseGroupMbid,
              coverArtUrl: match.caaUrl,
              cloudflareImageId: result.id,
            },
          });

          console.log(
            `  ${progress} OK    "${match.albumTitle}" → ${result.id}`
          );
          stats.upgraded++;
        } else {
          console.log(
            `  ${progress} FAIL  "${match.albumTitle}" (upload returned null)`
          );
          stats.failed++;
          stats.errors.push({
            albumId: match.albumId,
            title: match.albumTitle,
            error: 'cacheAlbumArt returned null',
          });
        }
      } catch (error) {
        const errorMsg =
          error instanceof Error ? error.message : String(error);
        console.log(
          `  ${progress} ERROR "${match.albumTitle}": ${errorMsg}`
        );
        stats.failed++;
        stats.errors.push({
          albumId: match.albumId,
          title: match.albumTitle,
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
        await sleep(UPLOAD_DELAY_MS);
      }
    }
  }

  // Summary
  console.log('');
  console.log('═══════════════════════════════════════════════════');
  console.log('  Phase 2 Summary');
  console.log('═══════════════════════════════════════════════════');
  console.log(`  Total:          ${stats.total}`);
  console.log(`  Processed:      ${stats.processed}`);
  console.log(`  Upgraded:       ${stats.upgraded}`);
  console.log(`  HEAD failed:    ${stats.headFailed} (CAA 404)`);
  console.log(`  Duplicate MBID: ${stats.duplicateMbid}`);
  console.log(`  Failed:         ${stats.failed}`);
  if (dryRun) {
    console.log('');
    console.log('  DRY RUN — no changes were made');
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

// ─── Main ───────────────────────────────────────────────────────

async function main() {
  try {
    if (phase === 'match' || phase === 'all') {
      await phaseMatch();
    }
    if (phase === 'upload' || phase === 'all') {
      await phaseUpload();
    }
  } catch (error) {
    console.error('Script failed:', error);
    process.exit(1);
  } finally {
    await snapshotPrisma.$disconnect();
    if (prodPrisma) {
      await prodPrisma.$disconnect();
    }
  }
}

main();
