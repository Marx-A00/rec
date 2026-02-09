# Project State: v1.4 LlamaLog

**Last Updated:** 2026-02-09
**Current Milestone:** v1.4 LlamaLog - Entity Provenance & Audit System
**Status:** Planning

## Project Reference

**Core Value:** Admins can fix a broken album (trackless, wrong metadata, missing IDs) in under a minute without touching the database.

**Extended Mission (v1.4):** Track the complete lifecycle of entities (Albums, Artists, Tracks) from creation through all subsequent operations. Answer: "How did this album get into the database, and what happened to it afterward?"

**Current Focus:** Rename EnrichmentLog → LlamaLog and expand from enrichment-only tracking to full entity provenance system with creation event logging.

## Current Position

**Phase:** 26 - Schema Migration
**Plan:** Not yet created
**Status:** Pending

**Progress:**
```
[26]━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ 0%
 ^
 Phases: 26 27 28 29 30 31 32
```

**Milestone Progress:** 0/34 requirements complete (0%)

## Performance Metrics

**Milestone v1.4:**
- Start date: 2026-02-09
- Phases planned: 7 (26-32)
- Requirements: 34
- Completed: 0
- Remaining: 34
- Estimated completion: TBD (after first phase planning)

**Previous Milestone (v1.3):**
- Completed: 2026-02-09
- Phases: 9 (17-25)
- Duration: ~14 days
- Key achievement: Dual-source correction (MusicBrainz + Discogs)

## Accumulated Context

### Key Decisions (v1.4)

**2026-02-09: Rename EnrichmentLog → LlamaLog**
- Rationale: Broader purpose beyond just enrichment - now covers creation, correction, caching, failures
- Impact: Schema migration, codebase-wide rename, GraphQL regeneration
- Trade-off: One-time migration complexity for clearer naming going forward

**2026-02-09: Category enum over operation parsing**
- Rationale: Cleaner filtering, easier queries, backward-compatible with existing operation field
- Values: CREATED, ENRICHED, CORRECTED, CACHED, FAILED
- Trade-off: Requires backfill migration but simplifies future queries

**2026-02-09: Track all album creation paths**
- Paths: addAlbum mutation, addAlbumToCollection, Spotify sync, MusicBrainz sync, search/save
- Rationale: Complete provenance requires capturing every entry point
- Trade-off: More logging calls to add, but essential for answering "how did this get here?"

**2026-02-09: Parent-child for related entities**
- Pattern: Album creation logs artist/track creation as children via parentJobId
- Rationale: Maintain existing job linking pattern from v1.2
- Trade-off: None - already supported in schema

**2026-02-09: Llama branding throughout**
- Where: Console logs, admin UI, code comments, category badges
- Rationale: Fun, memorable, aligns with expanded "llama-sized" logging scope
- Emoji: 🦙 used sparingly for accessibility

### Technical Debt

**From v1.3:**
- None carried forward - v1.3 completed clean

**Potential in v1.4:**
- Migration backfill logic complexity (category assignment based on operation patterns)
- Global find-replace risk (must avoid breaking migration SQL comments)
- GraphQL cache invalidation after type rename

### Blockers

**Current:** None

**Resolved:**
- None yet (milestone just started)

### Active TODOs

**Phase 26 (Schema Migration):**
- [ ] Design migration SQL (rename table, add enum, add category field)
- [ ] Write backfill logic (CASE statement for category assignment)
- [ ] Update Prisma schema (model + enum)
- [ ] Test migration on dev database
- [ ] Verify zero data loss

**Phase 27 (Code Rename):**
- [ ] Plan global find-replace strategy
- [ ] Identify all import statements
- [ ] Update GraphQL schema
- [ ] Regenerate types (pnpm codegen)
- [ ] Verify existing admin UI still works

**Phase 28-32:**
- [ ] Pending phase 26 and 27 completion

## Session Continuity

### What Just Happened

**2026-02-09 - Milestone v1.4 Started:**
- Roadmap created with 7 phases (26-32)
- Requirements mapped: 34/34 (100% coverage)
- Phase structure validated: Schema → Code → Creation → Relations → Categories → UI → Query
- Dependency graph established with parallelization opportunities identified

### What's Next

**Immediate (Phase 26):**
1. Review existing Prisma schema and migration patterns
2. Draft migration SQL with backfill logic
3. Update Prisma schema (model + enum)
4. Test migration on local dev database
5. Verify Prisma client generation succeeds

**After Phase 26:**
- Phase 27: Execute global codebase rename with verification
- Phase 28: Add creation logging to all album entry points
- Phase 29: Link artist/track creation to album jobs

**Parallelization Strategy:**
- Phase 30 (categorizing existing logs) can run parallel with Phase 28
- Phase 31 (UI branding) can run parallel with Phase 28/29
- Phase 32 (query) requires Phase 28+29 complete

### Context for Next Session

**If resuming Phase 26:**
- Check: `/prisma/schema.prisma` for current EnrichmentLog model
- Check: `/prisma/migrations/` for recent migration patterns
- Check: `.env.example` for database connection setup
- Goal: Complete schema migration with zero data loss

**If resuming Phase 27:**
- Verify: Phase 26 merged and deployed
- Check: All files importing `EnrichmentLog` or `EnrichmentLogger`
- Check: `src/graphql/schema.graphql` for type definitions
- Goal: Clean codebase with no `EnrichmentLog` references remaining

**Key Files to Track:**
- `prisma/schema.prisma` - Model definitions (Phase 26)
- `src/lib/logging/llama-logger.ts` - Logger class (Phase 27)
- `src/graphql/schema.graphql` - GraphQL types (Phase 27)
- `src/lib/graphql/resolvers/mutations.ts` - Creation logging (Phase 28)
- `src/workers/queue-worker.ts` - Job handlers (Phase 28-30)

---

_State initialized: 2026-02-09_
_Last session: 2026-02-09 (roadmap creation)_
