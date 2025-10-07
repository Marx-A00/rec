'use client';

import { useState } from 'react';
import { Plus } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/toast';
import { Collection, CollectionAlbum as CollectionAlbumType } from '@/types/collection';
import {
  useRemoveAlbumFromCollectionMutation,
  useReorderCollectionAlbumsMutation
} from '@/generated/graphql';
import SortableAlbumGrid from './SortableAlbumGrid';

interface CollectionAlbumsProps {
  collection: Collection;
  canEdit: boolean;
}

export default function CollectionAlbums({
  collection,
  canEdit,
}: CollectionAlbumsProps) {
  const { showToast } = useToast();
  const [albums, setAlbums] = useState(collection.albums || []);
  const [removingAlbumId, setRemovingAlbumId] = useState<string | null>(null);

  const removeMutation = useRemoveAlbumFromCollectionMutation({
    onSuccess: () => {
      showToast('Album removed from collection', 'success');
    },
    onError: () => {
      showToast('Failed to remove album', 'error');
    },
  });

  const reorderMutation = useReorderCollectionAlbumsMutation({
    onSuccess: () => {
      showToast('Album order saved', 'success');
    },
    onError: () => {
      showToast('Failed to save album order', 'error');
    },
  });

  const handleRemoveAlbum = async (albumId: string) => {
    setRemovingAlbumId(albumId);

    try {
      await removeMutation.mutateAsync({
        collectionId: collection.id,
        albumId,
      });
      setAlbums(prev => prev.filter(album => album.albumId !== albumId));
    } catch (error) {
      console.error('Error removing album:', error);
    } finally {
      setRemovingAlbumId(null);
    }
  };

  const handleReorder = async (reorderedAlbums: CollectionAlbumType[]) => {
    // Update local state immediately for smooth UX
    setAlbums(reorderedAlbums);

    // Save to backend
    try {
      await reorderMutation.mutateAsync({
        collectionId: collection.id,
        albumIds: reorderedAlbums.map(a => a.albumId),
      });
    } catch (error) {
      console.error('Error reordering albums:', error);
      // Revert on error
      setAlbums(collection.albums || []);
    }
  };

  if (albums.length === 0) {
    return (
      <div className='text-center py-12'>
        <div className='max-w-md mx-auto'>
          <Plus className='h-16 w-16 text-zinc-600 mx-auto mb-4' />
          <h3 className='text-xl font-semibold text-white mb-2'>
            No albums yet
          </h3>
          <p className='text-zinc-400 mb-6'>
            {canEdit
              ? 'Start building your collection by adding albums'
              : 'This collection is empty'}
          </p>
          {canEdit && (
            <Button
              onClick={() => {
                // TODO: Open album search modal or navigate to add albums page
                showToast('Album search feature coming soon!', 'success');
              }}
              className='flex items-center gap-2'
            >
              <Plus className='h-4 w-4' />
              Add Albums
            </Button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className='space-y-4'>
      {/* Header */}
      <div className='flex items-center justify-between'>
        <h2 className='text-xl font-semibold text-white'>
          Albums ({albums.length})
        </h2>

        {canEdit && (
          <Button
            size='sm'
            onClick={() => {
              // TODO: Open album search modal
              showToast('Album search feature coming soon!', 'success');
            }}
            className='flex items-center gap-2'
          >
            <Plus className='h-4 w-4' />
            Add Albums
          </Button>
        )}
      </div>

      {/* Albums Grid - Sortable when canEdit is true */}
      <SortableAlbumGrid
        albums={albums}
        onReorder={canEdit ? handleReorder : undefined}
        isEditable={canEdit}
      />
    </div>
  );
}
