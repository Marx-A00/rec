// Debug script to check Listen Later data
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function debugListenLater() {
  console.log('\n🔍 Checking Listen Later Collections...\n');

  // Find all Listen Later collections
  const collections = await prisma.collection.findMany({
    where: { name: 'Listen Later' },
    include: {
      user: { select: { name: true, email: true } },
      albums: {
        include: {
          album: {
            select: {
              id: true,
              title: true,
              musicbrainzId: true,
              coverArtUrl: true,
              enrichmentStatus: true,
            },
          },
        },
      },
    },
  });

  console.log(`Found ${collections.length} Listen Later collection(s)\n`);

  for (const collection of collections) {
    console.log(`📚 Collection ID: ${collection.id}`);
    console.log(`   User: ${collection.user.name} (${collection.user.email})`);
    console.log(`   Albums: ${collection.albums.length}`);
    console.log('');

    if (collection.albums.length > 0) {
      console.log('   Albums in collection:');
      for (const ca of collection.albums) {
        console.log(`
   ├─ CollectionAlbum ID: ${ca.id}
   ├─ albumId (FK): ${ca.albumId}
   ├─ Album DB ID: ${ca.album?.id || 'NULL'}
   ├─ Album Title: "${ca.album?.title || 'NULL'}"
   ├─ MusicBrainz ID: ${ca.album?.musicbrainzId || 'NULL'}
   ├─ Cover Art: ${ca.album?.coverArtUrl ? 'Yes' : 'No'}
   └─ Enrichment: ${ca.album?.enrichmentStatus || 'NULL'}
        `);
      }
    }
    console.log('\n' + '='.repeat(60) + '\n');
  }

  await prisma.$disconnect();
}

debugListenLater()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('Error:', error);
    process.exit(1);
  });
