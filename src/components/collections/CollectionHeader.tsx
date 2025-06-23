'use client';

import { useState } from 'react';
import { Settings, Globe, Lock, Users, Calendar, Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';

import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/toast';
import { Collection } from '@/types/collection';
import { sanitizeArtistName } from '@/lib/utils';

interface CollectionHeaderProps {
  collection: Collection;
  canEdit: boolean;
}

export default function CollectionHeader({
  collection,
  canEdit,
}: CollectionHeaderProps) {
  const router = useRouter();
  const { showToast } = useToast();
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    if (
      !confirm(
        'Are you sure you want to delete this collection? This action cannot be undone.'
      )
    ) {
      return;
    }

    setIsDeleting(true);

    try {
      const response = await fetch(`/api/collections/${collection.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete collection');
      }

      showToast('Collection deleted successfully', 'success');
      router.push('/collections');
    } catch (error) {
      console.error('Error deleting collection:', error);
      showToast('Failed to delete collection', 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className='bg-zinc-900 border border-zinc-700 rounded-lg p-6'>
      <div className='flex items-start justify-between'>
        {/* Collection Info */}
        <div className='flex-1'>
          <div className='flex items-center gap-3 mb-2'>
            <h1 className='text-3xl font-bold text-white'>{collection.name}</h1>
            <div className='flex items-center gap-2'>
              {collection.isPublic ? (
                <>
                  <Globe className='h-5 w-5 text-emeraled-green' />
                  <span className='text-sm text-emeraled-green'>
                    Public collection
                  </span>
                </>
              ) : (
                <>
                  <Lock className='h-5 w-5 text-zinc-400' />
                  <span className='text-sm text-zinc-400'>
                    Private collection
                  </span>
                </>
              )}
            </div>
          </div>

          {collection.description && (
            <p className='text-zinc-300 mb-4 max-w-2xl leading-relaxed'>
              {collection.description}
            </p>
          )}

          {/* Collection Metadata */}
          <div className='flex items-center gap-6 text-sm text-zinc-400'>
            <div className='flex items-center gap-1'>
              <Users className='h-4 w-4' />
              <span>{collection.metadata.totalAlbums} albums</span>
            </div>

            <div className='flex items-center gap-1'>
              <Calendar className='h-4 w-4' />
              <span>
                Created {new Date(collection.createdAt).toLocaleDateString()}
              </span>
            </div>

            {collection.metadata.averageRating && (
              <div className='flex items-center gap-1'>
                <span>
                  ★ {collection.metadata.averageRating.toFixed(1)} avg
                </span>
              </div>
            )}
          </div>

          {/* Tags */}
          {collection.tags && collection.tags.length > 0 && (
            <div className='flex items-center gap-2 mt-4'>
              {collection.tags.map(tag => (
                <span
                  key={tag}
                  className='px-2 py-1 bg-zinc-800 text-zinc-300 text-xs rounded-full'
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Actions */}
        {canEdit && (
          <div className='flex items-center gap-2 ml-6'>
            <Button
              variant='outline'
              size='sm'
              onClick={() => router.push(`/collections/${collection.id}/edit`)}
              className='flex items-center gap-2'
            >
              <Settings className='h-4 w-4' />
              Edit
            </Button>

            <Button
              variant='outline'
              size='sm'
              onClick={handleDelete}
              disabled={isDeleting}
              className='flex items-center gap-2 text-red-400 border-red-400 hover:bg-red-400 hover:text-white'
            >
              <Trash2 className='h-4 w-4' />
              {isDeleting ? 'Deleting...' : 'Delete'}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
