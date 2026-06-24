'use client';

import { useState, useEffect } from 'react';
import {
  RefreshCw,
  Play,
  Square,
  CheckCircle,
  XCircle,
  Clock,
  Loader2,
  Activity,
} from 'lucide-react';

const MONITORING_API =
  process.env.NODE_ENV === 'development'
    ? process.env.NEXT_PUBLIC_MONITORING_API_URL || 'http://localhost:3001'
    : '/api/admin/worker';

interface SchedulerInfo {
  enabled: boolean;
  nextRunAt: string | null;
  lastRunAt: string | null;
  intervalMinutes: number;
}

interface SchedulerStatus {
  musicbrainz: SchedulerInfo;
  listenbrainz: SchedulerInfo & { config: Record<string, unknown> };
  'deezer-editorial': SchedulerInfo & { config: Record<string, unknown> };
  queue: {
    waiting: number;
    active: number;
    completed: number;
    failed: number;
    delayed: number;
    paused: boolean;
  };
}

type SchedulerKey = 'musicbrainz' | 'listenbrainz' | 'deezer-editorial';

function formatRelativeTime(isoString: string | null): string {
  if (!isoString) return 'Never';
  const date = new Date(isoString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const absDiff = Math.abs(diffMs);
  const isFuture = diffMs < 0;

  if (absDiff < 60_000) return isFuture ? 'in < 1 min' : '< 1 min ago';
  if (absDiff < 3_600_000) {
    const mins = Math.round(absDiff / 60_000);
    return isFuture ? `in ${mins}m` : `${mins}m ago`;
  }
  if (absDiff < 86_400_000) {
    const hrs = Math.round(absDiff / 3_600_000);
    return isFuture ? `in ${hrs}h` : `${hrs}h ago`;
  }
  const days = Math.round(absDiff / 86_400_000);
  return isFuture ? `in ${days}d` : `${days}d ago`;
}

function SchedulerCard({
  name,
  schedulerKey,
  info,
  togglingAction,
  onToggle,
  onSync,
}: {
  name: string;
  schedulerKey: SchedulerKey;
  info: SchedulerInfo;
  togglingAction: string | null;
  onToggle: (key: SchedulerKey, action: 'start' | 'stop') => void;
  onSync: (key: SchedulerKey) => void;
}) {
  const isToggling = togglingAction?.startsWith(schedulerKey) ?? false;
  const disabled = schedulerKey === 'musicbrainz';

  return (
    <div
      className={`bg-zinc-900 border border-zinc-800 rounded-lg p-4 ${disabled ? 'opacity-40' : ''}`}
    >
      <div className='flex items-center justify-between mb-3'>
        <h3 className='text-sm font-semibold text-white'>{name}</h3>
        {disabled ? (
          <span className='text-xs text-zinc-600'>Not in use</span>
        ) : info.enabled ? (
          <span className='flex items-center gap-1 text-xs text-emerald-400'>
            <CheckCircle className='w-3 h-3' /> Running
          </span>
        ) : (
          <span className='flex items-center gap-1 text-xs text-zinc-500'>
            <XCircle className='w-3 h-3' /> Stopped
          </span>
        )}
      </div>

      <div className='space-y-1.5 text-xs text-zinc-400 mb-3'>
        <div className='flex items-center gap-1.5'>
          <Clock className='w-3 h-3 text-zinc-500' />
          <span>
            Interval:{' '}
            {info.intervalMinutes > 0
              ? `${Math.round(info.intervalMinutes / 1440)}d`
              : 'N/A'}
          </span>
        </div>
        <div>Last run: {formatRelativeTime(info.lastRunAt)}</div>
        <div>Next run: {formatRelativeTime(info.nextRunAt)}</div>
      </div>

      {!disabled && (
        <div className='flex gap-2'>
          {info.enabled ? (
            <button
              onClick={() => onToggle(schedulerKey, 'stop')}
              disabled={isToggling}
              className='flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-red-400 border border-red-900 rounded-lg hover:bg-red-950 transition-colors disabled:opacity-50'
            >
              {togglingAction === `${schedulerKey}-stop` ? (
                <Activity className='w-3 h-3 animate-spin' />
              ) : (
                <Square className='w-3 h-3' />
              )}
              Stop
            </button>
          ) : (
            <button
              onClick={() => onToggle(schedulerKey, 'start')}
              disabled={isToggling}
              className='flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-emerald-400 border border-emerald-900 rounded-lg hover:bg-emerald-950 transition-colors disabled:opacity-50'
            >
              {togglingAction === `${schedulerKey}-start` ? (
                <Activity className='w-3 h-3 animate-spin' />
              ) : (
                <Play className='w-3 h-3' />
              )}
              Start
            </button>
          )}
          <button
            onClick={() => onSync(schedulerKey)}
            disabled={isToggling}
            className='flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-zinc-300 border border-zinc-700 rounded-lg hover:bg-zinc-800 transition-colors disabled:opacity-50'
          >
            {togglingAction === `${schedulerKey}-sync` ? (
              <Activity className='w-3 h-3 animate-spin' />
            ) : (
              <RefreshCw className='w-3 h-3' />
            )}
            Sync Now
          </button>
        </div>
      )}
    </div>
  );
}

export default function SchedulerControlsPage() {
  const [status, setStatus] = useState<SchedulerStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Scheduler toggle state
  const [togglingAction, setTogglingAction] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  // Taste match state
  const [tasteMatchPending, setTasteMatchPending] = useState(false);
  const [tasteMatchResult, setTasteMatchResult] = useState<string | null>(null);

  const fetchStatus = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/scheduler/status');
      const data = await res.json();
      if (data.success) {
        setStatus(data.status);
        setError(null);
      } else {
        setError(data.error || 'Failed to fetch status');
      }
    } catch {
      setError('Failed to connect');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 10000);
    return () => clearInterval(interval);
  }, []);

  const handleToggle = async (
    scheduler: SchedulerKey,
    action: 'start' | 'stop'
  ) => {
    const key = `${scheduler}-${action}`;
    setTogglingAction(key);
    setActionMessage(null);
    try {
      const res = await fetch(`${MONITORING_API}/${scheduler}/${action}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await res.json();
      const labelMap: Record<string, string> = {
        musicbrainz: 'MusicBrainz',
        listenbrainz: 'ListenBrainz',
        'deezer-editorial': 'Deezer Editorial',
      };
      if (data.success) {
        setActionMessage(
          `${labelMap[scheduler]} scheduler ${action === 'start' ? 'started' : 'stopped'}`
        );
        setStatus(prev =>
          prev
            ? {
                ...prev,
                [scheduler]: {
                  ...prev[scheduler],
                  enabled: action === 'start',
                },
              }
            : prev
        );
        setTimeout(fetchStatus, 1500);
      } else {
        setActionMessage(`Failed: ${data.message || data.error}`);
      }
    } catch (err) {
      setActionMessage(
        `Error: ${err instanceof Error ? err.message : 'Request failed'}`
      );
    } finally {
      setTogglingAction(null);
      setTimeout(() => setActionMessage(null), 5000);
    }
  };

  const handleSync = async (scheduler: SchedulerKey) => {
    const key = `${scheduler}-sync`;
    setTogglingAction(key);
    setActionMessage(null);
    try {
      const res = await fetch(`${MONITORING_API}/${scheduler}/sync`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await res.json();
      const labelMap: Record<string, string> = {
        musicbrainz: 'MusicBrainz',
        listenbrainz: 'ListenBrainz',
        'deezer-editorial': 'Deezer Editorial',
      };
      if (data.success) {
        setActionMessage(`${labelMap[scheduler]} sync triggered`);
      } else {
        setActionMessage(`Failed: ${data.message || data.error}`);
      }
    } catch (err) {
      setActionMessage(
        `Error: ${err instanceof Error ? err.message : 'Request failed'}`
      );
    } finally {
      setTogglingAction(null);
      setTimeout(() => setActionMessage(null), 5000);
    }
  };

  const triggerTasteMatches = async () => {
    setTasteMatchPending(true);
    setTasteMatchResult(null);
    try {
      const res = await fetch('/api/admin/taste-matches', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        setTasteMatchResult(`Queued: ${data.jobId}`);
      } else {
        setTasteMatchResult(`Error: ${data.error}`);
      }
    } catch {
      setTasteMatchResult('Failed to trigger');
    } finally {
      setTasteMatchPending(false);
    }
  };

  return (
    <div className='p-8 max-w-4xl'>
      <div className='flex items-center justify-between mb-8'>
        <div>
          <h1 className='text-2xl font-bold text-white'>Scheduler Controls</h1>
          <p className='text-sm text-zinc-500 mt-1'>
            Monitor scheduled jobs and trigger manual runs
          </p>
        </div>
        <button
          onClick={fetchStatus}
          disabled={loading}
          className='flex items-center gap-2 px-3 py-2 text-sm text-zinc-300 bg-zinc-800 border border-zinc-700 rounded-lg hover:bg-zinc-700 transition-colors disabled:opacity-50'
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {error && (
        <div className='bg-red-950/50 border border-red-800 rounded-lg p-3 mb-6 text-sm text-red-400'>
          {error}
        </div>
      )}

      {actionMessage && (
        <div
          className={`rounded-lg p-3 mb-6 text-sm ${
            actionMessage.startsWith('Failed') ||
            actionMessage.startsWith('Error')
              ? 'bg-red-950/50 border border-red-800 text-red-400'
              : 'bg-green-950/50 border border-green-800 text-green-400'
          }`}
        >
          {actionMessage}
        </div>
      )}

      {/* Scheduler Cards with Controls */}
      {status && (
        <section className='mb-8'>
          <h2 className='text-sm font-semibold text-zinc-400 uppercase tracking-wider mb-3'>
            Release Sync Schedulers
          </h2>
          <div className='grid grid-cols-1 md:grid-cols-3 gap-3'>
            <SchedulerCard
              name='ListenBrainz'
              schedulerKey='listenbrainz'
              info={status.listenbrainz}
              togglingAction={togglingAction}
              onToggle={handleToggle}
              onSync={handleSync}
            />
            <SchedulerCard
              name='Deezer Editorial'
              schedulerKey='deezer-editorial'
              info={status['deezer-editorial']}
              togglingAction={togglingAction}
              onToggle={handleToggle}
              onSync={handleSync}
            />
            <SchedulerCard
              name='MusicBrainz'
              schedulerKey='musicbrainz'
              info={status.musicbrainz}
              togglingAction={togglingAction}
              onToggle={handleToggle}
              onSync={handleSync}
            />
          </div>
        </section>
      )}

      {/* Queue Stats */}
      {status && (
        <section className='mb-8'>
          <h2 className='text-sm font-semibold text-zinc-400 uppercase tracking-wider mb-3'>
            Queue Stats
          </h2>
          <div className='bg-zinc-900 border border-zinc-800 rounded-lg p-4'>
            <div className='flex flex-wrap gap-6 text-sm'>
              <div>
                <span className='text-zinc-500'>Waiting:</span>{' '}
                <span className='text-white font-medium'>
                  {status.queue.waiting}
                </span>
              </div>
              <div>
                <span className='text-zinc-500'>Active:</span>{' '}
                <span className='text-white font-medium'>
                  {status.queue.active}
                </span>
              </div>
              <div>
                <span className='text-zinc-500'>Completed:</span>{' '}
                <span className='text-white font-medium'>
                  {status.queue.completed}
                </span>
              </div>
              <div>
                <span className='text-zinc-500'>Failed:</span>{' '}
                <span className='text-white font-medium'>
                  {status.queue.failed}
                </span>
              </div>
              <div>
                <span className='text-zinc-500'>Delayed:</span>{' '}
                <span className='text-white font-medium'>
                  {status.queue.delayed}
                </span>
              </div>
              <div>
                <span className='text-zinc-500'>Paused:</span>{' '}
                <span className='text-white font-medium'>
                  {status.queue.paused ? 'Yes' : 'No'}
                </span>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Manual Triggers */}
      <section>
        <h2 className='text-sm font-semibold text-zinc-400 uppercase tracking-wider mb-3'>
          Manual Triggers
        </h2>
        <div className='space-y-3'>
          {/* Taste Matches */}
          <div className='bg-zinc-900 border border-zinc-800 rounded-lg p-4 flex items-center justify-between'>
            <div>
              <h3 className='text-sm font-semibold text-white'>
                Compute Taste Matches
              </h3>
              <p className='text-xs text-zinc-500 mt-0.5'>
                Recompute taste match scores for all users
              </p>
              {tasteMatchResult && (
                <p
                  className={`text-xs mt-1 ${tasteMatchResult.startsWith('Error') ? 'text-red-400' : 'text-emerald-400'}`}
                >
                  {tasteMatchResult}
                </p>
              )}
            </div>
            <button
              onClick={triggerTasteMatches}
              disabled={tasteMatchPending}
              className='flex items-center gap-2 px-4 py-2 text-sm font-medium text-black bg-cosmic-latte rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50'
            >
              {tasteMatchPending ? (
                <Loader2 className='w-4 h-4 animate-spin' />
              ) : (
                <Play className='w-4 h-4' />
              )}
              {tasteMatchPending ? 'Queuing...' : 'Run Now'}
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
