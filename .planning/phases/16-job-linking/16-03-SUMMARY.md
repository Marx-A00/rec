---
phase: 16-job-linking
plan: 03
subsystem: queue
tags: [bullmq, enrichment, job-linking, parentJobId, isRootJob]

requires:
  - phase: 16-02
    provides: EnrichmentLogData interface with parentJobId/isRootJob, processor index passes Job objects

provides:
  - Updated enrichment handler signatures to accept Job<T> parameters
  - Parent ID propagation through all job chains (CHECK_* -> ENRICH_*)
  - All log entries include jobId, parentJobId, isRootJob fields
  - ENRICH_ARTIST propagates parentJobId to DISCOGS_SEARCH and CACHE jobs

affects: [16-04, 16-05, 16-06]

tech-stack:
  added: []
  patterns:
    - 'Flat parent structure: all children point to root job'
    - 'rootJobId = data.parentJobId || job.id pattern for chain propagation'

key-files:
  created: []
  modified:
    - src/lib/queue/processors/enrichment-processor.ts

key-decisions:
  - 'handleEnrichTrack does not need rootJobId since it spawns no child jobs'
  - 'SPOTIFY_TRACK_FALLBACK explicitly sets isRootJob: false (always child)'

patterns-established:
  - 'Handler signature: job: Job<T> with data extraction at function start'
  - 'Parent propagation: const rootJobId = data.parentJobId || job.id'
  - 'Log entry fields: jobId: job.id, parentJobId: data.parentJobId || null, isRootJob: !data.parentJobId'

duration: 2min
completed: 2026-02-07
---

# Phase 16 Plan 03: Enrichment Handler Signature Updates

**All 6 enrichment handlers accept Job<T> parameters and propagate parentJobId through job chains to child jobs**

## Performance

- **Duration:** 2 min (95 seconds)
- **Started:** 2026-02-07T01:50:55Z
- **Completed:** 2026-02-07T01:52:30Z
- **Tasks:** 3
- **Files modified:** 1

## Accomplishments

- Updated all 6 enrichment handler signatures from `(data: T)` to `(job: Job<T>)`
- Implemented flat parent structure where all children point to root job
- Added parentJobId propagation to all spawned jobs (ENRICH_ALBUM, ENRICH_ARTIST, ENRICH_TRACK, CHECK_ARTIST_ENRICHMENT, DISCOGS_SEARCH_ARTIST, CACHE_ARTIST_IMAGE)
- All enrichmentLogger.logEnrichment calls now include jobId, parentJobId, isRootJob

## Task Commits

Since all changes were in a single file and interdependent, they were committed atomically:

1. **Tasks 1-3: Update all handler signatures and parent ID propagation** - `66c6f4c` (feat)

## Files Modified

- `src/lib/queue/processors/enrichment-processor.ts` - Updated 6 handler signatures, added rootJobId computation, propagated parentJobId to spawned jobs, added jobId/parentJobId/isRootJob to all log entries

## Decisions Made

- **handleEnrichTrack simplified**: Does not compute rootJobId since it spawns no child jobs; just uses data.parentJobId directly in log entries
- **SPOTIFY_TRACK_FALLBACK explicit flag**: Sets `isRootJob: false` explicitly since it's always a child operation of album enrichment

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None - the changes from Plan 16-02 had already prepared the processor index to pass Job objects, so this was a straightforward update of handler signatures and propagation logic.

## Next Phase Readiness

- All enrichment handlers now have correct signatures and propagate parentJobId
- Ready for Plan 16-04 (Discogs handler logging) and 16-05 (Cache handler logging)
- Type checking passes with no errors

---

_Phase: 16-job-linking_
_Completed: 2026-02-07_
