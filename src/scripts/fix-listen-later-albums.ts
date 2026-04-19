// Fix Listen Later albums that have no musicbrainzId
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function fixListenLaterAlbums() {
  console.log('\n🔧 Fixing Listen Later Albums...\n');

  // Find Listen Later collections with albums
  const collections = await prisma.collection.findMany({
    where: { name: 'Listen Later' },
    include: {
      albums: {
        include: {
          album: true,
        },
      },
    },
  });

  let fixedCount = 0;

  for (const collection of collections) {
    for (const ca of collection.albums) {
      const album = ca.album;

      // Check if album exists and has no musicbrainzId
      if (album && !album.musicbrainzId) {
        console.log(`\n📀 Album ID: ${album.id}`);
        console.log(`   Title: "${album.title}"`);
        console.log(`   MusicBrainz ID: NULL`);

        // Check if the album.id is a valid MusicBrainz UUID format
        const isValidMbid = album.id.match(
          /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
        );

        if (isValidMbid) {
          console.log(`   ✅ Looks like a valid MusicBrainz UUID!`);
          console.log(`   🔄 Setting musicbrainzId = ${album.id}`);

          await prisma.album.update({
            where: { id: album.id },
            data: {
              musicbrainzId: album.id,
              title: album.title || 'Loading...',
              enrichmentStatus: 'UNENRICHED', // Reset enrichment status
            },
          });

          fixedCount++;
          console.log(`   ✅ Fixed!`);
        } else {
          console.log(`   ❌ Not a valid UUID - skipping`);
        }
      }
    }
  }

  console.log(`\n✅ Fixed ${fixedCount} album(s)\n`);
  await prisma.$disconnect();
}

fixListenLaterAlbums()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('Error:', error);
    process.exit(1);
  });
