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
  useGetLlamaLogsQuery,
  useGetSyncJobByJobIdQuery,
  type LlamaLog,
} from '@/generated/graphql';

import { EnrichmentTimeline } from './EnrichmentTimeline';
import { SkeletonTimeline } from './SkeletonTimeline';
import { EnrichmentTimelineModal } from './EnrichmentTimelineModal';
import { JobDetailPanel } from './JobDetailPanel';
import { EnrichmentSummaryStrip } from './EnrichmentSummaryStrip';
import { SyncJobExpandedContent } from './SyncJobExpandedContent';
import { isSyncJob } from './job-detail-utils';

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
  const {
    data: logsData,
    isLoading: loadingLogs,
    error: logsError,
    refetch: refetchLogs,
  } = useGetLlamaLogsQuery(
    {
      parentJobId: job.id,
      limit: 100,
    },
    {
      enabled: isExpanded,
      refetchInterval: query => {
        if (!isExpanded) return false;
        const logs = query.state.data?.llamaLogs || [];
        if (logs.length === 0) return false;
        const lastLog = logs[logs.length - 1];
        const age = Date.now() - new Date(lastLog.createdAt).getTime();
        return age < 30000 ? 3000 : false;
      },
    }
  );

  // Lazy fetch sync job record when expanded and job is a sync type
  const isSyncType = isSyncJob(job.name);
  const { data: syncData } = useGetSyncJobByJobIdQuery(
    { jobId: job.id },
    { enabled: isExpanded && isSyncType }
  );

  const logs = logsData?.llamaLogs || [];
  const hasBeenFetched = logsData !== undefined;
  const syncJob = syncData?.syncJobByJobId;

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

        {/* Job Name column with llama indicator */}
        <TableCell className='text-zinc-300 font-medium'>
          <div className='flex items-center gap-2'>
            {job.name}
            {hasBeenFetched && logs.length > 0 && (
              <Badge
                variant='outline'
                className='text-xs bg-purple-500/10 text-purple-300 border-purple-500/20'
              >
                <span className='mr-1'>🦙</span>
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
            <div className='p-4 max-h-[600px] overflow-y-auto space-y-4'>
              {/* Section 1: Job Details (always shown) */}
              <JobDetailPanel job={job} />

              {/* Section 2: Enrichment data (when logs exist) */}
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
              ) : logs.length > 0 ? (
                <div className='space-y-3'>
                  <div className='flex items-center gap-1.5'>
                    <Activity className='h-3 w-3 text-purple-400' />
                    <span className='text-xs font-medium text-purple-300 uppercase tracking-wider'>
                      Enrichment Logs ({logs.length})
                    </span>
                  </div>
                  <EnrichmentSummaryStrip log={logs[0] as LlamaLog} />
                  <EnrichmentTimeline
                    logs={logs as LlamaLog[]}
                    variant='compact'
                    truncateChildren={5}
                  />
                  <EnrichmentTimelineModal
                    parentLog={logs[0] as LlamaLog}
                    childLogs={logs.slice(1) as LlamaLog[]}
                  />
                </div>
              ) : null}

              {/* Section 3: Sync job details (when sync job record exists) */}
              {isSyncType && syncJob && (
                <div className='border-t border-zinc-800 pt-4'>
                  <SyncJobExpandedContent syncJob={syncJob} />
                </div>
              )}
              {isSyncType && !syncJob && hasBeenFetched && (
                <div className='text-xs text-zinc-600 text-center py-2'>
                  No sync record found for this job
                </div>
              )}
            </div>
          </TableCell>
        </TableRow>
      )}
    </React.Fragment>
  );
}
