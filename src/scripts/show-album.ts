// Show the album details
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function showAlbum() {
  const albumId = '4cfc8830-0de7-4617-b886-ce9507f7580d';

  const album = await prisma.album.findUnique({
    where: { id: albumId },
    include: {
      artists: {
        include: {
          artist: true,
        },
      },
      collectionAlbums: {
        include: {
          collection: {
            select: {
              name: true,
              user: { select: { name: true } },
            },
          },
        },
      },
    },
  });

  console.log('\n📀 Album Details:\n');
  console.log(JSON.stringify(album, null, 2));

  await prisma.$disconnect();
}

showAlbum()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('Error:', error);
    process.exit(1);
  });
