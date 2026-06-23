'use client';

import { useState, useEffect } from 'react';
import { RefreshCw, Play, CheckCircle, XCircle, Clock, Loader2 } from 'lucide-react';

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
  info,
}: {
  name: string;
  info: SchedulerInfo;
}) {
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-white">{name}</h3>
        {info.enabled ? (
          <span className="flex items-center gap-1 text-xs text-emerald-400">
            <CheckCircle className="w-3 h-3" /> Enabled
          </span>
        ) : (
          <span className="flex items-center gap-1 text-xs text-zinc-500">
            <XCircle className="w-3 h-3" /> Disabled
          </span>
        )}
      </div>
      <div className="space-y-1.5 text-xs text-zinc-400">
        <div className="flex items-center gap-1.5">
          <Clock className="w-3 h-3 text-zinc-500" />
          <span>Interval: {info.intervalMinutes > 0 ? `${info.intervalMinutes} min` : 'N/A'}</span>
        </div>
        <div>Last run: {formatRelativeTime(info.lastRunAt)}</div>
        <div>Next run: {formatRelativeTime(info.nextRunAt)}</div>
      </div>
    </div>
  );
}

export default function SchedulerControlsPage() {
  const [status, setStatus] = useState<SchedulerStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Action states
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
  }, []);

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
    <div className="p-8 max-w-4xl">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">Scheduler Controls</h1>
          <p className="text-sm text-zinc-500 mt-1">
            Monitor scheduled jobs and trigger manual runs
          </p>
        </div>
        <button
          onClick={fetchStatus}
          disabled={loading}
          className="flex items-center gap-2 px-3 py-2 text-sm text-zinc-300 bg-zinc-800 border border-zinc-700 rounded-lg hover:bg-zinc-700 transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {error && (
        <div className="bg-red-950/50 border border-red-800 rounded-lg p-3 mb-6 text-sm text-red-400">
          {error}
        </div>
      )}

      {/* Scheduler Status */}
      {status && (
        <section className="mb-8">
          <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider mb-3">
            Scheduled Jobs
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <SchedulerCard name="MusicBrainz" info={status.musicbrainz} />
            <SchedulerCard name="ListenBrainz" info={status.listenbrainz} />
            <SchedulerCard name="Deezer Editorial" info={status['deezer-editorial']} />
          </div>
        </section>
      )}

      {/* Queue Stats */}
      {status && (
        <section className="mb-8">
          <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider mb-3">
            Queue Stats
          </h2>
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
            <div className="flex flex-wrap gap-6 text-sm">
              <div>
                <span className="text-zinc-500">Waiting:</span>{' '}
                <span className="text-white font-medium">{status.queue.waiting}</span>
              </div>
              <div>
                <span className="text-zinc-500">Active:</span>{' '}
                <span className="text-white font-medium">{status.queue.active}</span>
              </div>
              <div>
                <span className="text-zinc-500">Completed:</span>{' '}
                <span className="text-white font-medium">{status.queue.completed}</span>
              </div>
              <div>
                <span className="text-zinc-500">Failed:</span>{' '}
                <span className="text-white font-medium">{status.queue.failed}</span>
              </div>
              <div>
                <span className="text-zinc-500">Delayed:</span>{' '}
                <span className="text-white font-medium">{status.queue.delayed}</span>
              </div>
              <div>
                <span className="text-zinc-500">Paused:</span>{' '}
                <span className="text-white font-medium">{status.queue.paused ? 'Yes' : 'No'}</span>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Manual Triggers */}
      <section>
        <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider mb-3">
          Manual Triggers
        </h2>
        <div className="space-y-3">
          {/* Taste Matches */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-white">Compute Taste Matches</h3>
              <p className="text-xs text-zinc-500 mt-0.5">
                Recompute taste match scores for all users
              </p>
              {tasteMatchResult && (
                <p className={`text-xs mt-1 ${tasteMatchResult.startsWith('Error') ? 'text-red-400' : 'text-emerald-400'}`}>
                  {tasteMatchResult}
                </p>
              )}
            </div>
            <button
              onClick={triggerTasteMatches}
              disabled={tasteMatchPending}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-black bg-cosmic-latte rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {tasteMatchPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Play className="w-4 h-4" />
              )}
              {tasteMatchPending ? 'Queuing...' : 'Run Now'}
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
