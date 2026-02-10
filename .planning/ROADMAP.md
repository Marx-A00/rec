# Roadmap: v1.4 LlamaLog - Entity Provenance & Audit System

**Milestone:** v1.4
**Created:** 2026-02-09
**Status:** Planning

## Overview

Transform EnrichmentLog into LlamaLog - a complete entity provenance and audit system that tracks not just enrichment operations, but the entire lifecycle of entities from creation through all subsequent operations. The system answers: "How did this album get into the database, and what happened to it afterward?"

**Core changes:** Rename EnrichmentLog → LlamaLog, add category classification (CREATED, ENRICHED, CORRECTED, CACHED, FAILED), track album/artist/track creation events across all entry points, maintain parent-child job relationships, and add llama branding throughout.

## Phases

**Phase 26: Schema Migration**
- Goal: Rename database model and table, add category enum
- Requirements: 5 (SCHEMA-01 through SCHEMA-05)
- Success Criteria: 4

**Phase 27: Code Rename**
- Goal: Update all codebase references to new naming
- Requirements: 7 (CODE-01 through CODE-07)
- Success Criteria: 3

**Phase 28: Album Creation Tracking**
- Goal: Log album creation from all entry points
- Requirements: 7 (CREATE-01 through CREATE-07)
- Success Criteria: 4

**Phase 29: Related Entity Tracking**
- Goal: Log artist/track creation as children of album jobs
- Requirements: 5 (RELATE-01 through RELATE-05)
- Success Criteria: 3

**Phase 30: Existing Logging Categories**
- Goal: Apply category field to existing logging operations
- Requirements: 4 (EXIST-01 through EXIST-04)
- Success Criteria: 2

**Phase 31: UI & Branding**
- Goal: Add llama emoji and theming to console and admin UI
- Requirements: 4 (UI-01 through UI-04)
- Success Criteria: 3

**Phase 32: Query & Provenance**
- Goal: GraphQL query for entity provenance chains
- Requirements: 3 (QUERY-01 through QUERY-03)
- Success Criteria: 3

---

## Phase 26: Schema Migration

**Goal:** Database model and table renamed with new category enum, preserving all existing data.

**Dependencies:** None (foundation phase)

**Requirements:**
- SCHEMA-01: Prisma model renamed from `EnrichmentLog` to `LlamaLog`
- SCHEMA-02: Database table renamed via migration preserving all data
- SCHEMA-03: New `LlamaLogCategory` enum with values: CREATED, ENRICHED, CORRECTED, CACHED, FAILED
- SCHEMA-04: New `category` field added to `LlamaLog` model (required)
- SCHEMA-05: Migration backfills existing records with appropriate categories

**Success Criteria:**

1. **Database table renamed:** `EnrichmentLog` table renamed to `LlamaLog` with zero data loss
2. **Category enum exists:** `LlamaLogCategory` enum created with all 5 values (CREATED, ENRICHED, CORRECTED, CACHED, FAILED)
3. **All existing records categorized:** Migration successfully backfills category field based on operation patterns
4. **Prisma schema valid:** `npx prisma validate` succeeds, `npx prisma generate` produces `LlamaLog` types

**Plans:** 1 plan

Plans:
- [x] 26-01-PLAN.md — Schema rename, enum creation, and backfill migration

**Key Files:**
- `prisma/schema.prisma` - Model and enum definitions
- `prisma/migrations/[timestamp]_rename_enrichment_log_to_llama_log/` - Migration SQL
- Generated Prisma types

**Notes:**
- Migration must be reversible (down migration included)
- Backfill logic uses SQL CASE based on operation field patterns
- Consider index on `(category, entityType)` for common queries

---

## Phase 27: Code Rename

**Goal:** All codebase references updated from EnrichmentLog to LlamaLog.

**Dependencies:** Phase 26 (schema must exist first)

**Requirements:**
- CODE-01: Logger class renamed from `EnrichmentLogger` to `LlamaLogger`
- CODE-02: Logger file moved to `src/lib/logging/llama-logger.ts`
- CODE-03: All `prisma.enrichmentLog` calls updated to `prisma.llamaLog`
- CODE-04: All type imports updated (`EnrichmentLog` → `LlamaLog`)
- CODE-05: GraphQL schema types updated
- CODE-06: Generated GraphQL types regenerated via codegen
- CODE-07: All resolver references updated

**Success Criteria:**

1. **No `EnrichmentLog` references remain:** Codebase search for `EnrichmentLog` (case-sensitive) returns zero results in non-migration files
2. **Logger class functional:** `LlamaLogger` can be instantiated and log operations without errors
3. **GraphQL types regenerated:** `pnpm codegen` succeeds, generated types include `LlamaLog` and `LlamaLogCategory`

**Plans:** 5 plans

Plans:
- [x] 27-01-PLAN.md — Logger class rename and relocation
- [x] 27-02-PLAN.md — GraphQL schema and codegen update
- [x] 27-03-PLAN.md — Resolver and service updates
- [x] 27-04-PLAN.md — Component updates
- [x] 27-05-PLAN.md — Final verification

**Key Files:**
- `src/lib/logging/llama-logger.ts` (renamed from enrichment-logger.ts)
- `src/graphql/schema.graphql` - GraphQL type definitions
- `src/lib/graphql/resolvers/*.ts` - All resolver files
- `src/generated/graphql.ts` - Regenerated types
- All files importing/using the logger

**Notes:**
- Use global find-replace with caution (avoid breaking migration file comments)
- Verify no runtime errors after rename (check existing admin UI still works)
- GraphQL subscriptions may have cached types - consider cache clear

---

## Phase 28: Album Creation Tracking

**Goal:** All album creation paths log CREATED category events with full context.

**Dependencies:** Phase 27 (LlamaLogger must exist)

**Requirements:**
- CREATE-01: Album creation from `addAlbum` mutation logged with category: CREATED
- CREATE-02: ~~Album creation from `addAlbumToCollection`~~ — N/A: `addAlbumToCollection` links existing albums to collections (uses `tx.collectionAlbum.create()` with existing albumId), does not create albums
- CREATE-03: Album creation from Spotify sync logged with category: CREATED
- CREATE-04: Album creation from MusicBrainz sync logged with category: CREATED
- CREATE-05: Album creation from search/save flow logged with category: CREATED (covered by addAlbum)
- CREATE-06: Creation logs include userId when user-triggered
- CREATE-07: Creation logs have isRootJob: true

**Success Criteria:**

1. **User-initiated creation tracked:** Creating album via `addAlbum` mutation produces LlamaLog entry with category: CREATED, isRootJob: true, userId populated
2. **Sync operations tracked:** Both Spotify and MusicBrainz new releases sync produce CREATED logs for new albums (userId null, jobId present)
3. **All paths verified:** Manual test of each creation path confirms LlamaLog entry appears in database with correct category

**Plans:** 2 plans

Plans:
- [x] 28-01-PLAN.md — User-initiated creation logging (addAlbum mutation)
- [x] 28-02-PLAN.md — Sync operation creation logging (Spotify + MusicBrainz)

**Key Files:**
- `src/lib/graphql/resolvers/mutations.ts` - addAlbum mutation
- `src/lib/spotify/mappers.ts` - Spotify sync album creation
- `src/lib/queue/processors/musicbrainz-processor.ts` - MusicBrainz sync
- `src/lib/logging/llama-logger.ts` - Logger methods

**Notes:**
- CREATE-01 and CREATE-05 are both covered by addAlbum mutation (single entry point for user-initiated album creation)
- CREATE-02 is NOT applicable: `addAlbumToCollection` requires an existing albumId and only creates a collectionAlbum link record
- Creation logs should fire AFTER successful database insert
- userId is null for automated sync operations


---

## Phase 29: Related Entity Tracking

**Goal:** Artist and track creation logged as children of album creation jobs.

**Dependencies:** Phase 28 (album creation tracking must exist)

**Requirements:**
- RELATE-01: Artist creation logged as child of album creation
- RELATE-02: Artist creation has parentJobId pointing to album's jobId
- RELATE-03: Track creation logged as child of album creation/enrichment
- RELATE-04: Track creation has parentJobId pointing to root job
- RELATE-05: Child creations have isRootJob: false

**Success Criteria:**

1. **Artist creation linked:** When album creation triggers artist creation, LlamaLog shows artist entry with parentJobId = album's jobId, isRootJob: false
2. **Track creation linked:** When album enrichment creates tracks, LlamaLog shows track entries with parentJobId = root album jobId
3. **Timeline shows hierarchy:** Admin UI timeline for an album displays artist and track creation as children

Plans:
- [x] 29-01-PLAN.md — Schema migration: rootJobId column and LINKED category
- [x] 29-02-PLAN.md — LlamaLogger interface: add rootJobId support
- [x] 29-03-PLAN.md — Artist creation logging (8 paths)
- [x] 29-04-PLAN.md — Track creation logging (3 paths)

**Key Files:**
- `src/workers/queue-worker.ts` - Artist/track creation handlers
- `src/lib/musicbrainz/queue-service.ts` - MusicBrainz operations
- `src/lib/logging/llama-logger.ts` - Logger methods
- `src/lib/graphql/resolvers/queries.ts` - Timeline queries

**Notes:**
- parentJobId must propagate through job chains (e.g., album → artist → artist enrichment)
- isRootJob = false for all child operations
- Consider depth limits to prevent infinite recursion in timeline queries

---

## Phase 30: Existing Logging Categories

**Goal:** All existing logging operations use appropriate category values.

**Dependencies:** Phase 27 (LlamaLogger must exist)

**Requirements:**
- EXIST-01: All enrichment operations use category: ENRICHED
- EXIST-02: All correction operations use category: CORRECTED
- EXIST-03: All cache/image operations use category: ENRICHED (adds cloudflareImageId field)
- EXIST-04: All failed operations use category: FAILED

**Success Criteria:**

1. **Enrichment categorized:** Triggering album enrichment (MusicBrainz get-release job) produces LlamaLog with category: ENRICHED
2. **Corrections categorized:** Applying Discogs/MusicBrainz correction produces LlamaLog with category: CORRECTED

**Key Files:**
- `src/workers/queue-worker.ts` - All job handlers
- `src/lib/graphql/resolvers/mutations.ts` - Correction mutations
- `src/lib/logging/llama-logger.ts` - Logger method signatures

**Notes:**
- Existing enrichment code already logs - just add category parameter
- FAILED category should capture exceptions in enrichment/correction operations
- CACHED category for album cover and artist image cache operations

**Plans:** 1 plan

Plans:
- [x] 30-01-PLAN.md — Add explicit category values to processor logEnrichment calls

---

## Phase 31: UI & Branding

**Goal:** Llama emoji and theming in console output and admin UI.

**Dependencies:** Phase 27 (LlamaLogger must exist)

**Requirements:**
- UI-01: Console log output uses `[🦙 LlamaLog]` prefix
- UI-02: Admin log table shows llama emoji in header
- UI-03: Log detail view includes llama theming
- UI-04: Category badges incorporate llama where appropriate

**Success Criteria:**

1. **Console logs branded:** Server logs show `[🦙 LlamaLog]` prefix for all logger output
2. **Admin table header:** EnrichmentLogTable component header displays "🦙 LlamaLog" instead of "Enrichment Log"
3. **Category badges themed:** Category badges in timeline/table show llama emoji for CREATED entries


**Plans:** 1 plan

Plans:
- [ ] 31-01-PLAN.md — Console and admin UI llama branding

**Key Files:**
- `src/lib/logging/llama-logger.ts` - Console output
- `src/components/admin/enrichment/EnrichmentLogTable.tsx` - Table header
- `src/components/admin/enrichment/EnrichmentLogTimeline.tsx` - Timeline display
- `src/components/admin/enrichment/LogCategoryBadge.tsx` - Category rendering (if created)

**Notes:**
- Keep llama emoji optional in code comments (don't break syntax highlighting)
- Emoji should enhance UX, not clutter - use sparingly
- Consider accessibility (emoji should not be the only indicator)

---

## Phase 32: Query & Provenance

**Goal:** GraphQL query returns complete entity provenance chain.

**Dependencies:** Phase 28, 29 (creation tracking must exist)

**Requirements:**
- QUERY-01: GraphQL query `llamaLogChain(entityType, entityId)` returns root + all children
- QUERY-02: Chain query returns logs ordered by createdAt
- QUERY-03: Chain query can filter by category

**Success Criteria:**

1. **Chain query exists:** `llamaLogChain` query in GraphQL schema accepts entityType and entityId parameters
2. **Root + children returned:** Querying for an album's chain returns the album CREATED log plus all related artist/track creation logs
3. **Filtering works:** Passing category filter (e.g., `[CREATED, ENRICHED]`) returns only matching logs in the chain

**Key Files:**
- `src/graphql/schema.graphql` - Query definition
- `src/lib/graphql/resolvers/queries.ts` - Resolver implementation
- `src/graphql/queries/llamaLog.graphql` - Client query
- `src/generated/graphql.ts` - Generated types (after codegen)

**Notes:**
- Query should be efficient (avoid N+1 queries, use Prisma include/select)
- Consider pagination for entities with many child logs
- Return type should match existing log queries for consistency

---

## Dependencies

**Phase execution order:**

```
26 (Schema Migration)
  ↓
27 (Code Rename)
  ↓
28 (Album Creation Tracking) ← 30 (Existing Logging Categories)
  ↓                             ↓
29 (Related Entity Tracking)    31 (UI & Branding)
  ↓
32 (Query & Provenance)
```

**Parallelization opportunities:**
- Phase 30 (Existing Logging) can run in parallel with Phase 28
- Phase 31 (UI & Branding) can run in parallel with Phase 28/29
- Phase 32 depends on Phase 28 and 29 completing

---

## Progress Tracking

| Phase | Name                          | Requirements | Status  | Completed |
|-------|-------------------------------|--------------|---------|-----------|
| 26    | Schema Migration              | 5            | Complete | 2026-02-09 |
| 27    | Code Rename                   | 7            | Complete | 2026-02-09 |
| 28    | Album Creation Tracking       | 7            | Complete | 2026-02-10 |
| 29    | Related Entity Tracking       | 5            | Complete | 2026-02-10 |
| 30    | Existing Logging Categories   | 4            | Complete | 2026-02-10 |
| 31    | UI & Branding                 | 4            | Pending | -         |
| 32    | Query & Provenance            | 3            | Pending | -         |

**Total:** 7 phases, 34 requirements

---

## Requirement Coverage

| Requirement | Phase | Status  | Description                              |
|-------------|-------|---------|------------------------------------------|
| SCHEMA-01   | 26    | Complete | Rename Prisma model                      |
| SCHEMA-02   | 26    | Complete | Rename database table                    |
| SCHEMA-03   | 26    | Complete | Add category enum                        |
| SCHEMA-04   | 26    | Complete | Add category field                       |
| SCHEMA-05   | 26    | Complete | Backfill existing records                |
| CODE-01     | 27    | Complete | Rename logger class                      |
| CODE-02     | 27    | Complete | Move logger file                         |
| CODE-03     | 27    | Complete | Update prisma calls                      |
| CODE-04     | 27    | Complete | Update type imports                      |
| CODE-05     | 27    | Complete | Update GraphQL schema                    |
| CODE-06     | 27    | Complete | Regenerate GraphQL types                 |
| CODE-07     | 27    | Complete | Update resolver references               |
| CREATE-01   | 28    | Complete | Log addAlbum creation                    |
| CREATE-02   | 28    | N/A     | addAlbumToCollection links, not creates  |
| CREATE-03   | 28    | Complete | Log Spotify sync creation                |
| CREATE-04   | 28    | Complete | Log MusicBrainz sync creation            |
| CREATE-05   | 28    | Complete | Log search/save creation                 |
| CREATE-06   | 28    | Complete | Include userId in creation logs          |
| CREATE-07   | 28    | Complete | Set isRootJob true for creations         |
| RELATE-01   | 29    | Complete | Log artist creation                      |
| RELATE-02   | 29    | Complete | Set parentJobId for artists              |
| RELATE-03   | 29    | Complete | Log track creation                       |
| RELATE-04   | 29    | Complete | Set parentJobId for tracks               |
| RELATE-05   | 29    | Complete | Set isRootJob false for children         |
| EXIST-01    | 30    | Complete | Categorize enrichment operations         |
| EXIST-02    | 30    | Complete | Categorize correction operations         |
| EXIST-03    | 30    | Complete | Categorize cache/image ops as ENRICHED   |
| EXIST-04    | 30    | Complete | Categorize failed operations             |
| UI-01       | 31    | Pending | Console log prefix                       |
| UI-02       | 31    | Pending | Admin table header                       |
| UI-03       | 31    | Pending | Log detail theming                       |
| UI-04       | 31    | Pending | Category badge theming                   |
| QUERY-01    | 32    | Pending | Create llamaLogChain query               |
| QUERY-02    | 32    | Pending | Order chain by createdAt                 |
| QUERY-03    | 32    | Pending | Filter chain by category                 |

**Coverage:** 34/34 requirements mapped (100%)

---

_Roadmap created: 2026-02-09_
_Last updated: 2026-02-10 (Phase 30 complete)_
