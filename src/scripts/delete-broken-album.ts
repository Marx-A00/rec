// Delete the broken Listen Later album
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function deleteAlbum() {
  const albumId = '4cfc8830-0de7-4617-b886-ce9507f7580d';

  console.log('\n🗑️  Deleting broken album...\n');

  // First delete the CollectionAlbum entries (foreign key constraint)
  const deletedCollectionAlbums = await prisma.collectionAlbum.deleteMany({
    where: { albumId },
  });
  console.log(`   ✅ Deleted ${deletedCollectionAlbums.count} CollectionAlbum entry(ies)`);

  // Then delete the Album
  const deletedAlbum = await prisma.album.delete({
    where: { id: albumId },
  });
  console.log(`   ✅ Deleted Album: "${deletedAlbum.title || '(empty)'}"`);

  console.log('\n✅ Done! You can now re-add the album to Listen Later.\n');

  await prisma.$disconnect();
}

deleteAlbum()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('Error:', error);
    process.exit(1);
  });
