/**
 * Fetch MusicBrainz data for Claude's curated album recommendations.
 *
 * Parses .taskmaster/docs/iconic-album-covers.md, searches MusicBrainz for
 * each album via the existing BullMQ queue (respecting 1 req/sec rate limit),
 * and writes enriched results to src/data/claude-recommendations.json.
 *
 * Usage:
 *   pnpm tsx src/scripts/fetch-claude-recommendations.ts
 *   pnpm tsx src/scripts/fetch-claude-recommendations.ts --dry-run          # search but don't write file
 *   pnpm tsx src/scripts/fetch-claude-recommendations.ts --limit 5          # process only N albums
 *   pnpm tsx src/scripts/fetch-claude-recommendations.ts --skip-existing    # skip already-matched albums
 *
 * Timing: ~197 albums × 1 req/sec = ~3.5 minutes
 */

import * as fs from 'fs';
import * as path from 'path';
import {
  getQueuedMusicBrainzService,
  destroyQueuedMusicBrainzService,
} from '@/lib/musicbrainz';
import type { ReleaseGroupSearchResult } from '@/lib/musicbrainz/basic-service';
import { buildDualInputQuery } from '@/lib/musicbrainz/query-builder';
import { PRIORITY_TIERS } from '@/lib/queue/jobs';

// ─── Types ──────────────────────────────────────────────────────

interface ParsedAlbum {
  index: number;
  artist: string;
  title: string;
  genre: string;
}

interface ClaudeRecommendation {
  // From the markdown
  index: number;
  artist: string;
  title: string;
  genre: string;

  // From MusicBrainz (null if no match found)
  musicbrainzId: string | null;
  mbTitle: string | null;
  mbArtist: string | null;
  mbArtistId: string | null;
  releaseDate: string | null;
  albumType: string | null;
  score: number | null;

  // Status
  status: 'matched' | 'no_match' | 'error';
}

// ─── CLI args ───────────────────────────────────────────────────

const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const skipExisting = args.includes('--skip-existing');
const limitIdx = args.indexOf('--limit');
const limit = limitIdx !== -1 ? parseInt(args[limitIdx + 1], 10) : undefined;

// ─── Paths ──────────────────────────────────────────────────────

const INPUT_PATH = path.resolve(
  process.cwd(),
  '.taskmaster/docs/iconic-album-covers.md'
);
const OUTPUT_PATH = path.resolve(
  process.cwd(),
  'src/data/claude-recommendations.json'
);

// ─── Markdown Parser ────────────────────────────────────────────

function parseIconicAlbumCovers(markdown: string): ParsedAlbum[] {
  const albums: ParsedAlbum[] = [];
  let currentGenre = '';

  const lines = markdown.split('\n');

  for (const line of lines) {
    // Detect genre headers: ## Rock / Classic Rock
    const genreMatch = line.match(/^## (.+)$/);
    if (genreMatch) {
      currentGenre = genreMatch[1].trim();
      continue;
    }

    // Detect album entries: N. Artist — *Album Title*
    // Artist name is plain text, album title is in *italics*
    const albumMatch = line.match(/^\d+\.\s+(.+?)\s+—\s+\*(.+?)\*\s*$/);
    if (albumMatch && currentGenre) {
      albums.push({
        index: albums.length + 1,
        artist: albumMatch[1].trim(),
        title: albumMatch[2].trim(),
        genre: currentGenre,
      });
    }
  }

  return albums;
}

// ─── MusicBrainz Search ─────────────────────────────────────────

async function searchAlbum(album: ParsedAlbum): Promise<ClaudeRecommendation> {
  const service = getQueuedMusicBrainzService();

  try {
    const query = buildDualInputQuery(album.title, album.artist);
    if (!query) {
      return {
        ...album,
        musicbrainzId: null,
        mbTitle: null,
        mbArtist: null,
        mbArtistId: null,
        releaseDate: null,
        albumType: null,
        score: null,
        status: 'error',
      };
    }

    const results: ReleaseGroupSearchResult[] =
      await service.searchReleaseGroups(query, 5, 0, PRIORITY_TIERS.BACKGROUND);

    if (results.length === 0) {
      return {
        ...album,
        musicbrainzId: null,
        mbTitle: null,
        mbArtist: null,
        mbArtistId: null,
        releaseDate: null,
        albumType: null,
        score: null,
        status: 'no_match',
      };
    }

    // Take the top result (highest score)
    const best = results[0];
    const artistCredit = best.artistCredit?.[0];

    return {
      ...album,
      musicbrainzId: best.id,
      mbTitle: best.title,
      mbArtist: artistCredit?.artist.name ?? artistCredit?.name ?? null,
      mbArtistId: artistCredit?.artist.id ?? null,
      releaseDate: best.firstReleaseDate ?? null,
      albumType: best.primaryType ?? null,
      score: best.score,
      status: 'matched',
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(
      `  ERROR searching "${album.artist} — ${album.title}": ${message}`
    );
    return {
      ...album,
      musicbrainzId: null,
      mbTitle: null,
      mbArtist: null,
      mbArtistId: null,
      releaseDate: null,
      albumType: null,
      score: null,
      status: 'error',
    };
  }
}

// ─── Main ───────────────────────────────────────────────────────

async function main() {
  console.log('╔══════════════════════════════════════════════════╗');
  console.log('║  Claude Recommendations — MusicBrainz Fetcher   ║');
  console.log('╚══════════════════════════════════════════════════╝');
  console.log();

  // Parse the markdown
  if (!fs.existsSync(INPUT_PATH)) {
    console.error(`Input file not found: ${INPUT_PATH}`);
    process.exit(1);
  }

  const markdown = fs.readFileSync(INPUT_PATH, 'utf-8');
  let albums = parseIconicAlbumCovers(markdown);
  console.log(`Parsed ${albums.length} albums from iconic-album-covers.md`);

  // Load existing results if --skip-existing
  let existingResults: ClaudeRecommendation[] = [];
  if (skipExisting && fs.existsSync(OUTPUT_PATH)) {
    existingResults = JSON.parse(fs.readFileSync(OUTPUT_PATH, 'utf-8'));
    const matchedSet = new Set(
      existingResults
        .filter(r => r.status === 'matched')
        .map(r => `${r.artist}|||${r.title}`)
    );
    const before = albums.length;
    albums = albums.filter(a => !matchedSet.has(`${a.artist}|||${a.title}`));
    console.log(`Skipping ${before - albums.length} already-matched albums`);
  }

  // Apply limit
  if (limit !== undefined && limit > 0) {
    albums = albums.slice(0, limit);
    console.log(`Limited to ${albums.length} albums`);
  }

  if (dryRun) {
    console.log('[DRY RUN] Will search but not write output file');
  }

  console.log();
  console.log(`Processing ${albums.length} albums...`);
  console.log(
    `Estimated time: ~${Math.ceil(albums.length / 60)} min ${albums.length % 60}s`
  );
  console.log();

  // Process sequentially — the queue handles rate limiting,
  // but we want to show progress linearly
  const results: ClaudeRecommendation[] = [];
  let matched = 0;
  let noMatch = 0;
  let errors = 0;

  for (let i = 0; i < albums.length; i++) {
    const album = albums[i];
    const padIdx = String(i + 1).padStart(3, ' ');
    process.stdout.write(
      `  [${padIdx}/${albums.length}] ${album.artist} — ${album.title} ... `
    );

    const result = await searchAlbum(album);
    results.push(result);

    if (result.status === 'matched') {
      matched++;
      console.log(
        `✓ matched (score: ${result.score}, MB: "${result.mbTitle}")`
      );
    } else if (result.status === 'no_match') {
      noMatch++;
      console.log('✗ no match');
    } else {
      errors++;
      console.log('⚠ error');
    }
  }

  // Merge with existing results if --skip-existing
  let finalResults: ClaudeRecommendation[];
  if (skipExisting && existingResults.length > 0) {
    // Replace entries that were re-searched, keep the rest
    const newByKey = new Map(results.map(r => [`${r.artist}|||${r.title}`, r]));
    finalResults = existingResults.map(existing => {
      const key = `${existing.artist}|||${existing.title}`;
      return newByKey.get(key) ?? existing;
    });
    // Add any new ones not already in existing
    for (const r of results) {
      const key = `${r.artist}|||${r.title}`;
      if (!existingResults.some(e => `${e.artist}|||${e.title}` === key)) {
        finalResults.push(r);
      }
    }
  } else {
    finalResults = results;
  }

  // Summary
  console.log();
  console.log('─────────────────────────────────');
  console.log(`  Matched:  ${matched}`);
  console.log(`  No match: ${noMatch}`);
  console.log(`  Errors:   ${errors}`);
  console.log(`  Total:    ${finalResults.length}`);
  console.log('─────────────────────────────────');

  // Write output
  if (!dryRun) {
    // Ensure output directory exists
    const outputDir = path.dirname(OUTPUT_PATH);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    fs.writeFileSync(OUTPUT_PATH, JSON.stringify(finalResults, null, 2));
    console.log(`\nWrote ${finalResults.length} results to ${OUTPUT_PATH}`);
  } else {
    console.log('\n[DRY RUN] Skipped writing output file');
  }

  // Cleanup
  await destroyQueuedMusicBrainzService();
}

main()
  .then(() => {
    console.log('\nDone!');
    process.exit(0);
  })
  .catch(err => {
    console.error('\nFatal error:', err);
    process.exit(1);
  });
