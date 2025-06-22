import { Suspense } from 'react';
import Link from 'next/link';
import { Plus } from 'lucide-react';

import { auth } from '@/../auth';
import { Button } from '@/components/ui/button';
import CollectionsList from '@/components/collections/CollectionsList';
import { CollectionsSkeleton } from '@/components/ui/skeletons';

export default async function CollectionsPage() {
  const session = await auth();

  if (!session?.user) {
    return (
      <div className='flex flex-col items-center justify-center min-h-[60vh] space-y-4'>
        <h1 className='text-2xl font-bold text-white'>Collections</h1>
        <p className='text-zinc-400 text-center max-w-md'>
          Sign in to create and manage your personal album collections.
        </p>
        <Link href='/signin'>
          <Button>Sign In</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className='space-y-6'>
      {/* Header */}
      <div className='flex items-center justify-between'>
        <div>
          <h1 className='text-3xl font-bold text-white'>Your Collections</h1>
          <p className='text-zinc-400 mt-2'>
            Organize your favorite albums into collections
          </p>
        </div>

        <Link href='/collections/new'>
          <Button className='flex items-center gap-2'>
            <Plus className='h-4 w-4' />
            New Collection
          </Button>
        </Link>
      </div>

      {/* Collections List */}
      <Suspense fallback={<CollectionsSkeleton />}>
        <CollectionsList userId={session.user.id} />
      </Suspense>
    </div>
  );
}
