'use client';

import { ExternalLink } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import type { EnrichmentLog } from '@/generated/graphql';

import { EnrichmentTimeline } from './EnrichmentTimeline';

interface EnrichmentTimelineModalProps {
  parentLog: EnrichmentLog;
  childLogs: EnrichmentLog[];
}

export function EnrichmentTimelineModal({
  parentLog,
  childLogs,
}: EnrichmentTimelineModalProps) {
  const timelineLogs =
    childLogs.length > 0 ? [parentLog, ...childLogs] : [parentLog];

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button
          variant='link'
          size='sm'
          className='mt-2 text-xs text-blue-400 hover:text-blue-300 p-0 h-auto'
        >
          <ExternalLink className='h-3 w-3 mr-1' />
          View full timeline
        </Button>
      </DialogTrigger>
      <DialogContent className='max-w-3xl max-h-[85vh] overflow-hidden flex flex-col'>
        <DialogHeader>
          <DialogTitle>Enrichment Timeline</DialogTitle>
          <DialogDescription>
            {parentLog.operation} — {parentLog.entityType}
            {childLogs.length > 0 && ` (${childLogs.length} child jobs)`}
          </DialogDescription>
        </DialogHeader>
        <div className='flex-1 overflow-y-auto pr-2 custom-scrollbar'>
          <EnrichmentTimeline
            logs={timelineLogs}
            variant='default'
            className='mt-4'
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
