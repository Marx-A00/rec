# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-08)

**Core value:** Admins can fix a broken album in under a minute without touching the database.
**Current focus:** Milestone v1.3 — Discogs Correction Source

## Current Position

Phase: 23 of 25 (Discogs Album Apply) — COMPLETE
Plan: 3 of 3 in current phase
Status: Phase 23 complete
Last activity: 2026-02-09 — Completed 23-03-PLAN.md

Progress: [█████████░░░░░░░░░░░] 9/18 plans complete (v1.3)

## Performance Metrics

**Milestone v1.0 (Shipped 2026-02-03):**

- Phases: 12
- Plans: 37
- Duration: 11 days
- Requirements: 35/35

**Milestone v1.1 (Shipped 2026-02-05):**

- Phases: 2 (13-14)
- Plans: 5
- Duration: 1 day
- Requirements: 30/30

**Milestone v1.2 (Shipped 2026-02-07):**

- Phases: 6 (15-20)
- Plans: 15
- Duration: 2 days
- Requirements: 20/20

**Milestone v1.3 (In Progress):**

- Phases: 5 (21-25)
- Plans: 9 complete (phase 21 + phase 22 + phase 23)
- Requirements: 11/17 complete (UI-01 through UI-04, ALB-01, ALB-02, ALB-03, MAP-01, ALB-04, ALB-05, ALB-06)

**Total shipped:** 21 phases, 62 plans

## Accumulated Context

### Key Decisions (from v1.0 + v1.1 + v1.2 + v1.3)

- MusicBrainz only for v1 (Discogs/Spotify deferred) — NOW ADDING DISCOGS
- Session-only state (no DB persistence for correction queue)
- Thin resolver pattern — all business logic in services
- Separate Zustand stores for album and artist (different state shapes)
- Factory pattern with Map cache for per-entity store instances
- Atomic actions for multi-field state updates
- `parentJobId` for job linking (flat parent structure)
- shadcn-timeline for enrichment visualization
- [21-01] CorrectionSource type defined in album store, re-exported from artist store
- [21-01] Atomic state clearing on source switch (prevents stale data)
- [21-02] SourceToggle placed at top of search views
- [21-02] Toggle disabled during loading to prevent mid-query source switch
- [21-03] Source badge in preview header (not per-field)
- [22-01] DISCOGS_SEARCH_ALBUM job type added
- [22-01] Shared mapper mapMasterToCorrectionSearchResult in mappers.ts
- [22-01] QueuedDiscogsService follows QueuedMusicBrainzService pattern
- [22-02] CorrectionSource enum in GraphQL schema (MUSICBRAINZ, DISCOGS)
- [22-02] Resolver routes to QueuedDiscogsService when source is DISCOGS
- [22-03] Orange accent for Discogs cards (border + hover)
- [22-03] Badge labels 'DG'/'MB' for source indication
- [22-03] Unified search UI for both sources
- [23-01] DISCOGS_GET_MASTER job type for master detail fetching
- [23-01] getMaster() returns full DiscogsMaster (tracklist + images)
- [23-01] ADMIN priority tier for getMaster (immediate feedback)
- [23-02] CorrectionSource type in preview/types.ts for service layer
- [23-02] Discogs tracklist parsing handles A1/B1 vinyl positions
- [23-02] Year-only dates converted to YYYY-01-01 format
- [23-02] Source-conditional field diffs (country/barcode only for MB)
- [23-02] Source-conditional external ID storage (musicbrainzId vs discogsId)
- [23-03] Source field on CorrectionPreviewInput with MUSICBRAINZ default
- [23-03] Discogs results wrapped with default scoring (normalizedScore: 1.0)

### v1.3 Context

- Adding Discogs as second search source for corrections
- Toggle UI to select source before searching — COMPLETE (Phase 21)
- Reuse existing Discogs queue infrastructure (DISCOGS_SEARCH_ARTIST, DISCOGS_GET_ARTIST)
- DISCOGS_SEARCH_ALBUM job type — COMPLETE (22-01)
- GraphQL resolver routing for search — COMPLETE (22-02)
- Frontend search integration — COMPLETE (22-03)
- DISCOGS_GET_MASTER job type — COMPLETE (23-01)
- Preview/apply service source support — COMPLETE (23-02)
- GraphQL resolver routing for preview — COMPLETE (23-03)
- Both album and artist corrections supported
- Same preview/apply pattern as MusicBrainz

### Existing Infrastructure

- Discogs queue processors: `DISCOGS_SEARCH_ARTIST`, `DISCOGS_GET_ARTIST`, `DISCOGS_SEARCH_ALBUM`, `DISCOGS_GET_MASTER`
- Discogs service layer: `src/lib/discogs/mappers.ts`, `src/lib/discogs/queued-service.ts`
- MusicBrainz correction services in `src/lib/correction/`
- Zustand stores: `useCorrectionStore.ts`, `useArtistCorrectionStore.ts`
- Toggle Group component: `src/components/ui/toggle-group.tsx`
- SourceToggle component: `src/components/admin/correction/shared/SourceToggle.tsx`
- correctionSource state in both stores with sessionStorage persistence
- Source badges in PreviewView and ArtistPreviewView
- QueuedDiscogsService with searchAlbums() and getMaster() methods
- CorrectionSource enum in GraphQL schema
- CorrectionSource type in preview/types.ts
- CorrectionPreviewInput.source field for preview source selection
- SearchView passes source to GraphQL query
- SearchResultCard with source-aware styling
- CorrectionPreviewService.generatePreview() accepts source parameter
- ApplyCorrectionService stores correct external ID based on source
- correctionPreview resolver routes to Discogs when source is DISCOGS

### Blockers/Concerns

None.

## Session Continuity

Last session: 2026-02-09
Stopped at: Completed Phase 23 (Discogs Album Apply)
Resume file: N/A

**Next action:** Execute Phase 24 (Discogs Artist Search)
