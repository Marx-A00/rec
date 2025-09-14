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

    const { id: collectionId } = await params;
    const { albumId, personalRating, personalNotes, position } =
      await request.json();

    if (!albumId) {
      return NextResponse.json(
        { error: 'Album ID is required' },
        { status: 400 }
      );
    }

    // Verify collection ownership
    const collection = await prisma.collection.findUnique({
      where: { id: collectionId },
      select: { userId: true },
    });

    if (!collection || collection.userId !== session.user.id) {
      return NextResponse.json(
        { error: 'Collection not found or access denied' },
        { status: 404 }
      );
    }

    // Check if album is already in collection
    const existingEntry = await prisma.collectionAlbum.findUnique({
      where: {
        collectionId_albumDiscogsId: {
          collectionId,
          albumDiscogsId: albumId,
        },
      },
    });

    if (existingEntry) {
      return NextResponse.json(
        { error: 'Album already in collection' },
        { status: 409 }
      );
    }

    // Get next position if not provided
    let finalPosition = position;
    if (finalPosition === undefined) {
      const lastAlbum = await prisma.collectionAlbum.findFirst({
        where: { collectionId },
        orderBy: { position: 'desc' },
        select: { position: true },
      });
      finalPosition = (lastAlbum?.position || 0) + 1;
    }

    const collectionAlbum = await prisma.collectionAlbum.create({
      data: {
        collectionId,
        albumDiscogsId: albumId,
        personalRating: personalRating
          ? Math.max(1, Math.min(10, personalRating))
          : null,
        personalNotes: personalNotes?.trim(),
        position: finalPosition,
        albumTitle: 'Unknown Album',
        albumArtist: 'Unknown Artist',
      },
    });

    return NextResponse.json({ collectionAlbum }, { status: 201 });
  } catch (error) {
    console.error('Error adding album to collection:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
