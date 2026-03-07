/**
 * MusicBrainz Canonical Data CSV Processing Script
 *
 * Processes the ~23M row canonical_musicbrainz_data.csv into a deduplicated
 * CSV of unique (release_name, artist_credit_name) pairs for the game_album_lookup table.
 *
 * Usage:
 *   npx tsx scripts/import-musicbrainz-lookup.ts <path-to-csv>
 *
 * Output: game_album_lookup_data.csv (~1-3M deduplicated rows)
 *
 * After generating the CSV, import it into the database using psql COPY:
 *
 *   # 1. Clear existing data
 *   psql $DATABASE_URL -c "TRUNCATE game_album_lookup RESTART IDENTITY;"
 *
 *   # 2. Bulk load the CSV (fast, no bloat)
 *   psql $DATABASE_URL -c "\COPY game_album_lookup(title, artist_name, score) FROM 'game_album_lookup_data.csv' WITH (FORMAT csv, HEADER true)"
 *
 *   # 3. Re-seed local albums so they appear in autocomplete
 *   psql $DATABASE_URL -c "INSERT INTO game_album_lookup (title, artist_name, source) SELECT DISTINCT a.title, ar.name, 'local' FROM albums a JOIN album_artists aa ON aa.album_id = a.id JOIN artists ar ON ar.id = aa.artist_id ON CONFLICT (title, artist_name) DO UPDATE SET source = 'local';"
 *
 * DO NOT insert rows via application-level batch inserts — that generates
 * millions of dead tuples and will tank your database IO budget.
 */

import { createReadStream, createWriteStream } from 'fs';
import { createInterface } from 'readline';

interface LookupEntry {
  title: string;
  artistName: string;
  score: number;
}

// Parse a CSV line handling quoted fields with commas
function parseCSVLine(line: string): string[] {
  const fields: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++; // skip escaped quote
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      fields.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  fields.push(current);
  return fields;
}

// Escape a value for CSV output
function escapeCSV(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

async function processCSV(
  inputPath: string
): Promise<Map<string, LookupEntry>> {
  const dedupeMap = new Map<string, LookupEntry>();
  let totalRows = 0;
  let skipped = 0;
  let emptySkipped = 0;
  let isHeader = true;

  const fileStream = createReadStream(inputPath, { encoding: 'utf-8' });
  const rl = createInterface({ input: fileStream, crlfDelay: Infinity });

  const startTime = Date.now();
  let lastLog = Date.now();

  for await (const line of rl) {
    if (isHeader) {
      isHeader = false;
      continue;
    }

    totalRows++;

    // Progress logging every 5 seconds
    if (Date.now() - lastLog > 5000) {
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(0);
      console.log(
        `  Processed ${totalRows.toLocaleString()} rows (${dedupeMap.size.toLocaleString()} unique) [${elapsed}s]`
      );
      lastLog = Date.now();
    }

    const fields = parseCSVLine(line);

    const artistName = fields[3]?.trim();
    const releaseName = fields[5]?.trim();
    const score = parseInt(fields[9]) || 0;

    if (!releaseName || !artistName) {
      emptySkipped++;
      continue;
    }

    // Skip "Various Artists" compilations — not useful for album guessing
    if (artistName === 'Various Artists') {
      skipped++;
      continue;
    }

    const key = `${releaseName.toLowerCase()}|||${artistName.toLowerCase()}`;
    const existing = dedupeMap.get(key);

    if (!existing || score > existing.score) {
      if (existing) skipped++;
      dedupeMap.set(key, { title: releaseName, artistName, score });
    } else {
      skipped++;
    }
  }

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log('\n--- Processing Complete ---');
  console.log(`  Total rows read: ${totalRows.toLocaleString()}`);
  console.log(`  Unique pairs: ${dedupeMap.size.toLocaleString()}`);
  console.log(`  Duplicates merged: ${skipped.toLocaleString()}`);
  console.log(`  Empty/missing skipped: ${emptySkipped.toLocaleString()}`);
  console.log(`  Time: ${elapsed}s\n`);

  return dedupeMap;
}

async function writeCSV(
  dedupeMap: Map<string, LookupEntry>,
  outputPath: string
): Promise<void> {
  console.log(
    `Writing ${dedupeMap.size.toLocaleString()} rows to ${outputPath}...`
  );

  const output = createWriteStream(outputPath, { encoding: 'utf-8' });
  output.write('title,artist_name,score\n');

  let written = 0;
  for (const entry of dedupeMap.values()) {
    output.write(
      `${escapeCSV(entry.title)},${escapeCSV(entry.artistName)},${entry.score}\n`
    );
    written++;
    if (written % 500000 === 0) {
      console.log(`  Written ${written.toLocaleString()} rows...`);
    }
  }

  await new Promise<void>((resolve, reject) => {
    output.end(() => resolve());
    output.on('error', reject);
  });

  console.log(`Done. Wrote ${written.toLocaleString()} rows to ${outputPath}`);
}

async function main(): Promise<void> {
  const inputPath = process.argv[2];

  if (!inputPath) {
    console.log(
      'Usage: npx tsx scripts/import-musicbrainz-lookup.ts <path-to-csv>'
    );
    console.log('');
    console.log('  <path-to-csv>  Path to canonical_musicbrainz_data.csv');
    console.log('');
    console.log('Outputs deduplicated CSV to game_album_lookup_data.csv.');
    console.log(
      'Then use psql \\COPY to bulk load into the database (see script header for instructions).'
    );
    process.exit(1);
  }

  console.log(`Processing: ${inputPath}\n`);

  const dedupeMap = await processCSV(inputPath);
  await writeCSV(dedupeMap, 'game_album_lookup_data.csv');
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
