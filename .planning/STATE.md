# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-08)

**Core value:** Admins can fix a broken album in under a minute without touching the database.
**Current focus:** Milestone v1.3 — Discogs Correction Source

## Current Position

Phase: 21 of 25 (Source Selection UI)
Plan: 2 of TBD in current phase
Status: In progress
Last activity: 2026-02-08 — Completed 21-02-PLAN.md

Progress: [████░░░░░░░░░░░░░░░░] 2/5 phases (plan 2 of phase 21 complete)

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
- Plans: TBD
- Requirements: 17

**Total shipped:** 20 phases, 57 plans

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
- [21-02] Discogs shows placeholder until Phase 22+ implements search
- [21-02] Source toggle disabled during loading to prevent race conditions

### v1.3 Context

- Adding Discogs as second search source for corrections
- Toggle UI to select source before searching
- Reuse existing Discogs queue infrastructure (DISCOGS_SEARCH_ARTIST, DISCOGS_GET_ARTIST)
- Need to add DISCOGS_SEARCH_ALBUM job type
- Both album and artist corrections supported
- Same preview/apply pattern as MusicBrainz

### Existing Infrastructure

- Discogs queue processors: `DISCOGS_SEARCH_ARTIST`, `DISCOGS_GET_ARTIST`
- Discogs service layer: `src/lib/discogs/mappers.ts`
- MusicBrainz correction services in `src/lib/correction/`
- Zustand stores: `useCorrectionStore.ts`, `useArtistCorrectionStore.ts`
- Toggle Group component: `src/components/ui/toggle-group.tsx`
- correctionSource state in both stores with sessionStorage persistence
- **NEW:** SourceToggle component: `src/components/admin/correction/shared/SourceToggle.tsx`
- **NEW:** Source-aware SearchView and ArtistSearchView

### Blockers/Concerns

None.

## Session Continuity

Last session: 2026-02-08 21:32 UTC
Stopped at: Completed 21-02-PLAN.md
Resume file: N/A

**Next action:** Execute 21-03-PLAN.md (if exists) or proceed to Phase 22
