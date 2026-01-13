'use client';

import {
  Loader2,
  RefreshCcw,
  Database,
  ExternalLink,
  Trash2,
} from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { formatDistanceToNow } from 'date-fns';

import { Button } from '@/components/ui/button';
import Toast, { useToast } from '@/components/ui/toast';
import { useAdminOverlay } from '@/hooks/useAdminOverlay';
import { useAlbumState } from '@/hooks/useAlbumState';
import {
  useTriggerAlbumEnrichmentMutation,
  useAddAlbumMutation,
  useDeleteAlbumMutation,
  EnrichmentPriority,
  EnrichmentStatus,
  DataQuality,
} from '@/generated/graphql';
import { Album } from '@/types/album';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface AlbumAdminActionsProps {
  album: Album;
}

export default function AlbumAdminActions({ album }: AlbumAdminActionsProps) {
  const { toast, showToast, hideToast } = useToast();
  const queryClient = useQueryClient();
  const router = useRouter();
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const { adminOverlayEnabled } = useAdminOverlay();

  // Get unified album state
  const albumState = useAlbumState(album);

  // Admin mutation hooks (must be called before early return)
  const enrichMutation = useTriggerAlbumEnrichmentMutation();
  const addAlbumMutation = useAddAlbumMutation();
  const deleteMutation = useDeleteAlbumMutation();

  // Only render for admin users with overlay enabled
  if (!adminOverlayEnabled) {
    return null;
  }

  // Admin action handlers
  const handleEnrichAlbum = async () => {
    const dbId = albumState.dbId || album.id;
    if (!dbId) return;

    try {
      const result = await enrichMutation.mutateAsync({
        id: dbId,
        priority: EnrichmentPriority.High,
      });

      if (result.triggerAlbumEnrichment.success) {
        showToast('Enrichment job queued successfully', 'success');
        // Invalidate album queries to refresh data
        queryClient.invalidateQueries({
          queryKey: [
            'AlbumByMusicBrainzId',
            { musicbrainzId: album.musicbrainzId },
          ],
        });
        // Invalidate enrichment logs to refresh admin panel
        queryClient.invalidateQueries({
          queryKey: ['GetEnrichmentLogs'],
        });
      } else {
        throw new Error(
          result.triggerAlbumEnrichment.message || 'Failed to queue enrichment'
        );
      }
    } catch (error) {
      showToast(`Failed to queue enrichment: ${error}`, 'error');
    }
  };

  const handleAddToDatabase = async () => {
    if (albumState.existsInDb) {
      showToast('Album is already in the database', 'error');
      return;
    }

    try {
      const artistInputs = (album.artists || []).map(a => ({
        artistName: a.name,
      }));

      const input: any = {
        title: album.title || 'Unknown Album',
        artists:
          artistInputs.length > 0
            ? artistInputs
            : [{ artistName: 'Unknown Artist' }],
      };

      if (album.source === 'musicbrainz' && album.musicbrainzId) {
        input.musicbrainzId = album.musicbrainzId;
      }
      if (album.releaseDate) input.releaseDate = album.releaseDate;
      if (album.metadata?.numberOfTracks)
        input.totalTracks = album.metadata.numberOfTracks;
      if (album.image?.url) input.coverImageUrl = album.image.url;

      await addAlbumMutation.mutateAsync({ input });

      // Invalidate queries to refresh album state
      queryClient.invalidateQueries({
        queryKey: [
          'AlbumByMusicBrainzId',
          { musicbrainzId: album.musicbrainzId },
        ],
      });

      showToast('Album added to database successfully', 'success');
    } catch (error) {
      showToast(`Failed to add album: ${error}`, 'error');
    }
  };

  const handleDeleteAlbum = async () => {
    const dbId = albumState.dbId || album.id;
    if (!dbId) return;

    try {
      await deleteMutation.mutateAsync({ id: dbId });
      showToast('Album deleted successfully', 'success');
      setDeleteModalOpen(false);

      // Redirect to home after deletion
      router.push('/home-mosaic');
    } catch (error) {
      showToast(`Failed to delete album: ${error}`, 'error');
    }
  };

  const handleViewInAdmin = () => {
    const dbId = albumState.dbId || album.id;
    if (!dbId) return;
    window.open(`/admin/music-database?id=${dbId}&type=albums`, '_blank');
  };

  return (
    <>
      <div className='mt-6 rounded-lg border border-amber-900/30 bg-amber-950/10 p-4'>
        <div className='mb-3 flex items-start justify-between'>
          <div className='flex items-center gap-2'>
            <h3 className='text-sm font-medium text-amber-200'>
              Admin Actions
            </h3>
            <span className='rounded bg-amber-900/40 px-1.5 py-0.5 text-[10px] font-medium text-amber-300 ring-1 ring-amber-800/50'>
              OVERLAY
            </span>
            {/* Data Source Badge */}
            {album.source && (
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${
                  album.source === 'local'
                    ? 'bg-emerald-500/20 text-emerald-400 ring-1 ring-emerald-800/50'
                    : album.source === 'musicbrainz'
                      ? 'bg-blue-500/20 text-blue-400 ring-1 ring-blue-800/50'
                      : 'bg-purple-500/20 text-purple-400 ring-1 ring-purple-800/50'
                }`}
              >
                {album.source === 'local'
                  ? 'DATABASE'
                  : album.source === 'musicbrainz'
                    ? 'MUSICBRAINZ'
                    : 'DISCOGS'}
              </span>
            )}
          </div>
          {albumState.isLoading && (
            <Loader2 className='h-3.5 w-3.5 animate-spin text-amber-400' />
          )}
        </div>

        {/* Enrichment Status Display */}
        {albumState.existsInDb && (
          <div className='mb-3 space-y-1 rounded-md border border-zinc-800/50 bg-zinc-900/30 p-2 text-xs'>
            <div className='flex items-center justify-between'>
              <span className='text-zinc-400'>Status:</span>
              <span
                className={`font-medium ${
                  albumState.enrichmentStatus === EnrichmentStatus.Completed
                    ? 'text-emerald-400'
                    : albumState.enrichmentStatus ===
                        EnrichmentStatus.InProgress
                      ? 'text-amber-400'
                      : albumState.enrichmentStatus === EnrichmentStatus.Failed
                        ? 'text-red-400'
                        : 'text-zinc-400'
                }`}
              >
                {albumState.enrichmentStatus || EnrichmentStatus.Pending}
              </span>
            </div>
            {albumState.dataQuality && (
              <div className='flex items-center justify-between'>
                <span className='text-zinc-400'>Quality:</span>
                <span
                  className={`font-medium ${
                    albumState.dataQuality === DataQuality.High
                      ? 'text-emerald-400'
                      : albumState.dataQuality === DataQuality.Medium
                        ? 'text-amber-400'
                        : 'text-zinc-400'
                  }`}
                >
                  {albumState.dataQuality}
                </span>
              </div>
            )}
            {albumState.lastEnriched && (
              <div className='flex items-center justify-between'>
                <span className='text-zinc-400'>Last Enriched:</span>
                <span className='text-zinc-300'>
                  {albumState.lastEnriched.toLocaleDateString()}
                  <span className='text-zinc-500 text-xs ml-1.5'>
                    (
                    {formatDistanceToNow(albumState.lastEnriched, {
                      addSuffix: true,
                    })}
                    )
                  </span>
                </span>
              </div>
            )}
          </div>
        )}

        <div className='grid grid-cols-2 gap-2'>
          {/* Add to Database - Only show if NOT in DB */}
          {!albumState.existsInDb && (
            <Button
              variant='outline'
              size='sm'
              onClick={handleAddToDatabase}
              disabled={addAlbumMutation.isPending || albumState.isLoading}
              className='gap-1.5 border-emerald-800/50 bg-emerald-950/20 text-emerald-200 hover:bg-emerald-900/30 hover:text-emerald-100'
            >
              {addAlbumMutation.isPending ? (
                <Loader2 className='h-3.5 w-3.5 animate-spin' />
              ) : (
                <Database className='h-3.5 w-3.5' />
              )}
              {addAlbumMutation.isPending ? 'Adding...' : 'Add to DB'}
            </Button>
          )}

          {/* Already in Database - Show disabled if in DB */}
          {albumState.existsInDb && (
            <Button
              variant='outline'
              size='sm'
              disabled
              className='gap-1.5 border-zinc-700/50 bg-zinc-900/20 text-zinc-500 cursor-not-allowed'
            >
              <Database className='h-3.5 w-3.5' />
              Already in DB
            </Button>
          )}

          {/* Enrich Album - Disabled if not in DB */}
          <Button
            variant='outline'
            size='sm'
            onClick={handleEnrichAlbum}
            disabled={
              !albumState.existsInDb ||
              enrichMutation.isPending ||
              albumState.isLoading
            }
            className={
              albumState.existsInDb
                ? 'gap-1.5 border-amber-800/50 bg-amber-950/20 text-amber-200 hover:bg-amber-900/30 hover:text-amber-100'
                : 'gap-1.5 border-zinc-700/50 bg-zinc-900/20 text-zinc-500 cursor-not-allowed'
            }
            title={
              !albumState.existsInDb
                ? 'Add to DB first'
                : 'Trigger enrichment job'
            }
          >
            {enrichMutation.isPending ? (
              <Loader2 className='h-3.5 w-3.5 animate-spin' />
            ) : (
              <RefreshCcw className='h-3.5 w-3.5' />
            )}
            {!albumState.existsInDb ? 'Add to DB first' : 'Enrich'}
          </Button>

          {/* Admin Panel Link - Only if in DB */}
          {albumState.existsInDb && albumState.dbId && (
            <Button
              variant='outline'
              size='sm'
              onClick={handleViewInAdmin}
              disabled={albumState.isLoading}
              className='gap-1.5 border-zinc-700/50 bg-zinc-900/20 text-zinc-300 hover:bg-zinc-800/30 hover:text-zinc-100'
            >
              <ExternalLink className='h-3.5 w-3.5' />
              Admin Panel
            </Button>
          )}

          {/* Delete Album - Only if in DB */}
          {albumState.existsInDb && albumState.dbId && (
            <Button
              variant='outline'
              size='sm'
              onClick={() => setDeleteModalOpen(true)}
              disabled={albumState.isLoading}
              className='gap-1.5 border-red-800/50 bg-red-950/20 text-red-300 hover:bg-red-900/30 hover:text-red-100'
            >
              <Trash2 className='h-3.5 w-3.5' />
              Delete
            </Button>
          )}
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      <Dialog open={deleteModalOpen} onOpenChange={setDeleteModalOpen}>
        <DialogContent className='bg-zinc-900 border-zinc-800 text-white'>
          <DialogHeader>
            <DialogTitle>Delete Album</DialogTitle>
            <DialogDescription className='text-zinc-400'>
              Are you sure you want to delete &quot;{album.title}&quot;? This
              will remove all tracks, recommendations, and collection entries.
              This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant='outline'
              onClick={() => setDeleteModalOpen(false)}
              disabled={deleteMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              variant='destructive'
              onClick={handleDeleteAlbum}
              disabled={deleteMutation.isPending}
              className='gap-2'
            >
              {deleteMutation.isPending ? (
                <>
                  <Loader2 className='h-4 w-4 animate-spin' />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className='h-4 w-4' />
                  Delete Album
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Toast Notification */}
      <Toast
        message={toast.message}
        type={toast.type}
        isVisible={toast.isVisible}
        onClose={hideToast}
      />
    </>
  );
}
