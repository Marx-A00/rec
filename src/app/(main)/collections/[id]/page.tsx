import { notFound } from 'next/navigation';
import { Suspense } from 'react';

import { auth } from '@/../auth';
import CollectionHeader from '@/components/collections/CollectionHeader';
import CollectionAlbums from '@/components/collections/CollectionAlbums';
import { ListSkeleton } from '@/components/ui/skeletons';
import BackButton from '@/components/ui/BackButton';
import prisma from '@/lib/prisma';

interface CollectionPageProps {
  params: Promise<{ id: string }>;
}

async function getCollection(id: string, userId?: string) {
  try {
    const collection = await prisma.collection.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, name: true, image: true } },
        albums: {
          orderBy: { position: 'asc' },
        },
      },
    });

    if (!collection) {
      notFound();
    }

    // Check access permissions - same logic as API
    if (!collection.isPublic && collection.userId !== userId) {
      notFound(); // Treat unauthorized access as not found for security
    }

    // Transform to match Collection interface
    const transformedCollection = {
      ...collection,
      createdAt: collection.createdAt.toISOString(),
      updatedAt: collection.updatedAt.toISOString(),
      albums: collection.albums.map(album => ({
        ...album,
        albumId: album.albumDiscogsId, // Map to expected field name
        addedBy: collection.userId, // Use collection owner as adder
        addedAt: album.addedAt.toISOString(),
      })),
      metadata: {
        totalAlbums: collection.albums.length,
        totalDuration: 0, // Not computed for now
        genres: [], // Not computed for now
        averageRating:
          collection.albums
            .filter(album => album.personalRating)
            .reduce(
              (acc, album, _, arr) => acc + album.personalRating! / arr.length,
              0
            ) || undefined,
      },
    };

    return transformedCollection;
  } catch (error) {
    console.error('Error fetching collection:', error);
    throw error;
  }
}

export default async function CollectionPage({ params }: CollectionPageProps) {
  const session = await auth();
  const { id } = await params;

  let collection;
  try {
    collection = await getCollection(id, session?.user?.id);
  } catch (error) {
    // This will be caught by the error boundary
    throw error;
  }

  // Check if user can edit this collection
  const canEdit = session?.user?.id === collection.userId;

  return (
    <div className='space-y-6'>
      {/* Back Button */}
      <BackButton />

      {/* Collection Header */}
      <CollectionHeader collection={collection} canEdit={canEdit} />

      {/* Collection Albums */}
      <Suspense fallback={<ListSkeleton count={8} />}>
        <CollectionAlbums collection={collection} canEdit={canEdit} />
      </Suspense>
    </div>
  );
}
