'use client';

import { useState } from 'react';
import { Bookmark, Loader2, Plus } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';

import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { useAlbumState } from '@/hooks/useAlbumState';
import { Album } from '@/types/album';
import { useToast } from '@/components/ui/toast';
import { graphqlClient } from '@/lib/graphql-client';
import { useSession } from 'next-auth/react';
import {
  useGetMyCollectionsQuery,
  useRemoveAlbumFromCollectionMutation,
} from '@/generated/graphql';

interface CollectionPopoverProps {
  album: Album;
  variant?: 'default' | 'outline' | 'ghost' | 'primary' | 'secondary';
  size?: 'sm' | 'lg';
}

// GraphQL mutation strings
const ADD_ALBUM_TO_COLLECTION = `
  mutation AddAlbumToCollection($collectionId: String!, $albumId: UUID!, $position: Int) {
    addAlbumToCollection(
      collectionId: $collectionId,
      input: {
        albumId: $albumId,
        position: $position
      }
    ) {
      id
    }
  }
`;

const ADD_ALBUM = `
  mutation AddAlbum($input: AlbumInput!) {
    addAlbum(input: $input) {
      id
      title
    }
  }
`;

export default function CollectionPopover({
  album,
  variant = 'default',
  size = 'lg',
}: CollectionPopoverProps) {
  const [open, setOpen] = useState(false);
  const [processingCollections, setProcessingCollections] = useState<Set<string>>(new Set());
  // Track optimistic state: Map<collectionId, isInCollection>
  const [optimisticState, setOptimisticState] = useState<Map<string, boolean>>(new Map());
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const { data: session } = useSession();

  // Get album state to know which collections it's in
  const albumState = useAlbumState(album);

  // Get user's collections
  const { data: collectionsData, isLoading: isLoadingCollections } = useGetMyCollectionsQuery(
    {},
    { enabled: !!session?.user }
  );

  // Remove from collection mutation
  const removeFromCollectionMutation = useRemoveAlbumFromCollectionMutation();

  const collections = collectionsData?.myCollections || [];

  // Helper function to ensure album exists in DB and return its ID
  const ensureAlbumInDb = async (): Promise<string> => {
    // If album is already in DB, use that ID
    if (albumState.existsInDb && albumState.dbId) {
      return albumState.dbId;
    }

    // Otherwise, add it to the DB first
    const artistInputs = (album.artists || []).map(a => ({ artistName: a.name }));

    const input: any = {
      title: album.title || 'Unknown Album',
      artists:
        artistInputs.length > 0
          ? artistInputs
          : [{ artistName: 'Unknown Artist' }],
    };

    // Attach MusicBrainz ID if available
    if (album.source === 'musicbrainz' && album.musicbrainzId) {
      input.musicbrainzId = album.musicbrainzId;
    }

    // Optional fields
    if (album.releaseDate) input.releaseDate = album.releaseDate;
    if (album.metadata?.numberOfTracks) input.totalTracks = album.metadata.numberOfTracks;
    if (album.image?.url) input.coverImageUrl = album.image.url;

    const created: any = await graphqlClient.request(ADD_ALBUM, { input });
    return created.addAlbum.id as string;
  };

  // Handle checkbox toggle
  const handleToggleCollection = async (collectionId: string, collectionName: string, isCurrentlyInCollection: boolean) => {
    if (!session?.user) {
      showToast('Please sign in to save albums', 'error');
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
          showToast(`Removed from ${collectionName}`, 'success');
        }
      } else {
        // Add to collection
        const albumId = await ensureAlbumInDb();
        await graphqlClient.request(ADD_ALBUM_TO_COLLECTION, {
          collectionId,
          albumId,
          position: 0,
        });
        showToast(`Added to ${collectionName}`, 'success');
      }

      // Invalidate queries to refresh UI
      queryClient.invalidateQueries({ queryKey: ['GetMyCollections'] });
      queryClient.invalidateQueries({ queryKey: ['AlbumByMusicBrainzId'] });
    } catch (error) {
      console.error('Error toggling collection:', error);
      showToast(
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
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant={variant}
          size={size}
          className="gap-2"
        >
          <Bookmark className="h-4 w-4" />
          Save
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-64 bg-zinc-900 border-zinc-800 text-white p-3"
        sideOffset={8}
      >
        <div className="space-y-3">
          <div className="font-semibold text-sm">Save to...</div>

          {isLoadingCollections ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="h-4 w-4 animate-spin text-zinc-400" />
            </div>
          ) : collections.length === 0 ? (
            <div className="text-sm text-zinc-400 py-2">
              No collections yet. Create one first!
            </div>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {collections.map((collection: any) => {
                const isInThisCollection = albumState.collectionNames.includes(collection.name);
                const isProcessing = processingCollections.has(collection.id);

                // Apply optimistic update if it exists, otherwise use actual state
                const optimisticValue = optimisticState.get(collection.id);
                const isChecked = optimisticValue !== undefined ? optimisticValue : isInThisCollection;

                return (
                  <label
                    key={collection.id}
                    className="flex items-center gap-2 cursor-pointer hover:bg-zinc-800 p-2 rounded-md transition-colors"
                  >
                    <Checkbox
                      checked={isChecked}
                      disabled={isProcessing}
                      onCheckedChange={() =>
                        handleToggleCollection(collection.id, collection.name, isInThisCollection)
                      }
                    />
                    <span className="text-sm flex-1">
                      {collection.name}
                      {collection.albumCount > 0 && (
                        <span className="text-zinc-500 ml-1">({collection.albumCount})</span>
                      )}
                    </span>
                    {isProcessing && <Loader2 className="h-3 w-3 animate-spin text-zinc-400" />}
                  </label>
                );
              })}
            </div>
          )}

          <div className="border-t border-zinc-800 pt-2">
            <Button
              variant="ghost"
              size="sm"
              disabled
              className="w-full justify-start gap-2 text-zinc-600 cursor-not-allowed"
              onClick={() => {
                // TODO: Open create collection dialog
                showToast('Create collection coming soon!', 'success');
              }}
            >
              <Plus className="h-4 w-4" />
              Create new collection
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
