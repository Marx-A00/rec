# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-08)

**Core value:** Admins can fix a broken album in under a minute without touching the database.
**Current focus:** Milestone v1.3 — Discogs Correction Source

## Current Position

Phase: 24 of 25 (Discogs Artist Search) — COMPLETE
Plan: 3 of 3 in current phase
Status: Phase 24 complete
Last activity: 2026-02-09 — Completed 24-03-PLAN.md (frontend integration)

Progress: [█████████████░░░░░░░] 13/18 plans complete (v1.3)

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
- Plans: 13 complete (phase 21 + phase 22 + phase 23 + phase 24)
- Requirements: 14/17 complete (UI-01 through UI-04, ALB-01 through ALB-05, ART-01 through ART-03, MAP-01, MAP-02)

**Total shipped:** 21 phases, 63 plans

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
- [23-04] Source parameter threading pattern: UI (lowercase) → GraphQL (uppercase) → services (lowercase)
- [23-04] CorrectionApplyInput.source field with MUSICBRAINZ default
- [23-04] Conditional service routing in correctionApply resolver
- [24-01] ArtistSearchResult type includes source field
- [24-01] mapDiscogsSearchResultToArtistSearchResult mapper in mappers.ts
- [24-01] DISCOGS_SEARCH_ARTIST handler returns searchResults array
- [24-01] QueuedDiscogsService.searchArtists() uses existing job type
- [24-02] source parameter on artistCorrectionSearch GraphQL query
- [24-02] Resolver routes to QueuedDiscogsService.searchArtists() for DISCOGS
- [24-02] source field on ArtistCorrectionSearchResult type
- [24-03] ArtistSearchView passes graphqlSource to query
- [24-03] ArtistSearchCard with orange accent for Discogs results

### v1.3 Context

- Adding Discogs as second search source for corrections
- Toggle UI to select source before searching — COMPLETE (Phase 21)
- Reuse existing Discogs queue infrastructure (DISCOGS_SEARCH_ARTIST, DISCOGS_GET_ARTIST)
- DISCOGS_SEARCH_ALBUM job type — COMPLETE (22-01)
- GraphQL resolver routing for album search — COMPLETE (22-02)
- Frontend album search integration — COMPLETE (22-03)
- DISCOGS_GET_MASTER job type — COMPLETE (23-01)
- Preview/apply service source support — COMPLETE (23-02)
- GraphQL resolver routing for album preview — COMPLETE (23-03)
- Album apply source wiring — COMPLETE (23-04)
- Artist search backend (searchArtists method) — COMPLETE (24-01)
- Artist search GraphQL routing — COMPLETE (24-02)
- Artist search frontend integration — COMPLETE (24-03)
- Both album and artist SEARCH now supported
- Artist preview/apply pending (Phase 25)

### Existing Infrastructure

- Discogs queue processors: `DISCOGS_SEARCH_ARTIST`, `DISCOGS_GET_ARTIST`, `DISCOGS_SEARCH_ALBUM`, `DISCOGS_GET_MASTER`
- Discogs service layer: `src/lib/discogs/mappers.ts`, `src/lib/discogs/queued-service.ts`
- MusicBrainz correction services in `src/lib/correction/`
- Zustand stores: `useCorrectionStore.ts`, `useArtistCorrectionStore.ts`
- Toggle Group component: `src/components/ui/toggle-group.tsx`
- SourceToggle component: `src/components/admin/correction/shared/SourceToggle.tsx`
- correctionSource state in both stores with sessionStorage persistence
- Source badges in PreviewView and ArtistPreviewView
- QueuedDiscogsService with searchAlbums(), getMaster(), and searchArtists() methods
- CorrectionSource enum in GraphQL schema
- CorrectionSource type in preview/types.ts
- CorrectionPreviewInput.source field for preview source selection
- SearchView passes source to GraphQL query
- SearchResultCard with source-aware styling
- CorrectionPreviewService.generatePreview() accepts source parameter
- ApplyCorrectionService stores correct external ID based on source
- correctionPreview resolver routes to Discogs when source is DISCOGS
- artistCorrectionSearch resolver routes to Discogs when source is DISCOGS
- ArtistSearchView passes source to GraphQL query
- ArtistSearchCard with source-aware styling (orange for Discogs)

### Blockers/Concerns

None.

## Session Continuity

Last session: 2026-02-09
Stopped at: Completed Phase 24 (Discogs Artist Search)
Resume file: N/A

**Next action:** Plan Phase 25 (Discogs Artist Apply)
