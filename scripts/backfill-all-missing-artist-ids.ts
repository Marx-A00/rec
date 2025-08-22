// scripts/backfill-all-missing-artist-ids.ts
import prisma from '@/lib/prisma';
import { getAlbumDetails } from '@/lib/api/albums';
import chalk from 'chalk';

async function backfillAllMissingArtistIds() {
  console.log(chalk.bgBlue.white.bold('\n🎨 Starting comprehensive artist ID backfill... 🎨\n'));

  try {
    // Count total missing
    const totalMissing = await prisma.recommendation.count({
      where: {
        OR: [
          { basisAlbumArtistDiscogsId: null },
          { recommendedAlbumArtistDiscogsId: null },
        ],
      },
    });

    console.log(chalk.yellow(`Found ${totalMissing} recommendations with missing artist IDs\n`));

    // Process in batches to avoid memory issues
    const batchSize = 10;
    let processed = 0;
    let updated = 0;
    let failed = 0;

    while (processed < totalMissing) {
      // Get next batch
      const batch = await prisma.recommendation.findMany({
        where: {
          OR: [
            { basisAlbumArtistDiscogsId: null },
            { recommendedAlbumArtistDiscogsId: null },
          ],
        },
        take: batchSize,
        skip: 0, // Always skip 0 because we're updating as we go
      });

      if (batch.length === 0) break;

      console.log(chalk.blue(`\nProcessing batch: ${processed + 1} to ${processed + batch.length}`));

      for (const rec of batch) {
        try {
          console.log(chalk.cyan(`\n[${processed + 1}/${totalMissing}] ${rec.basisAlbumTitle} → ${rec.recommendedAlbumTitle}`));

          const updates: any = {};
          let needsUpdate = false;

          // Check basis album
          if (!rec.basisAlbumArtistDiscogsId) {
            try {
              console.log(chalk.gray(`  Fetching basis album ${rec.basisAlbumDiscogsId}...`));
              const album = await getAlbumDetails(rec.basisAlbumDiscogsId);
              const artistId = album.artists?.[0]?.id;
              if (artistId) {
                updates.basisAlbumArtistDiscogsId = artistId;
                needsUpdate = true;
                console.log(chalk.green(`  ✓ Basis: ${rec.basisAlbumArtist} → ID: ${artistId}`));
              } else {
                console.log(chalk.yellow(`  ⚠ No artist ID found for basis album`));
              }
            } catch (e) {
              console.log(chalk.red(`  ✗ Failed to fetch basis album: ${e instanceof Error ? e.message : 'Unknown error'}`));
            }
            // Add delay between API calls
            await new Promise(resolve => setTimeout(resolve, 300));
          }

          // Check recommended album
          if (!rec.recommendedAlbumArtistDiscogsId) {
            try {
              console.log(chalk.gray(`  Fetching recommended album ${rec.recommendedAlbumDiscogsId}...`));
              const album = await getAlbumDetails(rec.recommendedAlbumDiscogsId);
              const artistId = album.artists?.[0]?.id;
              if (artistId) {
                updates.recommendedAlbumArtistDiscogsId = artistId;
                needsUpdate = true;
                console.log(chalk.green(`  ✓ Recommended: ${rec.recommendedAlbumArtist} → ID: ${artistId}`));
              } else {
                console.log(chalk.yellow(`  ⚠ No artist ID found for recommended album`));
              }
            } catch (e) {
              console.log(chalk.red(`  ✗ Failed to fetch recommended album: ${e instanceof Error ? e.message : 'Unknown error'}`));
            }
            // Add delay between API calls
            await new Promise(resolve => setTimeout(resolve, 300));
          }

          // Update if we found any IDs
          if (needsUpdate && Object.keys(updates).length > 0) {
            await prisma.recommendation.update({
              where: { id: rec.id },
              data: updates,
            });
            updated++;
            console.log(chalk.green('  ✓ Updated recommendation'));
          }

          processed++;
        } catch (error) {
          console.error(chalk.red(`  ✗ Error processing ${rec.id}:`), error);
          failed++;
          processed++;
        }

        // Longer delay between recommendations to avoid rate limits
        await new Promise(resolve => setTimeout(resolve, 500));
      }

      // Progress summary
      console.log(chalk.blue(`\nProgress: ${processed}/${totalMissing} (${Math.round((processed / totalMissing) * 100)}%)`));
      console.log(chalk.green(`Updated: ${updated}`));
      console.log(chalk.red(`Failed: ${failed}`));
    }

    console.log(chalk.bgGreen.black.bold('\n🎨 Backfill complete! 🎨'));
    console.log(chalk.green(`✓ Successfully updated: ${updated}`));
    console.log(chalk.red(`✗ Failed: ${failed}`));
    console.log(chalk.yellow(`⚠ Skipped: ${totalMissing - updated - failed}`));

  } catch (error) {
    console.error(chalk.bgRed.white('Backfill failed:'), error);
  } finally {
    await prisma.$disconnect();
  }
}

// Add error handling for the Discogs API issues
process.on('unhandledRejection', (error) => {
  console.error(chalk.bgRed.white('\n❌ Unhandled error - likely Discogs API issue ❌'));
  console.error(error);
  process.exit(1);
});

backfillAllMissingArtistIds();