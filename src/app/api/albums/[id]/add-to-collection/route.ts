import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import prisma from '@/lib/prisma';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const albumId = params.id;
    const { collectionId, createNew, collectionName, personalRating, personalNotes } = await request.json();
    
    // Check if album exists
    const album = await prisma.album.findUnique({
      where: { id: albumId }
    });
    
    if (!album) {
      return NextResponse.json({ error: 'Album not found' }, { status: 404 });
    }
    
    let targetCollectionId = collectionId;
    
    // Create new collection if requested
    if (createNew && collectionName) {
      const newCollection = await prisma.collection.create({
        data: {
          name: collectionName.trim(),
          userId: session.user.id,
          isPublic: false
        }
      });
      targetCollectionId = newCollection.id;
    }
    
    if (!targetCollectionId) {
      return NextResponse.json({ error: 'Collection ID or new collection name is required' }, { status: 400 });
    }
    
    // Verify collection ownership
    const collection = await prisma.collection.findUnique({
      where: { id: targetCollectionId },
      select: { userId: true, name: true }
    });
    
    if (!collection || collection.userId !== session.user.id) {
      return NextResponse.json({ error: 'Collection not found or access denied' }, { status: 404 });
    }
    
    // Check if album is already in collection
    const existingEntry = await prisma.collectionAlbum.findUnique({
      where: {
        collectionId_albumId: {
          collectionId: targetCollectionId,
          albumId
        }
      }
    });
    
    if (existingEntry) {
      return NextResponse.json({ 
        error: `Album is already in collection "${collection.name}"` 
      }, { status: 409 });
    }
    
    // Get next position
    const lastAlbum = await prisma.collectionAlbum.findFirst({
      where: { collectionId: targetCollectionId },
      orderBy: { position: 'desc' },
      select: { position: true }
    });
    const position = (lastAlbum?.position || 0) + 1;
    
    const collectionAlbum = await prisma.collectionAlbum.create({
      data: {
        collectionId: targetCollectionId,
        albumId,
        personalRating: personalRating ? Math.max(1, Math.min(10, personalRating)) : null,
        personalNotes: personalNotes?.trim(),
        position
      },
      include: {
        collection: { select: { name: true } },
        album: { select: { title: true, artist: true } }
      }
    });
    
    return NextResponse.json({ 
      message: `Album "${album.title}" added to collection "${collection.name}"`,
      collectionAlbum 
    }, { status: 201 });
  } catch (error) {
    console.error('Error adding album to collection:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 