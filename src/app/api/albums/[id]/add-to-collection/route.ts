// @ts-nocheck - Schema migration broke API routes, needs GraphQL rewrite
import { NextRequest, NextResponse } from 'next/server';

import { auth } from '@/../auth';
import prisma from '@/lib/prisma';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: albumDiscogsId } = await params;

    const {
      collectionId,
      createNew,
      collectionName,
      personalRating,
      personalNotes,
      // Album data from Discogs API
      albumTitle,
      albumArtist,
      albumImageUrl,
      albumYear,
    } = await request.json();

    if (!albumTitle || !albumArtist) {
      return NextResponse.json(
        { error: 'Album title and artist are required' },
        { status: 400 }
      );
    }

    let targetCollectionId = collectionId;

    // Create new collection if requested
    if (createNew && collectionName) {
      const newCollection = await prisma.collection.create({
        data: {
          name: collectionName.trim(),
          userId: session.user.id,
          isPublic: false,
        },
      });
      targetCollectionId = newCollection.id;
    }

    // If no collection specified, find or create a default collection
    if (!targetCollectionId) {
      // Look for an existing default collection
      let defaultCollection = await prisma.collection.findFirst({
        where: {
          userId: session.user.id,
          name: 'My Collection',
        },
      });

      // Create default collection if it doesn't exist
      if (!defaultCollection) {
        defaultCollection = await prisma.collection.create({
          data: {
            name: 'My Collection',
            description: 'My personal album collection',
            userId: session.user.id,
            isPublic: false,
          },
        });
      }

      targetCollectionId = defaultCollection.id;
    }

    // Verify collection ownership
    const collection = await prisma.collection.findUnique({
      where: { id: targetCollectionId },
      select: { userId: true, name: true },
    });

    if (!collection || collection.userId !== session.user.id) {
      return NextResponse.json(
        { error: 'Collection not found or access denied' },
        { status: 404 }
      );
    }

    // Check if album is already in collection
    const existingEntry = await prisma.collectionAlbum.findFirst({
      where: {
        collectionId: targetCollectionId,
        discogsId: albumDiscogsId,
      },
    });

    if (existingEntry) {
      return NextResponse.json(
        {
          error: `Album is already in collection "${collection.name}"`,
        },
        { status: 409 }
      );
    }

    // Get next position
    const lastAlbum = await prisma.collectionAlbum.findFirst({
      where: { collectionId: targetCollectionId },
      orderBy: { position: 'desc' },
      select: { position: true },
    });
    const position = (lastAlbum?.position || 0) + 1;

    // Create CollectionAlbum with cached display data
    const collectionAlbum = await prisma.collectionAlbum.create({
      data: {
        collectionId: targetCollectionId,
        discogsId: albumDiscogsId, // NEW: Store Discogs ID for cross-reference
        // TODO: albumId will be populated during migration from Discogs->MusicBrainz
        personalRating: personalRating
          ? Math.max(1, Math.min(10, personalRating))
          : null,
        personalNotes: personalNotes?.trim(),
        position,
        // Cached display data from Discogs
        albumTitle: albumTitle.trim(),
        albumArtist: albumArtist.trim(),
        albumImageUrl: albumImageUrl || null,
        albumYear: albumYear ? String(albumYear) : null,
      },
      include: {
        collection: { select: { name: true } },
      },
    });

    return NextResponse.json(
      {
        message: `Album "${albumTitle}" added to collection "${collection.name}"`,
        collectionAlbum,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error adding album to collection:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
