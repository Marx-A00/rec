import { notFound } from 'next/navigation';
import { Suspense } from 'react';

import { auth } from '@/../auth';
import CollectionHeader from '@/components/collections/CollectionHeader';
import CollectionAlbums from '@/components/collections/CollectionAlbums';
import { ListSkeleton } from '@/components/ui/skeletons';
import BackButton from '@/components/ui/BackButton';
import prisma from '@/lib/prisma';
import type {
  Collection as UICollection,
  CollectionAlbum as UICollectionAlbum,
} from '@/types/collection';

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
    const transformedCollection: UICollection = {
      ...collection,
      createdAt: collection.createdAt.toISOString(),
      updatedAt: collection.updatedAt.toISOString(),
      albums: collection.albums.map((album): UICollectionAlbum => {
        type LegacyAlbumProps = {
          albumId?: string | null;
          albumTitle?: string | null;
          albumArtist?: string | null;
          albumImageUrl?: string | null;
          albumYear?: string | number | null;
          discogsId?: string | null;
        };
        const legacy = album as unknown as LegacyAlbumProps;

        return {
          id: album.id,
          // Prefer canonical albumId if present, fallback to legacy discogsId
          albumId: String(legacy.albumId ?? album.discogsId ?? ''),
          albumTitle: legacy.albumTitle ?? 'Unknown Album',
          albumArtist: legacy.albumArtist ?? 'Unknown Artist',
          albumImageUrl: legacy.albumImageUrl ?? null,
          albumYear:
            legacy.albumYear !== undefined && legacy.albumYear !== null
              ? String(legacy.albumYear)
              : null,
          addedBy: collection.userId,
          addedAt: album.addedAt.toISOString(),
          personalRating: album.personalRating ?? null,
          personalNotes: album.personalNotes ?? null,
          position: album.position,
        };
      }),
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
