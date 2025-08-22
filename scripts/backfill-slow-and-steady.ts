// scripts/backfill-slow-and-steady.ts
import prisma from '@/lib/prisma';
import { getAlbumDetails } from '@/lib/api/albums';
import chalk from 'chalk';

async function slowAndSteadyBackfill() {
  console.log(
    chalk.bgBlue.white.bold(
      '\n🐌 Starting SLOW & STEADY artist ID backfill... 🐌\n'
    )
  );
  console.log(
    chalk.yellow("This will take a while but it won't hit rate limits!\n")
  );

  try {
    // Get ALL recommendations with missing artist IDs
    const missingRecs = await prisma.recommendation.findMany({
      where: {
        OR: [
          { basisAlbumArtistDiscogsId: null },
          { recommendedAlbumArtistDiscogsId: null },
        ],
      },
    });

    const total = missingRecs.length;
    console.log(chalk.yellow(`Found ${total} recommendations to process`));
    console.log(
      chalk.gray(
        `Estimated time: ${Math.ceil((total * 2 * 10) / 60)} minutes\n`
      )
    );

    let processed = 0;
    let updated = 0;
    let failed = 0;

    for (const rec of missingRecs) {
      processed++;
      console.log(
        chalk.bgMagenta.white(
          `\n[${processed}/${total}] Processing recommendation ${rec.id}`
        )
      );
      console.log(
        chalk.cyan(`${rec.basisAlbumTitle} → ${rec.recommendedAlbumTitle}`)
      );

      const updates: any = {};
      let apiCallsMade = 0;

      // Check basis album
      if (!rec.basisAlbumArtistDiscogsId) {
        try {
          console.log(chalk.gray(`\n⏳ Waiting 10 seconds before API call...`));
          await new Promise(resolve => setTimeout(resolve, 10000)); // 10 second wait

          console.log(
            chalk.blue(`📡 Fetching basis album ${rec.basisAlbumDiscogsId}...`)
          );
          const album = await getAlbumDetails(rec.basisAlbumDiscogsId);
          apiCallsMade++;

          const artistId = album.artists?.[0]?.id;
          if (artistId) {
            updates.basisAlbumArtistDiscogsId = artistId;
            console.log(
              chalk.green(
                `✅ Found basis artist: ${rec.basisAlbumArtist} → ID: ${artistId}`
              )
            );
          } else {
            console.log(
              chalk.yellow(`⚠️  No artist ID found in basis album data`)
            );
          }
        } catch (e) {
          console.log(
            chalk.red(
              `❌ Failed to fetch basis album: ${e instanceof Error ? e.message : 'Unknown error'}`
            )
          );
        }
      }

      // Check recommended album
      if (!rec.recommendedAlbumArtistDiscogsId) {
        try {
          console.log(chalk.gray(`\n⏳ Waiting 10 seconds before API call...`));
          await new Promise(resolve => setTimeout(resolve, 10000)); // 10 second wait

          console.log(
            chalk.blue(
              `📡 Fetching recommended album ${rec.recommendedAlbumDiscogsId}...`
            )
          );
          const album = await getAlbumDetails(rec.recommendedAlbumDiscogsId);
          apiCallsMade++;

          const artistId = album.artists?.[0]?.id;
          if (artistId) {
            updates.recommendedAlbumArtistDiscogsId = artistId;
            console.log(
              chalk.green(
                `✅ Found recommended artist: ${rec.recommendedAlbumArtist} → ID: ${artistId}`
              )
            );
          } else {
            console.log(
              chalk.yellow(`⚠️  No artist ID found in recommended album data`)
            );
          }
        } catch (e) {
          console.log(
            chalk.red(
              `❌ Failed to fetch recommended album: ${e instanceof Error ? e.message : 'Unknown error'}`
            )
          );
        }
      }

      // Update the database if we found any IDs
      if (Object.keys(updates).length > 0) {
        try {
          await prisma.recommendation.update({
            where: { id: rec.id },
            data: updates,
          });
          updated++;
          console.log(
            chalk.bgGreen.black(`\n✨ Successfully updated recommendation! ✨`)
          );
        } catch (e) {
          console.log(
            chalk.red(
              `❌ Failed to update database: ${e instanceof Error ? e.message : 'Unknown error'}`
            )
          );
          failed++;
        }
      } else if (apiCallsMade === 0) {
        console.log(chalk.gray(`⏭️  Skipping - already has all artist IDs`));
      }

      // Progress report
      const percentage = Math.round((processed / total) * 100);
      const remainingTime = Math.ceil(((total - processed) * 2 * 10) / 60);
      console.log(
        chalk.blue(
          `\n📊 Progress: ${percentage}% | Remaining time: ~${remainingTime} minutes`
        )
      );
      console.log(chalk.green(`Updated: ${updated} | Failed: ${failed}`));
    }

    console.log(chalk.bgGreen.black.bold('\n🎉 BACKFILL COMPLETE! 🎉\n'));
    console.log(chalk.green(`✅ Successfully updated: ${updated}`));
    console.log(chalk.red(`❌ Failed: ${failed}`));
    console.log(
      chalk.yellow(`⏭️  Already complete: ${total - updated - failed}`)
    );
  } catch (error) {
    console.error(chalk.bgRed.white('\n💥 FATAL ERROR 💥'), error);
  } finally {
    await prisma.$disconnect();
  }
}

// Better error handling
process.on('unhandledRejection', error => {
  console.error(chalk.bgRed.white('\n💥 Unhandled error 💥'));
  console.error(error);
  console.log(
    chalk.yellow('\n⚠️  The script will continue with the next item...')
  );
});

// Allow graceful shutdown
process.on('SIGINT', async () => {
  console.log(chalk.bgYellow.black('\n⚠️  Gracefully shutting down...'));
  await prisma.$disconnect();
  process.exit(0);
});

slowAndSteadyBackfill();
