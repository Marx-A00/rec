---
phase: 01-foundation-infrastructure
plan: 01
subsystem: queue
tags: [bullmq, priority, admin-ui]

dependency-graph:
  requires: []
  provides: [PRIORITY_TIERS, PriorityTier, priority-aware-queue-service]
  affects: [01-02, 01-03, 02-01]

tech-stack:
  added: []
  patterns: [semantic-priority-tiers, optional-parameter-defaults]

key-files:
  created: []
  modified:
    - src/lib/queue/jobs.ts
    - src/lib/queue/index.ts
    - src/lib/musicbrainz/queue-service.ts

decisions:
  - id: priority-values
    decision: 'ADMIN=1, USER=5, ENRICHMENT=8, BACKGROUND=10'
    rationale: 'Lower number = higher priority (BullMQ convention). Wide spacing allows future tiers.'

metrics:
  duration: 5m
  completed: 2026-01-24
---

# Phase 1 Plan 1: Priority Queue Foundation Summary

**One-liner:** Semantic priority tiers (ADMIN/USER/ENRICHMENT/BACKGROUND) for BullMQ job scheduling with optional priorityTier parameter on queue-service methods.

## Objective Achieved

Added semantic priority tiers to the BullMQ queue system so admin requests can be prioritized over background jobs. Admin UI corrections will now execute before scheduled syncs to provide responsive correction workflow.

## Tasks Completed

**Task 1: Add PRIORITY_TIERS constant and type to jobs.ts**

- Added PRIORITY_TIERS constant with four semantic tiers: ADMIN(1), USER(5), ENRICHMENT(8), BACKGROUND(10)
- Created PriorityTier type for type-safe priority usage
- Exported both from src/lib/queue/index.ts
- Commit: 0400abc

**Task 2: Update queue-service.ts to accept priority tier parameter**

- Updated all 8 public MusicBrainz methods to accept optional priorityTier parameter
- Default is PRIORITY_TIERS.USER (5) for backward compatibility
- Methods updated: searchArtists, searchReleaseGroups, searchRecordings, getArtist, getRelease, getReleaseGroup, getRecording, browseReleaseGroupsByArtist
- Commit: d787796

## Decisions Made

- **Priority Values**: ADMIN=1, USER=5, ENRICHMENT=8, BACKGROUND=10
  - Lower number = higher priority (BullMQ convention)
  - Wide spacing allows adding intermediate tiers later (e.g., URGENT=3)
  - ADMIN is highest priority for immediate admin UI feedback

- **Backward Compatibility**: Default to USER priority
  - Existing code calling without priority parameter continues to work unchanged
  - New admin correction code will explicitly pass PRIORITY_TIERS.ADMIN

## Deviations from Plan

None - plan executed exactly as written.

## What's Ready for Next Phase

The queue infrastructure now supports priority-based job scheduling:

- Admin correction service (01-02) can import PRIORITY_TIERS.ADMIN
- Background sync jobs (01-03) can use PRIORITY_TIERS.BACKGROUND
- All existing user-facing code works unchanged with USER priority

## Files Changed

- `src/lib/queue/jobs.ts` - Added PRIORITY_TIERS constant and PriorityTier type
- `src/lib/queue/index.ts` - Exported PRIORITY_TIERS and PriorityTier
- `src/lib/musicbrainz/queue-service.ts` - Added priorityTier parameter to 8 methods

## Next Phase Readiness

Ready for 01-02 (Admin Correction Service):

- PRIORITY_TIERS.ADMIN available for high-priority corrections
- Queue service methods can receive explicit priority
- No blockers identified
