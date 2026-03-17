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
  ChevronDown,
  ChevronUp,
  ArrowRight,
  FlaskConical,
} from 'lucide-react';
import { toast } from 'sonner';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

import { InspectionZone } from './InspectionZone';
import type { JobHistoryItem } from './ExpandableJobRow';

// ============================================================================
// Types
// ============================================================================

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

interface QueueDashboardProps {
  isActive: boolean;
  onSwitchToHistory: () => void;
}

// ============================================================================
// Helpers
// ============================================================================

const MONITORING_API = '/api/admin/worker';

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

/**
 * Convert a QueueJob snapshot into a JobHistoryItem for the InspectionZone.
 * This is a snapshot — not a live reference.
 */
function queueJobToHistoryItem(job: QueueJob): JobHistoryItem {
  return {
    id: job.id,
    name: job.name,
    status:
      job.status === 'failed'
        ? 'failed'
        : job.status === 'active'
          ? 'active'
          : 'waiting',
    data: job.data as Record<string, unknown>,
    error: job.error,
    createdAt: job.createdAt,
    processedOn: job.processedOn,
    attempts: job.attempts,
  };
}

// ============================================================================
// QueueDashboard Component
// ============================================================================

export function QueueDashboard({
  isActive,
  onSwitchToHistory,
}: QueueDashboardProps) {
  const [loading, setLoading] = useState<string | null>(null);
  const [snapshot, setSnapshot] = useState<QueueSnapshot | null>(null);
  const [snapshotLoading, setSnapshotLoading] = useState(true);
  const [snapshotError, setSnapshotError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [controlsOpen, setControlsOpen] = useState(false);
  const [inspectedJob, setInspectedJob] = useState<JobHistoryItem | null>(null);

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

  // Auto-refresh: pauses when tab is inactive
  useEffect(() => {
    fetchSnapshot();

    if (!isActive) return;

    const interval = setInterval(fetchSnapshot, 3000);
    return () => clearInterval(interval);
  }, [fetchSnapshot, isActive]);

  // ---- Queue Actions ----

  const handleQueueAction = async (action: string) => {
    setLoading(action);
    try {
      const response = await fetch(`${MONITORING_API}/queue/${action}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      if (!response.ok) throw new Error(`Failed to ${action} queue`);
      const data = await response.json();
      toast.success(data.message || `Queue ${action} successful`);
      fetchSnapshot();
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
    } catch {
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
        body: JSON.stringify({ olderThan: 86400000 }),
      });
      if (!response.ok) throw new Error('Cleanup failed');
      toast.success('Queue cleaned up successfully');
      fetchSnapshot();
    } catch {
      toast.error('Failed to cleanup queue');
    } finally {
      setLoading(null);
    }
  };

  const handleSendTestJobs = async () => {
    setLoading('test-jobs');
    try {
      const response = await fetch('/api/admin/queue/test-jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          count: 15,
          includeSlow: true,
          includeFail: true,
        }),
      });
      if (!response.ok) throw new Error('Failed to send test jobs');
      const data = await response.json();
      toast.success(`${data.total} test jobs queued`);
      fetchSnapshot();
    } catch {
      toast.error('Failed to send test jobs');
    } finally {
      setLoading(null);
    }
  };

  const handleJobClick = (job: QueueJob) => {
    setInspectedJob(queueJobToHistoryItem({ ...job }));
  };

  const stats = snapshot?.stats;
  const jobs = snapshot?.jobs;

  return (
    <div className='space-y-6'>
      {/* Queue Paused Banner */}
      {stats?.paused && (
        <div className='p-4 bg-yellow-900/20 border border-yellow-800 rounded-lg flex items-center gap-3'>
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
      <div className='grid grid-cols-2 md:grid-cols-5 gap-4'>
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

      {/* Auto-refresh indicator + Controls toggle */}
      <div className='flex items-center justify-between'>
        <div className='flex items-center gap-2'>
          {lastUpdated && (
            <span className='text-xs text-zinc-500'>
              Updated {formatTimeAgo(lastUpdated.toISOString())}
            </span>
          )}
          {isActive && !snapshotError && (
            <Badge
              variant='outline'
              className='border-green-800 text-green-400 text-xs'
            >
              <span className='w-1.5 h-1.5 bg-green-500 rounded-full mr-1.5 animate-pulse' />
              Live
            </Badge>
          )}
        </div>
        <div className='flex items-center gap-2'>
          <Button
            variant='outline'
            size='sm'
            onClick={fetchSnapshot}
            disabled={snapshotLoading}
            className='border-zinc-700 text-zinc-400 hover:bg-zinc-800 h-7'
          >
            <RefreshCw
              className={`h-3 w-3 ${snapshotLoading ? 'animate-spin' : ''}`}
            />
          </Button>
          <Button
            variant='outline'
            size='sm'
            onClick={() => setControlsOpen(!controlsOpen)}
            className='border-zinc-700 text-zinc-400 hover:bg-zinc-800 h-7'
          >
            {controlsOpen ? (
              <ChevronUp className='h-3 w-3 mr-1' />
            ) : (
              <ChevronDown className='h-3 w-3 mr-1' />
            )}
            Controls
          </Button>
        </div>
      </div>

      {/* Collapsible Controls Panel */}
      {controlsOpen && (
        <div className='grid grid-cols-1 lg:grid-cols-2 gap-4'>
          <Card className='bg-zinc-900 border-zinc-800'>
            <CardHeader className='py-3 px-4'>
              <CardTitle className='text-sm text-white'>
                Queue Controls
              </CardTitle>
            </CardHeader>
            <CardContent className='px-4 pb-4 space-y-3'>
              <div className='flex gap-2'>
                <Button
                  onClick={() => handleQueueAction('resume')}
                  disabled={
                    loading === 'resume' || (stats != null && !stats.paused)
                  }
                  className='flex-1 bg-green-700 hover:bg-green-600 text-white disabled:opacity-50'
                  size='sm'
                >
                  <PlayCircle className='h-3.5 w-3.5 mr-1.5' />
                  Resume
                </Button>
                <Button
                  onClick={() => handleQueueAction('pause')}
                  disabled={
                    loading === 'pause' || (stats != null && stats.paused)
                  }
                  className='flex-1 text-white border-zinc-700 hover:bg-zinc-700 disabled:opacity-50'
                  variant='outline'
                  size='sm'
                >
                  <PauseCircle className='h-3.5 w-3.5 mr-1.5' />
                  Pause
                </Button>
              </div>
              <Button
                onClick={handleRetryAllFailed}
                disabled={loading === 'retry-all' || !stats?.failed}
                variant='outline'
                size='sm'
                className='w-full justify-start text-white border-zinc-700 hover:bg-zinc-700 disabled:opacity-50'
              >
                <RotateCcw className='h-3.5 w-3.5 mr-1.5' />
                Retry All Failed
                {stats?.failed ? (
                  <Badge className='ml-auto bg-red-900 text-red-300 text-xs'>
                    {stats.failed}
                  </Badge>
                ) : null}
              </Button>
              <Button
                onClick={handleCleanup}
                disabled={loading === 'cleanup'}
                variant='outline'
                size='sm'
                className='w-full justify-start text-white border-zinc-700 hover:bg-zinc-700'
              >
                <Trash2 className='h-3.5 w-3.5 mr-1.5' />
                Clean Old Jobs (&gt;24h)
              </Button>
              <Button
                onClick={handleSendTestJobs}
                disabled={loading === 'test-jobs'}
                variant='outline'
                size='sm'
                className='w-full justify-start text-purple-300 border-purple-800/50 hover:bg-purple-900/20'
              >
                {loading === 'test-jobs' ? (
                  <Loader2 className='h-3.5 w-3.5 mr-1.5 animate-spin' />
                ) : (
                  <FlaskConical className='h-3.5 w-3.5 mr-1.5' />
                )}
                Send Test Jobs
              </Button>
            </CardContent>
          </Card>

          <Card className='bg-zinc-900 border-zinc-800'>
            <CardHeader className='py-3 px-4'>
              <CardTitle className='text-sm text-white'>
                Configuration
              </CardTitle>
            </CardHeader>
            <CardContent className='px-4 pb-4'>
              <div className='space-y-2 text-sm'>
                <div className='flex justify-between'>
                  <span className='text-zinc-400'>Rate Limit</span>
                  <Badge
                    variant='outline'
                    className='border-zinc-700 text-zinc-300 text-xs'
                  >
                    1 req/sec
                  </Badge>
                </div>
                <div className='flex justify-between'>
                  <span className='text-zinc-400'>Max Retries</span>
                  <span className='text-zinc-300'>3 attempts</span>
                </div>
                <div className='flex justify-between'>
                  <span className='text-zinc-400'>Backoff</span>
                  <span className='text-zinc-300'>Exponential</span>
                </div>
                <div className='flex justify-between'>
                  <span className='text-zinc-400'>Keep Completed</span>
                  <span className='text-zinc-300'>100 jobs</span>
                </div>
                <div className='flex justify-between'>
                  <span className='text-zinc-400'>Keep Failed</span>
                  <span className='text-zinc-300'>50 jobs</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Connection Error */}
      {snapshotError && (
        <Card className='bg-zinc-900 border-zinc-800'>
          <CardContent className='py-8'>
            <div className='flex flex-col items-center justify-center text-center'>
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
          </CardContent>
        </Card>
      )}

      {/* Three-Section Layout */}
      {!snapshotError && (
        <div className='space-y-4'>
          {/* Section 1: Upcoming Jobs (waiting + delayed) */}
          <Card className='bg-zinc-900 border-zinc-800'>
            <CardHeader className='py-3 px-4'>
              <CardTitle className='text-sm text-white flex items-center gap-2'>
                <Clock className='h-4 w-4 text-zinc-500' />
                Upcoming Jobs
                {(stats?.waiting ?? 0) + (stats?.delayed ?? 0) > 0 && (
                  <Badge
                    variant='outline'
                    className='text-xs border-zinc-700 text-zinc-400'
                  >
                    {(stats?.waiting ?? 0) + (stats?.delayed ?? 0)}
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className='px-4 pb-4'>
              {snapshotLoading && !snapshot ? (
                <div className='flex items-center justify-center py-4'>
                  <Loader2 className='h-4 w-4 text-zinc-500 animate-spin' />
                </div>
              ) : (
                <div className='space-y-1'>
                  {/* Delayed jobs first */}
                  {jobs?.delayed?.map(job => (
                    <div
                      key={`delayed-${job.id}`}
                      onClick={() => handleJobClick(job)}
                      className='bg-yellow-900/10 border border-yellow-900/20 rounded-lg px-3 py-2 flex items-center justify-between cursor-pointer hover:bg-yellow-900/20 transition-colors'
                    >
                      <div className='flex items-center gap-2'>
                        <Timer className='h-3 w-3 text-yellow-500' />
                        <span className='text-zinc-300 text-sm'>
                          {job.name}
                        </span>
                        {getJobDescription(job) && (
                          <span className='text-zinc-500 text-xs'>
                            {getJobDescription(job)}
                          </span>
                        )}
                      </div>
                      <Badge
                        variant='outline'
                        className='text-xs border-yellow-800 text-yellow-400'
                      >
                        delayed
                      </Badge>
                    </div>
                  ))}

                  {/* Waiting jobs */}
                  {jobs?.waiting?.slice(0, 10).map(job => (
                    <div
                      key={`waiting-${job.id}`}
                      onClick={() => handleJobClick(job)}
                      className='bg-zinc-800/50 rounded-lg px-3 py-2 flex items-center justify-between cursor-pointer hover:bg-zinc-800 transition-colors'
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
                  {(jobs?.waiting?.length ?? 0) > 10 && (
                    <p className='text-xs text-zinc-600 text-center pt-1'>
                      +{(jobs?.waiting?.length ?? 0) - 10} more waiting...
                    </p>
                  )}

                  {/* Empty state */}
                  {(!jobs?.waiting || jobs.waiting.length === 0) &&
                    (!jobs?.delayed || jobs.delayed.length === 0) && (
                      <div className='text-center py-4 text-zinc-600 text-sm'>
                        No upcoming jobs
                      </div>
                    )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Section 2: Live Queue (active) */}
          <Card className='bg-zinc-900 border-zinc-800'>
            <CardHeader className='py-3 px-4'>
              <CardTitle className='text-sm text-white flex items-center gap-2'>
                <Activity className='h-4 w-4 text-blue-500' />
                Live Queue
                {(stats?.active ?? 0) > 0 && (
                  <Badge
                    variant='outline'
                    className='text-xs border-blue-800 text-blue-400'
                  >
                    {stats?.active ?? 0} active
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className='px-4 pb-4'>
              {snapshotLoading && !snapshot ? (
                <div className='flex items-center justify-center py-4'>
                  <Loader2 className='h-4 w-4 text-zinc-500 animate-spin' />
                </div>
              ) : jobs?.active && jobs.active.length > 0 ? (
                <div className='space-y-2'>
                  {jobs.active.map(job => (
                    <div
                      key={job.id}
                      onClick={() => handleJobClick(job)}
                      className='bg-blue-900/20 border border-blue-800/50 rounded-lg p-3 cursor-pointer hover:bg-blue-900/30 transition-colors'
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
              ) : (
                <div className='text-center py-4 text-zinc-600 text-sm'>
                  No active jobs
                </div>
              )}
            </CardContent>
          </Card>

          {/* Section 3: Recently Finished (failed from snapshot) */}
          <Card className='bg-zinc-900 border-zinc-800'>
            <CardHeader className='py-3 px-4'>
              <div className='flex items-center justify-between'>
                <CardTitle className='text-sm text-white flex items-center gap-2'>
                  <CheckCircle className='h-4 w-4 text-zinc-500' />
                  Recently Finished
                </CardTitle>
                <Button
                  variant='ghost'
                  size='sm'
                  onClick={onSwitchToHistory}
                  className='text-zinc-400 hover:text-white h-7 text-xs'
                >
                  View full history
                  <ArrowRight className='h-3 w-3 ml-1' />
                </Button>
              </div>
            </CardHeader>
            <CardContent className='px-4 pb-4'>
              {snapshotLoading && !snapshot ? (
                <div className='flex items-center justify-center py-4'>
                  <Loader2 className='h-4 w-4 text-zinc-500 animate-spin' />
                </div>
              ) : jobs?.failed && jobs.failed.length > 0 ? (
                <div className='space-y-1'>
                  {jobs.failed.slice(0, 10).map(job => (
                    <div
                      key={job.id}
                      onClick={() => handleJobClick(job)}
                      className='bg-red-900/10 border border-red-900/20 rounded-lg px-3 py-2 cursor-pointer hover:bg-red-900/20 transition-colors'
                    >
                      <div className='flex items-center justify-between'>
                        <div className='flex items-center gap-2'>
                          <XCircle className='h-3 w-3 text-red-500' />
                          <span className='text-zinc-300 text-sm'>
                            {job.name}
                          </span>
                          {getJobDescription(job) && (
                            <span className='text-zinc-500 text-xs'>
                              {getJobDescription(job)}
                            </span>
                          )}
                        </div>
                        <Badge
                          variant='outline'
                          className='text-xs border-red-800 text-red-400'
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
              ) : (
                <div className='text-center py-4 text-zinc-600 text-sm'>
                  No recent failures
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Inspection Zone */}
      <InspectionZone
        inspectedJob={inspectedJob}
        onDismiss={() => setInspectedJob(null)}
      />
    </div>
  );
}
