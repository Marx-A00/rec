---
phase: 20-job-history-tab
plan: 01
subsystem: admin-ui
tags: [job-history, timeline, expandable-rows, bullmq]

dependency-graph:
  requires: [19-03]
  provides: [JOB-TIMELINE-INTEGRATION]
  affects: [admin-monitoring]

tech-stack:
  added: []
  patterns: [ExpandableJobRow, lazy-fetch, dynamic-polling]

file-tracking:
  key-files:
    created:
      - src/components/admin/ExpandableJobRow.tsx
    modified:
      - src/app/admin/job-history/page.tsx

decisions:
  - id: DEC-20-01
    title: "Lazy badge pattern"
    choice: "Badge appears after first expansion"
    rationale: "TanStack Query caches data, so badge persists on collapse"
  - id: DEC-20-02
    title: "Direct parentJobId filter"
    choice: "Use job.id as parentJobId filter"
    rationale: "BullMQ job IDs are stored as parentJobId in EnrichmentLog"

metrics:
  duration: 5m
  completed: 2026-02-07
---

# Phase 20 Plan 01: Job History Timeline Integration Summary

**One-liner:** Expandable job rows with lazy-loaded EnrichmentTimeline showing all linked logs for BullMQ jobs.

## What Was Built

### ExpandableJobRow Component
- **File:** `src/components/admin/ExpandableJobRow.tsx` (241 lines)
- **Exports:** `ExpandableJobRow`, `JobHistoryItem`, `ExpandableJobRowProps`
- **Features:**
  - Lazy fetch enrichment logs using `parentJobId: job.id` filter
  - Dynamic polling (30s after last log activity)
  - Badge with count appears after first expansion (cached by TanStack Query)
  - Chevron toggle for expansion state
  - SkeletonTimeline loading state
  - Error state with retry button
  - EnrichmentTimeline `variant='compact'` in expanded area
  - EnrichmentTimelineModal for full inspection

### Job History Page Integration
- **File:** `src/app/admin/job-history/page.tsx`
- **Changes:**
  - Added `expandedRows` state with `Set<string>`
  - Added `toggleRow` handler for expansion state
  - Added chevron column to table header (8 columns total)
  - Replaced inline table rows with `ExpandableJobRow` component
  - Updated `colSpan` references from 7 to 8
  - Removed job detail dialog (replaced by expandable rows)
  - Moved job type filtering to computed `filteredJobs`

## Success Criteria Met

- JOB-01: Enrichment activity indicator (badge with count) visible after expanding job row
- JOB-02: Expanding job row shows EnrichmentTimeline with all linked logs
- Type checking passes with no errors
- Build succeeds
- Pattern matches Phase 19 ExpandableLogRow architecture

## Key Patterns

### Lazy Fetch with parentJobId Filter
```typescript
const { data, isLoading } = useGetEnrichmentLogsQuery(
  { parentJobId: job.id, limit: 100 },
  {
    enabled: isExpanded,
    refetchInterval: query => {
      // Poll for 30s after last activity
    },
  }
);
```

### Lazy Badge Pattern
```typescript
const hasBeenFetched = logsData !== undefined;
// Badge appears after first expansion, persists due to cache
{hasBeenFetched && logs.length > 0 && <Badge>{logs.length}</Badge>}
```

### Compact Timeline in Expanded Row
```typescript
<EnrichmentTimeline logs={logs} variant='compact' truncateChildren={5} />
```

## Deviations from Plan

None - plan executed exactly as written.

## Commits

- f78a594: feat(20-01): create ExpandableJobRow component
- a463b0b: feat(20-01): integrate ExpandableJobRow into Job History page
- 7dfde0b: style(20-01): apply prettier formatting

## Next Phase Readiness

Phase 20 is now complete. The Job History tab has enrichment activity indicators and expandable rows showing EnrichmentTimeline for each job.
