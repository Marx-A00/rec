'use client';

import { useState, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useSession } from 'next-auth/react';
import { Check, Loader2, Plus, FolderOpen } from 'lucide-react';
import Link from 'next/link';

import { useAlbumState } from '@/hooks/useAlbumState';
import { useCollectionToastContext } from '@/components/ui/CollectionToastProvider';
import { cn } from '@/lib/utils';
import {
  useGetMyCollectionsQuery,
  useRemoveAlbumFromCollectionMutation,
  useAddAlbumToCollectionWithCreateMutation,
  type AlbumInput,
} from '@/generated/graphql';
import type { Album } from '@/types/album';

import {
  MobileBottomSheet,
  MobileBottomSheetContent,
  MobileBottomSheetHeader,
  MobileBottomSheetBody,
  MobileBottomSheetFooter,
} from './MobileBottomSheet';
import { MobileButton } from './MobileButton';

interface CollectionSelectionSheetProps {
  album: Album;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface CollectionItem {
  id: string;
  name: string;
  albumCount?: number;
}

export default function CollectionSelectionSheet({
  album,
  open,
  onOpenChange,
}: CollectionSelectionSheetProps) {
  const { data: session } = useSession();
  const queryClient = useQueryClient();
  const { showCollectionToast } = useCollectionToastContext();
  const albumState = useAlbumState(album);

  const [processingCollections, setProcessingCollections] = useState<
    Set<string>
  >(new Set());
  const [optimisticState, setOptimisticState] = useState<Map<string, boolean>>(
    new Map()
  );

  // Get user's collections
  const { data: collectionsData, isLoading: isLoadingCollections } =
    useGetMyCollectionsQuery({}, { enabled: !!session?.user && open });

  // Mutations
  const removeFromCollectionMutation = useRemoveAlbumFromCollectionMutation();
  const addToCollectionMutation = useAddAlbumToCollectionWithCreateMutation();

  const collections = collectionsData?.myCollections || [];

  // Helper to build AlbumInput from album object
  const buildAlbumInput = useCallback((albumData: Album): AlbumInput => {
    const artistInputs = (albumData.artists || []).map(a => ({
      artistName: a.name,
    }));

    const input: AlbumInput = {
      title: albumData.title || 'Unknown Album',
      artists:
        artistInputs.length > 0
          ? artistInputs
          : [{ artistName: 'Unknown Artist' }],
    };

    // Attach MusicBrainz ID if available
    if (albumData.source === 'musicbrainz' && albumData.musicbrainzId) {
      input.musicbrainzId = albumData.musicbrainzId;
    }

    // Optional fields
    if (albumData.releaseDate) input.releaseDate = albumData.releaseDate;
    if (albumData.metadata?.numberOfTracks) {
      input.totalTracks = albumData.metadata.numberOfTracks;
    }
    if (albumData.image?.url) input.coverImageUrl = albumData.image.url;

    return input;
  }, []);

  // Handle collection toggle
  const handleToggleCollection = useCallback(
    async (
      collectionId: string,
      collectionName: string,
      isCurrentlyInCollection: boolean
    ) => {
      if (!session?.user) {
        showCollectionToast('Please sign in to save albums', 'error');
        return;
      }

      // Optimistically update UI immediately
      setOptimisticState(prev => {
        const next = new Map(prev);
        next.set(collectionId, !isCurrentlyInCollection);
        return next;
      });

      setProcessingCollections(prev => new Set(prev).add(collectionId));

      try {
        if (isCurrentlyInCollection) {
          // Remove from collection
          if (albumState.dbId) {
            await removeFromCollectionMutation.mutateAsync({
              collectionId,
              albumId: albumState.dbId,
            });
            showCollectionToast(`Removed from ${collectionName}`, 'success');
          }
        } else {
          // Add to collection using combined mutation
          await addToCollectionMutation.mutateAsync({
            input: {
              collectionId,
              position: 0,
              ...(albumState.existsInDb && albumState.dbId
                ? { albumId: albumState.dbId }
                : { albumData: buildAlbumInput(album) }),
            },
          });
          showCollectionToast(`Added to ${collectionName}`, 'success');
        }

        // Invalidate queries to refresh UI
        queryClient.invalidateQueries({ queryKey: ['GetMyCollections'] });
        queryClient.invalidateQueries({ queryKey: ['AlbumByMusicBrainzId'] });
        queryClient.invalidateQueries({ queryKey: ['GetAlbumDetailsAdmin'] });
      } catch (error) {
        console.error('Error toggling collection:', error);
        showCollectionToast(
          `Failed to ${isCurrentlyInCollection ? 'remove from' : 'add to'} ${collectionName}`,
          'error'
        );
        // Revert optimistic update on error
        setOptimisticState(prev => {
          const next = new Map(prev);
          next.delete(collectionId);
          return next;
        });
      } finally {
        setProcessingCollections(prev => {
          const next = new Set(prev);
          next.delete(collectionId);
          return next;
        });
      }
    },
    [
      session?.user,
      album,
      albumState.existsInDb,
      albumState.dbId,
      buildAlbumInput,
      addToCollectionMutation,
      queryClient,
      removeFromCollectionMutation,
      showCollectionToast,
    ]
  );

  // Close the sheet
  const handleClose = useCallback(() => {
    onOpenChange(false);
    // Clear optimistic state when closing
    setOptimisticState(new Map());
  }, [onOpenChange]);

  return (
    <MobileBottomSheet open={open} onOpenChange={handleClose}>
      <MobileBottomSheetContent maxHeight='max-h-[70vh]'>
        <MobileBottomSheetHeader title='Save to...' description={album.title} />

        <MobileBottomSheetBody>
          {isLoadingCollections ? (
            <div className='flex flex-col items-center justify-center py-8'>
              <Loader2 className='h-8 w-8 animate-spin text-zinc-400 mb-3' />
              <p className='text-sm text-zinc-500'>Loading collections...</p>
            </div>
          ) : collections.length === 0 ? (
            <div className='flex flex-col items-center justify-center py-8 text-center'>
              <FolderOpen className='h-12 w-12 text-zinc-600 mb-3' />
              <p className='text-white font-medium mb-1'>No collections yet</p>
              <p className='text-sm text-zinc-500 mb-4'>
                Create your first collection to organize your albums
              </p>
              <Link href='/m/profile'>
                <MobileButton variant='secondary' size='sm'>
                  Go to Profile
                </MobileButton>
              </Link>
            </div>
          ) : (
            <div className='space-y-1 pb-4'>
              {collections.map((collection: CollectionItem) => {
                const isInThisCollection = albumState.collectionNames.includes(
                  collection.name
                );
                const isProcessing = processingCollections.has(collection.id);

                // Apply optimistic update if it exists, otherwise use actual state
                const optimisticValue = optimisticState.get(collection.id);
                const isChecked =
                  optimisticValue !== undefined
                    ? optimisticValue
                    : isInThisCollection;

                return (
                  <button
                    key={collection.id}
                    onClick={() =>
                      handleToggleCollection(
                        collection.id,
                        collection.name,
                        isInThisCollection
                      )
                    }
                    disabled={isProcessing}
                    className={cn(
                      'w-full flex items-center gap-3 p-4 rounded-lg transition-colors min-h-[52px]',
                      'active:scale-[0.98]',
                      isChecked
                        ? 'bg-emeraled-green/10 border border-emeraled-green/30'
                        : 'bg-zinc-800 border border-zinc-700',
                      isProcessing && 'opacity-60'
                    )}
                  >
                    {/* Checkbox indicator */}
                    <div
                      className={cn(
                        'w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0',
                        isChecked
                          ? 'bg-emeraled-green'
                          : 'bg-zinc-700 border border-zinc-600'
                      )}
                    >
                      {isProcessing ? (
                        <Loader2 className='h-4 w-4 animate-spin text-white' />
                      ) : isChecked ? (
                        <Check className='h-4 w-4 text-black' />
                      ) : null}
                    </div>

                    {/* Collection info */}
                    <div className='flex-1 text-left'>
                      <p className='text-white font-medium'>
                        {collection.name}
                      </p>
                      {collection.albumCount !== undefined && (
                        <p className='text-sm text-zinc-500'>
                          {collection.albumCount} album
                          {collection.albumCount !== 1 ? 's' : ''}
                        </p>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </MobileBottomSheetBody>

        <MobileBottomSheetFooter>
          <MobileButton
            variant='ghost'
            className='w-full justify-center gap-2 text-zinc-400'
            disabled
          >
            <Plus className='h-4 w-4' />
            Create new collection (coming soon)
          </MobileButton>
        </MobileBottomSheetFooter>
      </MobileBottomSheetContent>
    </MobileBottomSheet>
  );
}
