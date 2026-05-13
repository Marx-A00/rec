import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  useResetAlbumEnrichmentMutation,
  useResetArtistEnrichmentMutation,
  useUpdateAlbumDataQualityMutation,
  useUpdateArtistDataQualityMutation,
  useTriggerAlbumEnrichmentMutation,
  useTriggerArtistEnrichmentMutation,
  useBatchEnrichmentMutation,
  useDeleteAlbumMutation,
  useDeleteArtistMutation,
  usePreviewAlbumEnrichmentMutation,
  usePreviewArtistEnrichmentMutation,
  type PreviewEnrichmentResult,
  EnrichmentType,
  EnrichmentPriority,
  DataQuality,
} from '@/generated/graphql';

type SearchType = 'albums' | 'artists' | 'tracks';

interface UseMusicDatabaseActionsOptions {
  activeTab: SearchType;
  refetchAlbums: () => void;
  refetchArtists: () => void;
  setExpandedRows: React.Dispatch<React.SetStateAction<Set<string>>>;
  selectedItems: Set<string>;
  setSelectedItems: React.Dispatch<React.SetStateAction<Set<string>>>;
}

export function useMusicDatabaseActions({
  activeTab,
  refetchAlbums,
  refetchArtists,
  setExpandedRows,
  selectedItems,
  setSelectedItems,
}: UseMusicDatabaseActionsOptions) {
  const queryClient = useQueryClient();

  // Internal state
  const [enrichingItems, setEnrichingItems] = useState<Set<string>>(new Set());
  const [previewingItems, setPreviewingItems] = useState<Set<string>>(
    new Set()
  );
  const [previewResults, setPreviewResults] = useState<
    Map<string, PreviewEnrichmentResult>
  >(new Map());

  // Delete modal state
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [albumToDelete, setAlbumToDelete] = useState<{
    id: string;
    title: string;
  } | null>(null);
  const [deleteArtistModalOpen, setDeleteArtistModalOpen] = useState(false);
  const [artistToDelete, setArtistToDelete] = useState<{
    id: string;
    name: string;
  } | null>(null);

  // Mutations
  const triggerAlbumEnrichmentMutation = useTriggerAlbumEnrichmentMutation();
  const triggerArtistEnrichmentMutation = useTriggerArtistEnrichmentMutation();
  const resetAlbumMutation = useResetAlbumEnrichmentMutation();
  const resetArtistMutation = useResetArtistEnrichmentMutation();
  const updateAlbumQualityMutation = useUpdateAlbumDataQualityMutation();
  const updateArtistQualityMutation = useUpdateArtistDataQualityMutation();
  const batchEnrichmentMutation = useBatchEnrichmentMutation();
  const deleteAlbumMutation = useDeleteAlbumMutation();
  const deleteArtistMutation = useDeleteArtistMutation();
  const previewAlbumEnrichmentMutation = usePreviewAlbumEnrichmentMutation();
  const previewArtistEnrichmentMutation = usePreviewArtistEnrichmentMutation();

  const handleDeleteAlbum = async () => {
    if (!albumToDelete) return;
    try {
      const result = await deleteAlbumMutation.mutateAsync({
        id: albumToDelete.id,
      });
      if (result.deleteAlbum?.success) {
        toast.success(`Successfully deleted "${albumToDelete.title}"`);
        setExpandedRows(prev => {
          const next = new Set(prev);
          next.delete(albumToDelete.id);
          return next;
        });
        setDeleteModalOpen(false);
        setAlbumToDelete(null);
        refetchAlbums();
      } else {
        throw new Error(
          result.deleteAlbum?.message || 'Failed to delete album'
        );
      }
    } catch (error) {
      console.error('Delete error:', error);
      toast.error(
        error instanceof Error ? error.message : 'Failed to delete album'
      );
    }
  };

  const handleDeleteArtist = async () => {
    if (!artistToDelete) return;
    try {
      const result = await deleteArtistMutation.mutateAsync({
        id: artistToDelete.id,
      });
      if (result.deleteArtist?.success) {
        toast.success(`Successfully deleted "${artistToDelete.name}"`);
        setExpandedRows(prev => {
          const next = new Set(prev);
          next.delete(artistToDelete.id);
          return next;
        });
        setDeleteArtistModalOpen(false);
        setArtistToDelete(null);
        refetchArtists();
      } else {
        throw new Error(
          result.deleteArtist?.message || 'Failed to delete artist'
        );
      }
    } catch (error) {
      console.error('Delete artist error:', error);
      toast.error(
        error instanceof Error ? error.message : 'Failed to delete artist'
      );
    }
  };

  const handleEnrichItem = async (
    itemId: string,
    type: 'album' | 'artist',
    priority: EnrichmentPriority = EnrichmentPriority.Medium,
    force: boolean = false
  ) => {
    setEnrichingItems(prev => new Set(prev).add(itemId));
    try {
      if (type === 'album') {
        const result = await triggerAlbumEnrichmentMutation.mutateAsync({
          id: itemId,
          priority,
          force,
        });
        if (result.triggerAlbumEnrichment.success) {
          toast.success(
            force
              ? 'Force re-enrichment job queued for album'
              : 'Enrichment job queued for album'
          );
          await Promise.all([
            queryClient.invalidateQueries({ queryKey: ['SearchAlbumsAdmin'] }),
            queryClient.invalidateQueries({
              queryKey: ['GetAlbumDetailsAdmin'],
            }),
            queryClient.invalidateQueries({ queryKey: ['GetLlamaLogs'] }),
          ]);
        } else {
          throw new Error(
            result.triggerAlbumEnrichment.message ||
              'Failed to queue enrichment'
          );
        }
      } else {
        const result = await triggerArtistEnrichmentMutation.mutateAsync({
          id: itemId,
          priority,
          force,
        });
        if (result.triggerArtistEnrichment.success) {
          toast.success(
            force
              ? 'Force re-enrichment job queued for artist'
              : 'Enrichment job queued for artist'
          );
          await Promise.all([
            queryClient.invalidateQueries({
              queryKey: ['SearchArtistsAdmin'],
            }),
            queryClient.invalidateQueries({ queryKey: ['GetArtistDetails'] }),
            queryClient.invalidateQueries({ queryKey: ['GetLlamaLogs'] }),
          ]);
        } else {
          throw new Error(
            result.triggerArtistEnrichment.message ||
              'Failed to queue enrichment'
          );
        }
      }
    } catch (error) {
      toast.error(`Failed to queue enrichment: ${error}`);
    } finally {
      setEnrichingItems(prev => {
        const next = new Set(prev);
        next.delete(itemId);
        return next;
      });
    }
  };

  const handlePreviewEnrichment = async (
    itemId: string,
    type: 'album' | 'artist'
  ) => {
    setPreviewingItems(prev => new Set(prev).add(itemId));
    try {
      if (type === 'album') {
        const result = await previewAlbumEnrichmentMutation.mutateAsync({
          id: itemId,
        });
        setPreviewResults(prev => {
          const next = new Map(prev);
          next.set(itemId, result.previewAlbumEnrichment);
          return next;
        });
        toast.success('Preview enrichment completed');
        await queryClient.invalidateQueries({ queryKey: ['GetLlamaLogs'] });
      } else {
        const result = await previewArtistEnrichmentMutation.mutateAsync({
          id: itemId,
        });
        setPreviewResults(prev => {
          const next = new Map(prev);
          next.set(itemId, result.previewArtistEnrichment);
          return next;
        });
        toast.success('Preview enrichment completed');
        await queryClient.invalidateQueries({ queryKey: ['GetLlamaLogs'] });
      }
    } catch (error) {
      toast.error(`Preview enrichment failed: ${error}`);
    } finally {
      setPreviewingItems(prev => {
        const next = new Set(prev);
        next.delete(itemId);
        return next;
      });
    }
  };

  const clearPreviewResult = (itemId: string) => {
    setPreviewResults(prev => {
      const next = new Map(prev);
      next.delete(itemId);
      return next;
    });
  };

  const handleResetEnrichment = async (
    itemId: string,
    type: 'album' | 'artist'
  ) => {
    try {
      if (type === 'album') {
        await resetAlbumMutation.mutateAsync({ id: itemId });
        toast.success('Album enrichment status reset');
        refetchAlbums();
      } else {
        await resetArtistMutation.mutateAsync({ id: itemId });
        toast.success('Artist enrichment status reset');
        refetchArtists();
      }
    } catch (error) {
      toast.error(`Failed to reset enrichment: ${error}`);
    }
  };

  const handleUpdateDataQuality = async (
    itemId: string,
    type: 'album' | 'artist',
    dataQuality: DataQuality
  ) => {
    if (!itemId) {
      toast.error('No item ID provided');
      return;
    }
    try {
      if (type === 'album') {
        await updateAlbumQualityMutation.mutateAsync({
          id: itemId,
          dataQuality,
        });
        toast.success(`Album data quality updated to ${dataQuality}`);
        refetchAlbums();
      } else {
        await updateArtistQualityMutation.mutateAsync({
          id: itemId,
          dataQuality,
        });
        toast.success(`Artist data quality updated to ${dataQuality}`);
        refetchArtists();
      }
    } catch (error) {
      toast.error(
        `Failed to update data quality: ${(error as Error).message || String(error)}`
      );
    }
  };

  const handleBatchEnrichment = async () => {
    if (selectedItems.size === 0) {
      toast.error('No items selected');
      return;
    }
    const itemsArray = Array.from(selectedItems);
    const enrichmentType =
      activeTab === 'albums'
        ? EnrichmentType.Album
        : activeTab === 'artists'
          ? EnrichmentType.Artist
          : null;

    if (!enrichmentType) {
      toast.error('Batch enrichment not available for tracks');
      return;
    }

    try {
      const result = await batchEnrichmentMutation.mutateAsync({
        ids: itemsArray,
        type: enrichmentType,
        priority: EnrichmentPriority.Medium,
      });
      if (result.batchEnrichment?.success) {
        toast.success(
          `${result.batchEnrichment.jobsQueued} enrichment jobs queued`
        );
        setSelectedItems(new Set());
        if (activeTab === 'albums') {
          await queryClient.invalidateQueries({
            queryKey: ['SearchAlbumsAdmin'],
          });
        } else if (activeTab === 'artists') {
          await queryClient.invalidateQueries({
            queryKey: ['SearchArtistsAdmin'],
          });
        }
      } else {
        throw new Error(
          result.batchEnrichment?.message || 'Failed to queue batch enrichment'
        );
      }
    } catch (error) {
      toast.error(`Failed to queue batch enrichment: ${error}`);
    }
  };

  const openDeleteAlbumModal = (id: string, title: string) => {
    setAlbumToDelete({ id, title });
    setDeleteModalOpen(true);
  };

  const openDeleteArtistModal = (id: string, name: string) => {
    setArtistToDelete({ id, name });
    setDeleteArtistModalOpen(true);
  };

  return {
    // State
    enrichingItems,
    previewingItems,
    previewResults,
    deleteModalOpen,
    setDeleteModalOpen,
    albumToDelete,
    deleteArtistModalOpen,
    setDeleteArtistModalOpen,
    artistToDelete,
    deleteAlbumPending: deleteAlbumMutation.isPending,
    deleteArtistPending: deleteArtistMutation.isPending,

    // Handlers
    handleDeleteAlbum,
    handleDeleteArtist,
    handleEnrichItem,
    handlePreviewEnrichment,
    clearPreviewResult,
    handleResetEnrichment,
    handleUpdateDataQuality,
    handleBatchEnrichment,
    openDeleteAlbumModal,
    openDeleteArtistModal,
  };
}
