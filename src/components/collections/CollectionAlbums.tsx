'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Plus, Star, Trash2, Calendar } from 'lucide-react';

import AlbumImage from '@/components/ui/AlbumImage';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/toast';
import { Collection } from '@/types/collection';
import { sanitizeArtistName } from '@/lib/utils';
import { useRemoveAlbumFromCollectionMutation } from '@/generated/graphql';

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

      {/* Albums Grid */}
      <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4'>
        {albums.map(album => (
          <div
            key={album.id}
            className='bg-zinc-900 border border-zinc-700 rounded-lg p-4 hover:bg-zinc-800 hover:border-zinc-600 transition-all group'
          >
            {/* Album Cover */}
            <Link href={`/albums/${album.albumId}`} className='block mb-3'>
              <div className='aspect-square bg-zinc-800 rounded-lg overflow-hidden'>
                <AlbumImage
                  src={album.albumImageUrl}
                  alt={`${album.albumTitle} by ${sanitizeArtistName(album.albumArtist)}`}
                  fill
                  className='object-cover group-hover:scale-105 transition-transform duration-200'
                  showSkeleton={false}
                />
              </div>
            </Link>

            {/* Album Info */}
            <div className='space-y-2'>
              <Link href={`/albums/${album.albumId}`}>
                <h3 className='font-semibold text-white text-sm leading-tight hover:text-blue-400 transition-colors line-clamp-2'>
                  {album.albumTitle}
                </h3>
              </Link>

              <p className='text-zinc-400 text-xs'>
                {sanitizeArtistName(album.albumArtist)}
              </p>

              {album.albumYear && (
                <p className='text-zinc-500 text-xs'>{album.albumYear}</p>
              )}

              {/* Personal Rating */}
              {album.personalRating && (
                <div className='flex items-center gap-1'>
                  <Star className='h-3 w-3 text-yellow-500 fill-current' />
                  <span className='text-yellow-500 text-xs'>
                    {album.personalRating}/10
                  </span>
                </div>
              )}

              {/* Personal Notes */}
              {album.personalNotes && (
                <p className='text-zinc-400 text-xs italic line-clamp-2'>
                  &quot;{album.personalNotes}&quot;
                </p>
              )}

              {/* Added Date */}
              <div className='flex items-center gap-1 text-zinc-500 text-xs'>
                <Calendar className='h-3 w-3' />
                <span>
                  Added {new Date(album.addedAt).toLocaleDateString()}
                </span>
              </div>

              {/* Remove Button */}
              {canEdit && (
                <Button
                  variant='outline'
                  size='sm'
                  onClick={() => handleRemoveAlbum(album.albumId)}
                  disabled={removingAlbumId === album.albumId}
                  className='w-full mt-2 text-red-400 border-red-400 hover:bg-red-400 hover:text-white'
                >
                  <Trash2 className='h-3 w-3 mr-1' />
                  {removingAlbumId === album.albumId ? 'Removing...' : 'Remove'}
                </Button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
