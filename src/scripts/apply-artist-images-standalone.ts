/**
 * Apply artist image data to production database.
 *
 * This is a STANDALONE script - all data is embedded in prod-artist-images.json.
 * No dev DB connection required.
 *
 * Usage:
 *   npx tsx src/scripts/apply-artist-images-standalone.ts
 *
 * Options:
 *   --dry-run     Show what would be done without making changes
 *   --artist=ID   Only process a specific artist
 */

import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

interface ArtistImageData {
  id: string;
  name: string;
  imageUrl: string;
  cloudflareImageId: string | null;
}

// Parse CLI args
const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const artistArg = args.find(a => a.startsWith('--artist='));
const specificArtistId = artistArg?.split('=')[1];

// Uses DATABASE_URL from environment
const prisma = new PrismaClient();

async function applyArtistImages() {
  console.log('=== Apply Artist Images (Standalone) ===\n');

  if (dryRun) {
    console.log('*** DRY RUN MODE - No changes will be made ***\n');
  }

  // Read the self-contained image data
  const dataPath = path.join(__dirname, '../../prod-artist-images.json');

  if (!fs.existsSync(dataPath)) {
    // Try alternate path (when running from project root)
    const altPath = './prod-artist-images.json';
    if (!fs.existsSync(altPath)) {
      console.error('ERROR: prod-artist-images.json not found');
      console.error('Expected at:', dataPath);
      process.exit(1);
    }
  }

  const dataContent = fs.readFileSync(
    fs.existsSync(dataPath) ? dataPath : './prod-artist-images.json',
    'utf-8'
  );
  const artists: ArtistImageData[] = JSON.parse(dataContent);

  console.log(`Found ${artists.length} artists in image data\n`);

  // Filter by specific artist if requested
  const toProcess = specificArtistId
    ? artists.filter(a => a.id === specificArtistId)
    : artists;

  if (specificArtistId && toProcess.length === 0) {
    console.log(`Artist ${specificArtistId} not found in image data`);
    return;
  }

  // Stats
  let artistsProcessed = 0;
  let artistsSkipped = 0;
  let errors = 0;

  for (const artist of toProcess) {
    try {
      // Check if artist exists in database
      const existingArtist = await prisma.artist.findUnique({
        where: { id: artist.id },
        select: { id: true, name: true, imageUrl: true },
      });

      if (!existingArtist) {
        console.log(`SKIP: ${artist.name} - not found in database`);
        artistsSkipped++;
        continue;
      }

      // Skip if already has an image
      if (existingArtist.imageUrl) {
        console.log(`SKIP: ${artist.name} - already has image`);
        artistsSkipped++;
        continue;
      }

      if (dryRun) {
        console.log(`[DRY RUN] Would update: ${artist.name}`);
        console.log(`  imageUrl: ${artist.imageUrl.substring(0, 60)}...`);
        console.log(
          `  cloudflareImageId: ${artist.cloudflareImageId ?? 'none'}`
        );
      } else {
        await prisma.artist.update({
          where: { id: artist.id },
          data: {
            imageUrl: artist.imageUrl,
            cloudflareImageId: artist.cloudflareImageId,
          },
        });
        console.log(`✓ Updated: ${artist.name}`);
      }

      artistsProcessed++;
    } catch (error) {
      console.error(`ERROR: ${artist.name} - ${error}`);
      errors++;
    }
  }

  // Summary
  console.log('\n=== Summary ===');
  console.log(`Artists processed: ${artistsProcessed}`);
  console.log(`Artists skipped: ${artistsSkipped}`);
  console.log(`Errors: ${errors}`);

  if (dryRun) {
    console.log(
      '\n*** This was a dry run. Run without --dry-run to apply changes. ***'
    );
  }
}

async function main() {
  try {
    await applyArtistImages();
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
