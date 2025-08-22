// scripts/backfill-artist-ids.ts
import prisma from '@/lib/prisma';
import { getAlbumDetails } from '@/lib/api/albums';

async function backfillArtistIds() {
  console.log('Starting artist ID backfill...');

  try {
    // Fetch all recommendations without artist IDs
    const recommendations = await prisma.recommendation.findMany({
      where: {
        OR: [
          { basisAlbumArtistDiscogsId: null },
          { recommendedAlbumArtistDiscogsId: null },
        ],
      },
    });

    console.log(`Found ${recommendations.length} recommendations to update`);

    let updated = 0;
    let failed = 0;

    for (const rec of recommendations) {
      try {
        console.log(`Processing recommendation ${rec.id}...`);

        // Fetch album details for both albums
        const [basisAlbum, recommendedAlbum] = await Promise.all([
          rec.basisAlbumArtistDiscogsId === null
            ? getAlbumDetails(rec.basisAlbumDiscogsId)
            : null,
          rec.recommendedAlbumArtistDiscogsId === null
            ? getAlbumDetails(rec.recommendedAlbumDiscogsId)
            : null,
        ]);

        // Extract artist IDs
        const basisArtistId = basisAlbum?.artists?.[0]?.id || null;
        const recommendedArtistId = recommendedAlbum?.artists?.[0]?.id || null;

        // Update the recommendation if we found any artist IDs
        if (basisArtistId || recommendedArtistId) {
          await prisma.recommendation.update({
            where: { id: rec.id },
            data: {
              ...(basisArtistId && { basisAlbumArtistDiscogsId: basisArtistId }),
              ...(recommendedArtistId && {
                recommendedAlbumArtistDiscogsId: recommendedArtistId,
              }),
            },
          });
          updated++;
          console.log(`✓ Updated recommendation ${rec.id}`);
        } else {
          console.log(`⚠ No artist IDs found for recommendation ${rec.id}`);
        }
      } catch (error) {
        console.error(`✗ Failed to update recommendation ${rec.id}:`, error);
        failed++;
      }

      // Add a small delay to avoid hitting rate limits
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    console.log('\nBackfill completed!');
    console.log(`Updated: ${updated}`);
    console.log(`Failed: ${failed}`);
    console.log(`Skipped: ${recommendations.length - updated - failed}`);
  } catch (error) {
    console.error('Backfill failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the backfill
backfillArtistIds();