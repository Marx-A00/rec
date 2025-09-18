// @ts-nocheck
// Check user collections and albums
import { prisma } from '@/lib/prisma';

async function checkUserCollections() {
  const userId = 'cmfmo8b6900019dwpsf9dsn35';

  console.log(`\n=== Checking collections for user ${userId} ===\n`);

  // First, check if user exists
  const user = await prisma.user.findUnique({
    where: { id: userId }
  });

  if (!user) {
    console.log('User not found!');
    return;
  }

  console.log(`User found: ${user.name} (${user.email})\n`);

  // Get collections
  const collections = await prisma.collection.findMany({
    where: { userId },
    include: {
      albums: {
        include: {
          album: {
            include: {
              artists: {
                include: {
                  artist: true
                }
              }
            }
          }
        }
      }
    }
  });

  console.log(`Found ${collections.length} collections\n`);

  collections.forEach((col, idx) => {
    console.log(`Collection ${idx + 1}: "${col.name}"`);
    console.log(`  - ID: ${col.id}`);
    console.log(`  - Albums: ${col.albums?.length || 0}`);
    console.log(`  - Created: ${col.createdAt}`);
    console.log(`  - Privacy: ${col.privacy}`);

    if (col.albums && col.albums.length > 0) {
      console.log('  - First 3 albums:');
      col.albums.slice(0, 3).forEach(ca => {
        console.log(`    • ${ca.album?.title || 'No title'} by ${ca.album?.artists?.[0]?.artist?.name || 'Unknown'}`);
      });
    }
    console.log('');
  });

  // Also check CollectionAlbum table directly
  console.log('\n=== Direct CollectionAlbum check ===');
  const collectionAlbums = await prisma.collectionAlbum.findMany({
    where: {
      collection: {
        userId
      }
    },
    include: {
      album: true,
      collection: true
    },
    take: 5
  });

  console.log(`Found ${collectionAlbums.length} CollectionAlbum records`);
  collectionAlbums.forEach(ca => {
    console.log(`- Album: ${ca.album?.title || ca.albumTitle} in collection "${ca.collection.name}"`);
  });

  await prisma.$disconnect();
}

checkUserCollections().catch(console.error);