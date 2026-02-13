'use client';

import { formatDistanceToNow } from 'date-fns';

import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { LlamaLogStatus, type LlamaLog } from '@/generated/graphql';

import {
  formatOperationTitle,
  getStatusColor,
} from './enrichment-timeline-utils';

// ============================================================================
// Types
// ============================================================================

interface EnrichmentTreeProps {
  /** Array of enrichment logs to display (may have children) */
  logs: LlamaLog[];
  /** Optional container class name */
  className?: string;
}

// ============================================================================
// Status Badge Variant Mapping
// ============================================================================

function getStatusBadgeVariant(
  status: LlamaLogStatus
): 'default' | 'secondary' | 'destructive' | 'outline' {
  const color = getStatusColor(status);
  switch (color) {
    case 'primary':
      return 'default'; // success - green
    case 'secondary':
      return 'destructive'; // failed - red
    case 'accent':
      return 'outline'; // partial/preview - yellow/blue
    case 'muted':
    default:
      return 'secondary'; // skipped/no data - gray
  }
}

function getStatusLabel(status: LlamaLogStatus): string {
  switch (status) {
    case LlamaLogStatus.Success:
      return 'Success';
    case LlamaLogStatus.PartialSuccess:
      return 'Partial';
    case LlamaLogStatus.Failed:
      return 'Failed';
    case LlamaLogStatus.NoDataAvailable:
      return 'No Data';
    case LlamaLogStatus.Skipped:
      return 'Skipped';
    case LlamaLogStatus.Preview:
      return 'Preview';
    default:
      return 'Unknown';
  }
}

// ============================================================================
// Tree Item Component
// ============================================================================

interface TreeItemProps {
  log: LlamaLog;
  depth?: number;
}

function TreeItem({ log, depth = 0 }: TreeItemProps) {
  const hasChildren = log.children && log.children.length > 0;

  return (
    <div className='flex flex-col'>
      {/* Tree item row */}
      <div
        className={cn(
          'flex items-center gap-3 rounded-md px-3 py-2 transition-colors',
          'hover:bg-zinc-800/50',
          depth > 0 && 'ml-6 border-l border-zinc-700'
        )}
      >
        {/* Indent indicator for nested items */}
        {depth > 0 && (
          <div className='flex h-full items-center'>
            <div className='h-px w-4 bg-zinc-700' />
          </div>
        )}

        {/* Operation name */}
        <span
          className={cn(
            'flex-1 truncate',
            depth === 0 ? 'font-medium text-zinc-100' : 'text-sm text-zinc-300'
          )}
        >
          {formatOperationTitle(log.operation, log.entityType)}
        </span>

        {/* Status badge */}
        <Badge
          variant={getStatusBadgeVariant(log.status)}
          className='shrink-0 text-xs'
        >
          {getStatusLabel(log.status)}
        </Badge>

        {/* Relative timestamp */}
        <span className='shrink-0 text-xs text-zinc-500'>
          {formatDistanceToNow(new Date(log.createdAt), { addSuffix: true })}
        </span>
      </div>

      {/* Nested children */}
      {hasChildren && (
        <div className='flex flex-col'>
          {log.children?.map(child => (
            <TreeItem key={child.id} log={child} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// EnrichmentTree Component
// ============================================================================

/**
 * EnrichmentTree - Simple tree view fallback for enrichment logs.
 *
 * A compact, indented list view of enrichment operations.
 * Used as a fallback when the timeline view is problematic or for
 * users who prefer a simpler representation.
 *
 * @example
 * ```tsx
 * <EnrichmentTree logs={llamaLogs} />
 * ```
 */
export function EnrichmentTree({ logs, className }: EnrichmentTreeProps) {
  if (logs.length === 0) {
    return (
      <div
        className={cn(
          'flex flex-col items-center justify-center py-8 text-center',
          className
        )}
      >
        <p className='text-sm text-zinc-500'>No enrichment history</p>
      </div>
    );
  }

  return (
    <div className={cn('flex flex-col gap-1', className)}>
      {logs.map(log => (
        <TreeItem key={log.id} log={log} />
      ))}
    </div>
  );
}

export default EnrichmentTree;
