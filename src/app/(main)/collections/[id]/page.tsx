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
        user: { select: { id: true, username: true, image: true } },
        albums: {
          orderBy: { position: 'asc' },
          include: {
            album: {
              select: {
                id: true,
                title: true,
                coverArtUrl: true,
                releaseDate: true,
                artists: {
                  select: {
                    artist: { select: { id: true, name: true } },
                  },
                },
              },
            },
          },
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
      albums: collection.albums.map((collectionAlbum): UICollectionAlbum => {
        const album = collectionAlbum.album;
        const artistNames = album?.artists?.map(a => a.artist.name).join(', ');
        const albumYear = album?.releaseDate
          ? new Date(album.releaseDate).getFullYear().toString()
          : null;

        return {
          id: collectionAlbum.id,
          albumId: String(
            collectionAlbum.albumId ?? collectionAlbum.discogsId ?? ''
          ),
          albumTitle: album?.title ?? 'Unknown Album',
          albumArtist: artistNames ?? 'Unknown Artist',
          albumArtistId: album?.artists?.[0]?.artist.id,
          albumImageUrl: album?.coverArtUrl ?? null,
          albumYear,
          addedBy: collection.userId,
          addedAt: collectionAlbum.addedAt.toISOString(),
          personalRating: collectionAlbum.personalRating ?? null,
          personalNotes: collectionAlbum.personalNotes ?? null,
          position: collectionAlbum.position,
        };
      }),
      metadata: {
        totalAlbums: collection.albums.length,
        totalDuration: 0, // Not computed for now
        genres: [], // Not computed for now
        averageRating:
          collection.albums
            .filter(collectionAlbum => collectionAlbum.personalRating)
            .reduce(
              (acc, collectionAlbum, _, arr) =>
                acc + collectionAlbum.personalRating! / arr.length,
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
