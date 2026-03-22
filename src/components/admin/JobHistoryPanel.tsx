'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  CheckCircle,
  XCircle,
  Clock,
  RefreshCw,
  AlertCircle,
  Download,
  TrendingUp,
  TrendingDown,
  Calendar,
  Music,
  Database,
  Pause,
} from 'lucide-react';
import { toast } from 'sonner';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
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

function formatTimeUntil(date: Date): string {
  const now = Date.now();
  const diff = date.getTime() - now;
  if (diff < 0) return 'running now';
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  if (days > 0) return `in ${days}d ${hours % 24}h`;
  if (hours > 0) return `in ${hours}h ${minutes % 60}m`;
  if (minutes > 0) return `in ${minutes}m`;
  return 'soon';
}

function formatInterval(minutes: number): string {
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  return `${days}d`;
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

interface JobStats {
  totalJobs: number;
  completedJobs: number;
  failedJobs: number;
  avgDuration: number;
  successRate: number;
  jobsToday: number;
  jobsThisWeek: number;
  trendsUp: boolean;
}

interface SchedulerStatus {
  spotify: {
    enabled: boolean;
    nextRunAt: string | null;
    lastRunAt: string | null;
    intervalMinutes: number;
    jobKey: string | null;
  };
  musicbrainz: {
    enabled: boolean;
    nextRunAt: string | null;
    lastRunAt: string | null;
    intervalMinutes: number;
    jobKey: string | null;
  };
  queue: {
    waiting: number;
    active: number;
    completed: number;
    failed: number;
    delayed: number;
    paused: boolean;
  };
}

const MONITORING_API = '/api/admin/worker';

// ============================================================================
// JobHistoryPanel Component
// ============================================================================

export function JobHistoryPanel() {
  const [jobs, setJobs] = useState<JobHistoryItem[]>([]);
  const [stats, setStats] = useState<JobStats | null>(null);
  const [schedulerStatus, setSchedulerStatus] =
    useState<SchedulerStatus | null>(null);
  const [schedulerLoading, setSchedulerLoading] = useState(true);
  const [schedulerError, setSchedulerError] = useState<string | null>(null);
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

  const fetchSchedulerStatus = async () => {
    setSchedulerLoading(true);
    setSchedulerError(null);
    try {
      const response = await fetch('/api/admin/scheduler/status');
      if (!response.ok) {
        throw new Error('Failed to fetch scheduler status');
      }
      const data = await response.json();
      if (data.success) {
        setSchedulerStatus(data.status);
      } else {
        throw new Error(data.error || 'Unknown error');
      }
    } catch (err) {
      setSchedulerError(
        err instanceof Error ? err.message : 'Failed to load scheduler status'
      );
      console.error('Error fetching scheduler status:', err);
    } finally {
      setSchedulerLoading(false);
    }
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
      setStats(data.stats || null);
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
    fetchSchedulerStatus();
  }, []);

  useEffect(() => {
    fetchJobHistory();
  }, [page, statusFilter, timeFilter]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchJobHistory();
    fetchSchedulerStatus();
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

  // Compute stats from SyncJob data when sync filter is active
  const effectiveStats: JobStats | null = useMemo(() => {
    if (!isSyncFilter) return stats;
    if (!syncJobsData?.syncJobs) return null;

    const syncJobs = syncJobsData.syncJobs.jobs;
    const total = syncJobsData.syncJobs.totalCount;
    const completed = syncJobs.filter(
      j => j.status === SyncJobStatus.Completed
    ).length;
    const failed = syncJobs.filter(
      j =>
        j.status === SyncJobStatus.Failed ||
        j.status === SyncJobStatus.Cancelled
    ).length;
    const durations = syncJobs
      .map(j => j.durationMs)
      .filter((d): d is number => d != null && d > 0);
    const avgDuration =
      durations.length > 0
        ? durations.reduce((a, b) => a + b, 0) / durations.length
        : 0;

    const now = new Date();
    const todayStart = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate()
    );
    const weekStart = new Date(todayStart);
    weekStart.setDate(weekStart.getDate() - 7);

    const jobsToday = syncJobs.filter(
      j => new Date(j.startedAt || j.createdAt) >= todayStart
    ).length;
    const jobsThisWeek = syncJobs.filter(
      j => new Date(j.startedAt || j.createdAt) >= weekStart
    ).length;

    return {
      totalJobs: total,
      completedJobs: completed,
      failedJobs: failed,
      avgDuration,
      successRate: total > 0 ? completed / total : 0,
      jobsToday,
      jobsThisWeek,
      trendsUp: completed > failed,
    };
  }, [isSyncFilter, syncJobsData, stats]);

  return (
    <div className='space-y-6'>
      {/* Scheduler Status Card */}
      <Card className='bg-zinc-900 border-zinc-800'>
        <CardHeader className='pb-3'>
          <div className='flex items-center justify-between'>
            <CardTitle className='text-lg font-semibold text-white flex items-center gap-2'>
              <Calendar className='h-5 w-5 text-green-500' />
              Sync Schedules
            </CardTitle>
            {schedulerStatus?.queue.paused && (
              <Badge
                variant='outline'
                className='text-yellow-500 border-yellow-500'
              >
                <Pause className='h-3 w-3 mr-1' />
                Queue Paused
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {schedulerLoading ? (
            <div className='text-zinc-500'>Loading scheduler status...</div>
          ) : schedulerError ? (
            <div className='flex items-center gap-2 text-red-400'>
              <AlertCircle className='h-4 w-4' />
              <span>{schedulerError}</span>
            </div>
          ) : schedulerStatus ? (
            <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
              {/* Spotify Sync */}
              <div className='bg-zinc-800 rounded-lg p-4'>
                <div className='flex items-center gap-2 mb-3'>
                  <Music className='h-5 w-5 text-green-500' />
                  <span className='font-medium text-white'>Spotify Sync</span>
                  {schedulerStatus.spotify.enabled ? (
                    <Badge className='bg-green-500/20 text-green-400 text-xs'>
                      Active
                    </Badge>
                  ) : (
                    <Badge variant='outline' className='text-zinc-500 text-xs'>
                      Disabled
                    </Badge>
                  )}
                </div>
                {schedulerStatus.spotify.enabled ? (
                  <div className='space-y-2 text-sm'>
                    <div className='flex justify-between'>
                      <span className='text-zinc-400'>Next sync</span>
                      <span className='text-white font-medium'>
                        {schedulerStatus.spotify.nextRunAt
                          ? formatTimeUntil(
                              new Date(schedulerStatus.spotify.nextRunAt)
                            )
                          : 'Unknown'}
                      </span>
                    </div>
                    {schedulerStatus.spotify.intervalMinutes > 0 && (
                      <div className='flex justify-between'>
                        <span className='text-zinc-400'>Interval</span>
                        <span className='text-zinc-300'>
                          Every{' '}
                          {formatInterval(
                            schedulerStatus.spotify.intervalMinutes
                          )}
                        </span>
                      </div>
                    )}
                    {schedulerStatus.spotify.lastRunAt && (
                      <div className='flex justify-between'>
                        <span className='text-zinc-400'>Last run</span>
                        <span className='text-zinc-300'>
                          {formatDistanceToNow(
                            new Date(schedulerStatus.spotify.lastRunAt)
                          )}
                        </span>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className='text-zinc-500 text-sm'>
                    No Spotify sync scheduled
                  </p>
                )}
              </div>

              {/* MusicBrainz Sync */}
              <div className='bg-zinc-800 rounded-lg p-4'>
                <div className='flex items-center gap-2 mb-3'>
                  <Database className='h-5 w-5 text-blue-500' />
                  <span className='font-medium text-white'>
                    MusicBrainz Sync
                  </span>
                  {schedulerStatus.musicbrainz.enabled ? (
                    <Badge className='bg-blue-500/20 text-blue-400 text-xs'>
                      Active
                    </Badge>
                  ) : (
                    <Badge variant='outline' className='text-zinc-500 text-xs'>
                      Disabled
                    </Badge>
                  )}
                </div>
                {schedulerStatus.musicbrainz.enabled ? (
                  <div className='space-y-2 text-sm'>
                    <div className='flex justify-between'>
                      <span className='text-zinc-400'>Next sync</span>
                      <span className='text-white font-medium'>
                        {schedulerStatus.musicbrainz.nextRunAt
                          ? formatTimeUntil(
                              new Date(schedulerStatus.musicbrainz.nextRunAt)
                            )
                          : 'Unknown'}
                      </span>
                    </div>
                    {schedulerStatus.musicbrainz.intervalMinutes > 0 && (
                      <div className='flex justify-between'>
                        <span className='text-zinc-400'>Interval</span>
                        <span className='text-zinc-300'>
                          Every{' '}
                          {formatInterval(
                            schedulerStatus.musicbrainz.intervalMinutes
                          )}
                        </span>
                      </div>
                    )}
                    {schedulerStatus.musicbrainz.lastRunAt && (
                      <div className='flex justify-between'>
                        <span className='text-zinc-400'>Last run</span>
                        <span className='text-zinc-300'>
                          {formatDistanceToNow(
                            new Date(schedulerStatus.musicbrainz.lastRunAt)
                          )}
                        </span>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className='text-zinc-500 text-sm'>
                    No MusicBrainz sync scheduled
                  </p>
                )}
              </div>
            </div>
          ) : null}

          {/* Queue Summary */}
          {schedulerStatus && (
            <div className='mt-4 pt-4 border-t border-zinc-700'>
              <div className='flex items-center gap-4 text-sm text-zinc-400'>
                <span>
                  Queue: {schedulerStatus.queue.waiting} waiting ·{' '}
                  {schedulerStatus.queue.active} active ·{' '}
                  {schedulerStatus.queue.delayed} delayed
                </span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Stats Cards */}
      {effectiveStats && (
        <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4'>
          <Card className='bg-zinc-900 border-zinc-800'>
            <CardHeader className='pb-3'>
              <CardTitle className='text-sm font-medium text-zinc-400'>
                Total Jobs
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className='text-2xl font-bold text-white'>
                {effectiveStats.totalJobs.toLocaleString()}
              </div>
              <p className='text-xs text-zinc-500 mt-1'>
                {effectiveStats.jobsToday} today
              </p>
            </CardContent>
          </Card>

          <Card className='bg-zinc-900 border-zinc-800'>
            <CardHeader className='pb-3'>
              <CardTitle className='text-sm font-medium text-zinc-400'>
                Success Rate
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className='flex items-center gap-2'>
                <div className='text-2xl font-bold text-white'>
                  {(effectiveStats.successRate * 100).toFixed(1)}%
                </div>
                {effectiveStats.trendsUp ? (
                  <TrendingUp className='h-4 w-4 text-green-500' />
                ) : (
                  <TrendingDown className='h-4 w-4 text-red-500' />
                )}
              </div>
              <p className='text-xs text-zinc-500 mt-1'>
                {effectiveStats.completedJobs} completed
              </p>
            </CardContent>
          </Card>

          <Card className='bg-zinc-900 border-zinc-800'>
            <CardHeader className='pb-3'>
              <CardTitle className='text-sm font-medium text-zinc-400'>
                Failed Jobs
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className='text-2xl font-bold text-red-400'>
                {effectiveStats.failedJobs}
              </div>
              <p className='text-xs text-zinc-500 mt-1'>
                {effectiveStats.totalJobs > 0
                  ? (
                      (effectiveStats.failedJobs / effectiveStats.totalJobs) *
                      100
                    ).toFixed(1)
                  : '0'}
                % failure rate
              </p>
            </CardContent>
          </Card>

          <Card className='bg-zinc-900 border-zinc-800'>
            <CardHeader className='pb-3'>
              <CardTitle className='text-sm font-medium text-zinc-400'>
                Avg Duration
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className='text-2xl font-bold text-white'>
                {formatDuration(effectiveStats.avgDuration)}
              </div>
              <p className='text-xs text-zinc-500 mt-1'>Per job processing</p>
            </CardContent>
          </Card>
        </div>
      )}

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
          <div className='h-[600px] overflow-auto'>
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
