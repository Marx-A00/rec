import { notFound } from 'next/navigation';
import { Suspense } from 'react';

import { auth } from '@/../auth';
import CollectionHeader from '@/components/collections/CollectionHeader';
import CollectionAlbums from '@/components/collections/CollectionAlbums';
import { ListSkeleton } from '@/components/ui/skeletons';
import BackButton from '@/components/ui/BackButton';

interface CollectionPageProps {
  params: Promise<{ id: string }>;
}

async function getCollection(id: string, userId?: string) {
  try {
    const response = await fetch(
      `${process.env.NEXTAUTH_URL}/api/collections/${id}`,
      {
        cache: 'no-store', // Always fetch fresh data
      }
    );

    if (!response.ok) {
      if (response.status === 404) {
        notFound();
      }
      throw new Error('Failed to fetch collection');
    }

    const data = await response.json();
    return data.collection;
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
