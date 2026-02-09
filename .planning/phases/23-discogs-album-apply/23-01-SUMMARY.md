---
phase: 23-discogs-album-apply
plan: 01
subsystem: queue
tags: [discogs, bullmq, queue, rate-limiting, api]

# Dependency graph
requires:
  - phase: 22-discogs-album-search
    provides: DISCOGS_SEARCH_ALBUM job type and QueuedDiscogsService pattern
provides:
  - DISCOGS_GET_MASTER job type for fetching master details
  - QueuedDiscogsService.getMaster() method
  - handleDiscogsGetMaster processor handler
  - Queue routing for DISCOGS_GET_MASTER and DISCOGS_SEARCH_ALBUM
affects:
  - 23-discogs-album-apply (plans 02, 03 will use getMaster for preview generation)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - QueuedDiscogsService follows QueuedMusicBrainzService singleton pattern
    - Job handlers use dynamic import for ESM-friendly Discogs client

key-files:
  created: []
  modified:
    - src/lib/queue/jobs.ts
    - src/lib/discogs/queued-service.ts
    - src/lib/queue/processors/discogs-processor.ts
    - src/lib/queue/processors/index.ts

key-decisions:
  - 'getMaster returns DiscogsMaster type (full tracklist + images)'
  - 'ADMIN priority tier for getMaster (immediate feedback for admin UI)'

patterns-established:
  - 'Pattern: Discogs job types mirror MusicBrainz pattern (search -> get detail)'

# Metrics
duration: 8min
completed: 2026-02-09
---

# Phase 23 Plan 01: Queue Infrastructure Summary

**DISCOGS_GET_MASTER job type and QueuedDiscogsService.getMaster() for fetching full master data with tracklist**

## Performance

- **Duration:** 8 min
- **Started:** 2026-02-09T03:22:55Z
- **Completed:** 2026-02-09T03:30:36Z
- **Tasks:** 3
- **Files modified:** 4

## Accomplishments

- Added DISCOGS_GET_MASTER job type constant and DiscogsGetMasterJobData interface
- Implemented QueuedDiscogsService.getMaster() method returning DiscogsMaster type
- Created handleDiscogsGetMaster processor for fetching master details from Discogs API
- Wired both DISCOGS_GET_MASTER and DISCOGS_SEARCH_ALBUM to processor routing

## Task Commits

Each task was committed atomically:

1. **Task 1: Add DISCOGS_GET_MASTER job type and data interface** - `73d6c06` (feat)
2. **Task 2: Add getMaster method to QueuedDiscogsService** - `81240b2` (feat)
3. **Task 3: Add handleDiscogsGetMaster processor and wire to worker** - `af6ea4f` (feat)

## Files Created/Modified

- `src/lib/queue/jobs.ts` - Added DISCOGS_GET_MASTER constant and DiscogsGetMasterJobData interface
- `src/lib/discogs/queued-service.ts` - Added getMaster() method with DiscogsMaster return type
- `src/lib/queue/processors/discogs-processor.ts` - Added handleDiscogsGetMaster handler function
- `src/lib/queue/processors/index.ts` - Wired DISCOGS_GET_MASTER and DISCOGS_SEARCH_ALBUM routing

## Decisions Made

- getMaster() uses ADMIN priority tier (priority 1) for immediate feedback in admin UI
- Changed JobResult generic from `any` to `unknown` for type safety
- Handler returns raw DiscogsMaster object (full data with tracklist and images)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Wired missing DISCOGS_SEARCH_ALBUM case**

- **Found during:** Task 3 (wiring processor routing)
- **Issue:** DISCOGS_SEARCH_ALBUM from Phase 22 was never wired to the processor switch statement
- **Fix:** Added handleDiscogsSearchAlbum import and case statement in processors/index.ts
- **Files modified:** src/lib/queue/processors/index.ts
- **Verification:** pnpm type-check passes, case routes correctly
- **Committed in:** af6ea4f (Task 3 commit)

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** Essential fix for DISCOGS_SEARCH_ALBUM functionality from Phase 22.

## Issues Encountered

None - plan executed smoothly.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Queue infrastructure complete for Discogs master fetching
- Ready for 23-02: Preview generation service using getMaster()
- Ready for 23-03: Apply correction with tracklist data

---

_Phase: 23-discogs-album-apply_
_Plan: 01_
_Completed: 2026-02-09_
