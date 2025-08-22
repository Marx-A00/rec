// scripts/check-artist-recommendations.ts
import prisma from '@/lib/prisma';

async function checkArtistRecommendations(artistId: string) {
  console.log(`Checking recommendations for artist ID: ${artistId}`);

  try {
    // Check recommendations where artist is the basis
    const basisRecs = await prisma.recommendation.findMany({
      where: { basisAlbumArtistDiscogsId: artistId },
      select: {
        id: true,
        basisAlbumTitle: true,
        basisAlbumArtist: true,
        basisAlbumArtistDiscogsId: true,
        recommendedAlbumTitle: true,
        recommendedAlbumArtist: true,
      },
    });

    console.log(
      `\nFound ${basisRecs.length} recommendations where artist ${artistId} is the basis album artist`
    );
    if (basisRecs.length > 0) {
      console.log('Sample:', basisRecs[0]);
    }

    // Check recommendations where artist is recommended
    const recommendedRecs = await prisma.recommendation.findMany({
      where: { recommendedAlbumArtistDiscogsId: artistId },
      select: {
        id: true,
        basisAlbumTitle: true,
        basisAlbumArtist: true,
        recommendedAlbumTitle: true,
        recommendedAlbumArtist: true,
        recommendedAlbumArtistDiscogsId: true,
      },
    });

    console.log(
      `\nFound ${recommendedRecs.length} recommendations where artist ${artistId} is the recommended album artist`
    );
    if (recommendedRecs.length > 0) {
      console.log('Sample:', recommendedRecs[0]);
    }

    // Check a few recommendations to see artist ID values
    const sampleRecs = await prisma.recommendation.findMany({
      take: 5,
      where: {
        AND: [
          { basisAlbumArtistDiscogsId: { not: null } },
          { recommendedAlbumArtistDiscogsId: { not: null } },
        ],
      },
      select: {
        id: true,
        basisAlbumArtist: true,
        basisAlbumArtistDiscogsId: true,
        recommendedAlbumArtist: true,
        recommendedAlbumArtistDiscogsId: true,
      },
    });

    console.log('\nSample recommendations with artist IDs:');
    sampleRecs.forEach(rec => {
      console.log({
        id: rec.id,
        basis: `${rec.basisAlbumArtist} (ID: ${rec.basisAlbumArtistDiscogsId})`,
        recommended: `${rec.recommendedAlbumArtist} (ID: ${rec.recommendedAlbumArtistDiscogsId})`,
      });
    });
  } catch (error) {
    console.error('Error checking recommendations:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run with artist ID 45 (Aphex Twin)
checkArtistRecommendations('45');
