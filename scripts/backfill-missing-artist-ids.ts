// scripts/backfill-missing-artist-ids.ts
import prisma from '@/lib/prisma';
import { getAlbumDetails } from '@/lib/api/albums';
import chalk from 'chalk';

async function backfillMissingArtistIds() {
  console.log(
    chalk.bgBlue.white.bold('\n🎨 Starting targeted artist ID backfill... 🎨\n')
  );

  try {
    // Find recommendations with Aphex Twin but missing artist IDs
    const aphexRecs = await prisma.recommendation.findMany({
      where: {
        OR: [
          {
            AND: [
              { basisAlbumArtist: 'Aphex Twin' },
              { basisAlbumArtistDiscogsId: null },
            ],
          },
          {
            AND: [
              { recommendedAlbumArtist: 'Aphex Twin' },
              { recommendedAlbumArtistDiscogsId: null },
            ],
          },
        ],
      },
    });

    console.log(
      chalk.yellow(
        `Found ${aphexRecs.length} Aphex Twin recommendations missing artist IDs`
      )
    );

    for (const rec of aphexRecs) {
      try {
        console.log(
          chalk.cyan(
            `\nProcessing: ${rec.basisAlbumTitle} → ${rec.recommendedAlbumTitle}`
          )
        );

        const updates: any = {};

        // Check basis album
        if (
          rec.basisAlbumArtist === 'Aphex Twin' &&
          !rec.basisAlbumArtistDiscogsId
        ) {
          try {
            const album = await getAlbumDetails(rec.basisAlbumDiscogsId);
            const artistId = album.artists?.[0]?.id;
            if (artistId) {
              updates.basisAlbumArtistDiscogsId = artistId;
              console.log(
                chalk.green(`  ✓ Found basis artist ID: ${artistId}`)
              );
            }
          } catch (e) {
            console.log(chalk.red(`  ✗ Failed to get basis album details`));
          }
        }

        // Check recommended album
        if (
          rec.recommendedAlbumArtist === 'Aphex Twin' &&
          !rec.recommendedAlbumArtistDiscogsId
        ) {
          try {
            const album = await getAlbumDetails(rec.recommendedAlbumDiscogsId);
            const artistId = album.artists?.[0]?.id;
            if (artistId) {
              updates.recommendedAlbumArtistDiscogsId = artistId;
              console.log(
                chalk.green(`  ✓ Found recommended artist ID: ${artistId}`)
              );
            }
          } catch (e) {
            console.log(
              chalk.red(`  ✗ Failed to get recommended album details`)
            );
          }
        }

        // Update if we found any IDs
        if (Object.keys(updates).length > 0) {
          await prisma.recommendation.update({
            where: { id: rec.id },
            data: updates,
          });
          console.log(chalk.green('  ✓ Updated recommendation'));
        }

        // Small delay to avoid rate limits
        await new Promise(resolve => setTimeout(resolve, 500));
      } catch (error) {
        console.error(chalk.red(`  ✗ Error processing ${rec.id}:`), error);
      }
    }

    console.log(chalk.bgGreen.black.bold('\n🎨 Backfill complete! 🎨\n'));
  } catch (error) {
    console.error(chalk.bgRed.white('Backfill failed:'), error);
  } finally {
    await prisma.$disconnect();
  }
}

backfillMissingArtistIds();
