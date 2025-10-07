import { prisma } from '@/lib/prisma';
import { cacheAlbumArt } from '@/lib/cloudflare-images';

async function cacheAllAlbumArt() {
  console.log('Starting album art caching...');

  // Get all albums with external cover art URLs
  const albums = await prisma.album.findMany({
    where: {
      coverArtUrl: {
        not: null,
      },
      // Only get albums not already cached to Cloudflare
      NOT: {
        coverArtUrl: {
          contains: 'imagedelivery.net',
        },
      },
    },
    select: {
      id: true,
      title: true,
      coverArtUrl: true,
      musicbrainzId: true,
    },
    take: 100, // Process in batches
  });

  console.log(`Found ${albums.length} albums to cache`);

  let successCount = 0;
  let failCount = 0;

  for (const album of albums) {
    if (!album.coverArtUrl) continue;

    try {
      console.log(`Caching: ${album.title}`);

      // Use MusicBrainz ID if available, otherwise use internal ID
      const identifier = album.musicbrainzId || album.id;

      const cached = await cacheAlbumArt(
        album.coverArtUrl,
        identifier,
        album.title
      );

      if (cached) {
        // Update album with new Cloudflare Images URL and ID
        await prisma.album.update({
          where: { id: album.id },
          data: {
            coverArtUrl: cached.url,
            cloudflareImageId: cached.id,
          },
        });

        successCount++;
        console.log(`✓ Cached: ${album.title}`);
      } else {
        failCount++;
        console.log(`✗ Failed to cache: ${album.title}`);
      }

      // Rate limit to avoid hitting Cloudflare limits
      await new Promise(resolve => setTimeout(resolve, 100));
    } catch (error) {
      failCount++;
      console.error(`Error caching ${album.title}:`, error);
    }
  }

  console.log(`\nCaching complete!`);
  console.log(`Success: ${successCount}`);
  console.log(`Failed: ${failCount}`);
}

// Run the script
cacheAllAlbumArt()
  .catch(console.error)
  .finally(() => prisma.$disconnect());