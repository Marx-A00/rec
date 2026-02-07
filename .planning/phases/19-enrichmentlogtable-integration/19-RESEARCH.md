# Phase 19: EnrichmentLogTable Integration - Research

**Researched:** 2026-02-06
**Domain:** React table expansion patterns, TanStack Query polling, component density variants
**Confidence:** HIGH

## Summary

Phase 19 integrates the EnrichmentTimeline component into EnrichmentLogTable expanded rows, allowing admins to view parent-child job hierarchies inline. The implementation requires lazy-loading children on row expansion, dynamic polling while rows are expanded, a compact timeline variant for table context, and a modal for full timeline inspection.

The codebase already has most primitives in place: `EnrichmentTimeline` wrapper component (Phase 18), GraphQL resolver with `includeChildren` parameter (Phase 17), `useGetEnrichmentLogsQuery` hook with polling support, Radix UI Dialog, and Skeleton component. The main work involves wiring these together with row expansion state management and creating a compact variant.

Key findings: React table expansion with lazy loading is a well-established pattern using controlled state + on-demand fetching. TanStack Query's `refetchInterval` accepts functions for dynamic polling control. Compact UI variants reduce whitespace and font sizes while maintaining information hierarchy. Skeleton loading should match content structure and respect `prefers-reduced-motion` for accessibility.

**Primary recommendation:** Use local React state to track expanded rows (existing pattern in table), fetch children on-demand with separate query hook, implement compact timeline variant via props, and use existing Dialog component for full view modal.

## Standard Stack

### Core

| Library                | Version      | Purpose                  | Why Standard                                                              |
| ---------------------- | ------------ | ------------------------ | ------------------------------------------------------------------------- |
| TanStack Query         | v5.79.0      | Data fetching + polling  | Already used throughout app, supports dynamic `refetchInterval` functions |
| Radix UI Dialog        | v1.1.14      | Modal for full timeline  | Already in use, accessible by default, composable primitives              |
| Framer Motion          | v12.23.14    | Timeline animations      | Already used in EnrichmentTimeline, required by timeline primitives       |
| React state (useState) | React 19.2.3 | Expansion state tracking | Standard pattern for table row expansion, already used in table           |

### Supporting

| Library            | Version | Purpose            | When to Use                                                  |
| ------------------ | ------- | ------------------ | ------------------------------------------------------------ |
| date-fns           | v4.1.0  | Time formatting    | Already imported in table and timeline                       |
| Skeleton component | Custom  | Loading states     | Already exists at `src/components/ui/skeletons/Skeleton.tsx` |
| cn utility         | Custom  | Class name merging | Standard pattern in codebase for Tailwind                    |

### Alternatives Considered

| Instead of                  | Could Use                | Tradeoff                                                                               |
| --------------------------- | ------------------------ | -------------------------------------------------------------------------------------- |
| Local state for expansion   | Zustand store            | Overkill - expansion state doesn't need persistence or cross-component sharing         |
| Separate query for children | Nested query in resolver | Current resolver already supports `includeChildren`, but lazy fetch is more performant |
| Dialog for full view        | Popover or sheet         | Dialog provides better focus management for large content inspection                   |

**Installation:**
No new dependencies required - all libraries already installed.

## Architecture Patterns

### Recommended Project Structure

```
src/components/admin/
├── EnrichmentLogTable.tsx          # Main table component (existing)
├── EnrichmentTimeline.tsx          # Timeline wrapper (existing, Phase 18)
├── EnrichmentTimelineCompact.tsx   # NEW: Compact variant for table rows
└── EnrichmentTimelineModal.tsx     # NEW: Full view modal wrapper
```

### Pattern 1: Lazy-Load Children on Row Expansion

**What:** Track expanded rows in local state, fetch children only when row is expanded for the first time, cache results per row.

**When to use:** Table displays parent-only rows initially, children are expensive to fetch or numerous.

**Example:**

```typescript
// Current table pattern (simplified)
const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

const toggleRow = (logId: string) => {
  setExpandedRows(prev => {
    const next = new Set(prev);
    if (next.has(logId)) {
      next.delete(logId);
    } else {
      next.add(logId);
    }
    return next;
  });
};

// NEW: Lazy fetch children per row
const { data: childrenData, isLoading: loadingChildren } =
  useGetEnrichmentLogsQuery(
    {
      parentJobId: log.jobId, // Query by parent
      limit: 100,
    },
    {
      enabled: expandedRows.has(log.id) && !!log.jobId, // Only fetch when expanded
    }
  );
```

**Alternative approach (batch fetch):** Current resolver supports `includeChildren: true` to fetch all parent + children in one query. Trade-off: More data upfront vs. on-demand loading. **Recommendation:** Use lazy fetch pattern to keep initial table load fast.

### Pattern 2: Dynamic Polling Based on Expansion State

**What:** Use TanStack Query's `refetchInterval` function form to poll only while relevant rows are expanded.

**When to use:** Real-time updates needed for expanded rows (watching active enrichment jobs).

**Example:**

```typescript
// Current table uses this pattern for top-level polling
const { data } = useGetEnrichmentLogsQuery(
  { entityType, entityId, limit },
  {
    refetchInterval: query => {
      // Poll if enrichment is active OR recent logs exist
      if (
        enrichmentStatus === 'PENDING' ||
        enrichmentStatus === 'IN_PROGRESS'
      ) {
        return 3000;
      }

      const logs = query.state.data?.enrichmentLogs || [];
      if (logs.length > 0) {
        const logAge = Date.now() - new Date(logs[0].createdAt).getTime();
        if (logAge < 30000) return 3000; // Keep polling 30s after last log
      }

      return false; // Stop polling
    },
  }
);

// NEW: Poll children while row is expanded
const { data: childrenData } = useGetEnrichmentLogsQuery(
  { parentJobId: log.jobId, limit: 100 },
  {
    enabled: expandedRows.has(log.id),
    refetchInterval: query => {
      // Only poll if row is still expanded AND has recent activity
      if (!expandedRows.has(log.id)) return false;

      const children = query.state.data?.enrichmentLogs || [];
      if (children.length === 0) return false;

      const mostRecent = children[children.length - 1];
      const age = Date.now() - new Date(mostRecent.createdAt).getTime();

      return age < 30000 ? 3000 : false; // Poll for 30s after last child
    },
  }
);
```

**Source:** TanStack Query docs - `refetchInterval` accepts `(data, query) => number | false`

### Pattern 3: Compact UI Variant via Props

**What:** Create density variants by reducing spacing, font sizes, and hiding secondary information. Use props to toggle between full and compact modes.

**When to use:** Component needs different density levels for different contexts (standalone vs. nested in table).

**Example:**

```typescript
// EnrichmentTimeline.tsx (existing)
interface EnrichmentTimelineProps {
  logs: EnrichmentLog[];
  className?: string;
  // NEW props for compact variant
  variant?: 'default' | 'compact';
  maxHeight?: string;
  truncateChildren?: number; // Override TRUNCATION_THRESHOLD
}

// Compact variant adjustments:
// - Timeline size='sm' instead of default 'md'
// - Hide descriptions by default (click item to expand)
// - Reduce truncation threshold from 15 to 5
// - Smaller text sizes (text-sm → text-xs)
// - Tighter spacing (gap-4 → gap-2)
// - Hide view switcher or make it minimal

<Timeline
  size={variant === 'compact' ? 'sm' : 'md'}
  className={variant === 'compact' ? 'gap-2' : 'gap-6'}
>
  {/* Items render with conditional detail visibility */}
</Timeline>
```

**Best practice:** Don't create separate component files for variants - use props to toggle behavior. Keeps maintenance simple and ensures consistent logic.

### Pattern 4: Skeleton Loading for Timeline

**What:** Show placeholder timeline items (2-3) with shimmer animation while children are loading.

**When to use:** Async data fetching with expected content structure known upfront.

**Example:**

```typescript
// In expanded row content
{isLoadingChildren ? (
  <div className="space-y-2 py-4">
    {Array.from({ length: 3 }).map((_, i) => (
      <div key={i} className="flex gap-3 animate-pulse">
        <Skeleton className="h-8 w-8 rounded-full" /> {/* Icon */}
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-32" /> {/* Title */}
          <Skeleton className="h-3 w-48" /> {/* Description */}
        </div>
        <Skeleton className="h-3 w-16" /> {/* Time */}
      </div>
    ))}
  </div>
) : (
  <EnrichmentTimeline
    logs={[parentLog, ...childrenData]}
    variant="compact"
  />
)}
```

**Accessibility:** Existing Skeleton component uses `animate-pulse` which respects `prefers-reduced-motion` via Tailwind's default behavior.

### Pattern 5: Modal for Full Timeline View

**What:** Use Radix Dialog to show complete timeline in overlay when user clicks "View full timeline" link in compact view.

**When to use:** Compact view hides details that user may want to inspect without leaving table context.

**Example:**

```typescript
// In table expanded row
<Dialog>
  <DialogTrigger asChild>
    <Button variant="link" size="sm" className="text-xs">
      View full timeline
    </Button>
  </DialogTrigger>
  <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
    <DialogHeader>
      <DialogTitle>Enrichment Timeline - {log.operation}</DialogTitle>
      <DialogDescription>
        Complete job hierarchy for {log.entityType} enrichment
      </DialogDescription>
    </DialogHeader>
    <EnrichmentTimeline
      logs={[parentLog, ...childrenData]}
      variant="default" // Full variant in modal
      className="mt-4"
    />
  </DialogContent>
</Dialog>
```

**Sizing best practice:** Use `max-w-3xl` (768px) for timeline content in modal, `max-h-[85vh]` to prevent overflow on short screens, `overflow-y-auto` for scrolling.

### Anti-Patterns to Avoid

- **Fetching all children upfront:** Don't use `includeChildren: true` in main table query - this loads data for collapsed rows unnecessarily. Lazy load per row instead.
- **Polling without conditions:** Don't poll children queries unconditionally - tie polling to expansion state and recent activity to avoid unnecessary requests.
- **Creating separate compact component:** Don't duplicate EnrichmentTimeline as `EnrichmentTimelineCompact.tsx` - use variant prop to avoid code divergence.
- **Nested query dependencies:** Don't make children query depend on parent query refetch - they're independent once parent is fetched. Use separate queries with proper cache keys.

## Don't Hand-Roll

| Problem               | Don't Build                    | Use Instead                      | Why                                                 |
| --------------------- | ------------------------------ | -------------------------------- | --------------------------------------------------- |
| Row expansion state   | Custom context provider        | `useState` in component          | Simple local state, no cross-component needs        |
| Skeleton placeholders | Custom shimmer animation       | Existing Skeleton component      | Already handles accessibility, Tailwind integration |
| Modal/dialog          | Custom overlay + focus trap    | Radix UI Dialog (existing)       | Accessibility, focus management, portal rendering   |
| Polling logic         | `setInterval` or manual timers | TanStack Query `refetchInterval` | Handles cleanup, pause on window blur, cancellation |
| Loading states        | Manual isLoading flags         | TanStack Query status            | Integrated with cache, handles race conditions      |

**Key insight:** TanStack Query handles complex async state (loading, error, stale, refetching) and edge cases (race conditions, cleanup, cache invalidation) that are error-prone to hand-roll. Radix UI handles accessibility requirements (focus traps, ARIA attributes, keyboard navigation) that are often forgotten in custom implementations.

## Common Pitfalls

### Pitfall 1: Forgetting to Filter Child Logs from Main Table

**What goes wrong:** Both parent and child logs appear as separate rows in the table, creating duplicate information and confusing hierarchy.

**Why it happens:** Current table query doesn't filter by `parentJobId: null`, so it fetches all logs.

**How to avoid:**

```typescript
// Add parentJobId filter to main table query
const { data } = useGetEnrichmentLogsQuery({
  entityType,
  entityId,
  limit,
  parentJobId: null, // NEW: Only fetch root/parent logs
});
```

**Warning signs:** Table shows more rows than expected, logs appear multiple times, clicking parent shows child that's also a separate row.

### Pitfall 2: Polling All Children Queries Simultaneously

**What goes wrong:** If 10 rows are expanded, 10 separate queries poll simultaneously, overwhelming the server and browser.

**Why it happens:** Each children query has `refetchInterval: 3000` without considering global state.

**How to avoid:** Use function form of `refetchInterval` that checks expansion state:

```typescript
refetchInterval: query => {
  // Stop polling if row was collapsed
  if (!expandedRows.has(logId)) return false;

  // Stop polling if no recent activity
  const children = query.state.data?.enrichmentLogs || [];
  if (children.length === 0) return false;

  const age =
    Date.now() - new Date(children[children.length - 1].createdAt).getTime();
  return age < 30000 ? 3000 : false;
};
```

**Warning signs:** Network tab shows many simultaneous requests, performance degradation with multiple expanded rows, high server load.

### Pitfall 3: Stale Expansion State After Query Invalidation

**What goes wrong:** User expands row, parent query refetches (due to invalidation), row collapses unexpectedly because component re-renders.

**Why it happens:** Expansion state stored by array index instead of stable ID.

**How to avoid:** Use log.id (UUID) for expansion tracking, not array indices:

```typescript
// WRONG
const [expandedIndices, setExpandedIndices] = useState<Set<number>>(new Set());

// CORRECT (current pattern)
const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
```

**Warning signs:** Rows collapse on unrelated data updates, expansion doesn't persist across refetches.

### Pitfall 4: Not Handling Empty Children State

**What goes wrong:** Timeline shows empty state or crashes when parent has `jobId` but zero children (legitimate case for solo jobs).

**Why it happens:** Assuming `jobId` presence means children exist.

**How to avoid:** Show single-item timeline for solo logs:

```typescript
const children = childrenData?.enrichmentLogs || [];
const timelineLogs = children.length > 0
  ? [parentLog, ...children]  // Parent + children tree
  : [parentLog];               // Solo log as single item

<EnrichmentTimeline logs={timelineLogs} variant="compact" />
```

**Warning signs:** Empty expanded rows, "No enrichment history" in timeline when parent log is visible.

### Pitfall 5: Compact Variant Breaking Existing Features

**What goes wrong:** Adding compact variant accidentally disables view switcher, truncation, or expand-on-click in standalone timeline.

**Why it happens:** Conditionals based on `variant` prop affect default behavior unintentionally.

**How to avoid:** Make compact variant additive, not subtractive:

```typescript
// Default behavior always available
const truncationThreshold = props.truncateChildren ?? TRUNCATION_THRESHOLD;
const showViewSwitcher = props.variant !== 'compact'; // Explicit opt-out
const defaultExpanded = props.variant === 'compact' ? false : undefined;

// Compact variant adds constraints, doesn't remove features
<Timeline size={variant === 'compact' ? 'sm' : 'md'}>
  {/* Core timeline logic unchanged */}
</Timeline>
```

**Warning signs:** Standalone timeline breaks after adding compact variant, tests fail for default behavior.

## Code Examples

Verified patterns from codebase and best practices:

### Lazy-Load Children on Expansion

```typescript
// src/components/admin/EnrichmentLogTable.tsx (modified)
export function EnrichmentLogTable({ entityType, entityId, limit = 100 }: Props) {
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  // Main table query - parent logs only
  const { data, isLoading } = useGetEnrichmentLogsQuery(
    {
      entityType,
      entityId,
      limit,
      parentJobId: null, // NEW: Filter to root logs only
    },
    {
      enabled: !!(entityType || entityId),
      refetchInterval: /* existing polling logic */
    }
  );

  const parentLogs = data?.enrichmentLogs || [];

  return (
    <Table>
      <TableBody>
        {parentLogs.map(log => (
          <ExpandableLogRow
            key={log.id}
            log={log}
            isExpanded={expandedRows.has(log.id)}
            onToggle={() => toggleRow(log.id)}
          />
        ))}
      </TableBody>
    </Table>
  );
}

// NEW: Separate component for expandable row
function ExpandableLogRow({ log, isExpanded, onToggle }: Props) {
  // Lazy fetch children only when expanded
  const { data: childrenData, isLoading: loadingChildren } =
    useGetEnrichmentLogsQuery(
      {
        parentJobId: log.jobId,
        limit: 100
      },
      {
        enabled: isExpanded && !!log.jobId,
        refetchInterval: (query) => {
          if (!isExpanded) return false;

          const children = query.state.data?.enrichmentLogs || [];
          if (children.length === 0) return false;

          const lastChild = children[children.length - 1];
          const age = Date.now() - new Date(lastChild.createdAt).getTime();

          return age < 30000 ? 3000 : false;
        }
      }
    );

  const children = childrenData?.enrichmentLogs || [];
  const hasChildren = children.length > 0;

  return (
    <>
      <TableRow onClick={onToggle} className="cursor-pointer">
        <TableCell className="w-8">
          {isExpanded ? (
            <ChevronDown className="h-4 w-4" />
          ) : (
            <ChevronRight className="h-4 w-4" />
          )}
        </TableCell>
        {/* ... other cells ... */}
      </TableRow>

      {isExpanded && (
        <TableRow className="bg-zinc-900/80">
          <TableCell colSpan={10} className="p-0">
            <div className="p-4 max-h-96 overflow-y-auto">
              {loadingChildren ? (
                <SkeletonTimeline />
              ) : (
                <EnrichmentTimeline
                  logs={hasChildren ? [log, ...children] : [log]}
                  variant="compact"
                  truncateChildren={5}
                />
              )}

              {/* View full timeline link */}
              <EnrichmentTimelineModal
                log={log}
                children={children}
              />
            </div>
          </TableCell>
        </TableRow>
      )}
    </>
  );
}
```

### Skeleton Timeline Component

```typescript
// src/components/admin/SkeletonTimeline.tsx (NEW)
import { Skeleton } from '@/components/ui/skeletons/Skeleton';

export function SkeletonTimeline({ itemCount = 3 }: { itemCount?: number }) {
  return (
    <div className="space-y-4" role="status" aria-busy="true" aria-live="polite">
      <span className="sr-only">Loading timeline...</span>
      {Array.from({ length: itemCount }).map((_, i) => (
        <div key={i} className="flex gap-3">
          {/* Icon */}
          <Skeleton className="h-8 w-8 rounded-full shrink-0" />

          {/* Content */}
          <div className="flex-1 space-y-2">
            <div className="flex items-center justify-between">
              <Skeleton className="h-4 w-32" /> {/* Title */}
              <Skeleton className="h-3 w-16" /> {/* Time */}
            </div>
            <Skeleton className="h-3 w-48" /> {/* Description */}
            <Skeleton className="h-16 w-full rounded" /> {/* Content card */}
          </div>
        </div>
      ))}
    </div>
  );
}
```

### Compact Timeline Variant

```typescript
// src/components/admin/EnrichmentTimeline.tsx (modified)
interface EnrichmentTimelineProps {
  logs: EnrichmentLog[];
  className?: string;
  variant?: 'default' | 'compact'; // NEW
  maxHeight?: string; // NEW
  truncateChildren?: number; // NEW - override TRUNCATION_THRESHOLD
}

export function EnrichmentTimeline({
  logs,
  className,
  variant = 'default',
  maxHeight,
  truncateChildren,
}: EnrichmentTimelineProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('timeline');
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const [showAllChildren, setShowAllChildren] = useState<Record<string, boolean>>({});

  // Compact variant adjustments
  const truncationThreshold = truncateChildren ?? TRUNCATION_THRESHOLD;
  const showViewSwitcher = variant !== 'compact';
  const timelineSize = variant === 'compact' ? 'sm' : 'md';

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
        <motion.div variants={containerVariants} initial="hidden" animate="visible">
          <Timeline size={timelineSize}>
            {logs.map(log => (
              <motion.div key={log.id} variants={itemVariants}>
                <TimelineLogItem
                  log={log}
                  isExpanded={expandedItems.has(log.id)}
                  onToggleExpand={() => toggleExpand(log.id)}
                  showAllChildren={showAllChildren[log.id] ?? false}
                  onToggleShowAll={() => toggleShowAll(log.id)}
                  truncationThreshold={truncationThreshold}
                  compact={variant === 'compact'} // NEW prop
                />
              </motion.div>
            ))}
          </Timeline>
        </motion.div>
      )}
    </div>
  );
}

// TimelineLogItem modifications for compact mode
function TimelineLogItem({
  log,
  compact = false,
  truncationThreshold = TRUNCATION_THRESHOLD,
  // ... other props
}: TimelineLogItemProps) {
  // In compact mode:
  // - Hide description by default (show only on expand)
  // - Use smaller text sizes
  // - Reduce spacing

  return (
    <TimelineItem
      status={status}
      error={hasError}
      className={cn(
        'cursor-pointer transition-shadow hover:shadow-md',
        isChild && 'ml-4 scale-95'
      )}
      onClick={onToggleExpand}
    >
      <TimelineIcon color={iconColor}>
        <Icon className={cn('h-4 w-4', compact && 'h-3 w-3')} />
      </TimelineIcon>

      <TimelineConnector />

      <TimelineHeader>
        <TimelineTitle className={cn(isChild && 'text-sm', compact && 'text-xs')}>
          {formatOperationTitle(log.operation, log.entityType)}
        </TimelineTitle>
        <TimelineTime className={cn('text-xs text-zinc-500', compact && 'text-[10px]')}>
          {formatDistanceToNow(new Date(log.createdAt), { addSuffix: true })}
        </TimelineTime>
      </TimelineHeader>

      <TimelineContent className={cn(compact && 'mt-1 p-2')}>
        {/* Hide description in compact mode unless expanded */}
        {(!compact || isExpanded) && (
          <TimelineDescription>{getItemDescription(log)}</TimelineDescription>
        )}

        {/* Error preview */}
        {hasError && !isExpanded && log.errorMessage && (
          <p className={cn('mt-1 text-xs text-red-400', compact && 'text-[10px]')}>
            {truncateError(log.errorMessage)}
          </p>
        )}

        {/* Expanded details */}
        <AnimatePresence>
          {isExpanded && <ExpandedDetails log={log} />}
        </AnimatePresence>

        {/* Children timeline */}
        {hasChildren && (
          <div className={cn('mt-4', compact && 'mt-2')}>
            <Timeline size={compact ? 'sm' : 'md'} animate={false}>
              {displayedChildren?.map(child => (
                <TimelineLogItem
                  key={child.id}
                  log={child}
                  compact={compact}
                  truncationThreshold={truncationThreshold}
                  // ... other props
                  isChild
                />
              ))}
            </Timeline>

            {/* Show more/less buttons */}
            {!showAllChildren && hiddenCount > 0 && (
              <Button /* ... */ >
                Show {hiddenCount} more...
              </Button>
            )}
          </div>
        )}
      </TimelineContent>
    </TimelineItem>
  );
}
```

### Full Timeline Modal

```typescript
// src/components/admin/EnrichmentTimelineModal.tsx (NEW)
import * as React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ExternalLink } from 'lucide-react';
import { EnrichmentTimeline } from './EnrichmentTimeline';
import type { EnrichmentLog } from '@/generated/graphql';

interface EnrichmentTimelineModalProps {
  log: EnrichmentLog;
  children: EnrichmentLog[];
}

export function EnrichmentTimelineModal({
  log,
  children
}: EnrichmentTimelineModalProps) {
  const timelineLogs = children.length > 0 ? [log, ...children] : [log];

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button
          variant="link"
          size="sm"
          className="mt-2 text-xs text-blue-400 hover:text-blue-300"
        >
          <ExternalLink className="h-3 w-3 mr-1" />
          View full timeline
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-3xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Enrichment Timeline</DialogTitle>
          <DialogDescription>
            {log.operation} - {log.entityType}
            {children.length > 0 && ` (${children.length} child jobs)`}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto pr-2">
          <EnrichmentTimeline
            logs={timelineLogs}
            variant="default" // Full variant in modal
            className="mt-4"
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
```

## State of the Art

| Old Approach               | Current Approach                 | When Changed               | Impact                                                         |
| -------------------------- | -------------------------------- | -------------------------- | -------------------------------------------------------------- |
| Fetch all logs flat        | Lazy-load children on expand     | Phase 19 (this phase)      | Faster initial table load, scales to large hierarchies         |
| Static polling interval    | Function-based `refetchInterval` | TanStack Query v4+         | Conditional polling based on state, fewer unnecessary requests |
| Separate compact component | Variant prop pattern             | Modern React best practice | Single source of truth, easier maintenance                     |
| Manual skeleton markup     | Reusable Skeleton component      | Already adopted            | Consistency, accessibility built-in                            |
| Hand-rolled modals         | Radix UI primitives              | Already adopted            | Accessibility, focus management, portability                   |

**Deprecated/outdated:**

- Table row expansion with nested queries: Use lazy loading instead - batching children upfront doesn't scale
- Polling all queries unconditionally: Use function form to poll only active/expanded rows
- Separate component files for variants: Use props - variants should share core logic

## Open Questions

1. **Row count display format**
   - What we know: Context doc specifies `"12 jobs (47 total logs)"` format showing parent count + total with children
   - What's unclear: Should this be a separate query (count aggregation) or computed from fetched logs?
   - Recommendation: Compute from fetched logs initially, add count query if performance becomes issue

2. **Polling behavior when multiple rows expanded**
   - What we know: Each expanded row polls independently via `refetchInterval` function
   - What's unclear: Should there be a global limit (e.g., max 3 rows polling simultaneously)?
   - Recommendation: Start without limit, monitor performance, add throttling if needed

3. **Compact variant truncation threshold**
   - What we know: Context suggests `~5` for compact vs `15` for default
   - What's unclear: Exact threshold or user-configurable?
   - Recommendation: Use `truncateChildren={5}` in table context, make prop configurable for flexibility

4. **View switcher in compact mode**
   - What we know: Context says view switcher "included in the expand row"
   - What's unclear: Should compact mode hide view switcher or show minimal version?
   - Recommendation: Hide in compact (user can use full modal for tree view), keeps table row concise

## Sources

### Primary (HIGH confidence)

- TanStack Query v5 documentation - `refetchInterval` function signature verified
- Radix UI Dialog v1.1 documentation - sizing and accessibility patterns
- Codebase files (read directly):
  - `src/components/admin/EnrichmentLogTable.tsx` - existing table patterns
  - `src/components/admin/EnrichmentTimeline.tsx` - Phase 18 timeline wrapper
  - `src/components/ui/timeline/timeline.tsx` - timeline primitives
  - `src/graphql/queries/enrichment.graphql` - available queries
  - `src/lib/graphql/resolvers/queries.ts` - `enrichmentLogs` resolver with `includeChildren` logic
  - `src/components/ui/dialog.tsx` - Radix Dialog wrapper
  - `src/components/ui/skeletons/Skeleton.tsx` - existing skeleton component
  - `src/components/admin/MusicDatabaseExpandedSkeleton.tsx` - skeleton pattern examples
- [Lazy-Loading Expandable Rows with React Table | Tenjin Engineering](https://medium.com/tenjin-engineering/lazy-loading-expandable-rows-with-react-table-cd2fc86b0630)
- [Material React Table V3 - Lazy Detail Panel](https://www.material-react-table.com/docs/examples/lazy-detail-panel)
- [TanStack Query - Data-dependent query refetch interval](https://github.com/TanStack/query/discussions/2086)

### Secondary (MEDIUM confidence)

- [Handling React loading states with React Loading Skeleton - LogRocket](https://blog.logrocket.com/handling-react-loading-states-react-loading-skeleton/)
- [The do's and dont's of Skeleton Loading in React - Ironeko](https://ironeko.com/posts/the-dos-and-donts-of-skeleton-loading-in-react)
- [Material React Table V3 - Density Toggle Guide](https://www.material-react-table.com/docs/guides/density-toggle)
- [Designing for Data Density - Medium](https://paulwallas.medium.com/designing-for-data-density-what-most-ui-tutorials-wont-teach-you-091b3e9b51f4)
- [Radix UI Dialog - Themes Documentation](https://www.radix-ui.com/themes/docs/components/dialog)

### Tertiary (LOW confidence)

- Web search results for compact timeline patterns - general design principles, not library-specific

## Metadata

**Confidence breakdown:**

- Standard stack: HIGH - All libraries already in use, versions verified from package.json
- Architecture patterns: HIGH - Based on existing codebase patterns and verified library capabilities
- Pitfalls: HIGH - Common issues identified from codebase review and community discussions
- Code examples: HIGH - Adapted from existing codebase components, verified APIs
- Compact variant specifics: MEDIUM - Design decisions (exact spacing, truncation thresholds) are discretionary per context doc

**Research date:** 2026-02-06
**Valid until:** 2026-04-06 (60 days - stable libraries, existing codebase patterns)

**Codebase-specific notes:**

- Table already has expansion pattern with `Set<string>` state
- Timeline component already has animation and truncation logic
- GraphQL resolver already supports both flat and tree fetching
- Polling pattern already established in current table implementation
- No new dependencies required - all primitives in place
