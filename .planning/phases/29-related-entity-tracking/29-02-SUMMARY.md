---
phase: 29-related-entity-tracking
plan: 02
subsystem: logging
tags: [llama-logger, job-hierarchy, rootJobId]

dependency_graph:
  requires:
    - 29-01 (rootJobId column in database)
  provides:
    - LlamaLogData interface with rootJobId field
    - Auto-computation of rootJobId for root jobs
  affects:
    - 29-03 (artist creation logging will pass rootJobId)
    - 29-04 (track creation logging will pass rootJobId)

tech_stack:
  added: []
  patterns:
    - "Auto-computed field defaults (rootJobId = jobId for root jobs)"

file_tracking:
  created: []
  modified:
    - src/lib/logging/llama-logger.ts

decisions:
  - id: DEC-29-02-01
    title: "Auto-compute rootJobId for root jobs"
    choice: "rootJobId = data.rootJobId ?? (isRootJob ? data.jobId : null)"
    rationale: "Root jobs should always have rootJobId equal to their own jobId for query consistency"
  - id: DEC-29-02-02
    title: "Child jobs default to null rootJobId"
    choice: "Non-root jobs without explicit rootJobId get null"
    rationale: "Callers must pass rootJobId for child jobs; null indicates missing provenance (acceptable during incremental rollout)"

metrics:
  duration: "2m 46s"
  completed: "2026-02-10"
---

# Phase 29 Plan 02: LlamaLogger rootJobId Support Summary

**One-liner:** Added rootJobId field to LlamaLogData interface with auto-computation for root jobs, enabling job hierarchy tracking.

## What Was Done

### Task 1: Add rootJobId to LlamaLogData Interface

**Changes to `src/lib/logging/llama-logger.ts`:**

1. **Added rootJobId field to interface:**
   ```typescript
   /** Root job ID for hierarchy queries (original album job). Auto-computed for root jobs. */
   rootJobId?: string | null;
   ```

2. **Updated parentJobId comment:**
   - Changed from "root job ID in flat structure" to "immediate parent tracking in job chains"
   - Clarifies the distinction: parentJobId = immediate parent, rootJobId = original root

3. **Added rootJobId computation in logEnrichment():**
   ```typescript
   // Compute rootJobId: use provided value, or set to jobId for root jobs
   const rootJobId = data.rootJobId ?? (isRootJob ? data.jobId : null);
   ```

4. **Added rootJobId to prisma.llamaLog.create:**
   ```typescript
   rootJobId,
   ```

5. **Enhanced console logging:**
   ```typescript
   const rootInfo = rootJobId ? ` root:${rootJobId.slice(0, 8)}` : '';
   ```
   - Shows truncated rootJobId (first 8 chars) when present

### Task 2: Validate Existing Callers

**Verified backward compatibility for all 7 files with logEnrichment calls:**

- src/lib/queue/processors/discogs-processor.ts (7 calls)
- src/lib/queue/processors/cache-processor.ts (12 calls)
- src/lib/queue/processors/enrichment-processor.ts (9 calls)
- src/lib/queue/processors/musicbrainz-processor.ts (1 call)
- src/lib/graphql/resolvers/mutations.ts (1 call)
- src/lib/spotify/mappers.ts (1 call)

All callers compile without errors. The new rootJobId field is:
- Optional (callers don't need to provide it)
- Auto-computed for root jobs (isRootJob: true gets rootJobId = jobId)
- Null for child jobs without explicit rootJobId (acceptable for incremental rollout)

## Verification Results

| Criterion | Status |
|-----------|--------|
| LlamaLogData has rootJobId field | PASS |
| logEnrichment computes rootJobId for root jobs | PASS |
| logEnrichment writes rootJobId to database | PASS |
| pnpm type-check passes | PASS |
| Console log shows rootJobId when present | PASS |
| Backward compatibility maintained | PASS |

## Deviations from Plan

None - plan executed exactly as written.

## Commits

- `988543e`: feat(29-02): add rootJobId field to LlamaLogData interface

## Next Phase Readiness

**Ready for Plans 03-04:** Artist and track creation logging can now pass rootJobId to establish job hierarchy. The LlamaLogger is prepared to receive and store the root job reference for all child entity operations.

**Key Integration Point:** Callers creating child jobs should pass:
```typescript
{
  parentJobId: immediateParentJobId,
  rootJobId: originalAlbumJobId,
  isRootJob: false,
  // ... other fields
}
```

Root jobs continue to work unchanged - rootJobId is auto-computed from jobId.
