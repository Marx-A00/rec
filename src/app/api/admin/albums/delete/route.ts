import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { isAdmin } from '@/lib/permissions';
import prisma from '@/lib/prisma';

export async function DELETE(request: NextRequest) {
  try {
    // Check authentication
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check admin permission
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true },
    });

    if (!user || !isAdmin(user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Get albumId from request body
    const body = await request.json();
    const { albumId } = body;

    if (!albumId) {
      return NextResponse.json(
        { error: 'Album ID is required' },
        { status: 400 }
      );
    }

    // Use transaction to ensure all related data is deleted
    await prisma.$transaction(async tx => {
      // Delete CollectionAlbum entries (foreign key constraint)
      const deletedCollectionAlbums = await tx.collectionAlbum.deleteMany({
        where: { albumId },
      });

      // Delete AlbumArtist entries (foreign key constraint)
      const deletedAlbumArtists = await tx.albumArtist.deleteMany({
        where: { albumId },
      });

      // Delete Track entries (foreign key constraint)
      const deletedTracks = await tx.track.deleteMany({
        where: { albumId },
      });

      // Delete Recommendation entries that reference this album
      // We need to delete both basisAlbumId and recommendedAlbumId references
      const deletedRecommendations = await tx.recommendation.deleteMany({
        where: {
          OR: [{ basisAlbumId: albumId }, { recommendedAlbumId: albumId }],
        },
      });

      // Finally, delete the Album itself
      const deletedAlbum = await tx.album.delete({
        where: { id: albumId },
      });

      console.log('Album deletion completed:', {
        albumId,
        albumTitle: deletedAlbum.title,
        deletedCollectionAlbums: deletedCollectionAlbums.count,
        deletedAlbumArtists: deletedAlbumArtists.count,
        deletedTracks: deletedTracks.count,
        deletedRecommendations: deletedRecommendations.count,
      });
    });

    return NextResponse.json({
      success: true,
      message: 'Album deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting album:', error);
    return NextResponse.json(
      {
        error: 'Failed to delete album',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
