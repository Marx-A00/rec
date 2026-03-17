'use client';

import React from 'react';
import { Search, X, Activity } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import {
  useGetLlamaLogsQuery,
  useGetSyncJobByJobIdQuery,
  type LlamaLog,
} from '@/generated/graphql';

import { JobDetailPanel } from './JobDetailPanel';
import { EnrichmentSummaryStrip } from './EnrichmentSummaryStrip';
import { EnrichmentTimeline } from './EnrichmentTimeline';
import { EnrichmentTimelineModal } from './EnrichmentTimelineModal';
import { SyncJobExpandedContent } from './SyncJobExpandedContent';
import { isSyncJob } from './job-detail-utils';
import type { JobHistoryItem } from './ExpandableJobRow';

// ============================================================================
// Types
// ============================================================================

/**
 * The inspection zone accepts either a full JobHistoryItem (from job history)
 * or a QueueJob snapshot (from the live queue dashboard).
 * We normalize into JobHistoryItem shape for display.
 */
interface InspectionZoneProps {
  inspectedJob: JobHistoryItem | null;
  onDismiss: () => void;
}

// ============================================================================
// InspectionZone Component
// ============================================================================

export function InspectionZone({
  inspectedJob,
  onDismiss,
}: InspectionZoneProps) {
  // Fetch enrichment logs for inspected job
  const { data: logsData, isLoading: loadingLogs } = useGetLlamaLogsQuery(
    { parentJobId: inspectedJob?.id ?? '', limit: 100 },
    { enabled: !!inspectedJob }
  );

  // Fetch sync job record if applicable
  const isSyncType = inspectedJob ? isSyncJob(inspectedJob.name) : false;
  const { data: syncData } = useGetSyncJobByJobIdQuery(
    { jobId: inspectedJob?.id ?? '' },
    { enabled: !!inspectedJob && isSyncType }
  );

  const logs = logsData?.llamaLogs || [];
  const syncJob = syncData?.syncJobByJobId;

  // Empty state
  if (!inspectedJob) {
    return (
      <Card className='bg-zinc-800/30 border-dashed border-zinc-700'>
        <CardContent className='py-8'>
          <div className='text-center'>
            <Search className='h-8 w-8 mx-auto text-zinc-700 mb-2' />
            <p className='text-sm text-zinc-600'>Click a job to inspect</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Pinned state
  return (
    <Card className='bg-zinc-800/50 border-zinc-700'>
      <CardHeader className='py-3 px-4'>
        <div className='flex items-center justify-between'>
          <div className='flex items-center gap-2'>
            <Badge
              variant='outline'
              className='text-xs border-amber-500/30 text-amber-400 bg-amber-500/10'
            >
              Inspecting
            </Badge>
            <span className='text-sm font-medium text-white'>
              {inspectedJob.name}
            </span>
            <Badge
              variant='outline'
              className='text-xs border-zinc-700 text-zinc-400'
            >
              {inspectedJob.status}
            </Badge>
            <span className='text-xs text-zinc-500 font-mono'>
              {inspectedJob.id}
            </span>
          </div>
          <Button
            variant='ghost'
            size='sm'
            onClick={onDismiss}
            className='text-zinc-400 hover:text-white h-7 w-7 p-0'
          >
            <X className='h-4 w-4' />
          </Button>
        </div>
      </CardHeader>
      <CardContent className='max-h-96 overflow-y-auto px-4 pb-4 space-y-4'>
        {/* Job Details */}
        <JobDetailPanel job={inspectedJob} />

        {/* Enrichment data */}
        {loadingLogs ? (
          <div className='text-xs text-zinc-500 text-center py-2'>
            Loading enrichment logs...
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

        {/* Sync job details */}
        {isSyncType && syncJob && (
          <div className='border-t border-zinc-800 pt-4'>
            <SyncJobExpandedContent syncJob={syncJob} />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
