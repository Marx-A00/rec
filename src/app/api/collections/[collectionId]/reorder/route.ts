// src/app/api/collections/[collectionId]/reorder/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import prisma from '@/lib/prisma';

interface ReorderAlbumRequest {
  albumIds: string[];
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ collectionId: string }> }
) {
  try {
    const session = await auth();
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { collectionId } = await params;
    const { albumIds }: ReorderAlbumRequest = await request.json();

    if (!albumIds || !Array.isArray(albumIds)) {
      return NextResponse.json({ error: 'Invalid album IDs array' }, { status: 400 });
    }

    // Verify the collection belongs to the user
    const collection = await prisma.collection.findUnique({
      where: { id: collectionId },
      select: { userId: true }
    });

    if (!collection) {
      return NextResponse.json({ error: 'Collection not found' }, { status: 404 });
    }

    if (collection.userId !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Update positions in a transaction
    await prisma.$transaction(
      albumIds.map((albumId, index) =>
        prisma.collectionAlbum.updateMany({
          where: {
            collectionId,
            albumId,
          },
          data: {
            position: index + 1, // 1-based positioning
          },
        })
      )
    );

    return NextResponse.json({ 
      success: true, 
      message: 'Album order updated successfully' 
    });

  } catch (error) {
    console.error('Error updating album order:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
