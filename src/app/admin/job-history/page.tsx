// src/app/admin/job-history/page.tsx
'use client';

import { useEffect, useState } from 'react';
import {
  CheckCircle,
  XCircle,
  Clock,
  RefreshCw,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Download,
  TrendingUp,
  TrendingDown,
  ExternalLink,
  Calendar,
  Music,
  Database,
  Pause,
  Play,
} from 'lucide-react';
import { toast } from 'sonner';
import Link from 'next/link';

import { useAlbumsByJobIdQuery } from '@/generated/graphql';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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

// Simple date formatting function
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

interface JobHistoryItem {
  id: string;
  name: string;
  status: 'completed' | 'failed' | 'active' | 'waiting' | 'delayed';
  data: any;
  result?: any;
  error?: string;
  createdAt: string;
  completedAt?: string;
  processedOn?: string;
  duration?: number;
  attempts: number;
  albumId?: string;
  albumName?: string;
}

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

// Use proxy route to securely access worker API
const MONITORING_API = '/api/admin/worker';

function JobAlbums({ jobId, jobName }: { jobId: string; jobName: string }) {
  const { data, isLoading } = useAlbumsByJobIdQuery(
    { jobId },
    { enabled: jobName.includes('spotify') }
  );

  if (!jobName.includes('spotify')) {
    return null;
  }

  if (isLoading) {
    return (
      <div className='space-y-2'>
        <div className='text-sm text-zinc-400'>Albums Added</div>
        <div className='text-zinc-500'>Loading albums...</div>
      </div>
    );
  }

  const albums = data?.albumsByJobId || [];

  if (albums.length === 0) {
    return (
      <div className='space-y-2'>
        <div className='text-sm text-zinc-400'>Albums Added</div>
        <div className='text-zinc-500'>No albums found for this job</div>
      </div>
    );
  }

  return (
    <div className='space-y-2'>
      <div className='text-sm text-zinc-400'>
        Albums Added ({albums.length})
      </div>
      <div className='grid grid-cols-2 md:grid-cols-3 gap-3 max-h-64 overflow-y-auto'>
        {albums.map(album => (
          <Link
            key={album.id}
            href={`/admin/music-database?id=${album.id}`}
            className='bg-zinc-800 rounded-lg p-2 hover:bg-zinc-700 transition-colors group'
          >
            <div className='flex gap-2'>
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
                  {album.artists[0]?.artist.name || 'Unknown Artist'}
                </div>
              </div>
              <ExternalLink className='h-4 w-4 text-zinc-500 group-hover:text-green-400 flex-shrink-0' />
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

// Helper to format relative time for next sync
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

// Helper to format interval
function formatInterval(minutes: number): string {
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  return `${days}d`;
}

export default function JobHistoryPage() {
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
  const [selectedJob, setSelectedJob] = useState<JobHistoryItem | null>(null);

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
    } catch (error) {
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

  return (
    <div className='p-8'>
      <div className='mb-8'>
        <h1 className='text-3xl font-bold text-white'>Job History</h1>
        <p className='text-zinc-400 mt-1'>
          Historical view of all processed jobs and their outcomes
        </p>
      </div>

      {/* Scheduler Status Card */}
      <Card className='bg-zinc-900 border-zinc-800 mb-6'>
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
      {stats && (
        <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6'>
          <Card className='bg-zinc-900 border-zinc-800'>
            <CardHeader className='pb-3'>
              <CardTitle className='text-sm font-medium text-zinc-400'>
                Total Jobs
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className='text-2xl font-bold text-white'>
                {stats.totalJobs.toLocaleString()}
              </div>
              <p className='text-xs text-zinc-500 mt-1'>
                {stats.jobsToday} today
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
                  {(stats.successRate * 100).toFixed(1)}%
                </div>
                {stats.trendsUp ? (
                  <TrendingUp className='h-4 w-4 text-green-500' />
                ) : (
                  <TrendingDown className='h-4 w-4 text-red-500' />
                )}
              </div>
              <p className='text-xs text-zinc-500 mt-1'>
                {stats.completedJobs} completed
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
                {stats.failedJobs}
              </div>
              <p className='text-xs text-zinc-500 mt-1'>
                {((stats.failedJobs / stats.totalJobs) * 100).toFixed(1)}%
                failure rate
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
                {formatDuration(stats.avgDuration)}
              </div>
              <p className='text-xs text-zinc-500 mt-1'>Per job processing</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters and Controls */}
      <Card className='bg-zinc-900 border-zinc-800 mb-6'>
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
                  <SelectItem value='spotify'>🎵 Spotify Sync</SelectItem>
                  <SelectItem value='musicbrainz'>
                    🎼 MusicBrainz Sync
                  </SelectItem>
                  <SelectItem value='enrichment'>✨ Enrichment</SelectItem>
                  <SelectItem value='cache'>💾 Cache</SelectItem>
                  <SelectItem value='discogs'>💿 Discogs</SelectItem>
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
                {loading ? (
                  <TableRow>
                    <TableCell
                      colSpan={7}
                      className='text-center text-zinc-500 py-8'
                    >
                      Loading job history...
                    </TableCell>
                  </TableRow>
                ) : error ? (
                  <TableRow>
                    <TableCell colSpan={7} className='py-12'>
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
                ) : jobs.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={7}
                      className='text-center text-zinc-500 py-8'
                    >
                      No jobs found for the selected filters
                    </TableCell>
                  </TableRow>
                ) : (
                  jobs
                    .filter(job => {
                      // Filter by job type
                      if (jobTypeFilter === 'all') return true;
                      if (jobTypeFilter === 'spotify')
                        return job.name.includes('spotify');
                      if (jobTypeFilter === 'musicbrainz')
                        return job.name.includes('musicbrainz');
                      if (jobTypeFilter === 'enrichment')
                        return job.name.includes('enrichment');
                      if (jobTypeFilter === 'cache')
                        return job.name.includes('cache');
                      if (jobTypeFilter === 'discogs')
                        return job.name.includes('discogs');
                      return true;
                    })
                    .map(job => (
                      <TableRow
                        key={job.id}
                        className='border-zinc-800 cursor-pointer hover:bg-zinc-800/50 transition-colors'
                        onClick={() => setSelectedJob(job)}
                      >
                        <TableCell>
                          <div className='flex items-center gap-2'>
                            {getStatusIcon(job.status)}
                            <Badge
                              variant={getStatusBadgeVariant(job.status) as any}
                              className='text-xs'
                            >
                              {job.status}
                            </Badge>
                          </div>
                        </TableCell>
                        <TableCell className='text-zinc-300 font-medium'>
                          {job.name}
                        </TableCell>
                        <TableCell className='text-zinc-400'>
                          {job.albumName || '-'}
                        </TableCell>
                        <TableCell className='text-zinc-400'>
                          {formatDistanceToNow(new Date(job.createdAt))}
                        </TableCell>
                        <TableCell className='text-zinc-400'>
                          {formatDuration(job.duration)}
                        </TableCell>
                        <TableCell className='text-zinc-400'>
                          {job.attempts}
                        </TableCell>
                        <TableCell>
                          {job.status === 'failed' && (
                            <Button
                              onClick={e => {
                                e.stopPropagation();
                                handleRetryJob(job.id);
                              }}
                              size='sm'
                              variant='ghost'
                              className='text-zinc-400 hover:text-white'
                            >
                              <RefreshCw className='h-3 w-3 mr-1' />
                              Retry
                            </Button>
                          )}
                          {job.error && (
                            <Button
                              onClick={e => e.stopPropagation()}
                              size='sm'
                              variant='ghost'
                              className='text-zinc-400 hover:text-white'
                              title={job.error}
                            >
                              <AlertCircle className='h-3 w-3' />
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className='flex items-center justify-between mt-4 pt-4 border-t border-zinc-800'>
              <div className='text-sm text-zinc-400'>
                Page {page} of {totalPages}
              </div>
              <div className='flex items-center gap-2'>
                <Button
                  onClick={() => setPage(page - 1)}
                  disabled={page === 1}
                  size='sm'
                  variant='outline'
                  className='border-zinc-700 text-white hover:bg-zinc-800'
                >
                  <ChevronLeft className='h-4 w-4' />
                  Previous
                </Button>
                <Button
                  onClick={() => setPage(page + 1)}
                  disabled={page === totalPages}
                  size='sm'
                  variant='outline'
                  className='border-zinc-700 text-white hover:bg-zinc-800'
                >
                  Next
                  <ChevronRight className='h-4 w-4' />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Job Details Modal */}
      <Dialog
        open={!!selectedJob}
        onOpenChange={open => !open && setSelectedJob(null)}
      >
        <DialogContent className='max-w-3xl max-h-[80vh] overflow-y-auto bg-zinc-900 border-zinc-800 text-white'>
          <DialogHeader>
            <DialogTitle className='text-white'>Job Details</DialogTitle>
            <DialogDescription className='text-zinc-400'>
              Full details for job {selectedJob?.id}
            </DialogDescription>
          </DialogHeader>

          {selectedJob && (
            <div className='space-y-4'>
              {/* Job Status and Basic Info */}
              <div className='grid grid-cols-2 gap-4'>
                <div className='space-y-2'>
                  <div className='text-sm text-zinc-400'>Status</div>
                  <div className='flex items-center gap-2'>
                    {getStatusIcon(selectedJob.status)}
                    <Badge
                      variant={getStatusBadgeVariant(selectedJob.status) as any}
                    >
                      {selectedJob.status}
                    </Badge>
                  </div>
                </div>

                <div className='space-y-2'>
                  <div className='text-sm text-zinc-400'>Job Name</div>
                  <div className='text-white font-medium'>
                    {selectedJob.name}
                  </div>
                </div>

                <div className='space-y-2'>
                  <div className='text-sm text-zinc-400'>Created</div>
                  <div className='text-white'>
                    {new Date(selectedJob.createdAt).toLocaleString()}
                  </div>
                </div>

                {selectedJob.completedAt && (
                  <div className='space-y-2'>
                    <div className='text-sm text-zinc-400'>Completed</div>
                    <div className='text-white'>
                      {new Date(selectedJob.completedAt).toLocaleString()}
                    </div>
                  </div>
                )}

                <div className='space-y-2'>
                  <div className='text-sm text-zinc-400'>Duration</div>
                  <div className='text-white'>
                    {formatDuration(selectedJob.duration)}
                  </div>
                </div>

                <div className='space-y-2'>
                  <div className='text-sm text-zinc-400'>Attempts</div>
                  <div className='text-white'>{selectedJob.attempts}</div>
                </div>
              </div>

              {/* Job Data */}
              <div className='space-y-2'>
                <div className='text-sm text-zinc-400'>Job Data</div>
                <div className='bg-zinc-800 rounded-lg p-3'>
                  <pre className='text-xs text-zinc-300 overflow-x-auto'>
                    {JSON.stringify(selectedJob.data, null, 2)}
                  </pre>
                </div>
              </div>

              {/* Job Result (if completed) */}
              {selectedJob.result && (
                <div className='space-y-2'>
                  <div className='text-sm text-zinc-400'>Result</div>
                  <div className='bg-zinc-800 rounded-lg p-3'>
                    <pre className='text-xs text-zinc-300 overflow-x-auto'>
                      {JSON.stringify(selectedJob.result, null, 2)}
                    </pre>
                  </div>
                </div>
              )}

              {/* Error Details (if failed) */}
              {selectedJob.error && (
                <div className='space-y-2'>
                  <div className='text-sm text-zinc-400'>Error</div>
                  <div className='bg-red-900/20 border border-red-800 rounded-lg p-3'>
                    <pre className='text-xs text-red-300 overflow-x-auto'>
                      {selectedJob.error}
                    </pre>
                  </div>
                </div>
              )}

              {/* Albums Added (for Spotify sync jobs) */}
              <JobAlbums jobId={selectedJob.id} jobName={selectedJob.name} />

              {/* Actions */}
              <div className='flex justify-end gap-2 pt-4 border-t border-zinc-800'>
                {selectedJob.status === 'failed' && (
                  <Button
                    onClick={() => {
                      handleRetryJob(selectedJob.id);
                      setSelectedJob(null);
                    }}
                    variant='outline'
                    className='border-zinc-700 text-white hover:bg-zinc-800'
                  >
                    <RefreshCw className='h-4 w-4 mr-2' />
                    Retry Job
                  </Button>
                )}
                <Button
                  onClick={() => setSelectedJob(null)}
                  variant='outline'
                  className='border-zinc-700 text-white hover:bg-zinc-800'
                >
                  Close
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
