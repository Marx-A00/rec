'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  CheckCircle,
  XCircle,
  Clock,
  RefreshCw,
  AlertCircle,
  Download,
} from 'lucide-react';
import { toast } from 'sonner';

import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { TablePagination } from '@/components/ui/table-pagination';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  ExpandableJobRow,
  type JobHistoryItem,
} from '@/components/admin/ExpandableJobRow';
import {
  useGetSyncJobsQuery,
  SyncJobType,
  SyncJobStatus,
  type GetSyncJobsQuery,
} from '@/generated/graphql';

// ============================================================================
// Helpers (same as original job-history page)
// ============================================================================

function formatDistanceToNow(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);

  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} minute${minutes !== 1 ? 's' : ''} ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hour${hours !== 1 ? 's' : ''} ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days} day${days !== 1 ? 's' : ''} ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months} month${months !== 1 ? 's' : ''} ago`;
  const years = Math.floor(months / 12);
  return `${years} year${years !== 1 ? 's' : ''} ago`;
}

// ============================================================================
// SyncJob → JobHistoryItem mapping
// ============================================================================

/** Filter values that should query the SyncJob Postgres table */
const SYNC_FILTERS: Record<string, SyncJobType | undefined> = {
  spotify: SyncJobType.SpotifyNewReleases,
  musicbrainz: SyncJobType.MusicbrainzNewReleases,
  listenbrainz: SyncJobType.ListenbrainzFreshReleases,
};

type SyncJobRecord = GetSyncJobsQuery['syncJobs']['jobs'][number];

function syncJobTypeToName(jobType: SyncJobType): string {
  switch (jobType) {
    case SyncJobType.SpotifyNewReleases:
      return 'spotify:sync-new-releases';
    case SyncJobType.MusicbrainzNewReleases:
      return 'musicbrainz:sync-new-releases';
    case SyncJobType.ListenbrainzFreshReleases:
      return 'listenbrainz:sync-fresh-releases';
    default:
      return jobType.toLowerCase().replace(/_/g, '-');
  }
}

function mapSyncStatus(status: SyncJobStatus): JobHistoryItem['status'] {
  switch (status) {
    case SyncJobStatus.Completed:
      return 'completed';
    case SyncJobStatus.Failed:
      return 'failed';
    case SyncJobStatus.Running:
      return 'active';
    case SyncJobStatus.Pending:
      return 'waiting';
    case SyncJobStatus.Cancelled:
      return 'failed';
    default:
      return 'completed';
  }
}

function syncJobToHistoryItem(syncJob: SyncJobRecord): JobHistoryItem {
  return {
    id: syncJob.jobId || syncJob.id,
    name: syncJobTypeToName(syncJob.jobType),
    status: mapSyncStatus(syncJob.status),
    data: {
      source: syncJob.triggeredBy,
      ...(typeof syncJob.metadata === 'object' && syncJob.metadata !== null
        ? (syncJob.metadata as Record<string, unknown>)
        : {}),
    },
    result: {
      albumsCreated: syncJob.albumsCreated,
      albumsUpdated: syncJob.albumsUpdated,
      albumsSkipped: syncJob.albumsSkipped,
      artistsCreated: syncJob.artistsCreated,
      artistsUpdated: syncJob.artistsUpdated,
    },
    error: syncJob.errorMessage ?? undefined,
    createdAt: new Date(syncJob.startedAt || syncJob.createdAt).toISOString(),
    completedAt: syncJob.completedAt
      ? new Date(syncJob.completedAt).toISOString()
      : undefined,
    processedOn: syncJob.startedAt
      ? new Date(syncJob.startedAt).toISOString()
      : undefined,
    duration: syncJob.durationMs ?? undefined,
    attempts: 1,
  };
}

// ============================================================================
// Types
// ============================================================================

const MONITORING_API = '/api/admin/worker';

// ============================================================================
// JobHistoryPanel Component
// ============================================================================

export function JobHistoryPanel() {
  const [jobs, setJobs] = useState<JobHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [timeFilter, setTimeFilter] = useState<string>('24h');
  const [jobTypeFilter, setJobTypeFilter] = useState<string>('all');
  const [refreshing, setRefreshing] = useState(false);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  // Determine data source based on job type filter
  const isSyncFilter = jobTypeFilter in SYNC_FILTERS;
  const syncJobType = SYNC_FILTERS[jobTypeFilter];

  // Query SyncJob Postgres table when a sync filter is selected or "all"
  const PAGE_SIZE = 20;
  const {
    data: syncJobsData,
    isLoading: syncJobsLoading,
    refetch: refetchSyncJobs,
  } = useGetSyncJobsQuery(
    {
      input: {
        ...(syncJobType ? { jobType: syncJobType } : {}),
        limit: PAGE_SIZE,
        offset: (page - 1) * PAGE_SIZE,
      },
    },
    {
      enabled: isSyncFilter || jobTypeFilter === 'all',
    }
  );

  // Convert SyncJob records to JobHistoryItem format
  const syncJobItems: JobHistoryItem[] = useMemo(() => {
    if (!syncJobsData?.syncJobs?.jobs) return [];
    return syncJobsData.syncJobs.jobs.map(syncJobToHistoryItem);
  }, [syncJobsData]);

  const toggleRow = (jobId: string) => {
    setExpandedRows(prev => {
      const next = new Set(prev);
      if (next.has(jobId)) {
        next.delete(jobId);
      } else {
        next.add(jobId);
      }
      return next;
    });
  };

  const fetchJobHistory = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '20',
        status: statusFilter !== 'all' ? statusFilter : '',
        timeRange: timeFilter,
      });

      const response = await fetch(`${MONITORING_API}/jobs/history?${params}`);

      if (!response.ok) {
        throw new Error('Failed to fetch job history');
      }

      const data = await response.json();

      setJobs(data.jobs || []);
      setTotalPages(data.totalPages || 1);
    } catch (err) {
      const isConnectionError =
        err instanceof TypeError && err.message === 'Failed to fetch';
      const errorMessage = isConnectionError
        ? `Unable to connect to monitoring service at ${MONITORING_API}. Make sure the queue worker is running.`
        : 'Failed to load job history';
      setError(errorMessage);
      console.error('Error fetching job history:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchJobHistory();
  }, [page, statusFilter, timeFilter]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchJobHistory();
    refetchSyncJobs();
  };

  const handleRetryJob = async (jobId: string) => {
    try {
      const response = await fetch(`${MONITORING_API}/jobs/${jobId}/retry`, {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error('Failed to retry job');
      }

      toast.success('Job queued for retry');
      fetchJobHistory();
    } catch {
      toast.error('Failed to retry job');
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className='h-4 w-4 text-green-500' />;
      case 'failed':
        return <XCircle className='h-4 w-4 text-red-500' />;
      case 'active':
        return <RefreshCw className='h-4 w-4 text-blue-500 animate-spin' />;
      case 'waiting':
      case 'delayed':
        return <Clock className='h-4 w-4 text-yellow-500' />;
      default:
        return <AlertCircle className='h-4 w-4 text-zinc-400' />;
    }
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'completed':
        return 'default';
      case 'failed':
        return 'destructive';
      case 'active':
        return 'secondary';
      case 'waiting':
      case 'delayed':
        return 'outline';
      default:
        return 'outline';
    }
  };

  const formatDuration = (ms?: number) => {
    if (!ms) return '-';
    if (ms < 1000) return `${Math.round(ms)}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    return `${(ms / 60000).toFixed(1)}m`;
  };

  // Build the final job list based on data source
  const filteredJobs = useMemo(() => {
    if (isSyncFilter) {
      // Sync filter selected → use SyncJob Postgres data exclusively
      return syncJobItems;
    }

    if (jobTypeFilter === 'all') {
      // "All" → merge BullMQ + SyncJob data, dedup by job ID
      // SyncJob records win over BullMQ records (richer data)
      const syncJobIds = new Set(syncJobItems.map(j => j.id));
      const bullMqOnly = jobs.filter(j => !syncJobIds.has(j.id));
      const merged = [...syncJobItems, ...bullMqOnly];
      // Sort by createdAt descending
      merged.sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
      return merged;
    }

    // Non-sync filter → BullMQ only, client-side filter
    return jobs.filter(job => {
      if (jobTypeFilter === 'enrichment')
        return job.name.includes('enrichment');
      if (jobTypeFilter === 'cache') return job.name.includes('cache');
      if (jobTypeFilter === 'discogs') return job.name.includes('discogs');
      return true;
    });
  }, [isSyncFilter, jobTypeFilter, syncJobItems, jobs]);

  // Compute effective loading/stats based on data source
  const isEffectivelyLoading = isSyncFilter
    ? syncJobsLoading
    : jobTypeFilter === 'all'
      ? loading && syncJobsLoading
      : loading;

  const effectiveTotalPages = isSyncFilter
    ? Math.ceil((syncJobsData?.syncJobs?.totalCount ?? 0) / PAGE_SIZE) || 1
    : totalPages;

  return (
    <div className='space-y-6'>
      {/* Filters and Table */}
      <Card className='bg-zinc-900 border-zinc-800'>
        <CardHeader>
          <div className='flex items-center justify-end'>
            <div className='flex items-center gap-2'>
              <Select value={timeFilter} onValueChange={setTimeFilter}>
                <SelectTrigger className='w-32 bg-zinc-800 border-zinc-700 text-white'>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className='bg-zinc-800 border-zinc-700'>
                  <SelectItem value='1h'>Last Hour</SelectItem>
                  <SelectItem value='24h'>Last 24 Hours</SelectItem>
                  <SelectItem value='7d'>Last 7 Days</SelectItem>
                  <SelectItem value='30d'>Last 30 Days</SelectItem>
                  <SelectItem value='all'>All Time</SelectItem>
                </SelectContent>
              </Select>

              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className='w-32 bg-zinc-800 border-zinc-700 text-white'>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className='bg-zinc-800 border-zinc-700'>
                  <SelectItem value='all'>All Status</SelectItem>
                  <SelectItem value='completed'>Completed</SelectItem>
                  <SelectItem value='failed'>Failed</SelectItem>
                  <SelectItem value='active'>Active</SelectItem>
                  <SelectItem value='waiting'>Waiting</SelectItem>
                </SelectContent>
              </Select>

              <Select value={jobTypeFilter} onValueChange={setJobTypeFilter}>
                <SelectTrigger className='w-48 bg-zinc-800 border-zinc-700 text-white'>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className='bg-zinc-800 border-zinc-700'>
                  <SelectItem value='all'>All Job Types</SelectItem>
                  <SelectItem value='spotify'>Spotify Sync</SelectItem>
                  <SelectItem value='musicbrainz'>MusicBrainz Sync</SelectItem>
                  <SelectItem value='enrichment'>Enrichment</SelectItem>
                  <SelectItem value='cache'>Cache</SelectItem>
                  <SelectItem value='discogs'>Discogs</SelectItem>
                  <SelectItem value='listenbrainz'>
                    ListenBrainz Sync
                  </SelectItem>
                </SelectContent>
              </Select>

              <Button
                onClick={handleRefresh}
                disabled={refreshing}
                size='sm'
                variant='outline'
                className='border-zinc-700 text-white hover:bg-zinc-800'
              >
                <RefreshCw
                  className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`}
                />
                Refresh
              </Button>

              <Button
                size='sm'
                variant='outline'
                className='border-zinc-700 text-white hover:bg-zinc-800'
              >
                <Download className='h-4 w-4 mr-2' />
                Export
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div>
            <Table>
              <TableHeader>
                <TableRow className='border-zinc-800'>
                  <TableHead className='text-zinc-400 w-8'></TableHead>
                  <TableHead className='text-zinc-400'>Status</TableHead>
                  <TableHead className='text-zinc-400'>Job Name</TableHead>
                  <TableHead className='text-zinc-400'>Album</TableHead>
                  <TableHead className='text-zinc-400'>Created</TableHead>
                  <TableHead className='text-zinc-400'>Duration</TableHead>
                  <TableHead className='text-zinc-400'>Attempts</TableHead>
                  <TableHead className='text-zinc-400'>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isEffectivelyLoading ? (
                  <TableRow>
                    <TableCell
                      colSpan={8}
                      className='text-center text-zinc-500 py-8'
                    >
                      Loading job history...
                    </TableCell>
                  </TableRow>
                ) : error && !isSyncFilter ? (
                  <TableRow>
                    <TableCell colSpan={8} className='py-12'>
                      <div className='flex flex-col items-center gap-4'>
                        <div className='flex items-center gap-2 text-red-400'>
                          <AlertCircle className='h-5 w-5' />
                          <span className='font-medium'>Connection Error</span>
                        </div>
                        <p className='text-zinc-400 text-sm text-center max-w-md'>
                          {error}
                        </p>
                        <Button
                          onClick={handleRefresh}
                          size='sm'
                          variant='outline'
                          className='border-zinc-700 text-white hover:bg-zinc-800'
                        >
                          <RefreshCw className='h-4 w-4 mr-2' />
                          Retry
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : filteredJobs.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={8}
                      className='text-center text-zinc-500 py-8'
                    >
                      No jobs found for the selected filters
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredJobs.map(job => (
                    <ExpandableJobRow
                      key={job.id}
                      job={job}
                      isExpanded={expandedRows.has(job.id)}
                      onToggle={() => toggleRow(job.id)}
                      getStatusIcon={getStatusIcon}
                      getStatusBadgeVariant={getStatusBadgeVariant}
                      formatDuration={formatDuration}
                      formatDistanceToNow={formatDistanceToNow}
                      onRetryJob={handleRetryJob}
                    />
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          <div className='mt-4 pt-4 border-t border-zinc-800'>
            <TablePagination
              currentPage={page}
              totalPages={effectiveTotalPages}
              onPageChange={setPage}
              pageSize={PAGE_SIZE}
              currentPageItemCount={filteredJobs.length}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
