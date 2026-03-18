'use client';

import React, { useState, useEffect } from 'react';
import {
  X,
  Activity,
  ChevronUp,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Search,
  PanelBottom,
  PanelRight,
} from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  useGetLlamaLogsQuery,
  useGetSyncJobByJobIdQuery,
  type LlamaLog,
  type GetSyncJobByJobIdQuery,
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

type DrawerSide = 'bottom' | 'right';
type SyncJobSummary = NonNullable<GetSyncJobByJobIdQuery['syncJobByJobId']>;

interface InspectionZoneProps {
  inspectedJob: JobHistoryItem | null;
  onDismiss: () => void;
}

// ============================================================================
// Shared content — rendered inside both drawer positions
// ============================================================================

function InspectionContent({
  inspectedJob,
  logs,
  loadingLogs,
  isSyncType,
  syncJob,
}: {
  inspectedJob: JobHistoryItem;
  logs: LlamaLog[];
  loadingLogs: boolean;
  isSyncType: boolean;
  syncJob: SyncJobSummary | null | undefined;
}) {
  return (
    <div className='space-y-4'>
      <JobDetailPanel job={inspectedJob} />

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

      {isSyncType && syncJob && (
        <div className='border-t border-zinc-800 pt-4'>
          <SyncJobExpandedContent syncJob={syncJob} />
        </div>
      )}
    </div>
  );
}

// ============================================================================
// InspectionZone — sticky drawer (bottom or right)
// ============================================================================

export function InspectionZone({
  inspectedJob,
  onDismiss,
}: InspectionZoneProps) {
  const [expanded, setExpanded] = useState(false);
  const [side, setSide] = useState<DrawerSide>('right');

  // Auto-expand when a new job is inspected
  useEffect(() => {
    if (inspectedJob) setExpanded(true);
  }, [inspectedJob]);

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

  const logs = (logsData?.llamaLogs || []) as LlamaLog[];
  const syncJob = syncData?.syncJobByJobId;

  const handleDismiss = () => {
    setExpanded(false);
    onDismiss();
  };

  const toggleSide = () => setSide(s => (s === 'bottom' ? 'right' : 'bottom'));

  // No job selected — show collapsed tab with hint
  if (!inspectedJob) {
    if (side === 'right') {
      return (
        <div className='fixed top-1/2 -translate-y-1/2 right-0 z-40 pointer-events-none'>
          <div className='pointer-events-auto'>
            <div className='bg-zinc-800/80 backdrop-blur-sm border border-r-0 border-zinc-700 rounded-l-lg px-2 py-4 flex flex-col items-center gap-2 text-zinc-600'>
              <Search className='h-3.5 w-3.5' />
              <span className='text-xs [writing-mode:vertical-lr] rotate-180'>
                Click a job to inspect
              </span>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className='fixed bottom-0 left-0 right-0 z-40 pointer-events-none'>
        <div className='max-w-5xl mx-auto px-4 flex justify-center pointer-events-auto'>
          <div className='bg-zinc-800/80 backdrop-blur-sm border border-b-0 border-zinc-700 rounded-t-lg px-4 py-2 flex items-center gap-2 text-zinc-600'>
            <Search className='h-3.5 w-3.5' />
            <span className='text-xs'>Click a job to inspect</span>
          </div>
        </div>
      </div>
    );
  }

  // ── Right side drawer ──────────────────────────────────────────────────────
  if (side === 'right') {
    return (
      <div className='fixed top-0 right-0 bottom-0 z-40 flex'>
        {/* Tab handle — vertical strip on the left edge */}
        <button
          onClick={() => setExpanded(prev => !prev)}
          className='self-start mt-20 flex flex-col items-center gap-2 bg-zinc-800 border border-r-0 border-zinc-700 rounded-l-lg px-2 py-3 hover:bg-zinc-750 transition-colors group cursor-pointer'
        >
          <Badge
            variant='outline'
            className='text-xs border-amber-500/30 text-amber-400 bg-amber-500/10 [writing-mode:vertical-lr] rotate-180 py-1 px-0.5'
          >
            Inspecting
          </Badge>
          {expanded ? (
            <ChevronRight className='h-4 w-4 text-zinc-500 group-hover:text-zinc-300' />
          ) : (
            <ChevronLeft className='h-4 w-4 text-zinc-500 group-hover:text-zinc-300' />
          )}
        </button>

        {/* Drawer body — slides left/right */}
        <div
          className={`bg-zinc-900 border-l border-zinc-700 transition-all duration-300 ease-in-out overflow-hidden h-full ${
            expanded ? 'w-[420px]' : 'w-0'
          }`}
        >
          <div className='w-[420px] h-full flex flex-col'>
            {/* Header */}
            <div className='flex items-center justify-between px-4 py-3 border-b border-zinc-800 shrink-0'>
              <div className='flex items-center gap-2 min-w-0'>
                <span className='text-sm font-medium text-white truncate'>
                  {inspectedJob.name}
                </span>
                <Badge
                  variant='outline'
                  className='text-xs border-zinc-700 text-zinc-400 shrink-0'
                >
                  {inspectedJob.status}
                </Badge>
              </div>
              <div className='flex items-center gap-1 shrink-0'>
                <Button
                  variant='ghost'
                  size='sm'
                  onClick={toggleSide}
                  className='text-zinc-500 hover:text-white h-7 w-7 p-0'
                  title='Switch to bottom'
                >
                  <PanelBottom className='h-3.5 w-3.5' />
                </Button>
                <Button
                  variant='ghost'
                  size='sm'
                  onClick={handleDismiss}
                  className='text-zinc-400 hover:text-white h-7 w-7 p-0'
                >
                  <X className='h-4 w-4' />
                </Button>
              </div>
            </div>

            {/* Job ID */}
            <div className='px-4 py-2 border-b border-zinc-800 shrink-0'>
              <span className='text-xs text-zinc-500 font-mono'>
                {inspectedJob.id}
              </span>
            </div>

            {/* Scrollable content */}
            <div className='overflow-y-auto flex-1 px-4 py-4'>
              <InspectionContent
                inspectedJob={inspectedJob}
                logs={logs}
                loadingLogs={loadingLogs}
                isSyncType={isSyncType}
                syncJob={syncJob}
              />
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Bottom drawer (default) ────────────────────────────────────────────────
  return (
    <div className='fixed bottom-0 left-0 right-0 z-40'>
      {/* Tab handle — always visible */}
      <div className='max-w-5xl mx-auto px-4'>
        <button
          onClick={() => setExpanded(prev => !prev)}
          className='flex items-center gap-2 bg-zinc-800 border border-b-0 border-zinc-700 rounded-t-lg px-4 py-2 hover:bg-zinc-750 transition-colors group cursor-pointer'
        >
          <Badge
            variant='outline'
            className='text-xs border-amber-500/30 text-amber-400 bg-amber-500/10'
          >
            Inspecting
          </Badge>
          <span className='text-sm font-medium text-white truncate max-w-[200px]'>
            {inspectedJob.name}
          </span>
          <Badge
            variant='outline'
            className='text-xs border-zinc-700 text-zinc-400'
          >
            {inspectedJob.status}
          </Badge>
          {expanded ? (
            <ChevronDown className='h-4 w-4 text-zinc-500 group-hover:text-zinc-300 ml-auto' />
          ) : (
            <ChevronUp className='h-4 w-4 text-zinc-500 group-hover:text-zinc-300 ml-auto' />
          )}
        </button>
      </div>

      {/* Drawer body — slides up/down */}
      <div
        className={`bg-zinc-900 border-t border-zinc-700 transition-all duration-300 ease-in-out overflow-hidden ${
          expanded ? 'max-h-[50vh]' : 'max-h-0'
        }`}
      >
        <div className='max-w-5xl mx-auto px-4'>
          {/* Header bar inside drawer */}
          <div className='flex items-center justify-between py-3'>
            <div className='flex items-center gap-2'>
              <span className='text-xs text-zinc-500 font-mono'>
                {inspectedJob.id}
              </span>
            </div>
            <div className='flex items-center gap-1'>
              <Button
                variant='ghost'
                size='sm'
                onClick={toggleSide}
                className='text-zinc-500 hover:text-white h-7 w-7 p-0'
                title='Switch to right side'
              >
                <PanelRight className='h-3.5 w-3.5' />
              </Button>
              <Button
                variant='ghost'
                size='sm'
                onClick={handleDismiss}
                className='text-zinc-400 hover:text-white h-7 w-7 p-0'
              >
                <X className='h-4 w-4' />
              </Button>
            </div>
          </div>

          {/* Scrollable content */}
          <div className='overflow-y-auto max-h-[calc(50vh-48px)] pb-4'>
            <InspectionContent
              inspectedJob={inspectedJob}
              logs={logs}
              loadingLogs={loadingLogs}
              isSyncType={isSyncType}
              syncJob={syncJob}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
