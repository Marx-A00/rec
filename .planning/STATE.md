# Project State: v1.4 LlamaLog

**Last Updated:** 2026-02-10
**Current Milestone:** v1.4 LlamaLog - Entity Provenance & Audit System
**Status:** Phase 29 In Progress

## Project Reference

**Core Value:** Admins can fix a broken album (trackless, wrong metadata, missing IDs) in under a minute without touching the database.

**Extended Mission (v1.4):** Track the complete lifecycle of entities (Albums, Artists, Tracks) from creation through all subsequent operations. Answer: "How did this album get into the database, and what happened to it afterward?"

**Current Focus:** Phase 29 Related Entity Tracking - Adding job hierarchy support.

## Current Position

**Phase:** 29 - Related Entity Tracking (IN PROGRESS)
**Plan:** 03 of 04 - Complete
**Status:** In Progress

**Progress:**
```
[29]█████████████████████████████████████████████░ 93%
                     ^
 Phases: 26 27 28 29 30 31 32
```

**Milestone Progress:** 32/34 requirements complete (94%)

## Performance Metrics

**Milestone v1.4:**
- Start date: 2026-02-09
- Phases planned: 7 (26-32)
- Requirements: 34
- Completed: 32
- Remaining: 2
- Phase 26 Duration: 4m 26s
- Phase 27 Total: 21m 48s
- Phase 28 Total: ~6m
- Phase 29-01 Duration: 12m
- Phase 29-02 Duration: 2m 46s
- Phase 29-03 Duration: ~6m
- Phase 29-04 Duration: ~5m (prior session)

**Previous Milestone (v1.3):**
- Completed: 2026-02-09
- Phases: 9 (17-25)
- Duration: ~14 days
- Key achievement: Dual-source correction (MusicBrainz + Discogs)

## Accumulated Context

### Key Decisions (v1.4)

**2026-02-09: Safe table rename over drop/create (DEC-26-01-01)**
- Rationale: Preserves all 4052 existing records without data loss
- Impact: Manual migration SQL editing required
- Result: Zero data loss confirmed

**2026-02-09: Backfill categories by operation pattern (DEC-26-01-02)**
- Pattern mapping: cache:* -> CACHED, admin_correction -> CORRECTED, enrichment:* -> ENRICHED, FAILED status -> FAILED, catch-all -> CREATED
- Result: 3770 ENRICHED, 266 CREATED, 15 CORRECTED, 1 CACHED

**2026-02-09: Category distribution strategy (DEC-26-01-03)**
- Values: CREATED, ENRICHED, CORRECTED, CACHED, FAILED
- Rationale: Covers all existing operation patterns and provides sensible defaults for future logging

**2026-02-09: Rename EnrichmentLog -> LlamaLog**
- Rationale: Broader purpose beyond just enrichment - now covers creation, correction, caching, failures
- Impact: Schema migration complete, codebase-wide rename complete
- Trade-off: One-time migration complexity for clearer naming going forward

**2026-02-09: Category enum over operation parsing**
- Rationale: Cleaner filtering, easier queries, backward-compatible with existing operation field
- Trade-off: Requires backfill migration but simplifies future queries

**2026-02-10: deriveCategory() function for activity-logger (DEC-27-03-01)**
- Rationale: Automatic category inference from operation type reduces caller burden
- Mapping: MANUAL_CREATE->CREATED, MUSICBRAINZ_FETCH->ENRICHED, MANUAL_UPDATE->CORRECTED, etc.

**2026-02-10: Rename enrichmentLogId to llamaLogId (DEC-27-05-01)**
- Found remaining references in GraphQL schema
- Renamed for consistency with LlamaLog model
- Regenerated types to propagate change

**2026-02-10: Component file naming acceptable (DEC-27-05-02)**
- EnrichmentLogTable.tsx keeps component name
- Components correctly use LlamaLog types internally
- Minor future cleanup optional

**2026-02-10: Recursive CTE with depth limit 10 for backfill (DEC-29-01-01)**
- Pattern: Recursive CTE walks parent chain to find root job
- Rationale: Prevents infinite loops, 10 levels sufficient for all expected chains

**2026-02-10: NULL rootJobId indicates orphan data (DEC-29-01-02)**
- 42 pre-tracking records have NULL rootJobId
- Acceptable: Legacy data without job provenance
- Future logs always have rootJobId set

**2026-02-10: Auto-compute rootJobId for root jobs (DEC-29-02-01)**
- Pattern: rootJobId = data.rootJobId ?? (isRootJob ? data.jobId : null)
- Rationale: Root jobs should always have rootJobId equal to their own jobId for query consistency

**2026-02-10: Child jobs default to null rootJobId (DEC-29-02-02)**
- Non-root jobs without explicit rootJobId get null
- Rationale: Callers must pass rootJobId for child jobs; null indicates missing provenance (acceptable during incremental rollout)

**2026-02-10: CREATED vs LINKED category usage (DEC-29-03-01)**
- CREATED: New entity created in database (entity didn't exist before)
- LINKED: Existing entity associated with another entity (entity already existed)
- Rationale: Distinguishes between true creation and association for provenance tracking

### Technical Debt

**From v1.3:**
- None carried forward - v1.3 completed clean

**From v1.4:**
- Pre-existing lint errors in codebase (import/order, prettier) - not Phase 27 related
- Component file naming (EnrichmentLogTable.tsx) - minor, optional future cleanup

### Blockers

**Current:** None

**Resolved:**
- Schema migration completed with zero data loss
- LlamaLogger class created in new location
- GraphQL schema and types regenerated
- Resolver and service files updated
- Admin components updated to use LlamaLog types
- enrichmentLogId renamed to llamaLogId
- Album creation tracking added to all entry points
- rootJobId field added to LlamaLogData interface
- rootJobId column added to database with backfill
- Artist creation/linking logging added to all entry points

### Active TODOs

**Phase 26 (Schema Migration): COMPLETE**
- [x] Design migration SQL (rename table, add enum, add category field)
- [x] Write backfill logic (pattern-based category assignment)
- [x] Update Prisma schema (model + enum)
- [x] Test migration on dev database
- [x] Verify zero data loss (4052 records preserved)

**Phase 27 (Code Rename): COMPLETE**
- [x] Plan 01: Create LlamaLogger class, update processors
- [x] Plan 02: Update GraphQL schema and regenerate types
- [x] Plan 03: Update resolvers and correction services
- [x] Plan 04: Update admin UI components
- [x] Plan 05: Final verification

**Phase 28 (Album Creation Tracking): COMPLETE**
- [x] Plan 01: User-initiated creation logging (addAlbum mutation)
- [x] Plan 02: Sync operation creation logging (Spotify + MusicBrainz)

**Phase 29 (Related Entity Tracking): IN PROGRESS**
- [x] Plan 01: Schema migration (rootJobId column, LINKED category)
- [x] Plan 02: LlamaLogger rootJobId support
- [x] Plan 03: Artist creation/linking logging
- [ ] Plan 04: Track creation/linking logging

## Session Continuity

### What Just Happened

**2026-02-10 - Phase 29 Plan 03 Complete:**
- Added artist creation logging with CREATED category across 3 paths
- Added artist linking logging with LINKED category across 3 paths
- All logs include parentJobId and rootJobId for hierarchy
- Updated album logging to include jobId for proper rootJobId computation

### What's Next

**Immediate:**
- Phase 29 Plan 04: Track creation/linking logging (may be partially done from prior session)

### Context for Next Session

**Phase 29 Plan 03 Completion Summary:**
- Artist creation now logged in addAlbum, enrichment processor, MusicBrainz processor
- Artist linking now logged when existing artists are associated with albums/tracks
- CREATED vs LINKED categories correctly distinguish new vs existing entities

**Key Files (Phase 29-03):**
- `src/lib/graphql/resolvers/mutations.ts` - albumJobId, artist CREATED/LINKED logging
- `src/lib/queue/processors/enrichment-processor.ts` - track-child artist logging
- `src/lib/queue/processors/musicbrainz-processor.ts` - sync artist logging

**Commits (Phase 29-03):**
- `28fa8af`: feat(29-03): add artist creation and linking logging in addAlbum
- `ce39f60`: feat(29-03): add artist creation/linking logging in MusicBrainz processor

Note: Task 2 changes (enrichment-processor) were bundled in `9f0fddc` from prior session.

**Database State:**
- 4010 records with rootJobId filled
- 42 orphan records with NULL rootJobId
- 4052 total records in llama_logs

---

_State initialized: 2026-02-09_
_Last session: 2026-02-10 (Phase 29 Plan 03 complete)_
