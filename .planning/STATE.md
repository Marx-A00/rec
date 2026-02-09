# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-08)

**Core value:** Admins can fix a broken album in under a minute without touching the database.
**Current focus:** Milestone v1.3 — Discogs Correction Source

## Current Position

Phase: 22 of 25 (Discogs Album Search)
Plan: 1 of 3 in current phase
Status: In progress
Last activity: 2026-02-09 — Completed 22-01-PLAN.md

Progress: [█████░░░░░░░░░░░░░░░] 4/18 plans complete (v1.3)

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
- Plans: 4 complete (phase 21 + 22-01)
- Requirements: 4/17 complete (UI-01 through UI-04)

**Total shipped:** 21 phases, 61 plans

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

### v1.3 Context

- Adding Discogs as second search source for corrections
- Toggle UI to select source before searching — COMPLETE (Phase 21)
- Reuse existing Discogs queue infrastructure (DISCOGS_SEARCH_ARTIST, DISCOGS_GET_ARTIST)
- DISCOGS_SEARCH_ALBUM job type — COMPLETE (22-01)
- Both album and artist corrections supported
- Same preview/apply pattern as MusicBrainz

### Existing Infrastructure

- Discogs queue processors: `DISCOGS_SEARCH_ARTIST`, `DISCOGS_GET_ARTIST`, `DISCOGS_SEARCH_ALBUM`
- Discogs service layer: `src/lib/discogs/mappers.ts`, `src/lib/discogs/queued-service.ts`
- MusicBrainz correction services in `src/lib/correction/`
- Zustand stores: `useCorrectionStore.ts`, `useArtistCorrectionStore.ts`
- Toggle Group component: `src/components/ui/toggle-group.tsx`
- SourceToggle component: `src/components/admin/correction/shared/SourceToggle.tsx`
- correctionSource state in both stores with sessionStorage persistence
- Source badges in PreviewView and ArtistPreviewView
- QueuedDiscogsService for resolver integration

### Blockers/Concerns

None.

## Session Continuity

Last session: 2026-02-09
Stopped at: Completed 22-01-PLAN.md
Resume file: N/A

**Next action:** Execute 22-02-PLAN.md (GraphQL resolver integration)
