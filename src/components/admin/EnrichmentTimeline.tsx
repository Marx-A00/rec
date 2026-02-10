'use client';

import * as React from 'react';
import { formatDistanceToNow } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, ChevronUp, GitBranch, List } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Timeline,
  TimelineItem,
  TimelineIcon,
  TimelineHeader,
  TimelineTitle,
  TimelineDescription,
  TimelineTime,
  TimelineContent,
  TimelineConnector,
  TimelineEmpty,
} from '@/components/ui/timeline';
import { cn } from '@/lib/utils';
import { LlamaLogStatus, type LlamaLog } from '@/generated/graphql';

import { EnrichmentTree } from './EnrichmentTree';
import {
  formatOperationTitle,
  getItemDescription,
  getOperationIcon,
  getStatusColor,
  mapEnrichmentStatus,
  truncateError,
} from './enrichment-timeline-utils';

// ============================================================================
// Constants
// ============================================================================

/** Maximum children to show before truncation */
const TRUNCATION_THRESHOLD = 15;

/** Animation variants for staggered fade-in */
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.2 },
  },
};

// ============================================================================
// Types
// ============================================================================

type ViewMode = 'timeline' | 'tree';

interface EnrichmentTimelineProps {
  /** Array of enrichment logs to display (parent logs with optional children) */
  logs: LlamaLog[];
  /** Optional container class name */
  className?: string;
  /** Display variant - 'default' for full timeline, 'compact' for table rows */
  variant?: 'default' | 'compact';
  /** Optional max height with scrolling */
  maxHeight?: string;
  /** Override truncation threshold (default: 15) */
  truncateChildren?: number;
}

interface TimelineLogItemProps {
  log: LlamaLog;
  isExpanded: boolean;
  onToggleExpand: () => void;
  showAllChildren: boolean;
  onToggleShowAll: () => void;
  isChild?: boolean;
  compact?: boolean;
  truncationThreshold?: number;
}

// ============================================================================
// Expanded Details Component
// ============================================================================

interface ExpandedDetailsProps {
  log: LlamaLog;
}

function ExpandedDetails({ log }: ExpandedDetailsProps) {
  return (
    <motion.div
      initial={{ height: 0, opacity: 0 }}
      animate={{ height: 'auto', opacity: 1 }}
      exit={{ height: 0, opacity: 0 }}
      transition={{ duration: 0.2 }}
      className='overflow-hidden'
    >
      <div className='mt-2 space-y-2 border-l-2 border-zinc-700 pl-3 text-sm'>
        {/* Full error message */}
        {log.errorMessage && (
          <div className='space-y-1'>
            <p className='font-medium text-red-400'>Error Details:</p>
            <pre className='max-h-32 overflow-auto rounded bg-zinc-900 p-2 text-xs text-zinc-300'>
              {log.errorMessage}
            </pre>
          </div>
        )}

        {/* Duration */}
        {log.durationMs != null && (
          <p className='text-zinc-400'>
            <span className='font-medium text-zinc-300'>Duration:</span>{' '}
            {log.durationMs}ms
          </p>
        )}

        {/* Fields enriched */}
        {log.fieldsEnriched.length > 0 && (
          <div className='space-y-1'>
            <p className='font-medium text-zinc-300'>Fields Enriched:</p>
            <div className='flex flex-wrap gap-1'>
              {log.fieldsEnriched.map(field => (
                <span
                  key={field}
                  className='rounded bg-zinc-800 px-2 py-0.5 text-xs text-zinc-400'
                >
                  {field}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* API call count */}
        {log.apiCallCount > 0 && (
          <p className='text-zinc-400'>
            <span className='font-medium text-zinc-300'>API Calls:</span>{' '}
            {log.apiCallCount}
          </p>
        )}

        {/* Reason */}
        {log.reason && (
          <p className='text-zinc-400'>
            <span className='font-medium text-zinc-300'>Reason:</span>{' '}
            {log.reason}
          </p>
        )}
      </div>
    </motion.div>
  );
}

// ============================================================================
// Timeline Log Item Component
// ============================================================================

function TimelineLogItem({
  log,
  isExpanded,
  onToggleExpand,
  showAllChildren,
  onToggleShowAll,
  isChild = false,
  compact = false,
  truncationThreshold = TRUNCATION_THRESHOLD,
}: TimelineLogItemProps) {
  const Icon = getOperationIcon(log.operation, log.status);
  const iconColor = getStatusColor(log.status);
  const status = mapEnrichmentStatus(log.status);
  const hasError = log.status === LlamaLogStatus.Failed;
  const hasChildren = log.children && log.children.length > 0;
  const childCount = log.children?.length ?? 0;
  const displayedChildren = showAllChildren
    ? log.children
    : log.children?.slice(0, truncationThreshold);
  const hiddenCount = childCount - truncationThreshold;

  return (
    <TimelineItem
      status={status}
      error={hasError}
      className={cn(
        'outline-none focus:outline-none',
        isChild && 'ml-4 scale-95'
      )}
    >
      <TimelineIcon color={iconColor}>
        <Icon className={cn('h-4 w-4', compact && 'h-3 w-3')} />
      </TimelineIcon>

      <TimelineConnector />

      <TimelineHeader>
        <TimelineTitle
          className={cn(
            'cursor-pointer hover:text-white transition-colors',
            isChild && 'text-sm',
            compact && 'text-xs'
          )}
          onClick={onToggleExpand}
        >
          {formatOperationTitle(log.operation, log.entityType)}
        </TimelineTitle>
        {log.triggeredBy && (
          <span
            className={cn('text-xs text-zinc-500', compact && 'text-[10px]')}
          >
            by {log.triggeredBy}
          </span>
        )}
        <TimelineTime
          className={cn('text-xs text-zinc-500', compact && 'text-[10px]')}
        >
          {formatDistanceToNow(new Date(log.createdAt), { addSuffix: true })}
        </TimelineTime>
      </TimelineHeader>

      <TimelineContent className={cn(compact && 'mt-1 p-2')}>
        {(!compact || isExpanded) && (
          <TimelineDescription>{getItemDescription(log)}</TimelineDescription>
        )}

        {/* Inline error preview (not expanded) */}
        {hasError && !isExpanded && log.errorMessage && (
          <p
            className={cn(
              'mt-1 text-xs text-red-400',
              compact && 'text-[10px]'
            )}
          >
            {truncateError(log.errorMessage)}
          </p>
        )}

        {/* Expanded details */}
        <AnimatePresence>
          {isExpanded && <ExpandedDetails log={log} />}
        </AnimatePresence>

        {/* Children timeline (nested) */}
        {hasChildren && (
          <div className={cn('mt-4', compact && 'mt-2')}>
            <Timeline size={compact ? 'sm' : 'md'} animate={false}>
              {displayedChildren?.map(child => (
                <TimelineLogItem
                  key={child.id}
                  log={child}
                  isExpanded={false}
                  onToggleExpand={() => {}}
                  showAllChildren={true}
                  onToggleShowAll={() => {}}
                  isChild
                  compact={compact}
                  truncationThreshold={truncationThreshold}
                />
              ))}
            </Timeline>

            {/* Show more button for truncated children */}
            {!showAllChildren && hiddenCount > 0 && (
              <Button
                variant='ghost'
                size='sm'
                onClick={e => {
                  e.stopPropagation();
                  onToggleShowAll();
                }}
                className='mt-2 h-8 text-xs text-zinc-400 hover:text-zinc-200'
              >
                <ChevronDown className='mr-1 h-3 w-3' />
                Show {hiddenCount} more...
              </Button>
            )}

            {/* Collapse button when expanded */}
            {showAllChildren && hiddenCount > 0 && (
              <Button
                variant='ghost'
                size='sm'
                onClick={e => {
                  e.stopPropagation();
                  onToggleShowAll();
                }}
                className='mt-2 h-8 text-xs text-zinc-400 hover:text-zinc-200'
              >
                <ChevronUp className='mr-1 h-3 w-3' />
                Show less
              </Button>
            )}
          </div>
        )}
      </TimelineContent>
    </TimelineItem>
  );
}

// ============================================================================
// View Switcher Component
// ============================================================================

interface ViewSwitcherProps {
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
}

function ViewSwitcher({ viewMode, onViewModeChange }: ViewSwitcherProps) {
  return (
    <div className='mb-4 flex gap-1 rounded-lg bg-zinc-800/50 p-1'>
      <Button
        variant={viewMode === 'timeline' ? 'secondary' : 'ghost'}
        size='sm'
        onClick={() => onViewModeChange('timeline')}
        className={cn(
          'h-8 gap-1.5 px-3',
          viewMode === 'timeline' && 'bg-zinc-700'
        )}
      >
        <List className='h-4 w-4' />
        Timeline
      </Button>
      <Button
        variant={viewMode === 'tree' ? 'secondary' : 'ghost'}
        size='sm'
        onClick={() => onViewModeChange('tree')}
        className={cn('h-8 gap-1.5 px-3', viewMode === 'tree' && 'bg-zinc-700')}
      >
        <GitBranch className='h-4 w-4' />
        Tree
      </Button>
    </div>
  );
}

// ============================================================================
// EnrichmentTimeline Component
// ============================================================================

/**
 * EnrichmentTimeline - Main timeline component for enrichment logs.
 *
 * Features:
 * - View switcher (timeline/tree)
 * - Parent-child hierarchy rendering
 * - Truncation for long chains (15+ children)
 * - Click-to-expand for details
 * - Staggered fade-in animation
 * - Empty state handling
 *
 * @example
 * ```tsx
 * const { data } = useGetLlamaLogsWithChildrenQuery({
 *   entityId: albumId,
 *   includeChildren: true
 * });
 * <EnrichmentTimeline logs={data?.llamaLogs ?? []} />
 * ```
 */
export function EnrichmentTimeline({
  logs,
  className,
  variant = 'default',
  maxHeight,
  truncateChildren,
}: EnrichmentTimelineProps) {
  // Derived values
  const truncationThreshold = truncateChildren ?? TRUNCATION_THRESHOLD;
  const isCompact = variant === 'compact';
  const showViewSwitcher = !isCompact;

  // State
  const [viewMode, setViewMode] = React.useState<ViewMode>('timeline');
  const [expandedItems, setExpandedItems] = React.useState<Set<string>>(
    new Set()
  );
  const [showAllChildren, setShowAllChildren] = React.useState<
    Record<string, boolean>
  >({});

  // Handlers
  const toggleExpand = React.useCallback((id: string) => {
    setExpandedItems(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const toggleShowAll = React.useCallback((id: string) => {
    setShowAllChildren(prev => ({
      ...prev,
      [id]: !prev[id],
    }));
  }, []);

  // Empty state
  if (logs.length === 0) {
    return (
      <div className={cn('flex flex-col', className)}>
        {showViewSwitcher && (
          <ViewSwitcher viewMode={viewMode} onViewModeChange={setViewMode} />
        )}
        <TimelineEmpty>No enrichment history</TimelineEmpty>
      </div>
    );
  }

  return (
    <div
      className={cn('flex flex-col', className)}
      style={maxHeight ? { maxHeight, overflowY: 'auto' } : undefined}
    >
      {showViewSwitcher && (
        <ViewSwitcher viewMode={viewMode} onViewModeChange={setViewMode} />
      )}

      {viewMode === 'tree' ? (
        <EnrichmentTree logs={logs} />
      ) : (
        <motion.div
          variants={containerVariants}
          initial='hidden'
          animate='visible'
        >
          <Timeline size={isCompact ? 'sm' : undefined}>
            {logs.map(log => (
              <motion.div key={log.id} variants={itemVariants}>
                <TimelineLogItem
                  log={log}
                  isExpanded={expandedItems.has(log.id)}
                  onToggleExpand={() => toggleExpand(log.id)}
                  showAllChildren={showAllChildren[log.id] ?? false}
                  onToggleShowAll={() => toggleShowAll(log.id)}
                  compact={isCompact}
                  truncationThreshold={truncationThreshold}
                />
              </motion.div>
            ))}
          </Timeline>
        </motion.div>
      )}
    </div>
  );
}

export default EnrichmentTimeline;
