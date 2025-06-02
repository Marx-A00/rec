import { NextResponse } from 'next/server';

import { auth } from '@/../auth';
import prisma from '@/lib/prisma';

export async function GET(_request: Request) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get all albums from user's collections
    const collections = await prisma.collection.findMany({
      where: { userId: session.user.id },
      include: {
        albums: true,
      },
    });

    // Flatten all albums from all collections into a single array
    const albums = collections.flatMap(collection =>
      collection.albums.map(collectionAlbum => ({
        id: collectionAlbum.albumDiscogsId,
        title: collectionAlbum.albumTitle,
        artist: collectionAlbum.albumArtist,
        releaseDate: collectionAlbum.albumYear || '',
        genre: [],
        label: '',
        image: {
          url:
            collectionAlbum.albumImageUrl ||
            '/placeholder.svg?height=400&width=400',
          width: 400,
          height: 400,
          alt: `${collectionAlbum.albumTitle} cover`,
        },
      }))
    );

    // Remove duplicates based on album ID
    const uniqueAlbums = albums.filter(
      (album, index, self) => index === self.findIndex(a => a.id === album.id)
    );

    // might not be necessary,
    // maybe should add pagination again
    return NextResponse.json({ albums: uniqueAlbums });
  } catch (error) {
    console.error('Error fetching user albums:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
