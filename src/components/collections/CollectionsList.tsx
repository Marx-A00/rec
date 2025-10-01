'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { Folder, FolderOpen, Lock, Globe, Calendar } from 'lucide-react';

import AlbumImage from '@/components/ui/AlbumImage';
import { useGetUserCollectionListQuery } from '@/generated/graphql';

interface CollectionsListProps {
  userId: string;
}

export default function CollectionsList({ userId }: CollectionsListProps) {
  const { data, isLoading, error } = useGetUserCollectionListQuery(
    { userId },
    { enabled: !!userId }
  );
  const collections = useMemo(() => data?.user?.collections ?? [], [data]);

  if (isLoading) {
    return (
      <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'>
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className='animate-pulse'>
            <div className='bg-zinc-800 rounded-lg h-48'></div>
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className='text-center py-8'>
        <p className='text-red-400'>Failed to load collections</p>
      </div>
    );
  }

  if (collections.length === 0) {
    return (
      <div className='text-center py-12'>
        <Folder className='h-16 w-16 text-zinc-600 mx-auto mb-4' />
        <h3 className='text-xl font-semibold text-white mb-2'>
          No collections yet
        </h3>
        <p className='text-zinc-400 mb-6'>
          Create your first collection to organize your favorite albums
        </p>
        <Link href='/collections/new'>
          <button className='bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg transition-colors'>
            Create Collection
          </button>
        </Link>
      </div>
    );
  }

  return (
    <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'>
      {collections.map(collection => (
        <Link key={collection.id} href={`/collections/${collection.id}`}>
          <div className='bg-zinc-900 border border-zinc-700 rounded-lg p-6 hover:bg-zinc-800 hover:border-zinc-600 transition-all cursor-pointer group'>
            {/* Collection Header */}
            <div className='flex items-start justify-between mb-4'>
              <div className='flex-1'>
                <h3 className='text-lg font-semibold text-white group-hover:text-blue-400 transition-colors'>
                  {collection.name}
                </h3>
                {collection.description && (
                  <p className='text-sm text-zinc-400 mt-1 line-clamp-2'>
                    {collection.description}
                  </p>
                )}
              </div>

              <div className='flex items-center gap-1 text-xs'>
                {collection.isPublic ? (
                  <>
                    <Globe className='h-4 w-4 text-emeraled-green' />
                    <span className='text-emeraled-green'>Public</span>
                  </>
                ) : (
                  <>
                    <Lock className='h-4 w-4 text-zinc-500' />
                    <span className='text-zinc-500'>Private</span>
                  </>
                )}
              </div>
            </div>

            {/* Collection Cover (placeholder) */}
            <div className='aspect-square mb-4 bg-zinc-800 rounded-lg overflow-hidden'>
              <div className='w-full h-full flex items-center justify-center'>
                <FolderOpen className='h-12 w-12 text-zinc-600' />
              </div>
            </div>

            {/* Collection Stats */}
            <div className='flex items-center justify-between text-sm text-zinc-400'>
              <span>{collection.albumCount ?? 0} albums</span>
              <div className='flex items-center gap-1'>
                <Calendar className='h-3 w-3' />
                <span>
                  {collection.updatedAt
                    ? new Date(collection.updatedAt).toLocaleDateString()
                    : ''}
                </span>
              </div>
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
}
