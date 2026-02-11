# Phase 20: Job History Tab - Research

**Researched:** 2026-02-06
**Domain:** BullMQ job monitoring, expandable table rows with lazy-loaded timelines, job-to-enrichment-log linking
**Confidence:** HIGH

## Summary

Phase 20 adds enrichment activity indicators and expandable timelines to the Job History tab. This bridges BullMQ job monitoring (via worker API) with the EnrichmentLog audit trail (via GraphQL). The implementation requires detecting which jobs have linked enrichment logs, adding expandable row functionality to the existing job table, and lazy-loading EnrichmentTimeline components filtered by `parentJobId`.

The codebase already has all necessary primitives: The Job History page fetches BullMQ jobs via worker proxy route (`/api/admin/worker`), the EnrichmentTimeline component displays parent-child hierarchies (Phase 18), GraphQL resolver supports `parentJobId` filter for querying job families (Phase 16-17), and Phase 19 demonstrates the exact expandable row + lazy-load pattern needed. The architecture uses BullMQ's native `job.id` as the linking key stored in EnrichmentLog's `jobId` and `parentJobId` fields.

Key technical decisions: Use the existing worker API endpoint for job data (already returns job metadata), add GraphQL query to count enrichment logs per job (indicator badge), reuse Phase 19's expandable row pattern with `useGetEnrichmentLogsQuery` filtered by `parentJobId`, display EnrichmentTimeline in compact variant within expanded rows, and optionally add a modal for full timeline view with tree visualization.

**Primary recommendation:** Extend existing Job History table with enrichment count badges (GraphQL query), implement expandable rows using Phase 19's proven pattern (lazy-fetch children on expand), and render EnrichmentTimeline compact variant in expanded row content.

## Standard Stack

The established libraries and patterns for this domain:

### Core

| Library                | Version  | Purpose                               | Why Standard                                                                            |
| ---------------------- | -------- | ------------------------------------- | --------------------------------------------------------------------------------------- |
| BullMQ Queue.getJobs() | v5.67+   | Retrieve job history programmatically | Native BullMQ method for accessing completed/failed/active jobs with pagination         |
| TanStack Query         | v5.79.0  | Enrichment log fetching + caching     | Already used throughout app, Phase 19 uses for lazy-loading children                    |
| EnrichmentTimeline     | Internal | Display job family timeline           | Phase 18 component, supports compact variant for table rows                             |
| GraphQL enrichmentLogs | Internal | Query logs by parentJobId             | Phase 17 resolver supports filtering by parentJobId, returns parent-child relationships |
| Worker proxy route     | Internal | Secure access to BullMQ job data      | /api/admin/worker/[...path] already authenticated and working                           |

### Supporting

| Library                 | Version      | Purpose                         | When to Use                                             |
| ----------------------- | ------------ | ------------------------------- | ------------------------------------------------------- |
| Badge component         | shadcn/ui    | Show enrichment count indicator | Display "5 logs" badge on jobs with enrichment activity |
| ChevronDown/Right icons | Lucide React | Expandable row toggle           | Standard pattern for table row expansion                |
| Dialog component        | Radix UI     | Optional full timeline modal    | If compact view needs "view full timeline" action       |
| useState for expansion  | React 19     | Track expanded rows             | Same pattern as Phase 19 EnrichmentLogTable             |

### Alternatives Considered

| Instead of                   | Could Use                      | Tradeoff                                                                              |
| ---------------------------- | ------------------------------ | ------------------------------------------------------------------------------------- |
| Worker API for jobs          | Direct Redis queries           | Worker API already authenticated and abstracted, Redis requires connection management |
| Lazy-load logs on expand     | Pre-fetch all logs upfront     | Lazy-load keeps initial page load fast, only fetches when user expands                |
| parentJobId filter query     | includeChildren tree query     | parentJobId is simpler and faster for flat job families (all children point to root)  |
| Compact timeline in row      | Link to separate timeline page | Inline timeline provides immediate context without navigation                         |
| EnrichmentTimeline component | Custom job-specific timeline   | EnrichmentTimeline already handles job hierarchies, no need to rebuild                |

**Installation:**
No new dependencies required - all components and libraries already installed.

## Architecture Patterns

### Recommended Integration Architecture

```
Job History Page (BullMQ jobs from worker API)
├── Table row for each job
│   ├── Job details (name, status, duration)
│   ├── Enrichment count badge (GraphQL query for count)
│   └── Expandable row (if count > 0)
│       └── EnrichmentTimeline (compact variant)
│           ├── Fetches logs via parentJobId filter
│           ├── Shows parent-child job hierarchy
│           └── Optional: "View full timeline" → Modal
```

**Key insight:** The jobId from BullMQ jobs maps directly to EnrichmentLog.jobId and EnrichmentLog.parentJobId. This enables simple queries: fetch logs WHERE `parentJobId = bullmqJob.id` OR `jobId = bullmqJob.id` to get entire job family.

### Pattern 1: Enrichment Activity Indicator

**What:** Add badge showing enrichment log count for each job row
**When to use:** Jobs that spawned enrichment activity (Spotify sync, manual enrichment, collection adds)

**Example:**

```typescript
// Source: Current GraphQL schema + Phase 19 pattern
// NEW: Query to get enrichment count per job
const { data: enrichmentCounts } = useGetEnrichmentCountsByJobsQuery(
  { jobIds: jobs.map(j => j.id) },
  { enabled: jobs.length > 0 }
);

// In table row
<TableCell>
  <div className="flex items-center gap-2">
    <span>{job.name}</span>
    {enrichmentCounts?.[job.id] > 0 && (
      <Badge variant="outline" className="text-xs">
        <Activity className="h-3 w-3 mr-1" />
        {enrichmentCounts[job.id]} logs
      </Badge>
    )}
  </div>
</TableCell>
```

**GraphQL addition needed:**

```graphql
# Add to schema.graphql
type Query {
  enrichmentCountByJobIds(jobIds: [String!]!): JSON!
}

# Resolver returns: { "job-123": 5, "job-456": 12 }
```

**Alternative:** Simple approach without batch query - show expand icon for all jobs, only fetch count when row is expanded. Trade-off: Less upfront information but simpler implementation.

### Pattern 2: Expandable Rows with Lazy-Loaded Timeline

**What:** Reuse Phase 19's expandable row pattern - track expansion state, fetch logs on demand, show timeline in expanded content
**When to use:** Table rows that need inline detail views without navigation

**Example:**

```typescript
// Source: Phase 19 EnrichmentLogTable.tsx (proven pattern)
const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

const toggleRow = (jobId: string) => {
  setExpandedRows(prev => {
    const next = new Set(prev);
    if (next.has(jobId)) {
      next.delete(jobId);
    } else {
      next.add(jobId);
    }
    return next;
  });
};

// Lazy fetch enrichment logs for expanded job
function ExpandableJobRow({ job, isExpanded, onToggle }: ExpandableJobRowProps) {
  const { data, isLoading } = useGetEnrichmentLogsQuery(
    {
      parentJobId: job.id, // Get all logs for this job family
      limit: 100,
    },
    {
      enabled: isExpanded, // Only fetch when expanded
      refetchInterval: query => {
        if (!isExpanded) return false;
        const logs = query.state.data?.enrichmentLogs || [];
        if (logs.length === 0) return false;
        const lastLog = logs[logs.length - 1];
        const age = Date.now() - new Date(lastLog.createdAt).getTime();
        return age < 30000 ? 3000 : false; // Poll for 30s after last activity
      },
    }
  );

  return (
    <>
      <TableRow onClick={onToggle} className="cursor-pointer">
        <TableCell>
          {isExpanded ? <ChevronDown /> : <ChevronRight />}
        </TableCell>
        {/* Job details cells */}
      </TableRow>

      {isExpanded && (
        <TableRow>
          <TableCell colSpan={7}>
            {isLoading ? (
              <SkeletonTimeline />
            ) : (
              <EnrichmentTimeline
                logs={data?.enrichmentLogs ?? []}
                variant="compact"
                maxHeight="400px"
              />
            )}
          </TableCell>
        </TableRow>
      )}
    </>
  );
}
```

**Key details:**

- `enabled: isExpanded` prevents unnecessary queries for collapsed rows
- `refetchInterval` function enables dynamic polling only while expanded and recently active
- `parentJobId` filter returns entire job family (root + all children)
- Compact variant keeps timeline readable in table context

### Pattern 3: Handling Root Jobs vs Child Jobs

**What:** Determine if BullMQ job is a root enrichment job or a child job, show timeline accordingly
**When to use:** Job History shows both parent and child jobs, need to display timeline correctly

**Example:**

```typescript
// Phase 16 established this structure:
// - Root jobs: have jobId in logs but no parentJobId
// - Child jobs: have both jobId and parentJobId in logs

// Query strategy depends on job type:
const { data } = useGetEnrichmentLogsQuery(
  {
    // For ANY job, query by parentJobId to get family
    // This works because:
    // - Root job: logs have jobId=thisJob, parentJobId=null (included)
    // - Child job: logs have parentJobId=rootJob (gets siblings)
    parentJobId: job.id,
    includeChildren: false, // Get flat list, timeline handles hierarchy
    limit: 100,
  },
  { enabled: isExpanded }
);

// ALSO fetch the job's own log entry if it exists
const { data: ownLog } = useGetEnrichmentLogsQuery(
  { jobId: job.id, limit: 1 },
  { enabled: isExpanded }
);

// Combine: ownLog (if exists) + all children
const allLogs = [
  ...(ownLog?.enrichmentLogs ?? []),
  ...(data?.enrichmentLogs ?? []),
];
```

**Alternative approach:** Use `includeChildren: true` with tree structure. Trade-off: More complex query but gets complete hierarchy in one request. **Recommendation:** Start with simple parentJobId filter, matches Phase 19 pattern.

### Pattern 4: Compact Timeline Variant

**What:** EnrichmentTimeline component already supports `variant="compact"` prop (Phase 18)
**When to use:** Timeline displayed in table row or other space-constrained context

**Example:**

```typescript
// Source: EnrichmentTimeline.tsx (Phase 18)
<EnrichmentTimeline
  logs={enrichmentLogs}
  variant="compact"
  maxHeight="400px"
  truncateChildren={5} // Show max 5 children before "show more"
  className="bg-zinc-900 p-4 rounded-lg"
/>

// Compact variant features:
// - Timeline size='sm' (smaller icons, tighter spacing)
// - Collapsed descriptions by default (expand on click)
// - Reduced truncation threshold (5 vs 15 children)
// - Smaller text sizes (text-xs vs text-sm)
// - Hidden or minimal view switcher
```

**Design considerations:**

- Maintain information hierarchy even in compact mode
- Preserve expand/collapse functionality per item
- Keep action buttons accessible (retry, view details)
- Respect `prefers-reduced-motion` for animations

### Pattern 5: Optional Full Timeline Modal

**What:** Add "View full timeline" button in compact view that opens Dialog with full-featured timeline
**When to use:** Job has many enrichment logs (>15) or complex hierarchy that needs tree view

**Example:**

```typescript
// Similar to Phase 19's EnrichmentTimelineModal pattern
function JobTimelineModal({ jobId, open, onClose }: JobTimelineModalProps) {
  const { data } = useGetEnrichmentLogsQuery(
    { parentJobId: jobId, includeChildren: true, limit: 200 },
    { enabled: open }
  );

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>Job Timeline: {jobId}</DialogTitle>
        </DialogHeader>
        <EnrichmentTimeline
          logs={data?.enrichmentLogs ?? []}
          variant="default" // Full-featured view
          className="overflow-y-auto"
        />
      </DialogContent>
    </Dialog>
  );
}

// Usage in expanded row
<Button
  variant="outline"
  size="sm"
  onClick={() => setShowModal(true)}
>
  <Maximize2 className="h-3 w-3 mr-1" />
  View full timeline
</Button>
```

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem                 | Don't Build                               | Use Instead                              | Why                                                                   |
| ----------------------- | ----------------------------------------- | ---------------------------------------- | --------------------------------------------------------------------- |
| BullMQ job retrieval    | Custom Redis queries for job data         | Queue.getJobs() or worker API            | BullMQ handles pagination, filtering, and state management            |
| Enrichment log queries  | Direct Prisma queries in components       | GraphQL useGetEnrichmentLogsQuery hook   | Already generated, supports caching, polling, and optimistic updates  |
| Timeline visualization  | Custom timeline component                 | EnrichmentTimeline (Phase 18)            | Already handles parent-child hierarchies, animations, compact variant |
| Expandable table rows   | Custom accordion or collapse logic        | Phase 19's expandable row pattern        | Proven pattern with lazy-loading, polling, and state management       |
| Job-to-log linking      | Custom tracking system or correlation IDs | EnrichmentLog.jobId + parentJobId fields | Phase 15-16 established this, indexed and queryable                   |
| Enrichment count badges | Client-side filtering and counting        | GraphQL aggregation query                | Database-level counting is faster and more accurate                   |

**Key insight:** Phase 15-19 built all the primitives needed. Phase 20 is primarily wiring them together with the Job History page, not building new infrastructure.

## Common Pitfalls

### Pitfall 1: Querying Wrong Job ID Scope

**What goes wrong:** Fetching logs for child job ID only shows that child's logs, missing siblings and context
**Why it happens:** BullMQ job.id might be a child job, not the root job
**How to avoid:** Always query by `parentJobId` to get entire job family, not just individual job
**Warning signs:** Timeline shows single log instead of expected cascade of enrichment steps

**Prevention:**

```typescript
// ❌ BAD: Only gets this specific job's log
const { data } = useGetEnrichmentLogsQuery({ jobId: job.id });

// ✅ GOOD: Gets entire job family (root + all children)
const { data } = useGetEnrichmentLogsQuery({
  parentJobId: job.id, // If this is root, gets all children
  // Also fetch own log separately if needed
});
```

### Pitfall 2: Performance Issues with Many Jobs

**What goes wrong:** Fetching enrichment counts for hundreds of jobs creates N+1 query problem
**Why it happens:** Individual GraphQL query per job row
**How to avoid:** Batch fetch counts for all visible jobs in single query
**Warning signs:** Slow page load, many GraphQL requests in network tab

**Prevention:**

```typescript
// ❌ BAD: N queries for N jobs
jobs.map(job => useGetEnrichmentLogsQuery({ parentJobId: job.id }));

// ✅ GOOD: Single batch query for counts
const jobIds = jobs.map(j => j.id);
const { data: counts } = useGetEnrichmentCountsByJobsQuery({ jobIds });
```

**Note:** May need to add batch count query to GraphQL schema if not exists.

### Pitfall 3: Stale Data in Expanded Rows

**What goes wrong:** User expands row, enrichment job is still running, timeline doesn't update
**Why it happens:** No polling configured or polling stops too early
**How to avoid:** Use TanStack Query's dynamic `refetchInterval` function to poll while expanded and recently active
**Warning signs:** Timeline freezes mid-enrichment, user must manually refresh

**Prevention:**

```typescript
// Phase 19 pattern - poll intelligently
refetchInterval: query => {
  if (!isExpanded) return false; // Stop polling when collapsed
  const logs = query.state.data?.enrichmentLogs || [];
  if (logs.length === 0) return false; // No logs yet
  const lastLog = logs[logs.length - 1];
  const age = Date.now() - new Date(lastLog.createdAt).getTime();
  return age < 30000 ? 3000 : false; // Poll for 30s after last activity
};
```

### Pitfall 4: Mixing BullMQ Job Status with EnrichmentLog Status

**What goes wrong:** BullMQ job shows "completed" but EnrichmentLog shows "FAILED", causes confusion
**Why it happens:** BullMQ job can complete successfully even if enrichment partially failed (e.g., some sources failed)
**How to avoid:** Show both statuses clearly - BullMQ status for job execution, EnrichmentLog status for data quality
**Warning signs:** User sees "completed" job but timeline shows failures

**Prevention:**

```typescript
// Show both contexts clearly
<div>
  <Badge>{job.status}</Badge> {/* BullMQ: completed */}
  <span className="text-xs text-zinc-500">
    Job execution status
  </span>
</div>

{/* In expanded timeline */}
<EnrichmentTimeline logs={logs} />
{/* Timeline shows individual operation statuses: SUCCESS, PARTIAL_SUCCESS, FAILED */}
```

### Pitfall 5: Not Handling Jobs Without Enrichment Logs

**What goes wrong:** Expanding a job with no enrichment logs shows empty timeline or loading spinner forever
**Why it happens:** Not all BullMQ jobs create EnrichmentLog entries (e.g., queue management jobs)
**How to avoid:** Check if job type creates enrichment logs, only show expand option if applicable
**Warning signs:** Empty timelines, "No enrichment history" message for valid jobs

**Prevention:**

```typescript
// Only show expand for enrichment-related jobs
const hasEnrichmentLogs = job.name.includes('enrichment') ||
                          job.name.includes('spotify:sync') ||
                          job.name.includes('musicbrainz:sync');

{hasEnrichmentLogs && (
  <Button onClick={toggleExpand}>
    <ChevronDown />
  </Button>
)}

// Or: Use enrichment count query, only show expand if count > 0
```

## Code Examples

Verified patterns from existing codebase:

### Expandable Row with Lazy-Loaded Timeline

```typescript
// Source: Phase 19 EnrichmentLogTable.tsx + Job History page structure
'use client';

import { useState } from 'react';
import { ChevronDown, ChevronRight, Activity } from 'lucide-react';
import { useGetEnrichmentLogsQuery } from '@/generated/graphql';
import { EnrichmentTimeline } from '@/components/admin/EnrichmentTimeline';
import { SkeletonTimeline } from '@/components/admin/SkeletonTimeline';
import { Badge } from '@/components/ui/badge';
import { TableRow, TableCell } from '@/components/ui/table';

interface JobRowProps {
  job: JobHistoryItem;
}

function ExpandableJobRow({ job }: JobRowProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  // Lazy fetch enrichment logs only when expanded
  const { data, isLoading } = useGetEnrichmentLogsQuery(
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
        const lastLog = logs[logs.length - 1];
        const age = Date.now() - new Date(lastLog.createdAt).getTime();
        return age < 30000 ? 3000 : false;
      },
    }
  );

  const enrichmentLogs = data?.enrichmentLogs ?? [];
  const hasLogs = enrichmentLogs.length > 0;

  return (
    <>
      <TableRow
        className="cursor-pointer hover:bg-zinc-800/50"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <TableCell className="w-8">
          {isExpanded ? (
            <ChevronDown className="h-4 w-4 text-zinc-400" />
          ) : (
            <ChevronRight className="h-4 w-4 text-zinc-400" />
          )}
        </TableCell>
        <TableCell>
          <div className="flex items-center gap-2">
            <span>{job.name}</span>
            {hasLogs && (
              <Badge variant="outline" className="text-xs">
                <Activity className="h-3 w-3 mr-1" />
                {enrichmentLogs.length} logs
              </Badge>
            )}
          </div>
        </TableCell>
        {/* Other job detail cells */}
      </TableRow>

      {isExpanded && (
        <TableRow>
          <TableCell colSpan={7} className="bg-zinc-900/50 p-6">
            {isLoading ? (
              <SkeletonTimeline />
            ) : hasLogs ? (
              <EnrichmentTimeline
                logs={enrichmentLogs}
                variant="compact"
                maxHeight="400px"
                truncateChildren={5}
              />
            ) : (
              <div className="text-center text-zinc-500 py-8">
                No enrichment logs for this job
              </div>
            )}
          </TableCell>
        </TableRow>
      )}
    </>
  );
}
```

### BullMQ Job to EnrichmentLog Query Mapping

```typescript
// Source: Phase 16 job linking architecture + GraphQL resolver
// How to query enrichment logs for a BullMQ job

// CASE 1: Job is a root enrichment job (e.g., ENRICH_ALBUM)
// EnrichmentLog entries have:
// - jobId = bullmqJob.id (the root log entry)
// - parentJobId = null
// - children have parentJobId = bullmqJob.id

const { data } = useGetEnrichmentLogsQuery({
  parentJobId: bullmqJob.id, // Gets all children
  includeChildren: false,
});
// Also fetch root:
const { data: root } = useGetEnrichmentLogsQuery({
  jobId: bullmqJob.id,
  limit: 1,
});

// CASE 2: Job is a child job (e.g., CACHE_ARTIST_IMAGE)
// EnrichmentLog entry has:
// - jobId = bullmqJob.id
// - parentJobId = rootJobId
// Query by this job's ID directly:

const { data } = useGetEnrichmentLogsQuery({
  jobId: bullmqJob.id,
  limit: 10,
});

// CASE 3: Want entire family regardless of root/child
// Use OR query via multiple filters:
const allRelated = [
  ...(rootData?.enrichmentLogs ?? []),
  ...(childrenData?.enrichmentLogs ?? []),
];
```

### Dynamic Polling for Active Jobs

```typescript
// Source: Phase 19 EnrichmentLogTable.tsx
// Poll intelligently - only while expanded and recently active

const { data, isLoading } = useGetEnrichmentLogsQuery(
  { parentJobId: job.id, limit: 100 },
  {
    enabled: isExpanded,
    refetchInterval: query => {
      // Stop polling if row is collapsed
      if (!isExpanded) return false;

      // Stop polling if no logs yet
      const logs = query.state.data?.enrichmentLogs || [];
      if (logs.length === 0) return false;

      // Check age of most recent log
      const lastLog = logs[logs.length - 1];
      const age = Date.now() - new Date(lastLog.createdAt).getTime();

      // Poll every 3 seconds if last log is less than 30 seconds old
      // This handles: "enrichment job is currently running"
      if (age < 30000) return 3000;

      // Stop polling - enrichment is finished
      return false;
    },
  }
);
```

## State of the Art

| Old Approach                     | Current Approach                             | When Changed | Impact                                                                 |
| -------------------------------- | -------------------------------------------- | ------------ | ---------------------------------------------------------------------- |
| Bull Board UI only               | Custom Job History + EnrichmentLog timelines | Phase 15-19  | Tighter integration with app's audit trail, domain-specific UX         |
| No job linking                   | parentJobId field for job families           | Phase 15-16  | Can trace enrichment cascades across API calls and processors          |
| Separate job and log views       | Expandable rows with inline timelines        | Phase 19-20  | Single page for job monitoring and enrichment audit trail              |
| Manual refresh for job updates   | TanStack Query dynamic polling               | Phase 19     | Real-time updates while watching active jobs, auto-stops when inactive |
| Deep hierarchy (nested children) | Flat parent structure (all point to root)    | Phase 16     | Simpler queries, faster lookups with single WHERE clause               |

**Deprecated/outdated:**

- **Bull Board as primary monitoring**: Still used at `/admin/queues` but supplemented by Job History page with enrichment context
- **Manual job-to-log correlation**: Automated via `jobId` and `parentJobId` fields in EnrichmentLog
- **Separate timeline pages**: Inline expandable timelines reduce navigation, keep context visible

## Open Questions

Things that couldn't be fully resolved:

1. **Enrichment count query performance**
   - What we know: Batch query for counts is more efficient than N individual queries
   - What's unclear: Whether to add dedicated GraphQL batch count query or use existing enrichmentLogs query with limit:0 + count field
   - Recommendation: Start with simple approach (show expand for all jobs), optimize with batch query if performance issue confirmed

2. **Job History pagination with enrichment indicators**
   - What we know: Job History page already paginates BullMQ jobs (20 per page)
   - What's unclear: Whether to fetch enrichment counts for all jobs in queue or just current page
   - Recommendation: Fetch counts only for current page (20 jobs), lazy-load on scroll if implementing infinite scroll

3. **Handling jobs without enrichment logs**
   - What we know: Not all BullMQ job types create EnrichmentLog entries (queue management, health checks)
   - What's unclear: Whether to hide expand option upfront or show "No logs" message on expand
   - Recommendation: Show expand icon for jobs that include 'enrichment', 'spotify', 'musicbrainz' in name; show "No logs" message for others if expanded

4. **Sync between BullMQ job completion and EnrichmentLog creation**
   - What we know: EnrichmentLog entries are created during job processing
   - What's unclear: Timing gap between job completion and log commit, could cause race conditions
   - Recommendation: Use dynamic polling pattern (30s after last log) to handle slight delays

## Sources

### Primary (HIGH confidence)

- BullMQ Official Documentation - [Getters API](https://docs.bullmq.io/guide/jobs/getters) - Queue.getJobs() method
- BullMQ API Reference - [Queue class v5.67](https://api.docs.bullmq.io/classes/v4.Queue.html) - getJobs, getJobCounts methods
- Codebase Phase 19 - `.planning/phases/19-enrichmentlogtable-integration/19-RESEARCH.md` - Expandable row pattern
- Codebase Phase 16 - `.planning/phases/16-job-linking/16-RESEARCH.md` - Job linking architecture
- Codebase EnrichmentTimeline - `src/components/admin/EnrichmentTimeline.tsx` - Compact variant support
- Codebase GraphQL resolver - `src/lib/graphql/resolvers/queries.ts` - parentJobId filter implementation

### Secondary (MEDIUM confidence)

- Bull Board GitHub - [felixmosh/bull-board](https://github.com/felixmosh/bull-board) - Monitoring UI reference
- TanStack Table Expansion Guide - [Material React Table Expanding Sub-Rows](https://www.material-react-table.com/docs/guides/expanding-sub-rows) - Table expansion patterns
- Medium Article - [Lazy-Loading Expandable Rows with React Table](https://medium.com/tenjin-engineering/lazy-loading-expandable-rows-with-react-table-cd2fc86b0630) - Lazy-load pattern

### Tertiary (LOW confidence)

- shadcn/ui Data Table Patterns - [Expandable Sub-Rows](https://www.shadcn.io/patterns/data-table-advanced-1) - UI pattern reference (Note: This link appears in search but may not be official shadcn docs)

## Metadata

**Confidence breakdown:**

- Standard stack: HIGH - All libraries already in codebase, proven by Phase 15-19
- Architecture patterns: HIGH - Phase 19 demonstrates exact pattern needed, well-tested
- BullMQ integration: HIGH - Official BullMQ docs + existing worker API implementation
- Job linking: HIGH - Phase 16 research and implementation already validated
- UI patterns: MEDIUM - Expandable rows are standard, but specific enrichment indicator design not yet prototyped

**Research date:** 2026-02-06
**Valid until:** ~30 days (stable domain - React patterns and BullMQ API rarely change)

**Key validation points for planner:**

- Phase 19's ExpandableLogRow component is the exact pattern to copy
- EnrichmentTimeline compact variant already exists and works
- GraphQL resolver already supports parentJobId filter
- Worker API already returns job data needed for table
- Main work is wiring, not building new primitives
