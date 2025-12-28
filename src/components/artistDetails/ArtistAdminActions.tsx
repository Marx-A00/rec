'use client';

import { Loader2, RefreshCcw, Database, ExternalLink } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { formatDistanceToNow } from 'date-fns';

import { Button } from '@/components/ui/button';
import Toast, { useToast } from '@/components/ui/toast';
import { useAdminOverlay } from '@/hooks/useAdminOverlay';
import { useArtistState } from '@/hooks/useArtistState';
import {
  useTriggerArtistEnrichmentMutation,
  useAddArtistMutation,
  EnrichmentPriority,
  EnrichmentStatus,
  DataQuality,
} from '@/generated/graphql';

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
  const { toast, showToast, hideToast } = useToast();
  const queryClient = useQueryClient();
  const { adminOverlayEnabled } = useAdminOverlay();

  // Get unified artist state
  const artistState = useArtistState({
    id: artistId,
    source: artistSource,
    musicbrainzId,
  });

  // Admin mutation hooks (must be called before early return)
  const enrichMutation = useTriggerArtistEnrichmentMutation();
  const addArtistMutation = useAddArtistMutation();

  // Only render for admin users with overlay enabled
  if (!adminOverlayEnabled) {
    return null;
  }

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
          queryKey: ['GetArtistByMusicBrainzId', { musicbrainzId }],
        });
        // Invalidate enrichment logs to refresh admin panel
        queryClient.invalidateQueries({
          queryKey: ['GetEnrichmentLogs'],
        });
      } else {
        throw new Error(
          result.triggerArtistEnrichment.message || 'Failed to queue enrichment'
        );
      }
    } catch (error) {
      showToast(`Failed to queue enrichment: ${error}`, 'error');
    }
  };

  const handleAddToDatabase = async () => {
    if (artistState.existsInDb) {
      showToast('Artist is already in the database', 'error');
      return;
    }

    try {
      const artistData = {
        name: artistName,
        musicbrainzId: musicbrainzId || undefined,
        // Additional fields would come from the artist page data if available
      };

      await addArtistMutation.mutateAsync({ input: artistData });

      // Invalidate queries to refresh artist state
      queryClient.invalidateQueries({
        queryKey: ['GetArtistByMusicBrainzId', { musicbrainzId }],
      });

      showToast('Artist added to database successfully', 'success');
    } catch (error) {
      showToast(`Failed to add artist: ${error}`, 'error');
    }
  };

  const handleViewInAdmin = () => {
    const dbId = artistState.dbId || artistId;
    if (!dbId) return;
    window.open(`/admin/music-database?id=${dbId}&type=artists`, '_blank');
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
          </div>
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
                    : artistState.enrichmentStatus ===
                        EnrichmentStatus.InProgress
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
                <span className='text-zinc-300'>
                  {artistState.lastEnriched.toLocaleDateString()}
                  <span className='text-zinc-500 text-xs ml-1.5'>
                    (
                    {formatDistanceToNow(artistState.lastEnriched, {
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
          {!artistState.existsInDb && (
            <Button
              variant='outline'
              size='sm'
              onClick={handleAddToDatabase}
              disabled={addArtistMutation.isPending || artistState.isLoading}
              className='gap-1.5 border-emerald-800/50 bg-emerald-950/20 text-emerald-200 hover:bg-emerald-900/30 hover:text-emerald-100'
            >
              {addArtistMutation.isPending ? (
                <Loader2 className='h-3.5 w-3.5 animate-spin' />
              ) : (
                <Database className='h-3.5 w-3.5' />
              )}
              {addArtistMutation.isPending ? 'Adding...' : 'Add to DB'}
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
            disabled={
              !artistState.existsInDb ||
              enrichMutation.isPending ||
              artistState.isLoading
            }
            className={
              artistState.existsInDb
                ? 'gap-1.5 border-amber-800/50 bg-amber-950/20 text-amber-200 hover:bg-amber-900/30 hover:text-amber-100'
                : 'gap-1.5 border-zinc-700/50 bg-zinc-900/20 text-zinc-500 cursor-not-allowed'
            }
            title={
              !artistState.existsInDb
                ? 'Add to DB first'
                : 'Trigger enrichment job'
            }
          >
            {enrichMutation.isPending ? (
              <Loader2 className='h-3.5 w-3.5 animate-spin' />
            ) : (
              <RefreshCcw className='h-3.5 w-3.5' />
            )}
            {!artistState.existsInDb ? 'Add to DB first' : 'Enrich'}
          </Button>

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
