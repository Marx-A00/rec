---
phase: 19
plan: 03
subsystem: admin-ui
status: complete
tags: [ui, timeline, table-integration, lazy-loading]
requires: [19-01, 19-02]
provides:
  - EnrichmentLogTable with timeline expansion
  - Parent-only row filtering
  - Lazy child loading per row
affects: [20]
tech-stack:
  added: []
  patterns:
    - 'Lazy data fetching per table row'
    - 'Modal dialog for detailed view'
    - 'Progressive disclosure UI pattern'
key-files:
  created: []
  modified:
    - src/components/admin/EnrichmentLogTable.tsx
decisions:
  - name: 'Direct child query approach'
    rationale: 'Use useGetEnrichmentLogsQuery({ parentJobId }) instead of useGetEnrichmentLogsWithChildrenQuery for simpler, more efficient per-row child fetching'
    alternatives: 'Tree assembly approach with includeChildren parameter'
    impact: 'Simpler code, one query per expanded row, avoids recursive tree assembly overhead'
  - name: 'Remove FieldChangesPanel'
    rationale: 'Timeline provides superior visualization of changes with full context and hierarchy'
    alternatives: 'Keep both visualizations'
    impact: 'Cleaner codebase, consistent UX across admin panels'
metrics:
  tasks: 2
  duration: '4.6 minutes'
  completed: '2026-02-06'
---

# Phase 19 Plan 03: EnrichmentLogTable Timeline Integration Summary

**One-liner:** Refactored EnrichmentLogTable to show parent-only rows with lazy-loaded timeline expansion

## What Changed

**Before:**

- Table showed all logs (parent + children) as flat rows
- Only rows with field changes were expandable
- Expanded rows showed FieldChangesPanel with before/after values
- No visibility into job hierarchy or execution flow

**After:**

- Table shows only parent/root logs as rows (parentOnly: true filter)
- All rows expandable with chevron icon
- Expanded rows show compact EnrichmentTimeline with parent + children
- Children lazy-loaded via `useGetEnrichmentLogsQuery({ parentJobId: log.jobId })`
- SkeletonTimeline during loading, error state with retry
- EnrichmentTimelineModal for full timeline inspection
- Solo logs (no children) render as single-item timeline

## Implementation

### Task 1: Refactor EnrichmentLogTable

**File:** src/components/admin/EnrichmentLogTable.tsx

**Changes:**

1. **Imports:** Added EnrichmentTimeline, SkeletonTimeline, EnrichmentTimelineModal
2. **Main query:** Added `parentOnly: true` to filter out child logs
3. **Row expansion:** All rows expandable (removed hasFieldChanges condition)
4. **ExpandableLogRow component:** Extracted per-row logic with lazy child fetching
5. **Child fetching:** Direct query via `useGetEnrichmentLogsQuery({ parentJobId: log.jobId })`
6. **Polling:** Children poll for 30s if recently updated (same pattern as main table)
7. **Timeline rendering:** Compact variant with truncateChildren={5} in expanded area
8. **Error handling:** Retry button for failed child fetches
9. **Modal integration:** EnrichmentTimelineModal for full view link
10. **Cleanup:** Removed unused FieldChangesPanel and extractFieldChanges

**Commit:** 28cfde8

### Task 2: Verification and Cleanup

**Verified:**

- ✓ `pnpm type-check` passes
- ✓ `pnpm lint` passes (no warnings for EnrichmentLogTable)
- ✓ `pnpm build` succeeds
- ✓ Main query includes `parentOnly: true`
- ✓ Child fetch uses `useGetEnrichmentLogsQuery({ parentJobId: log.jobId })`
- ✓ All rows show chevron (no conditional rendering)
- ✓ Expanded rows show compact timeline or skeleton
- ✓ Error state with retry exists
- ✓ EnrichmentTimelineModal renders in expanded area
- ✓ Row count displays "X jobs" format

## Key Patterns

### 1. Lazy Child Fetching

```typescript
const {
  data: childrenData,
  isLoading,
  error,
  refetch,
} = useGetEnrichmentLogsQuery(
  { parentJobId: log.jobId, limit: 100 },
  { enabled: isExpanded && !!log.jobId }
);
```

**Why:** Only fetch children when row is expanded, reduces initial load time

### 2. Progressive Disclosure

**Table view:** Parent logs only (high-level overview)
**Expanded row:** Compact timeline (inline detail)
**Modal:** Full timeline (deep inspection)

**Why:** Matches admin workflow — scan → inspect → investigate

### 3. Conditional Polling

```typescript
refetchInterval: query => {
  if (!isExpanded) return false;
  const children = query.state.data?.enrichmentLogs || [];
  if (children.length === 0) return false;
  const age =
    Date.now() - new Date(children[children.length - 1].createdAt).getTime();
  return age < 30000 ? 3000 : false;
};
```

**Why:** Only poll expanded rows with recent activity, avoids unnecessary queries

## Integration Points

**From:** EnrichmentLogTable
**To:** useGetEnrichmentLogsQuery (GraphQL)
**Via:** Two query patterns:

1. Main table: `{ entityType, entityId, parentOnly: true }`
2. Expanded row: `{ parentJobId: log.jobId }`

**From:** EnrichmentLogTable
**To:** EnrichmentTimeline
**Via:** Compact variant in expanded area
**Props:** `variant="compact"`, `truncateChildren={5}`

**From:** EnrichmentLogTable
**To:** EnrichmentTimelineModal
**Via:** "View full timeline" link in expanded area
**Props:** `parentLog`, `childLogs`

## Deviations from Plan

None. Plan executed exactly as written.

## Technical Decisions

### Why not useGetEnrichmentLogsWithChildrenQuery?

**Decision:** Use `useGetEnrichmentLogsQuery({ parentJobId })` instead

**Reasoning:**

- Simpler: Single query, no tree assembly
- Efficient: One indexed database query per expanded row
- Scalable: No recursive fetch overhead
- Flexible: Can adjust child limit per row

**Trade-off:** Separate query per expanded row vs. single tree query
**Result:** Better performance for typical use case (1-2 expanded rows)

### Why remove FieldChangesPanel?

**Decision:** Replace with timeline expansion

**Reasoning:**

- Timeline shows field changes PLUS full context (operation, status, sources)
- Timeline shows job hierarchy (parent → children flow)
- Timeline is visual (icons, colors, connector lines)
- Timeline is interactive (expand/collapse, modal)

**Trade-off:** Lost compact before/after table
**Result:** Richer visualization worth the trade-off

## Next Phase Readiness

**Phase 20 blockers:** None

**What Phase 20 needs from this:**

- EnrichmentLogTable shows parent-only rows ✓
- Timeline expansion works for all rows ✓
- Modal provides detailed inspection ✓

**What Phase 20 will add:**

- Real-time updates during enrichment
- Inline retry/rerun actions
- Job cancellation from timeline

## Verification Results

**Success criteria:** 8/8 met

- [x] TBL-01: Table fetches only parent logs (parentOnly: true)
- [x] TBL-02: All rows show expand chevron
- [x] TBL-03: Expanded row shows compact Timeline
- [x] TBL-04: Child logs hidden from table rows
- [x] Loading state uses SkeletonTimeline
- [x] Error state has retry button
- [x] Full timeline modal accessible
- [x] Build passes without errors

**Type check:** Passed
**Lint:** Passed (no warnings)
**Build:** Passed (compiled successfully)

## Impact

**User experience:**

- Admins see cleaner table (only parent jobs)
- Inline timeline shows full enrichment flow
- Progressive disclosure reduces cognitive load
- "View full timeline" modal for deep investigation

**Performance:**

- Faster initial load (fewer rows)
- Lazy child loading (only when needed)
- Conditional polling (only active rows)

**Maintainability:**

- Removed 70+ lines of FieldChangesPanel code
- Consistent pattern (timeline everywhere)
- Single query hook (no special tree query)

## Lessons Learned

**What went well:**

- Direct child query approach simpler than expected
- SkeletonTimeline loading state polish
- Error handling with retry UX
- All rows expandable (no special cases)

**What to watch:**

- Many expanded rows = many child queries (acceptable for admin use case)
- Modal z-index with other dialogs (shadcn Dialog should handle)

**Future improvements:**

- Keyboard navigation (↑/↓ to navigate rows, → to expand, ← to collapse)
- Bulk expand/collapse all rows
- Persist expanded state in session storage
