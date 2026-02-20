// src/app/admin/weekly-sync/page.tsx
'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  CheckCircle,
  XCircle,
  Clock,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Calendar,
  Music,
  Users,
  ExternalLink,
  Filter,
  Undo2,
  AlertTriangle,
  Loader2,
  Ban,
} from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';

import {
  useGetSyncJobsQuery,
  useGetSyncJobQuery,
  useRollbackSyncJobMutation,
  SyncJobType,
  SyncJobStatus,
  type GetSyncJobsQuery,
} from '@/generated/graphql';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

// Format duration from ms to human readable
function formatDuration(ms: number | null | undefined): string {
  if (!ms) return '-';
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  return `${(ms / 60000).toFixed(1)}m`;
}

// Format date to relative time
function formatRelativeTime(date: string | Date): string {
  const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000);

  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(date).toLocaleDateString();
}

// Get status badge variant
function getStatusBadge(status: SyncJobStatus) {
  switch (status) {
    case SyncJobStatus.Completed:
      return (
        <Badge className='bg-green-500/20 text-green-400 border-green-500/30'>
          <CheckCircle className='h-3 w-3 mr-1' />
          Completed
        </Badge>
      );
    case SyncJobStatus.Failed:
      return (
        <Badge className='bg-red-500/20 text-red-400 border-red-500/30'>
          <XCircle className='h-3 w-3 mr-1' />
          Failed
        </Badge>
      );
    case SyncJobStatus.Running:
      return (
        <Badge className='bg-blue-500/20 text-blue-400 border-blue-500/30'>
          <RefreshCw className='h-3 w-3 mr-1 animate-spin' />
          Running
        </Badge>
      );
    case SyncJobStatus.Pending:
      return (
        <Badge className='bg-yellow-500/20 text-yellow-400 border-yellow-500/30'>
          <Clock className='h-3 w-3 mr-1' />
          Pending
        </Badge>
      );
    case SyncJobStatus.Cancelled:
      return (
        <Badge className='bg-orange-500/20 text-orange-400 border-orange-500/30'>
          <Ban className='h-3 w-3 mr-1' />
          Rolled Back
        </Badge>
      );
    default:
      return <Badge variant='outline'>{status}</Badge>;
  }
}

// Get job type display name
function getJobTypeDisplay(jobType: SyncJobType): string {
  switch (jobType) {
    case SyncJobType.SpotifyNewReleases:
      return 'Spotify New Releases';
    case SyncJobType.SpotifyFeaturedPlaylists:
      return 'Spotify Featured Playlists';
    case SyncJobType.MusicbrainzNewReleases:
      return 'MusicBrainz New Releases';
    case SyncJobType.MusicbrainzSync:
      return 'MusicBrainz Sync';
    case SyncJobType.DiscogsSync:
      return 'Discogs Sync';
    case SyncJobType.EnrichmentBatch:
      return 'Enrichment Batch';
    default:
      return jobType;
  }
}

// Check if a sync job can be rolled back
function canRollback(status: SyncJobStatus): boolean {
  return status === SyncJobStatus.Completed || status === SyncJobStatus.Failed;
}

type SyncJobItem = GetSyncJobsQuery['syncJobs']['jobs'][number];

// Expandable row component for showing albums
function SyncJobRow({
  job,
  onRollbackComplete,
}: {
  job: SyncJobItem;
  onRollbackComplete: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
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

  // Only fetch albums when expanded
  const { data: detailData, isLoading: detailLoading } = useGetSyncJobQuery(
    { id: job.id },
    { enabled: expanded }
  );

  const albums = detailData?.syncJob?.albums || [];

  const handleRollbackClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setRollbackDialogOpen(true);
    setRollbackStep('preview');
    setDryRunResult(null);
    setRollbackError(null);

    // Run dry run to get preview
    try {
      const result = await rollbackMutation.mutateAsync({
        syncJobId: job.id,
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
        syncJobId: job.id,
        dryRun: false,
      });
      setRollbackStep('done');
      // Invalidate sync jobs queries to refresh the list
      queryClient.invalidateQueries({ queryKey: ['GetSyncJobs'] });
      queryClient.invalidateQueries({ queryKey: ['GetSyncJob'] });
    } catch (err) {
      setRollbackError(err instanceof Error ? err.message : 'Rollback failed');
      setRollbackStep('error');
    }
  };

  const handleDialogClose = () => {
    setRollbackDialogOpen(false);
    if (rollbackStep === 'done') {
      onRollbackComplete();
    }
  };

  return (
    <div className='border-b border-zinc-800 last:border-b-0'>
      {/* Main row */}
      <div
        className='flex items-center justify-between p-4 hover:bg-zinc-800/50 cursor-pointer transition-colors'
        onClick={() => setExpanded(!expanded)}
      >
        <div className='flex items-center gap-4 flex-1'>
          {/* Expand icon */}
          <div className='text-zinc-500'>
            {expanded ? (
              <ChevronUp className='h-5 w-5' />
            ) : (
              <ChevronDown className='h-5 w-5' />
            )}
          </div>

          {/* Status */}
          <div className='w-28'>{getStatusBadge(job.status)}</div>

          {/* Job Type */}
          <div className='w-48'>
            <span className='text-white font-medium'>
              {getJobTypeDisplay(job.jobType)}
            </span>
          </div>

          {/* Date */}
          <div className='flex items-center gap-2 text-zinc-400 w-32'>
            <Calendar className='h-4 w-4' />
            <span>{formatRelativeTime(job.startedAt)}</span>
          </div>

          {/* Albums Created */}
          <div className='flex items-center gap-2 text-zinc-400 w-28'>
            <Music className='h-4 w-4' />
            <span>{job.albumsCreated} albums</span>
          </div>

          {/* Artists Created */}
          <div className='flex items-center gap-2 text-zinc-400 w-28'>
            <Users className='h-4 w-4' />
            <span>{job.artistsCreated} artists</span>
          </div>

          {/* Duration */}
          <div className='text-zinc-400 w-20'>
            {formatDuration(job.durationMs)}
          </div>
        </div>

        <div className='flex items-center gap-3'>
          {/* Rollback button */}
          {canRollback(job.status) && (
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

          {/* Triggered By */}
          <div className='text-zinc-500 text-sm'>{job.triggeredBy || '-'}</div>
        </div>
      </div>

      {/* Expanded content - albums */}
      {expanded && (
        <div className='bg-zinc-900/50 p-4 border-t border-zinc-800'>
          {detailLoading ? (
            <div className='text-zinc-500 text-center py-4'>
              Loading albums...
            </div>
          ) : albums.length === 0 ? (
            <div className='text-zinc-500 text-center py-4'>
              No albums found for this sync job
            </div>
          ) : (
            <div className='space-y-3'>
              <div className='text-sm text-zinc-400 mb-3'>
                Albums created by this sync ({albums.length})
              </div>
              <div className='grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3'>
                {albums.map(album => (
                  <Link
                    key={album.id}
                    href={`/admin/music-database?id=${album.id}`}
                    className='bg-zinc-800 rounded-lg p-3 hover:bg-zinc-700 transition-colors group'
                  >
                    <div className='flex gap-3'>
                      <div className='w-12 h-12 bg-zinc-700 rounded flex-shrink-0 overflow-hidden'>
                        {album.coverArtUrl && (
                          <img
                            src={album.coverArtUrl}
                            alt={album.title}
                            className='w-full h-full object-cover'
                          />
                        )}
                      </div>
                      <div className='flex-1 min-w-0'>
                        <div className='text-sm font-medium text-white truncate group-hover:text-green-400'>
                          {album.title}
                        </div>
                        <div className='text-xs text-zinc-400 truncate'>
                          {album.artists?.[0]?.artist?.name || 'Unknown Artist'}
                        </div>
                        {album.releaseDate && (
                          <div className='text-xs text-zinc-500'>
                            {new Date(album.releaseDate).getFullYear()}
                          </div>
                        )}
                      </div>
                      <ExternalLink className='h-4 w-4 text-zinc-500 group-hover:text-green-400 flex-shrink-0' />
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Metadata section */}
          {job.metadata && (
            <div className='mt-4 pt-4 border-t border-zinc-800'>
              <div className='text-sm text-zinc-400 mb-2'>Job Metadata</div>
              <div className='bg-zinc-800 rounded-lg p-3'>
                <pre className='text-xs text-zinc-300 overflow-x-auto'>
                  {JSON.stringify(job.metadata, null, 2)}
                </pre>
              </div>
            </div>
          )}

          {/* Error message if failed */}
          {job.status === SyncJobStatus.Failed && job.errorMessage && (
            <div className='mt-4 pt-4 border-t border-zinc-800'>
              <div className='text-sm text-red-400 mb-2'>Error Message</div>
              <div className='bg-red-900/20 border border-red-800 rounded-lg p-3'>
                <pre className='text-xs text-red-300 overflow-x-auto'>
                  {job.errorMessage}
                </pre>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Rollback Confirmation Dialog */}
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
            {/* Loading state while dry run is fetching */}
            {rollbackStep === 'preview' && !dryRunResult && !rollbackError && (
              <div className='flex items-center justify-center gap-2 py-4 text-zinc-400'>
                <Loader2 className='h-4 w-4 animate-spin' />
                Calculating impact...
              </div>
            )}

            {/* Dry run results */}
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

            {/* Confirming state */}
            {rollbackStep === 'confirming' && (
              <div className='flex items-center justify-center gap-2 py-4 text-zinc-400'>
                <Loader2 className='h-4 w-4 animate-spin' />
                Rolling back...
              </div>
            )}

            {/* Done state */}
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

            {/* Error state */}
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

export default function WeeklySyncPage() {
  const [jobTypeFilter, setJobTypeFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Build query input based on filters
  const queryInput = {
    limit: 50,
    offset: 0,
    ...(jobTypeFilter !== 'all' && { jobType: jobTypeFilter as SyncJobType }),
    ...(statusFilter !== 'all' && { status: statusFilter as SyncJobStatus }),
  };

  const { data, isLoading, refetch, isRefetching } = useGetSyncJobsQuery({
    input: queryInput,
  });

  const syncJobs = data?.syncJobs?.jobs || [];
  const totalCount = data?.syncJobs?.totalCount || 0;

  // Calculate stats
  const completedCount = syncJobs.filter(
    j => j.status === SyncJobStatus.Completed
  ).length;
  const failedCount = syncJobs.filter(
    j => j.status === SyncJobStatus.Failed
  ).length;
  const totalAlbumsCreated = syncJobs.reduce(
    (sum, j) => sum + (j.albumsCreated || 0),
    0
  );
  const totalArtistsCreated = syncJobs.reduce(
    (sum, j) => sum + (j.artistsCreated || 0),
    0
  );

  return (
    <div className='p-8'>
      <div className='mb-8'>
        <h1 className='text-3xl font-bold text-white'>Weekly Sync</h1>
        <p className='text-zinc-400 mt-1'>
          View all sync jobs and the albums they created
        </p>
      </div>

      {/* Stats Cards */}
      <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6'>
        <Card className='bg-zinc-900 border-zinc-800'>
          <CardHeader className='pb-3'>
            <CardTitle className='text-sm font-medium text-zinc-400'>
              Total Sync Jobs
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className='text-2xl font-bold text-white'>{totalCount}</div>
            <p className='text-xs text-zinc-500 mt-1'>
              {completedCount} completed, {failedCount} failed
            </p>
          </CardContent>
        </Card>

        <Card className='bg-zinc-900 border-zinc-800'>
          <CardHeader className='pb-3'>
            <CardTitle className='text-sm font-medium text-zinc-400'>
              Albums Created
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className='text-2xl font-bold text-white'>
              {totalAlbumsCreated}
            </div>
            <p className='text-xs text-zinc-500 mt-1'>Across all sync jobs</p>
          </CardContent>
        </Card>

        <Card className='bg-zinc-900 border-zinc-800'>
          <CardHeader className='pb-3'>
            <CardTitle className='text-sm font-medium text-zinc-400'>
              Artists Created
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className='text-2xl font-bold text-white'>
              {totalArtistsCreated}
            </div>
            <p className='text-xs text-zinc-500 mt-1'>Across all sync jobs</p>
          </CardContent>
        </Card>

        <Card className='bg-zinc-900 border-zinc-800'>
          <CardHeader className='pb-3'>
            <CardTitle className='text-sm font-medium text-zinc-400'>
              Success Rate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className='text-2xl font-bold text-white'>
              {syncJobs.length > 0
                ? ((completedCount / syncJobs.length) * 100).toFixed(0)
                : 0}
              %
            </div>
            <p className='text-xs text-zinc-500 mt-1'>Of recent sync jobs</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Table */}
      <Card className='bg-zinc-900 border-zinc-800'>
        <CardHeader>
          <div className='flex items-center justify-between'>
            <CardTitle className='text-white'>Sync Jobs</CardTitle>
            <div className='flex items-center gap-2'>
              <Filter className='h-4 w-4 text-zinc-500' />

              <Select value={jobTypeFilter} onValueChange={setJobTypeFilter}>
                <SelectTrigger className='w-48 bg-zinc-800 border-zinc-700 text-white'>
                  <SelectValue placeholder='All Job Types' />
                </SelectTrigger>
                <SelectContent className='bg-zinc-800 border-zinc-700'>
                  <SelectItem value='all'>All Job Types</SelectItem>
                  <SelectItem value={SyncJobType.SpotifyNewReleases}>
                    Spotify New Releases
                  </SelectItem>
                  <SelectItem value={SyncJobType.SpotifyFeaturedPlaylists}>
                    Spotify Featured Playlists
                  </SelectItem>
                  <SelectItem value={SyncJobType.MusicbrainzNewReleases}>
                    MusicBrainz New Releases
                  </SelectItem>
                  <SelectItem value={SyncJobType.MusicbrainzSync}>
                    MusicBrainz Sync
                  </SelectItem>
                </SelectContent>
              </Select>

              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className='w-36 bg-zinc-800 border-zinc-700 text-white'>
                  <SelectValue placeholder='All Status' />
                </SelectTrigger>
                <SelectContent className='bg-zinc-800 border-zinc-700'>
                  <SelectItem value='all'>All Status</SelectItem>
                  <SelectItem value={SyncJobStatus.Completed}>
                    Completed
                  </SelectItem>
                  <SelectItem value={SyncJobStatus.Failed}>Failed</SelectItem>
                  <SelectItem value={SyncJobStatus.Running}>Running</SelectItem>
                  <SelectItem value={SyncJobStatus.Pending}>Pending</SelectItem>
                </SelectContent>
              </Select>

              <Button
                onClick={() => refetch()}
                disabled={isRefetching}
                size='sm'
                variant='outline'
                className='border-zinc-700 text-white hover:bg-zinc-800'
              >
                <RefreshCw
                  className={`h-4 w-4 mr-2 ${isRefetching ? 'animate-spin' : ''}`}
                />
                Refresh
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className='p-0'>
          {isLoading ? (
            <div className='text-zinc-500 text-center py-8'>
              Loading sync jobs...
            </div>
          ) : syncJobs.length === 0 ? (
            <div className='text-zinc-500 text-center py-8'>
              No sync jobs found. Run a Spotify sync to see results here.
            </div>
          ) : (
            <div className='divide-y divide-zinc-800'>
              {syncJobs.map(job => (
                <SyncJobRow
                  key={job.id}
                  job={job}
                  onRollbackComplete={() => refetch()}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
