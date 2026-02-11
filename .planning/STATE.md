# Project State: v1.4 LlamaLog

**Last Updated:** 2026-02-10
**Current Milestone:** v1.4 LlamaLog - Entity Provenance & Audit System
**Status:** Phase 32 In Progress

## Project Reference

**Core Value:** Admins can fix a broken album (trackless, wrong metadata, missing IDs) in under a minute without touching the database.

**Extended Mission (v1.4):** Track the complete lifecycle of entities (Albums, Artists, Tracks) from creation through all subsequent operations. Answer: "How did this album get into the database, and what happened to it afterward?"

**Current Focus:** Phase 32 Plan 01 complete. Query infrastructure ready.

## Current Position

**Phase:** 32 - Query & Provenance (IN PROGRESS)
**Plan:** 01 of 03 - Complete
**Status:** In Progress

**Progress:**
```
[32]██████████████████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ 33%
                               ^
 Phases: 26 27 28 29 30 31 32
```

**Milestone Progress:** 6.33/7 phases complete (~90%)

## Performance Metrics

**Milestone v1.4:**
- Start date: 2026-02-09
- Phases planned: 7 (26-32)
- Requirements: 34
- Completed: 38 (37 prior + 1 Phase 32-01)
- Remaining: 2 (QUERY-02, QUERY-03)
- Phase 26 Duration: 4m 26s
- Phase 27 Total: 21m 48s
- Phase 28 Total: ~6m
- Phase 29 Total: ~25m
- Phase 30-01 Duration: 3m 22s
- Phase 31-01 Duration: ~3m
- **Phase 32-01 Duration: 3m 51s**

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

**2026-02-10: jobContext propagation for track logging (DEC-29-04-01)**
- Pattern: Added jobContext parameter to createTrackRecord and processSpotifyTracks
- Rationale: Enables proper parentJobId/rootJobId propagation through function calls

**2026-02-10: Skipped operations use ENRICHED category (DEC-30-01-01)**
- SKIPPED status still represents completed enrichment operation outcome
- Rationale: Consistent categorization across all operation outcomes

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
- Track creation logging added to all entry points
- Explicit category added to all queue processor logEnrichment calls

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

**Phase 29 (Related Entity Tracking): COMPLETE**
- [x] Plan 01: Schema migration (rootJobId column, LINKED category)
- [x] Plan 02: LlamaLogger rootJobId support
- [x] Plan 03: Artist creation/linking logging
- [x] Plan 04: Track creation/linking logging

**Phase 30 (Existing Logging Categories): COMPLETE**
- [x] Plan 01: Add explicit category to queue processor logging

**Phase 31 (UI & Branding): COMPLETE**
- [x] Plan 01: Console and admin UI llama branding

**Phase 32 (Query & Provenance):**
- [x] Plan 01: Implement llamaLogChain query with pagination and filtering
- [ ] Plan 02: TBD
- [ ] Plan 03: TBD

## Session Continuity

### What Just Happened

**2026-02-10 - Phase 32-01 Complete:**
- Plan 01: Implemented llamaLogChain GraphQL query
- Added rootJobId field to LlamaLog schema type
- Created LlamaLogChainResponse type with pagination
- Implemented resolver with entity validation and typed ID queries
- Created client query file and regenerated hooks
- All verifications pass (type-check, prisma validate, grep checks)

**Commits (Phase 32-01):**
- 4e9743b: feat(32-01): add llamaLogChain query schema
- a98a6fd: feat(32-01): implement llamaLogChain resolver
- 0639f52: feat(32-01): add client query and regenerate types

### What's Next

**Immediate:**
- Phase 32-02/03: Additional query/provenance features (TBD)

### Context for Next Session

**Phase 32-01 Completion Summary:**
- Query: `llamaLogChain(entityType, entityId, categories?, startDate?, endDate?, limit?, cursor?)`
- Response: `{ logs: [...], totalCount, cursor, hasMore }`
- Hook: `useGetLlamaLogChainQuery` generated and ready
- Resolver: Validates entity exists, uses typed ID fields, cursor pagination

**Key Files (Phase 32-01):**
- `src/graphql/schema.graphql` - Schema additions
- `src/lib/graphql/resolvers/queries.ts` - Resolver implementation
- `src/graphql/queries/llamaLogChain.graphql` - Client query
- `src/generated/graphql.ts` - Generated types and hooks

---

_State initialized: 2026-02-09_
_Last session: 2026-02-10 (Phase 32-01 complete)_
