'use client';

import { Loader2, RefreshCcw, Database, Trash2, ExternalLink, AlertCircle } from 'lucide-react';
import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { useQueryClient } from '@tanstack/react-query';

import { Button } from '@/components/ui/button';
import Toast, { useToast } from '@/components/ui/toast';
import { isAdmin } from '@/lib/permissions';
import { useArtistState } from '@/hooks/useArtistState';
import {
  useTriggerArtistEnrichmentMutation,
  EnrichmentPriority,
  EnrichmentStatus,
  DataQuality,
} from '@/generated/graphql';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface ArtistAdminActionsProps {
  artistId: string;
  artistName: string;
  artistSource: 'local' | 'musicbrainz' | 'discogs';
  musicbrainzId?: string | null;
}

export default function ArtistAdminActions({
  artistId,
  artistName,
  artistSource,
  musicbrainzId,
}: ArtistAdminActionsProps) {
  const { data: session } = useSession();
  const { toast, showToast, hideToast } = useToast();
  const queryClient = useQueryClient();

  // Get unified artist state
  const artistState = useArtistState({
    id: artistId,
    source: artistSource,
    musicbrainzId,
  });

  // Only render for admin users
  if (!isAdmin(session?.user?.role)) {
    return null;
  }

  // Admin mutation hooks
  const enrichMutation = useTriggerArtistEnrichmentMutation();

  // Delete confirmation modal state
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);

  // Admin action handlers
  const handleEnrichArtist = async () => {
    const dbId = artistState.dbId || artistId;
    if (!dbId) return;

    try {
      const result = await enrichMutation.mutateAsync({
        id: dbId,
        priority: EnrichmentPriority.High,
      });

      if (result.triggerArtistEnrichment.success) {
        showToast('Enrichment job queued successfully', 'success');
        // Invalidate artist queries to refresh data
        queryClient.invalidateQueries({
          queryKey: ['GetArtistByMusicBrainzId', { musicbrainzId }]
        });
      } else {
        throw new Error(result.triggerArtistEnrichment.message || 'Failed to queue enrichment');
      }
    } catch (error) {
      showToast(`Failed to queue enrichment: ${error}`, 'error');
    }
  };

  const handleAddToDatabase = async () => {
    // TODO: Implement addArtist mutation (similar to addAlbum)
    showToast('Add to database feature coming soon', 'error');
  };

  const handleDeleteArtist = async () => {
    // TODO: Implement deleteArtist mutation (similar to deleteAlbum)
    showToast('Delete feature coming soon', 'error');
  };

  const handleViewInAdmin = () => {
    const dbId = artistState.dbId || artistId;
    if (!dbId) return;
    window.open(`/admin/music-database?id=${dbId}`, '_blank');
  };

  return (
    <>
      <div className='mt-6 rounded-lg border border-amber-900/30 bg-amber-950/10 p-4'>
        <div className='mb-3 flex items-start justify-between'>
          <h3 className='text-sm font-medium text-amber-200'>Admin Actions</h3>
          {artistState.isLoading && (
            <Loader2 className='h-3.5 w-3.5 animate-spin text-amber-400' />
          )}
        </div>

        {/* Enrichment Status Display */}
        {artistState.existsInDb && (
          <div className='mb-3 space-y-1 rounded-md border border-zinc-800/50 bg-zinc-900/30 p-2 text-xs'>
            <div className='flex items-center justify-between'>
              <span className='text-zinc-400'>Status:</span>
              <span
                className={`font-medium ${
                  artistState.enrichmentStatus === EnrichmentStatus.Completed
                    ? 'text-emerald-400'
                    : artistState.enrichmentStatus === EnrichmentStatus.InProgress
                      ? 'text-amber-400'
                      : artistState.enrichmentStatus === EnrichmentStatus.Failed
                        ? 'text-red-400'
                        : 'text-zinc-400'
                }`}
              >
                {artistState.enrichmentStatus || EnrichmentStatus.Pending}
              </span>
            </div>
            {artistState.dataQuality && (
              <div className='flex items-center justify-between'>
                <span className='text-zinc-400'>Quality:</span>
                <span
                  className={`font-medium ${
                    artistState.dataQuality === DataQuality.High
                      ? 'text-emerald-400'
                      : artistState.dataQuality === DataQuality.Medium
                        ? 'text-amber-400'
                        : 'text-zinc-400'
                  }`}
                >
                  {artistState.dataQuality}
                </span>
              </div>
            )}
            {artistState.lastEnriched && (
              <div className='flex items-center justify-between'>
                <span className='text-zinc-400'>Last Enriched:</span>
                <span className='text-zinc-300'>{artistState.lastEnriched.toLocaleDateString()}</span>
              </div>
            )}
          </div>
        )}

        <div className='grid grid-cols-2 gap-2'>
          {/* Add to Database - Only show if NOT in DB */}
          {!artistState.existsInDb && (
            <Button
              variant='outline'
              size='sm'
              onClick={handleAddToDatabase}
              disabled={artistState.isLoading}
              className='gap-1.5 border-emerald-800/50 bg-emerald-950/20 text-emerald-200 hover:bg-emerald-900/30 hover:text-emerald-100'
            >
              <Database className='h-3.5 w-3.5' />
              Add to DB
            </Button>
          )}

          {/* Already in Database - Show disabled if in DB */}
          {artistState.existsInDb && (
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

          {/* Enrich Artist - Disabled if not in DB */}
          <Button
            variant='outline'
            size='sm'
            onClick={handleEnrichArtist}
            disabled={!artistState.existsInDb || enrichMutation.isPending || artistState.isLoading}
            className={
              artistState.existsInDb
                ? 'gap-1.5 border-amber-800/50 bg-amber-950/20 text-amber-200 hover:bg-amber-900/30 hover:text-amber-100'
                : 'gap-1.5 border-zinc-700/50 bg-zinc-900/20 text-zinc-500 cursor-not-allowed'
            }
            title={!artistState.existsInDb ? 'Add to DB first' : 'Trigger enrichment job'}
          >
            {enrichMutation.isPending ? (
              <Loader2 className='h-3.5 w-3.5 animate-spin' />
            ) : (
              <RefreshCcw className='h-3.5 w-3.5' />
            )}
            {!artistState.existsInDb ? 'Add to DB first' : 'Enrich'}
          </Button>

          {/* Delete - Only show if in DB */}
          {artistState.existsInDb && (
            <Button
              variant='outline'
              size='sm'
              onClick={() => setDeleteModalOpen(true)}
              disabled={artistState.isLoading}
              className='gap-1.5 border-red-800/50 bg-red-950/20 text-red-200 hover:bg-red-900/30 hover:text-red-100'
            >
              <Trash2 className='h-3.5 w-3.5' />
              Delete
            </Button>
          )}

          {/* Admin Panel Link - Only if in DB */}
          {artistState.existsInDb && artistState.dbId && (
            <Button
              variant='outline'
              size='sm'
              onClick={handleViewInAdmin}
              disabled={artistState.isLoading}
              className='gap-1.5 border-zinc-700/50 bg-zinc-900/20 text-zinc-300 hover:bg-zinc-800/30 hover:text-zinc-100'
            >
              <ExternalLink className='h-3.5 w-3.5' />
              Admin Panel
            </Button>
          )}
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      <Dialog open={deleteModalOpen} onOpenChange={setDeleteModalOpen}>
        <DialogContent className='sm:max-w-md'>
          <DialogHeader>
            <DialogTitle>Delete Artist</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this artist? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>

          <div className='my-4'>
            <div className='rounded-lg border border-zinc-800 bg-zinc-900/50 p-3'>
              <p className='font-medium text-zinc-100'>{artistName}</p>
            </div>

            <div className='mt-4 rounded-lg border border-red-900/50 bg-red-950/20 p-3'>
              <div className='flex gap-2'>
                <AlertCircle className='mt-0.5 h-4 w-4 flex-shrink-0 text-red-400' />
                <div className='text-sm text-red-200'>
                  <p className='font-medium'>This will permanently delete:</p>
                  <ul className='mt-1 list-inside list-disc space-y-0.5 text-red-300'>
                    <li>All album relationships</li>
                    <li>All track relationships</li>
                    <li>All enrichment logs</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant='outline' onClick={() => setDeleteModalOpen(false)}>
              Cancel
            </Button>
            <Button variant='destructive' onClick={handleDeleteArtist} className='gap-2'>
              <Trash2 className='h-4 w-4' />
              Delete Permanently
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Toast Notification */}
      <Toast message={toast.message} type={toast.type} isVisible={toast.isVisible} onClose={hideToast} />
    </>
  );
}
