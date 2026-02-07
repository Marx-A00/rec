'use client';

import React from 'react';
import {
  ChevronDown,
  ChevronRight,
  Activity,
  RefreshCw,
  AlertCircle,
} from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { TableRow, TableCell } from '@/components/ui/table';
import {
  useGetEnrichmentLogsQuery,
  type EnrichmentLog,
} from '@/generated/graphql';

import { EnrichmentTimeline } from './EnrichmentTimeline';
import { SkeletonTimeline } from './SkeletonTimeline';
import { EnrichmentTimelineModal } from './EnrichmentTimelineModal';

// ============================================================================
// Types
// ============================================================================

export interface JobHistoryItem {
  id: string;
  name: string;
  status: 'completed' | 'failed' | 'active' | 'waiting' | 'delayed';
  data: Record<string, unknown>;
  result?: Record<string, unknown>;
  error?: string;
  createdAt: string;
  completedAt?: string;
  processedOn?: string;
  duration?: number;
  attempts: number;
  albumId?: string;
  albumName?: string;
}

export interface ExpandableJobRowProps {
  job: JobHistoryItem;
  isExpanded: boolean;
  onToggle: () => void;
  getStatusIcon: (status: string) => React.ReactNode;
  getStatusBadgeVariant: (status: string) => string;
  formatDuration: (ms?: number) => string;
  formatDistanceToNow: (date: Date) => string;
  onRetryJob: (jobId: string) => void;
}

// ============================================================================
// ExpandableJobRow Component
// ============================================================================

export function ExpandableJobRow({
  job,
  isExpanded,
  onToggle,
  getStatusIcon,
  getStatusBadgeVariant,
  formatDuration,
  formatDistanceToNow,
  onRetryJob,
}: ExpandableJobRowProps) {
  // Lazy fetch enrichment logs when expanded
  // Use job.id as parentJobId to find all logs linked to this BullMQ job
  const {
    data: logsData,
    isLoading: loadingLogs,
    error: logsError,
    refetch: refetchLogs,
  } = useGetEnrichmentLogsQuery(
    {
      parentJobId: job.id,
      limit: 100,
    },
    {
      enabled: isExpanded,
      refetchInterval: query => {
        if (!isExpanded) return false;
        const logs = query.state.data?.enrichmentLogs || [];
        if (logs.length === 0) return false;
        // Poll for 30 seconds after last log activity
        const lastLog = logs[logs.length - 1];
        const age = Date.now() - new Date(lastLog.createdAt).getTime();
        return age < 30000 ? 3000 : false;
      },
    }
  );

  const logs = logsData?.enrichmentLogs || [];
  // Badge with count appears after data has been fetched (query was enabled at least once)
  const hasBeenFetched = logsData !== undefined;

  return (
    <React.Fragment>
      <TableRow
        className='border-zinc-800 hover:bg-zinc-800/50 cursor-pointer'
        onClick={onToggle}
      >
        {/* Chevron column */}
        <TableCell className='w-8 px-2'>
          {isExpanded ? (
            <ChevronDown className='h-4 w-4 text-zinc-400' />
          ) : (
            <ChevronRight className='h-4 w-4 text-zinc-400' />
          )}
        </TableCell>

        {/* Status column */}
        <TableCell>
          <div className='flex items-center gap-2'>
            {getStatusIcon(job.status)}
            <Badge
              variant={
                getStatusBadgeVariant(job.status) as
                  | 'default'
                  | 'destructive'
                  | 'secondary'
                  | 'outline'
              }
              className='text-xs'
            >
              {job.status}
            </Badge>
          </div>
        </TableCell>

        {/* Job Name column with lazy badge */}
        <TableCell className='text-zinc-300 font-medium'>
          <div className='flex items-center gap-2'>
            {job.name}
            {hasBeenFetched && logs.length > 0 && (
              <Badge
                variant='outline'
                className='text-xs bg-purple-500/10 text-purple-300 border-purple-500/20'
              >
                <Activity className='h-3 w-3 mr-1' />
                {logs.length}
              </Badge>
            )}
          </div>
        </TableCell>

        {/* Album column */}
        <TableCell className='text-zinc-400'>{job.albumName || '-'}</TableCell>

        {/* Created column */}
        <TableCell className='text-zinc-400'>
          {formatDistanceToNow(new Date(job.createdAt))}
        </TableCell>

        {/* Duration column */}
        <TableCell className='text-zinc-400'>
          {formatDuration(job.duration)}
        </TableCell>

        {/* Attempts column */}
        <TableCell className='text-zinc-400'>{job.attempts}</TableCell>

        {/* Actions column */}
        <TableCell>
          {job.status === 'failed' && (
            <Button
              onClick={e => {
                e.stopPropagation();
                onRetryJob(job.id);
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

      {/* Expanded content row */}
      {isExpanded && (
        <TableRow className='border-zinc-800 bg-zinc-900/80'>
          <TableCell colSpan={8} className='p-0'>
            <div className='p-4 max-h-96 overflow-y-auto'>
              {loadingLogs ? (
                <SkeletonTimeline itemCount={3} />
              ) : logsError ? (
                <div className='py-4 text-center'>
                  <p className='text-sm text-red-400'>
                    Failed to load enrichment logs
                  </p>
                  <Button
                    variant='ghost'
                    size='sm'
                    onClick={e => {
                      e.stopPropagation();
                      refetchLogs();
                    }}
                    className='mt-2 text-xs'
                  >
                    Retry
                  </Button>
                </div>
              ) : logs.length === 0 ? (
                <div className='py-4 text-center'>
                  <p className='text-sm text-zinc-500'>
                    No enrichment logs for this job
                  </p>
                </div>
              ) : (
                <>
                  <EnrichmentTimeline
                    logs={logs as EnrichmentLog[]}
                    variant='compact'
                    truncateChildren={5}
                  />
                  {logs.length > 0 && (
                    <EnrichmentTimelineModal
                      parentLog={logs[0] as EnrichmentLog}
                      childLogs={logs.slice(1) as EnrichmentLog[]}
                    />
                  )}
                </>
              )}
            </div>
          </TableCell>
        </TableRow>
      )}
    </React.Fragment>
  );
}
