# Roadmap: v1.2 Job History Timeline UI

**Created:** 2026-02-06
**Phases:** 15-20 (continues from v1.1)
**Requirements:** 20

## Phase Overview

| Phase | Name | Goal | Requirements |
|-------|------|------|--------------|
| 15 | Schema & Migration ✓ | Add `parentJobId` field to EnrichmentLog | DATA-01, DATA-02, DATA-03 |
| 16 | Job Linking | Propagate `parentJobId` through all job chains | LINK-01 through LINK-07 |
| 17 | GraphQL Layer ✓ | Expose `jobId`, `parentJobId`, and tree fetching | GQL-01 through GQL-04 |
| 18 | Timeline Component | Add shadcn-timeline with status/icon mapping | UI-01, UI-02, UI-03 |
| 19 | EnrichmentLogTable | Integrate timeline into table expand rows | TBL-01 through TBL-04 |
| 20 | Job History Tab | Add timeline to Job History tab | JOB-01, JOB-02 |

---

## Phase 15: Schema & Migration

**Goal:** Add `parentJobId` field to EnrichmentLog schema and create migration.

**Requirements:** DATA-01, DATA-02, DATA-03

**Success Criteria:**
1. `parentJobId` field exists in EnrichmentLog model (nullable VARCHAR 100)
2. Index exists on `parentJobId` for efficient child lookups
3. Migration runs without errors
4. Existing logs remain intact (null `parentJobId`)
5. Prisma client regenerated with new field

**Key Files:**
- `prisma/schema.prisma`
- `prisma/migrations/[timestamp]_add_parent_job_id/`

---

## Phase 16: Job Linking

**Goal:** Update all job processors to propagate `parentJobId` through job chains and add logging to processors that don't currently log.

**Requirements:** LINK-01, LINK-02, LINK-03, LINK-04, LINK-05, LINK-06, LINK-07

**Success Criteria:**
1. `ENRICH_ALBUM` sets `parentJobId` when spawning artist enrichment jobs
2. `ENRICH_ARTIST` sets `parentJobId` when spawning discogs/cache jobs
3. `SPOTIFY_TRACK_FALLBACK` logs include `parentJobId` pointing to parent `ENRICH_ALBUM`
4. `DISCOGS_SEARCH_ARTIST` creates EnrichmentLog entry with `parentJobId`
5. `DISCOGS_GET_ARTIST` creates EnrichmentLog entry with `parentJobId`
6. `CACHE_ARTIST_IMAGE` creates EnrichmentLog entry with `parentJobId`
7. `CACHE_ALBUM_COVER_ART` creates EnrichmentLog entry with `parentJobId`
8. Job chains are verifiable in database (query by `parentJobId`)

**Key Files:**
- `src/lib/queue/processors/enrichment-processor.ts`
- `src/lib/queue/processors/discogs-processor.ts`
- `src/lib/queue/processors/cache-processor.ts`
- `src/lib/queue/jobs.ts` (add `parentJobId` to job data types)


**Plans:** 6 plans

Plans:
- [ ] 16-01-PLAN.md - Schema (isRootJob) and job data interfaces (parentJobId)
- [ ] 16-02-PLAN.md - Processor index passes Job objects, logger supports isRootJob
- [ ] 16-03-PLAN.md - Enrichment processor updates (ENRICH_ALBUM, ENRICH_ARTIST)
- [ ] 16-04-PLAN.md - Discogs processor logging (DISCOGS_SEARCH, DISCOGS_GET)
- [ ] 16-05-PLAN.md - Cache processor logging (CACHE_ARTIST, CACHE_ALBUM)
- [ ] 16-06-PLAN.md - Verification and type checking

---

## Phase 17: GraphQL Layer

**Goal:** Expose `jobId` and `parentJobId` in GraphQL schema and implement tree fetching.

**Requirements:** GQL-01, GQL-02, GQL-03, GQL-04

**Success Criteria:**
1. `EnrichmentLog` type has `jobId: String` field
2. `EnrichmentLog` type has `parentJobId: String` field
3. `enrichmentLogs` query accepts `includeChildren: Boolean` parameter
4. When `includeChildren=true`, resolver returns parent logs with nested `children` array
5. GraphQL codegen runs without errors
6. Generated hooks include new fields

**Key Files:**
- `src/graphql/schema.graphql`
- `src/graphql/queries/enrichment.graphql`
- `src/lib/graphql/resolvers/queries.ts`

**Plans:** 2 plans

Plans:
- [x] 17-01-PLAN.md — Schema and client query updates (parentJobId, children, includeChildren)
- [x] 17-02-PLAN.md — Resolver tree logic and codegen verification

---

## Phase 18: Timeline Component

**Goal:** Add shadcn-timeline component and create mapping utilities for EnrichmentLog.

**Requirements:** UI-01, UI-02, UI-03

**Success Criteria:**
1. `timeline.tsx` and `timeline-layout.tsx` copied to `src/components/ui/timeline/`
2. Component exports work (`Timeline`, `TimelineItem`, etc.)
3. `mapEnrichmentStatus()` utility maps log status to timeline status
4. `getOperationIcon()` utility returns appropriate icon for operation type
5. Timeline renders correctly with sample data
6. Framer Motion animations work

**Key Files:**
- `src/components/ui/timeline/timeline.tsx`
- `src/components/ui/timeline/timeline-layout.tsx`
- `src/components/ui/timeline/index.ts`
- `src/components/admin/EnrichmentTimeline.tsx` (wrapper with mapping)

---

## Phase 19: EnrichmentLogTable Integration

**Goal:** Integrate timeline into EnrichmentLogTable expanded rows.

**Requirements:** TBL-01, TBL-02, TBL-03, TBL-04

**Success Criteria:**
1. Table query fetches only parent logs (`parentJobId: null`) by default
2. Rows with children show expand chevron (based on existence of children)
3. Clicking expand loads children and shows Timeline component
4. Child logs do not appear as separate rows in main table
5. Timeline shows parent job first, then children in chronological order
6. Existing field changes panel still works alongside timeline

**Key Files:**
- `src/components/admin/EnrichmentLogTable.tsx`
- `src/graphql/queries/enrichment.graphql`

---

## Phase 20: Job History Tab

**Goal:** Add linked job timeline display to Job History tab.

**Requirements:** JOB-01, JOB-02

**Success Criteria:**
1. Job History tab shows jobs with enrichment activity indicator
2. Expanding a job row shows EnrichmentLog timeline for that `jobId`
3. Timeline displays all logs linked to that job (parent + children)
4. Works for Spotify sync jobs, manual enrichment, collection adds

**Key Files:**
- `src/app/admin/job-history/page.tsx`
- `src/components/admin/JobHistoryTimeline.tsx` (new)

---

## Dependency Graph

```
Phase 15 (Schema)
    ↓
Phase 16 (Job Linking) ──→ Phase 17 (GraphQL)
                                ↓
                          Phase 18 (Timeline Component)
                                ↓
                          Phase 19 (EnrichmentLogTable)
                                ↓
                          Phase 20 (Job History Tab)
```

**Critical Path:** 15 → 16 → 17 → 18 → 19 → 20

**Parallelization:** Phase 18 (Timeline Component) can start after Phase 15 if needed, but full integration requires Phase 17.

---

## Risk Mitigation

| Risk | Mitigation |
|------|------------|
| Migration fails on production data | Test migration on copy of prod data first |
| N+1 queries on child fetch | Batch fetch children in resolver, not per-row |
| Timeline component incompatibility | Component is copy-paste, full control to fix |
| Old logs without `parentJobId` | Treat as standalone, show without children |

---

*Roadmap created: 2026-02-06*
*Last updated: 2026-02-06 — Phase 17 complete*
