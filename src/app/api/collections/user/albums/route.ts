import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import prisma from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Get all albums from user's collections
    const collections = await prisma.collection.findMany({
      where: { userId: session.user.id },
      include: {
        albums: {
          include: {
            album: true
          }
        }
      }
    });
    
    // Flatten all albums from all collections into a single array
    const albums = collections.flatMap((collection: any) => 
      collection.albums.map((collectionAlbum: any) => ({
        id: collectionAlbum.album.id,
        title: collectionAlbum.album.title,
        artist: collectionAlbum.album.artist,
        releaseDate: collectionAlbum.album.releaseDate,
        genre: collectionAlbum.album.genre,
        label: collectionAlbum.album.label,
        image: {
          url: collectionAlbum.album.imageUrl || '/placeholder.svg?height=400&width=400',
          width: 400,
          height: 400,
          alt: `${collectionAlbum.album.title} cover`
        }
      }))
    );
    
    // Remove duplicates based on album ID
    const uniqueAlbums = albums.filter((album: any, index: number, self: any[]) => 
      index === self.findIndex((a: any) => a.id === album.id)
    );
    
    return NextResponse.json({ albums: uniqueAlbums });
  } catch (error) {
    console.error('Error fetching user albums:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 