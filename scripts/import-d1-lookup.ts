/**
 * MusicBrainz Release-Group → D1 Import Script
 *
 * Streams the MusicBrainz release-group JSONL dump, filters by type,
 * enriches with ListenBrainz popularity data, computes canonical scores,
 * and writes to a local SQLite database (game_albums.db) with FTS5.
 *
 * Usage:
 *   pnpm import:d1-lookup
 *
 * Prerequisites:
 *   - JSONL dump at data/musicbrainz/mbdump/release-group
 *   - better-sqlite3 installed (devDependency)
 *
 * After running, upload to D1:
 *   sqlite3 game_albums.db .dump > game_albums.sql
 *   npx wrangler d1 execute game-albums --file=game_albums.sql --config cloudflare/wrangler.toml --remote
 */

import fs from 'fs';
import path from 'path';
import readline from 'readline';
import Database from 'better-sqlite3';

// ─── Types ───────────────────────────────────────────────────────────

interface ArtistCredit {
  name: string;
  joinphrase?: string;
  artist: {
    id: string;
    name: string;
  };
}

interface ReleaseGroupEntry {
  id: string;
  title: string;
  'primary-type': string | null;
  'secondary-types': string[];
  'artist-credit': ArtistCredit[];
  'first-release-date': string;
  rating: {
    value: number | null;
    'votes-count': number;
  };
}

interface FilteredAlbum {
  title: string;
  artistName: string;
  releaseGroupMbid: string;
  releaseType: string;
  firstReleaseDate: string | null;
  mbRating: number | null;
  mbRatingCount: number;
}

interface ListenBrainzResult {
  release_group_mbid: string;
  total_listen_count: number | null;
  total_user_count: number | null;
}

// ─── Constants ───────────────────────────────────────────────────────

const JSONL_PATH = path.resolve(
  process.argv[2] === '--test'
    ? 'data/musicbrainz/mbdump/release-group-test'
    : 'data/musicbrainz/mbdump/release-group'
);
const SCHEMA_PATH = path.resolve('cloudflare/schema.sql');
const DB_PATH = path.resolve('game_albums.db');

const ALLOWED_PRIMARY_TYPES = new Set(['Album', 'EP']);

const REJECTED_ARTISTS = new Set([
  'various artists',
  '[unknown]',
  '[no artist]',
  '[traditional]',
  '[dialogue]',
  '[data]',
  '[anonymous]',
]);

const LISTENBRAINZ_CHUNK_SIZE = 200;
const LISTENBRAINZ_RATE_LIMIT_MS = 1100; // slightly over 1s to be safe
const LISTENBRAINZ_URL =
  'https://api.listenbrainz.org/1/popularity/release-group';

// ─── Helpers ─────────────────────────────────────────────────────────

function chunkArray<T>(arr: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
}

function buildArtistName(credits: ArtistCredit[]): string {
  return credits.map(ac => ac.name + (ac.joinphrase || '')).join('');
}

function getDateScore(dateStr: string | null): number {
  if (!dateStr) return 0;
  // Extract year from formats like "2024-01-15", "2024-01", "2024"
  const year = parseInt(dateStr.substring(0, 4), 10);
  if (isNaN(year) || year < 1900) return 0;
  // Scale: 1900 = 0, 2025 = 99
  return Math.min(99, Math.max(0, Math.floor(((year - 1900) / 125) * 99)));
}

function computeCanonicalScore(
  listenCount: number,
  mbRating: number | null,
  firstReleaseDate: string | null
): number {
  const listenCountBucket = Math.floor(listenCount / 1000);
  const ratingScore = Math.round((mbRating || 0) * 10);
  const dateScore = getDateScore(firstReleaseDate);
  return listenCountBucket * 1000 + ratingScore * 10 + dateScore;
}

function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  if (hours > 0) return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
  if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
  return `${seconds}s`;
}

// ─── Step 1: Stream and filter JSONL ─────────────────────────────────

async function streamAndFilter(): Promise<FilteredAlbum[]> {
  console.log('\n═══ Step 1: Streaming and filtering JSONL ═══\n');
  console.log(`  Source: ${JSONL_PATH}`);

  const fileStream = fs.createReadStream(JSONL_PATH, { encoding: 'utf-8' });
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity,
  });

  const filtered: FilteredAlbum[] = [];
  const dedupeKeys = new Set<string>();

  let total = 0;
  let skippedType = 0;
  let skippedSecondary = 0;
  let skippedArtist = 0;
  let skippedDupe = 0;
  let skippedNoTitle = 0;
  let albumCount = 0;
  let epCount = 0;

  const startTime = Date.now();
  let lastLog = Date.now();

  for await (const line of rl) {
    total++;

    if (Date.now() - lastLog > 5000) {
      const elapsed = formatDuration(Date.now() - startTime);
      console.log(
        `  Processed ${total.toLocaleString()} | Kept ${filtered.length.toLocaleString()} [${elapsed}]`
      );
      lastLog = Date.now();
    }

    let entry: ReleaseGroupEntry;
    try {
      entry = JSON.parse(line);
    } catch {
      continue;
    }

    // Filter 1: primary type must be Album or EP
    const primaryType = entry['primary-type'];
    if (!primaryType || !ALLOWED_PRIMARY_TYPES.has(primaryType)) {
      skippedType++;
      continue;
    }

    // Filter 2: no secondary types (rejects Compilation, Soundtrack, Live, etc.)
    const secondaryTypes = entry['secondary-types'];
    if (secondaryTypes && secondaryTypes.length > 0) {
      skippedSecondary++;
      continue;
    }

    // Extract artist name
    const credits = entry['artist-credit'];
    if (!credits || credits.length === 0) {
      skippedArtist++;
      continue;
    }
    const artistName = buildArtistName(credits).trim();

    // Filter 3: reject special artist names
    if (REJECTED_ARTISTS.has(artistName.toLowerCase())) {
      skippedArtist++;
      continue;
    }

    const title = entry.title?.trim();
    if (!title) {
      skippedNoTitle++;
      continue;
    }

    // Dedupe by lowercase title + artist
    const dedupeKey = `${title.toLowerCase()}|||${artistName.toLowerCase()}`;
    if (dedupeKeys.has(dedupeKey)) {
      skippedDupe++;
      continue;
    }
    dedupeKeys.add(dedupeKey);

    if (primaryType === 'Album') albumCount++;
    else epCount++;

    filtered.push({
      title,
      artistName,
      releaseGroupMbid: entry.id,
      releaseType: primaryType,
      firstReleaseDate: entry['first-release-date'] || null,
      mbRating: entry.rating?.value ?? null,
      mbRatingCount: entry.rating?.['votes-count'] ?? 0,
    });
  }

  const elapsed = formatDuration(Date.now() - startTime);
  console.log('\n  ── Filter Results ──');
  console.log(`  Total entries:       ${total.toLocaleString()}`);
  console.log(`  Kept:                ${filtered.length.toLocaleString()}`);
  console.log(`    Albums:            ${albumCount.toLocaleString()}`);
  console.log(`    EPs:               ${epCount.toLocaleString()}`);
  console.log(`  Skipped (type):      ${skippedType.toLocaleString()}`);
  console.log(`  Skipped (secondary): ${skippedSecondary.toLocaleString()}`);
  console.log(`  Skipped (artist):    ${skippedArtist.toLocaleString()}`);
  console.log(`  Skipped (dupe):      ${skippedDupe.toLocaleString()}`);
  console.log(`  Skipped (no title):  ${skippedNoTitle.toLocaleString()}`);
  console.log(`  Time:                ${elapsed}`);

  return filtered;
}

// ─── Step 2: Enrich with ListenBrainz popularity ─────────────────────

async function enrichWithListenBrainz(
  albums: FilteredAlbum[]
): Promise<Map<string, { listenCount: number; userCount: number }>> {
  console.log('\n═══ Step 2: Enriching with ListenBrainz popularity ═══\n');

  const mbids = albums.map(a => a.releaseGroupMbid);
  const chunks = chunkArray(mbids, LISTENBRAINZ_CHUNK_SIZE);
  const popularityMap = new Map<
    string,
    { listenCount: number; userCount: number }
  >();

  console.log(
    `  Total MBIDs: ${mbids.length.toLocaleString()} → ${chunks.length.toLocaleString()} API requests`
  );
  console.log(
    `  Estimated time: ${formatDuration(chunks.length * LISTENBRAINZ_RATE_LIMIT_MS)}\n`
  );

  const startTime = Date.now();
  let completed = 0;
  let withData = 0;
  let errors = 0;

  for (const chunk of chunks) {
    completed++;

    if (completed % 100 === 0 || completed === chunks.length) {
      const elapsed = formatDuration(Date.now() - startTime);
      const pct = ((completed / chunks.length) * 100).toFixed(1);
      console.log(
        `  Request ${completed.toLocaleString()}/${chunks.length.toLocaleString()} (${pct}%) | With data: ${withData.toLocaleString()} | Errors: ${errors} [${elapsed}]`
      );
    }

    try {
      const response = await fetch(LISTENBRAINZ_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ release_group_mbids: chunk }),
      });

      if (!response.ok) {
        errors++;
        if (response.status === 429) {
          // Rate limited — back off extra
          console.log('  ⚠ Rate limited, backing off 5s...');
          await new Promise(resolve => setTimeout(resolve, 5000));
        }
        continue;
      }

      const data = (await response.json()) as ListenBrainzResult[];

      for (const item of data) {
        if (item.total_listen_count != null && item.total_listen_count > 0) {
          withData++;
          popularityMap.set(item.release_group_mbid, {
            listenCount: item.total_listen_count,
            userCount: item.total_user_count ?? 0,
          });
        }
      }
    } catch (err) {
      errors++;
      if (errors % 50 === 0) {
        console.log(`  ⚠ ${errors} errors so far, latest: ${err}`);
      }
    }

    await new Promise(resolve =>
      setTimeout(resolve, LISTENBRAINZ_RATE_LIMIT_MS)
    );
  }

  const elapsed = formatDuration(Date.now() - startTime);
  console.log('\n  ── ListenBrainz Results ──');
  console.log(`  Requests:    ${completed.toLocaleString()}`);
  console.log(`  With data:   ${withData.toLocaleString()}`);
  console.log(`  Errors:      ${errors}`);
  console.log(`  Time:        ${elapsed}`);

  return popularityMap;
}

// ─── Step 3: Write to local SQLite ───────────────────────────────────

function writeToSQLite(
  albums: FilteredAlbum[],
  popularityMap: Map<string, { listenCount: number; userCount: number }>
): void {
  console.log('\n═══ Step 3: Writing to local SQLite ═══\n');

  // Delete existing DB if present
  if (fs.existsSync(DB_PATH)) {
    fs.unlinkSync(DB_PATH);
    console.log(`  Deleted existing ${DB_PATH}`);
  }

  const db = new Database(DB_PATH);

  // Enable WAL mode for faster writes
  db.pragma('journal_mode = WAL');

  // Create schema
  const schema = fs.readFileSync(SCHEMA_PATH, 'utf-8');
  db.exec(schema);
  console.log('  Schema created');

  // Prepare insert statement
  const insert = db.prepare(`
    INSERT OR IGNORE INTO albums (
      title, artist_name, release_group_mbid, release_type,
      listen_count, user_count, canonical_score,
      first_release_date, mb_rating, mb_rating_count
    ) VALUES (
      @title, @artistName, @releaseGroupMbid, @releaseType,
      @listenCount, @userCount, @canonicalScore,
      @firstReleaseDate, @mbRating, @mbRatingCount
    )
  `);

  // Bulk insert in transaction batches of 50k
  const BATCH_SIZE = 50_000;
  let inserted = 0;
  let withPopularity = 0;

  const startTime = Date.now();

  for (let i = 0; i < albums.length; i += BATCH_SIZE) {
    const batch = albums.slice(i, i + BATCH_SIZE);

    const insertBatch = db.transaction((entries: typeof batch) => {
      for (const album of entries) {
        const popularity = popularityMap.get(album.releaseGroupMbid);
        const listenCount = popularity?.listenCount ?? 0;
        const userCount = popularity?.userCount ?? 0;

        if (popularity) withPopularity++;

        const canonicalScore = computeCanonicalScore(
          listenCount,
          album.mbRating,
          album.firstReleaseDate
        );

        insert.run({
          title: album.title,
          artistName: album.artistName,
          releaseGroupMbid: album.releaseGroupMbid,
          releaseType: album.releaseType,
          listenCount: listenCount || null,
          userCount: userCount || null,
          canonicalScore,
          firstReleaseDate: album.firstReleaseDate,
          mbRating: album.mbRating,
          mbRatingCount: album.mbRatingCount,
        });
        inserted++;
      }
    });

    insertBatch(batch);

    if ((i + BATCH_SIZE) % 200_000 === 0 || i + BATCH_SIZE >= albums.length) {
      console.log(`  Inserted ${inserted.toLocaleString()} rows...`);
    }
  }

  db.close();

  const elapsed = formatDuration(Date.now() - startTime);
  const dbSize = (fs.statSync(DB_PATH).size / (1024 * 1024)).toFixed(1);

  console.log('\n  ── SQLite Results ──');
  console.log(`  Rows inserted:       ${inserted.toLocaleString()}`);
  console.log(`  With popularity:     ${withPopularity.toLocaleString()}`);
  console.log(`  Database size:       ${dbSize} MB`);
  console.log(`  Time:                ${elapsed}`);
}

// ─── Main ────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  console.log('╔══════════════════════════════════════════════════╗');
  console.log('║  MusicBrainz → D1 Import Script                 ║');
  console.log('╚══════════════════════════════════════════════════╝');

  if (!fs.existsSync(JSONL_PATH)) {
    console.error(`\n  ERROR: JSONL file not found at ${JSONL_PATH}`);
    console.error('  Run: bash scripts/download-release-group-dump.sh first\n');
    process.exit(1);
  }

  if (!fs.existsSync(SCHEMA_PATH)) {
    console.error(`\n  ERROR: Schema file not found at ${SCHEMA_PATH}`);
    process.exit(1);
  }

  const totalStart = Date.now();

  // Step 1: Stream and filter
  const filtered = await streamAndFilter();

  // Step 2: Enrich with ListenBrainz
  const popularityMap = await enrichWithListenBrainz(filtered);

  // Step 3: Write to SQLite
  writeToSQLite(filtered, popularityMap);

  // Final summary
  const totalElapsed = formatDuration(Date.now() - totalStart);
  console.log('\n╔══════════════════════════════════════════════════╗');
  console.log('║  Import Complete!                                ║');
  console.log('╚══════════════════════════════════════════════════╝');
  console.log(`  Total time: ${totalElapsed}`);
  console.log(`  Output:     ${DB_PATH}`);
  console.log('\n  Next steps:');
  console.log('    sqlite3 game_albums.db .dump > game_albums.sql');
  console.log(
    '    npx wrangler d1 execute game-albums --file=game_albums.sql --config cloudflare/wrangler.toml --remote'
  );
}

main().catch(err => {
  console.error('\nFatal error:', err);
  process.exit(1);
});
