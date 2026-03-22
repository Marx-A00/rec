'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Music,
  Users,
  ExternalLink,
  Undo2,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Loader2,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  useGetSyncJobQuery,
  useRollbackSyncJobMutation,
  SyncJobStatus,
  type GetSyncJobByJobIdQuery,
} from '@/generated/graphql';

// ============================================================================
// Types
// ============================================================================

type SyncJobSummary = NonNullable<GetSyncJobByJobIdQuery['syncJobByJobId']>;

interface SyncJobExpandedContentProps {
  syncJob: SyncJobSummary;
  onRollbackComplete?: () => void;
}

// ============================================================================
// Helpers
// ============================================================================

function canRollback(status: SyncJobStatus): boolean {
  return status === SyncJobStatus.Completed || status === SyncJobStatus.Failed;
}

function formatDuration(ms: number | null | undefined): string {
  if (!ms) return '-';
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  return `${(ms / 60000).toFixed(1)}m`;
}

// ============================================================================
// SyncJobExpandedContent Component
// ============================================================================

export function SyncJobExpandedContent({
  syncJob,
  onRollbackComplete,
}: SyncJobExpandedContentProps) {
  const [showAlbums, setShowAlbums] = useState(false);
  const [rollbackDialogOpen, setRollbackDialogOpen] = useState(false);
  const [rollbackStep, setRollbackStep] = useState<
    'preview' | 'confirming' | 'done' | 'error'
  >('preview');
  const [dryRunResult, setDryRunResult] = useState<{
    albumsDeleted: number;
    artistsDeleted: number;
    message: string;
  } | null>(null);
  const [rollbackError, setRollbackError] = useState<string | null>(null);

  const queryClient = useQueryClient();
  const rollbackMutation = useRollbackSyncJobMutation();

  // Fetch full sync job details (includes albums) using the sync job UUID
  const { data: detailData, isLoading: detailLoading } = useGetSyncJobQuery(
    { id: syncJob.id },
    { enabled: true }
  );

  const albums = detailData?.syncJob?.albums || [];

  const handleRollbackClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setRollbackDialogOpen(true);
    setRollbackStep('preview');
    setDryRunResult(null);
    setRollbackError(null);

    try {
      const result = await rollbackMutation.mutateAsync({
        syncJobId: syncJob.id,
        dryRun: true,
      });
      setDryRunResult({
        albumsDeleted: result.rollbackSyncJob.albumsDeleted ?? 0,
        artistsDeleted: result.rollbackSyncJob.artistsDeleted ?? 0,
        message: result.rollbackSyncJob.message ?? '',
      });
    } catch (err) {
      setRollbackError(
        err instanceof Error ? err.message : 'Failed to preview rollback'
      );
      setRollbackStep('error');
    }
  };

  const handleConfirmRollback = async () => {
    setRollbackStep('confirming');
    try {
      await rollbackMutation.mutateAsync({
        syncJobId: syncJob.id,
        dryRun: false,
      });
      setRollbackStep('done');
      queryClient.invalidateQueries({ queryKey: ['GetSyncJobs'] });
      queryClient.invalidateQueries({ queryKey: ['GetSyncJob'] });
      queryClient.invalidateQueries({ queryKey: ['GetSyncJobByJobId'] });
    } catch (err) {
      setRollbackError(err instanceof Error ? err.message : 'Rollback failed');
      setRollbackStep('error');
    }
  };

  const handleDialogClose = () => {
    setRollbackDialogOpen(false);
    if (rollbackStep === 'done') {
      onRollbackComplete?.();
    }
  };

  return (
    <div className='space-y-3'>
      {/* Sync Stats Header */}
      <div className='flex items-center justify-between'>
        <div className='flex items-center gap-3'>
          <span className='text-xs font-medium text-zinc-400 uppercase tracking-wider'>
            Sync Job Details
          </span>
          <Badge
            variant='outline'
            className='text-xs border-zinc-700 text-zinc-400'
          >
            {syncJob.jobType}
          </Badge>
        </div>
        {canRollback(syncJob.status) && (
          <Button
            onClick={handleRollbackClick}
            size='sm'
            variant='outline'
            className='border-red-800 text-red-400 hover:bg-red-900/30 hover:text-red-300'
          >
            <Undo2 className='h-3.5 w-3.5 mr-1.5' />
            Rollback
          </Button>
        )}
      </div>

      {/* Sync Stats Row */}
      <div className='flex items-center gap-4 text-xs'>
        <div className='flex items-center gap-1.5 text-zinc-400'>
          <Music className='h-3.5 w-3.5' />
          <span>
            <strong className='text-zinc-300'>{syncJob.albumsCreated}</strong>{' '}
            created
          </span>
          {syncJob.albumsUpdated > 0 && (
            <span className='text-zinc-500'>
              / {syncJob.albumsUpdated} updated
            </span>
          )}
          {syncJob.albumsSkipped > 0 && (
            <span className='text-zinc-500'>
              / {syncJob.albumsSkipped} skipped
            </span>
          )}
        </div>
        <div className='flex items-center gap-1.5 text-zinc-400'>
          <Users className='h-3.5 w-3.5' />
          <span>
            <strong className='text-zinc-300'>{syncJob.artistsCreated}</strong>{' '}
            artists
          </span>
          {syncJob.artistsUpdated > 0 && (
            <span className='text-zinc-500'>
              / {syncJob.artistsUpdated} updated
            </span>
          )}
        </div>
        {syncJob.durationMs && (
          <span className='text-zinc-500'>
            {formatDuration(syncJob.durationMs)}
          </span>
        )}
        {syncJob.triggeredBy && (
          <span className='text-zinc-500'>by {syncJob.triggeredBy}</span>
        )}
      </div>

      {/* Collapsible Albums Section */}
      <div>
        <button
          type='button'
          onClick={() => setShowAlbums(!showAlbums)}
          className='flex items-center gap-1.5 text-xs font-medium text-zinc-400 hover:text-zinc-200 transition-colors'
        >
          {showAlbums ? (
            <ChevronDown className='h-3.5 w-3.5' />
          ) : (
            <ChevronRight className='h-3.5 w-3.5' />
          )}
          <Music className='h-3.5 w-3.5' />
          <span>Albums ({detailLoading ? '...' : albums.length})</span>
        </button>

        {showAlbums && (
          <div className='mt-2'>
            {detailLoading ? (
              <div className='text-zinc-500 text-center py-4 text-sm'>
                Loading albums...
              </div>
            ) : albums.length === 0 ? (
              <div className='text-zinc-500 text-center py-3 text-sm'>
                No albums found for this sync job
              </div>
            ) : (
              <div className='grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2'>
                {albums.map(album => (
                  <Link
                    key={album.id}
                    href={`/admin/music-database?id=${album.id}`}
                    className='bg-zinc-800 rounded-lg p-2 hover:bg-zinc-700 transition-colors group'
                  >
                    <div className='flex gap-2'>
                      <div className='w-10 h-10 bg-zinc-700 rounded flex-shrink-0 overflow-hidden'>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        {album.coverArtUrl && (
                          <img
                            src={album.coverArtUrl}
                            alt={album.title}
                            className='w-full h-full object-cover'
                          />
                        )}
                      </div>
                      <div className='flex-1 min-w-0'>
                        <div className='text-xs font-medium text-white truncate group-hover:text-green-400'>
                          {album.title}
                        </div>
                        <div className='text-xs text-zinc-400 truncate'>
                          {album.artists?.[0]?.artist?.name || 'Unknown Artist'}
                        </div>
                      </div>
                      <ExternalLink className='h-3 w-3 text-zinc-600 group-hover:text-green-400 flex-shrink-0 mt-0.5' />
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Error message for failed sync */}
      {syncJob.errorMessage && (
        <div className='rounded-md bg-red-900/20 border border-red-800/50 px-3 py-2'>
          <pre className='text-xs text-red-300 whitespace-pre-wrap break-all'>
            {syncJob.errorMessage}
          </pre>
        </div>
      )}

      {/* Metadata */}
      {syncJob.metadata && (
        <div className='rounded-md bg-zinc-900/50 border border-zinc-800 px-3 py-2'>
          <div className='text-xs text-zinc-500 mb-1'>Metadata</div>
          <pre className='text-xs text-zinc-400 whitespace-pre-wrap break-all max-h-32 overflow-y-auto'>
            {JSON.stringify(syncJob.metadata, null, 2)}
          </pre>
        </div>
      )}

      {/* Rollback Dialog */}
      <Dialog open={rollbackDialogOpen} onOpenChange={handleDialogClose}>
        <DialogContent className='bg-zinc-900 border-zinc-700'>
          <DialogHeader>
            <DialogTitle className='text-white flex items-center gap-2'>
              {rollbackStep === 'done' ? (
                <>
                  <CheckCircle className='h-5 w-5 text-green-400' />
                  Rollback Complete
                </>
              ) : rollbackStep === 'error' ? (
                <>
                  <XCircle className='h-5 w-5 text-red-400' />
                  Rollback Failed
                </>
              ) : (
                <>
                  <AlertTriangle className='h-5 w-5 text-orange-400' />
                  Rollback Sync Job
                </>
              )}
            </DialogTitle>
            <DialogDescription className='text-zinc-400'>
              {rollbackStep === 'done'
                ? 'The sync job has been rolled back successfully.'
                : rollbackStep === 'error'
                  ? 'An error occurred during the rollback.'
                  : 'This will permanently delete all albums and orphaned artists created by this sync job.'}
            </DialogDescription>
          </DialogHeader>

          <div className='py-2'>
            {rollbackStep === 'preview' && !dryRunResult && !rollbackError && (
              <div className='flex items-center justify-center gap-2 py-4 text-zinc-400'>
                <Loader2 className='h-4 w-4 animate-spin' />
                Calculating impact...
              </div>
            )}

            {rollbackStep === 'preview' && dryRunResult && (
              <div className='space-y-3'>
                <div className='bg-zinc-800 rounded-lg p-4 space-y-2'>
                  <div className='text-sm font-medium text-zinc-300'>
                    Impact Preview
                  </div>
                  <div className='flex items-center gap-2 text-sm text-zinc-400'>
                    <Music className='h-4 w-4' />
                    <span>
                      <strong className='text-white'>
                        {dryRunResult.albumsDeleted}
                      </strong>{' '}
                      albums will be deleted
                    </span>
                  </div>
                  <div className='flex items-center gap-2 text-sm text-zinc-400'>
                    <Users className='h-4 w-4' />
                    <span>
                      <strong className='text-white'>
                        {dryRunResult.artistsDeleted}
                      </strong>{' '}
                      orphaned artists will be removed
                    </span>
                  </div>
                </div>
                <div className='bg-red-900/20 border border-red-800/50 rounded-lg p-3'>
                  <p className='text-xs text-red-300'>
                    This action cannot be undone. Associated recommendations,
                    collection entries, and tracks will also be removed.
                  </p>
                </div>
              </div>
            )}

            {rollbackStep === 'confirming' && (
              <div className='flex items-center justify-center gap-2 py-4 text-zinc-400'>
                <Loader2 className='h-4 w-4 animate-spin' />
                Rolling back...
              </div>
            )}

            {rollbackStep === 'done' && dryRunResult && (
              <div className='bg-green-900/20 border border-green-800/50 rounded-lg p-4 space-y-1'>
                <p className='text-sm text-green-300'>
                  Deleted {dryRunResult.albumsDeleted} albums and{' '}
                  {dryRunResult.artistsDeleted} orphaned artists.
                </p>
                <p className='text-xs text-green-400/70'>
                  The sync job has been marked as rolled back.
                </p>
              </div>
            )}

            {rollbackStep === 'error' && rollbackError && (
              <div className='bg-red-900/20 border border-red-800/50 rounded-lg p-4'>
                <p className='text-sm text-red-300'>{rollbackError}</p>
              </div>
            )}
          </div>

          <DialogFooter>
            {rollbackStep === 'preview' && dryRunResult && (
              <>
                <Button
                  variant='outline'
                  onClick={handleDialogClose}
                  className='border-zinc-700 text-zinc-300 hover:bg-zinc-800'
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleConfirmRollback}
                  className='bg-red-600 text-white hover:bg-red-700'
                >
                  <Undo2 className='h-4 w-4 mr-2' />
                  Confirm Rollback
                </Button>
              </>
            )}
            {(rollbackStep === 'done' || rollbackStep === 'error') && (
              <Button
                onClick={handleDialogClose}
                variant='outline'
                className='border-zinc-700 text-zinc-300 hover:bg-zinc-800'
              >
                Close
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
