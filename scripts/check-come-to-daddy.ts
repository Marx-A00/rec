// scripts/check-come-to-daddy.ts
import prisma from '@/lib/prisma';

async function checkComeToDaddy() {
  console.log('Checking for Come to Daddy recommendation...\n');

  try {
    // Search for recommendations with "Come to Daddy" in the title
    const comeToDaddyRecs = await prisma.recommendation.findMany({
      where: {
        OR: [
          { basisAlbumTitle: { contains: 'Come to Daddy' } },
          { recommendedAlbumTitle: { contains: 'Come to Daddy' } },
        ],
      },
      select: {
        id: true,
        basisAlbumTitle: true,
        basisAlbumArtist: true,
        basisAlbumArtistDiscogsId: true,
        recommendedAlbumTitle: true,
        recommendedAlbumArtist: true,
        recommendedAlbumArtistDiscogsId: true,
        createdAt: true,
      },
    });

    console.log(
      `Found ${comeToDaddyRecs.length} recommendations with "Come to Daddy":`
    );
    comeToDaddyRecs.forEach(rec => {
      console.log('\nRecommendation:', rec.id);
      console.log('Basis:', {
        title: rec.basisAlbumTitle,
        artist: rec.basisAlbumArtist,
        artistId: rec.basisAlbumArtistDiscogsId || 'MISSING',
      });
      console.log('Recommended:', {
        title: rec.recommendedAlbumTitle,
        artist: rec.recommendedAlbumArtist,
        artistId: rec.recommendedAlbumArtistDiscogsId || 'MISSING',
      });
    });

    // Also check for Ash Koosha
    console.log('\n\nChecking for Ash Koosha recommendations...');
    const ashKooshaRecs = await prisma.recommendation.findMany({
      where: {
        OR: [
          { basisAlbumArtist: { contains: 'Ash Koosha' } },
          { recommendedAlbumArtist: { contains: 'Ash Koosha' } },
        ],
      },
      select: {
        id: true,
        basisAlbumTitle: true,
        basisAlbumArtist: true,
        basisAlbumArtistDiscogsId: true,
        recommendedAlbumTitle: true,
        recommendedAlbumArtist: true,
        recommendedAlbumArtistDiscogsId: true,
      },
    });

    console.log(
      `\nFound ${ashKooshaRecs.length} recommendations with Ash Koosha:`
    );
    ashKooshaRecs.forEach(rec => {
      console.log('\nRecommendation:', rec.id);
      console.log('Basis:', {
        title: rec.basisAlbumTitle,
        artist: rec.basisAlbumArtist,
        artistId: rec.basisAlbumArtistDiscogsId || 'MISSING',
      });
      console.log('Recommended:', {
        title: rec.recommendedAlbumTitle,
        artist: rec.recommendedAlbumArtist,
        artistId: rec.recommendedAlbumArtistDiscogsId || 'MISSING',
      });
    });
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkComeToDaddy();
