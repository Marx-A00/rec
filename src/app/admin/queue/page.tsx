// src/app/admin/queue/page.tsx
'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  PlayCircle,
  PauseCircle,
  RotateCcw,
  Trash2,
  AlertCircle,
  RefreshCw,
  Clock,
  Loader2,
  CheckCircle,
  XCircle,
  Timer,
  Pause,
  Activity,
} from 'lucide-react';
import { toast } from 'sonner';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

// Use proxy API route to securely communicate with worker
const MONITORING_API = '/api/admin/worker';

interface QueueStats {
  waiting: number;
  active: number;
  delayed: number;
  completed: number;
  failed: number;
  paused: boolean;
}

interface QueueJob {
  id: string;
  name: string;
  status: 'active' | 'waiting' | 'delayed' | 'failed';
  data: {
    query?: string;
    mbid?: string;
    artistMbid?: string;
    albumId?: string;
    artistId?: string;
  };
  createdAt: string;
  processedOn?: string;
  attempts: number;
  error?: string;
}

interface QueueSnapshot {
  stats: QueueStats;
  jobs: {
    active: QueueJob[];
    waiting: QueueJob[];
    delayed: QueueJob[];
    failed: QueueJob[];
  };
  timestamp: string;
}

function formatTimeAgo(dateString: string): string {
  const seconds = Math.floor(
    (Date.now() - new Date(dateString).getTime()) / 1000
  );
  if (seconds < 5) return 'just now';
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  return `${hours}h ago`;
}

function getJobDescription(job: QueueJob): string {
  if (job.data.query) return `"${job.data.query}"`;
  if (job.data.mbid) return `MBID: ${job.data.mbid.substring(0, 8)}...`;
  if (job.data.artistMbid)
    return `Artist: ${job.data.artistMbid.substring(0, 8)}...`;
  if (job.data.albumId)
    return `Album ID: ${job.data.albumId.substring(0, 8)}...`;
  if (job.data.artistId)
    return `Artist ID: ${job.data.artistId.substring(0, 8)}...`;
  return '';
}

export default function QueueManagementPage() {
  const [loading, setLoading] = useState<string | null>(null);
  const [snapshot, setSnapshot] = useState<QueueSnapshot | null>(null);
  const [snapshotLoading, setSnapshotLoading] = useState(true);
  const [snapshotError, setSnapshotError] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchSnapshot = useCallback(async () => {
    try {
      const response = await fetch(`${MONITORING_API}/queue/snapshot`);
      if (!response.ok) throw new Error('Failed to fetch queue snapshot');
      const data = await response.json();
      setSnapshot(data);
      setSnapshotError(null);
      setLastUpdated(new Date());
    } catch (err) {
      setSnapshotError(
        err instanceof Error ? err.message : 'Failed to connect to queue'
      );
    } finally {
      setSnapshotLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSnapshot();

    if (autoRefresh) {
      const interval = setInterval(fetchSnapshot, 3000); // Refresh every 3s
      return () => clearInterval(interval);
    }
  }, [fetchSnapshot, autoRefresh]);

  const handleQueueAction = async (action: string) => {
    setLoading(action);
    try {
      const response = await fetch(`${MONITORING_API}/queue/${action}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) {
        throw new Error(`Failed to ${action} queue`);
      }

      const data = await response.json();
      toast.success(data.message || `Queue ${action} successful`);
      fetchSnapshot(); // Refresh after action
    } catch (error) {
      toast.error(`Failed to ${action} queue: ${error}`);
    } finally {
      setLoading(null);
    }
  };

  const handleRetryAllFailed = async () => {
    setLoading('retry-all');
    try {
      const response = await fetch(`${MONITORING_API}/queue/retry-all-failed`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) throw new Error('Failed to retry jobs');

      toast.success('All failed jobs queued for retry');
      fetchSnapshot();
    } catch (error) {
      toast.error('Failed to retry jobs');
    } finally {
      setLoading(null);
    }
  };

  const handleCleanup = async () => {
    setLoading('cleanup');
    try {
      const response = await fetch(`${MONITORING_API}/queue/cleanup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ olderThan: 86400000 }), // 24 hours
      });

      if (!response.ok) {
        throw new Error('Cleanup failed');
      }

      toast.success('Queue cleaned up successfully');
      fetchSnapshot();
    } catch (error) {
      toast.error('Failed to cleanup queue');
    } finally {
      setLoading(null);
    }
  };

  const stats = snapshot?.stats;
  const jobs = snapshot?.jobs;

  return (
    <div className='p-8'>
      <div className='mb-8 flex items-center justify-between'>
        <div>
          <h1 className='text-3xl font-bold text-white'>Queue Management</h1>
          <p className='text-zinc-400 mt-1'>
            Control and manage the job processing queue
          </p>
        </div>
        <div className='flex items-center gap-3'>
          {lastUpdated && (
            <span className='text-xs text-zinc-500'>
              Updated {formatTimeAgo(lastUpdated.toISOString())}
            </span>
          )}
          <Button
            variant='outline'
            size='sm'
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={`border-zinc-700 ${autoRefresh ? 'text-green-400' : 'text-zinc-400'} hover:bg-zinc-800`}
          >
            <RefreshCw
              className={`h-4 w-4 mr-2 ${autoRefresh ? 'animate-spin' : ''}`}
              style={{ animationDuration: '3s' }}
            />
            {autoRefresh ? 'Auto' : 'Paused'}
          </Button>
          <Button
            variant='outline'
            size='sm'
            onClick={fetchSnapshot}
            disabled={snapshotLoading}
            className='border-zinc-700 text-white hover:bg-zinc-800'
          >
            <RefreshCw
              className={`h-4 w-4 ${snapshotLoading ? 'animate-spin' : ''}`}
            />
          </Button>
        </div>
      </div>

      {/* Queue Status Banner */}
      {stats?.paused && (
        <div className='mb-6 p-4 bg-yellow-900/20 border border-yellow-800 rounded-lg flex items-center gap-3'>
          <Pause className='h-5 w-5 text-yellow-400' />
          <div>
            <p className='text-yellow-200 font-medium'>Queue is Paused</p>
            <p className='text-yellow-300/70 text-sm'>
              Jobs are not being processed. Click Resume to continue.
            </p>
          </div>
        </div>
      )}

      {/* Live Stats Cards */}
      <div className='grid grid-cols-2 md:grid-cols-5 gap-4 mb-6'>
        <Card className='bg-zinc-900 border-zinc-800'>
          <CardContent className='pt-4'>
            <div className='flex items-center justify-between'>
              <div>
                <p className='text-xs text-zinc-500 uppercase tracking-wide'>
                  Waiting
                </p>
                <p className='text-2xl font-bold text-white'>
                  {snapshotLoading ? '-' : (stats?.waiting ?? 0)}
                </p>
              </div>
              <Clock className='h-8 w-8 text-zinc-600' />
            </div>
          </CardContent>
        </Card>

        <Card className='bg-zinc-900 border-zinc-800'>
          <CardContent className='pt-4'>
            <div className='flex items-center justify-between'>
              <div>
                <p className='text-xs text-zinc-500 uppercase tracking-wide'>
                  Active
                </p>
                <p className='text-2xl font-bold text-blue-400'>
                  {snapshotLoading ? '-' : (stats?.active ?? 0)}
                </p>
              </div>
              <Loader2
                className={`h-8 w-8 text-blue-500 ${stats?.active ? 'animate-spin' : ''}`}
              />
            </div>
          </CardContent>
        </Card>

        <Card className='bg-zinc-900 border-zinc-800'>
          <CardContent className='pt-4'>
            <div className='flex items-center justify-between'>
              <div>
                <p className='text-xs text-zinc-500 uppercase tracking-wide'>
                  Delayed
                </p>
                <p className='text-2xl font-bold text-yellow-400'>
                  {snapshotLoading ? '-' : (stats?.delayed ?? 0)}
                </p>
              </div>
              <Timer className='h-8 w-8 text-yellow-600' />
            </div>
          </CardContent>
        </Card>

        <Card className='bg-zinc-900 border-zinc-800'>
          <CardContent className='pt-4'>
            <div className='flex items-center justify-between'>
              <div>
                <p className='text-xs text-zinc-500 uppercase tracking-wide'>
                  Completed
                </p>
                <p className='text-2xl font-bold text-green-400'>
                  {snapshotLoading ? '-' : (stats?.completed ?? 0)}
                </p>
              </div>
              <CheckCircle className='h-8 w-8 text-green-600' />
            </div>
          </CardContent>
        </Card>

        <Card className='bg-zinc-900 border-zinc-800'>
          <CardContent className='pt-4'>
            <div className='flex items-center justify-between'>
              <div>
                <p className='text-xs text-zinc-500 uppercase tracking-wide'>
                  Failed
                </p>
                <p className='text-2xl font-bold text-red-400'>
                  {snapshotLoading ? '-' : (stats?.failed ?? 0)}
                </p>
              </div>
              <XCircle className='h-8 w-8 text-red-600' />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Live Job List */}
      <Card className='bg-zinc-900 border-zinc-800 mb-6'>
        <CardHeader className='pb-3'>
          <div className='flex items-center justify-between'>
            <CardTitle className='text-white flex items-center gap-2'>
              <Activity className='h-5 w-5 text-green-500' />
              Live Queue
            </CardTitle>
            {!snapshotError && (
              <Badge
                variant='outline'
                className='border-green-800 text-green-400'
              >
                <span className='w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse' />
                Connected
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {snapshotError ? (
            <div className='flex flex-col items-center justify-center py-8 text-center'>
              <AlertCircle className='h-10 w-10 text-red-500 mb-3' />
              <p className='text-red-400 font-medium'>Connection Error</p>
              <p className='text-zinc-500 text-sm mt-1 max-w-md'>
                {snapshotError}. Make sure the queue worker is running (pnpm
                queue:dev).
              </p>
              <Button
                onClick={fetchSnapshot}
                variant='outline'
                size='sm'
                className='mt-4 border-zinc-700 text-white hover:bg-zinc-800'
              >
                <RefreshCw className='h-4 w-4 mr-2' />
                Retry
              </Button>
            </div>
          ) : snapshotLoading && !snapshot ? (
            <div className='flex items-center justify-center py-8'>
              <Loader2 className='h-6 w-6 text-zinc-500 animate-spin' />
              <span className='ml-2 text-zinc-500'>Loading queue...</span>
            </div>
          ) : (
            <div className='space-y-4'>
              {/* Active Jobs */}
              {jobs?.active && jobs.active.length > 0 && (
                <div>
                  <h4 className='text-sm font-medium text-zinc-400 mb-2 flex items-center gap-2'>
                    <Loader2 className='h-3 w-3 animate-spin text-blue-500' />
                    Processing Now
                  </h4>
                  <div className='space-y-2'>
                    {jobs.active.map(job => (
                      <div
                        key={job.id}
                        className='bg-blue-900/20 border border-blue-800/50 rounded-lg p-3'
                      >
                        <div className='flex items-center justify-between'>
                          <div className='flex items-center gap-3'>
                            <Loader2 className='h-4 w-4 text-blue-400 animate-spin' />
                            <div>
                              <span className='text-white font-medium'>
                                {job.name}
                              </span>
                              {getJobDescription(job) && (
                                <span className='text-zinc-400 text-sm ml-2'>
                                  {getJobDescription(job)}
                                </span>
                              )}
                            </div>
                          </div>
                          <div className='text-xs text-zinc-500'>
                            Started{' '}
                            {formatTimeAgo(job.processedOn || job.createdAt)}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Waiting Jobs */}
              {jobs?.waiting && jobs.waiting.length > 0 && (
                <div>
                  <h4 className='text-sm font-medium text-zinc-400 mb-2 flex items-center gap-2'>
                    <Clock className='h-3 w-3 text-zinc-500' />
                    Waiting ({jobs.waiting.length})
                  </h4>
                  <div className='space-y-1'>
                    {jobs.waiting.slice(0, 10).map(job => (
                      <div
                        key={job.id}
                        className='bg-zinc-800/50 rounded-lg px-3 py-2 flex items-center justify-between'
                      >
                        <div className='flex items-center gap-2'>
                          <span className='text-zinc-300 text-sm'>
                            {job.name}
                          </span>
                          {getJobDescription(job) && (
                            <span className='text-zinc-500 text-xs'>
                              {getJobDescription(job)}
                            </span>
                          )}
                        </div>
                        <span className='text-xs text-zinc-600'>
                          {formatTimeAgo(job.createdAt)}
                        </span>
                      </div>
                    ))}
                    {jobs.waiting.length > 10 && (
                      <p className='text-xs text-zinc-600 text-center pt-2'>
                        +{jobs.waiting.length - 10} more waiting...
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Failed Jobs */}
              {jobs?.failed && jobs.failed.length > 0 && (
                <div>
                  <h4 className='text-sm font-medium text-red-400 mb-2 flex items-center gap-2'>
                    <XCircle className='h-3 w-3' />
                    Recent Failures ({jobs.failed.length})
                  </h4>
                  <div className='space-y-1'>
                    {jobs.failed.slice(0, 5).map(job => (
                      <div
                        key={job.id}
                        className='bg-red-900/20 border border-red-900/30 rounded-lg px-3 py-2'
                      >
                        <div className='flex items-center justify-between'>
                          <div>
                            <span className='text-zinc-300 text-sm'>
                              {job.name}
                            </span>
                            {getJobDescription(job) && (
                              <span className='text-zinc-500 text-xs ml-2'>
                                {getJobDescription(job)}
                              </span>
                            )}
                          </div>
                          <Badge
                            variant='outline'
                            className='text-red-400 border-red-800 text-xs'
                          >
                            {job.attempts} attempts
                          </Badge>
                        </div>
                        {job.error && (
                          <p className='text-xs text-red-400/70 mt-1 truncate'>
                            {job.error}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Empty State */}
              {(!jobs?.active || jobs.active.length === 0) &&
                (!jobs?.waiting || jobs.waiting.length === 0) &&
                (!jobs?.failed || jobs.failed.length === 0) && (
                  <div className='text-center py-8 text-zinc-500'>
                    <Clock className='h-10 w-10 mx-auto mb-3 text-zinc-700' />
                    <p>Queue is empty</p>
                    <p className='text-sm text-zinc-600'>
                      No jobs waiting or processing
                    </p>
                  </div>
                )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Queue Controls */}
      <div className='grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8'>
        <Card className='bg-zinc-900 border-zinc-800'>
          <CardHeader>
            <CardTitle className='text-white'>Queue Controls</CardTitle>
            <CardDescription className='text-zinc-400'>
              Start, stop, and manage the queue
            </CardDescription>
          </CardHeader>
          <CardContent className='space-y-4'>
            <div className='flex gap-2'>
              <Button
                onClick={() => handleQueueAction('resume')}
                disabled={loading === 'resume' || (stats && !stats.paused)}
                className='flex-1 bg-green-700 hover:bg-green-600 text-white disabled:opacity-50'
                variant='default'
              >
                <PlayCircle className='h-4 w-4 mr-2' />
                Resume Queue
              </Button>
              <Button
                onClick={() => handleQueueAction('pause')}
                disabled={loading === 'pause' || (stats && stats.paused)}
                className='flex-1 text-white border-zinc-700 hover:bg-zinc-700 disabled:opacity-50'
                variant='outline'
              >
                <PauseCircle className='h-4 w-4 mr-2' />
                Pause Queue
              </Button>
            </div>

            <div className='pt-4 border-t border-zinc-800'>
              <h4 className='font-medium mb-2 text-white'>
                Maintenance Actions
              </h4>
              <div className='space-y-2'>
                <Button
                  onClick={handleRetryAllFailed}
                  disabled={loading === 'retry-all' || !stats?.failed}
                  variant='outline'
                  className='w-full justify-start text-white border-zinc-700 hover:bg-zinc-700 disabled:opacity-50'
                >
                  <RotateCcw className='h-4 w-4 mr-2' />
                  Retry All Failed Jobs
                  {stats?.failed ? (
                    <Badge className='ml-auto bg-red-900 text-red-300'>
                      {stats.failed}
                    </Badge>
                  ) : null}
                </Button>
                <Button
                  onClick={handleCleanup}
                  disabled={loading === 'cleanup'}
                  variant='outline'
                  className='w-full justify-start text-white border-zinc-700 hover:bg-zinc-700'
                >
                  <Trash2 className='h-4 w-4 mr-2' />
                  Clean Old Jobs (&gt;24h)
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className='bg-zinc-900 border-zinc-800'>
          <CardHeader>
            <CardTitle className='text-white'>Queue Configuration</CardTitle>
            <CardDescription className='text-zinc-400'>
              Current queue settings and limits
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className='space-y-3'>
              <div className='flex justify-between'>
                <span className='text-sm font-medium text-zinc-300'>
                  Rate Limit
                </span>
                <Badge
                  variant='outline'
                  className='border-zinc-700 text-zinc-300'
                >
                  1 req/sec
                </Badge>
              </div>
              <div className='flex justify-between'>
                <span className='text-sm font-medium text-zinc-300'>
                  Max Retries
                </span>
                <span className='text-sm text-zinc-400'>3 attempts</span>
              </div>
              <div className='flex justify-between'>
                <span className='text-sm font-medium text-zinc-300'>
                  Backoff Type
                </span>
                <span className='text-sm text-zinc-400'>Exponential</span>
              </div>
              <div className='flex justify-between'>
                <span className='text-sm font-medium text-zinc-300'>
                  Keep Completed
                </span>
                <span className='text-sm text-zinc-400'>Last 100 jobs</span>
              </div>
              <div className='flex justify-between'>
                <span className='text-sm font-medium text-zinc-300'>
                  Keep Failed
                </span>
                <span className='text-sm text-zinc-400'>Last 50 jobs</span>
              </div>
            </div>

            <div className='mt-4 p-3 bg-yellow-900/20 rounded-lg border border-yellow-900/30'>
              <div className='flex items-start space-x-2'>
                <AlertCircle className='h-4 w-4 text-yellow-400 mt-0.5' />
                <div className='text-sm text-yellow-200'>
                  <p className='font-medium'>MusicBrainz API Rate Limit</p>
                  <p className='text-xs mt-1 text-yellow-300/80'>
                    Queue is limited to 1 request per second to comply with
                    MusicBrainz API requirements.
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* External Tools */}
      <Card className='bg-zinc-900 border-zinc-800'>
        <CardHeader>
          <CardTitle className='text-white'>External Tools</CardTitle>
          <CardDescription className='text-zinc-400'>
            Access advanced monitoring and management tools
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
            <a
              href='http://localhost:3001/admin/queues'
              target='_blank'
              rel='noopener noreferrer'
              className='block'
            >
              <div className='p-4 border border-zinc-800 rounded-lg hover:bg-zinc-800 transition-colors'>
                <h4 className='font-medium text-white'>Bull Board Dashboard</h4>
                <p className='text-sm text-zinc-400 mt-1'>
                  Visual queue management interface with job details
                </p>
              </div>
            </a>

            <a
              href='http://localhost:3001/metrics'
              target='_blank'
              rel='noopener noreferrer'
              className='block'
            >
              <div className='p-4 border border-zinc-800 rounded-lg hover:bg-zinc-800 transition-colors'>
                <h4 className='font-medium text-white'>Metrics API</h4>
                <p className='text-sm text-zinc-400 mt-1'>
                  Raw JSON metrics for integration with monitoring tools
                </p>
              </div>
            </a>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
