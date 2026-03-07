/**
 * MusicBrainz Canonical Data CSV Processing Script
 *
 * Processes the ~23M row canonical_musicbrainz_data.csv into a deduplicated
 * CSV of unique (release_name, artist_credit_name) pairs for the game_album_lookup table.
 *
 * Usage:
 *   npx tsx scripts/import-musicbrainz-lookup.ts <path-to-csv> [--import]
 *
 * Without --import: outputs deduplicated CSV to game_album_lookup_data.csv
 * With --import: inserts directly into the database via DATABASE_URL
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

async function importToDatabase(
  dedupeMap: Map<string, LookupEntry>
): Promise<void> {
  // Dynamic import to avoid requiring pg when just doing CSV processing
  const { default: pg } = await import('pg');
  const { Pool } = pg;

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error(
      'ERROR: DATABASE_URL environment variable is required for --import'
    );
    process.exit(1);
  }

  const pool = new Pool({ connectionString: databaseUrl });
  const client = await pool.connect();

  try {
    console.log(
      `Importing ${dedupeMap.size.toLocaleString()} rows into game_album_lookup...`
    );

    const BATCH_SIZE = 1000;
    const entries = Array.from(dedupeMap.values());
    let imported = 0;

    await client.query('BEGIN');

    for (let i = 0; i < entries.length; i += BATCH_SIZE) {
      const batch = entries.slice(i, i + BATCH_SIZE);

      // Build a multi-row INSERT with ON CONFLICT
      const values: string[] = [];
      const params: (string | number)[] = [];
      let paramIdx = 1;

      for (const entry of batch) {
        values.push(
          `($${paramIdx}, $${paramIdx + 1}, $${paramIdx + 2}, 'musicbrainz')`
        );
        params.push(entry.title, entry.artistName, entry.score);
        paramIdx += 3;
      }

      await client.query(
        `INSERT INTO game_album_lookup (title, artist_name, score, source)
         VALUES ${values.join(', ')}
         ON CONFLICT (title, artist_name) DO UPDATE SET
           score = GREATEST(game_album_lookup.score, EXCLUDED.score)`,
        params
      );

      imported += batch.length;
      if (imported % 100000 === 0 || imported === entries.length) {
        console.log(
          `  Imported ${imported.toLocaleString()} / ${entries.length.toLocaleString()} rows`
        );
      }
    }

    await client.query('COMMIT');
    console.log(`Done. Imported ${imported.toLocaleString()} rows.`);
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const inputPath = args.find(a => !a.startsWith('--'));
  const shouldImport = args.includes('--import');

  if (!inputPath) {
    console.log(
      'Usage: npx tsx scripts/import-musicbrainz-lookup.ts <path-to-csv> [--import]'
    );
    console.log('');
    console.log('  <path-to-csv>  Path to canonical_musicbrainz_data.csv');
    console.log(
      '  --import       Insert directly into database (requires DATABASE_URL)'
    );
    console.log('');
    console.log(
      'Without --import, outputs deduplicated CSV to game_album_lookup_data.csv'
    );
    process.exit(1);
  }

  console.log(`Processing: ${inputPath}`);
  console.log(
    `Mode: ${shouldImport ? 'Direct database import' : 'CSV output'}\n`
  );

  const dedupeMap = await processCSV(inputPath);

  if (shouldImport) {
    await importToDatabase(dedupeMap);
  } else {
    await writeCSV(dedupeMap, 'game_album_lookup_data.csv');
  }
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
