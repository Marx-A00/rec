# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-08)

**Core value:** Admins can fix a broken album in under a minute without touching the database.
**Current focus:** Milestone v1.3 — Discogs Correction Source

## Current Position

Phase: 25 of 25 (Discogs Artist Apply) — COMPLETE
Plan: 3 of 3 in current phase
Status: Phase complete
Last activity: 2026-02-09 — Completed 25-03-PLAN.md (GraphQL layer source support)

Progress: [████████████████████] 15/15 plans complete (v1.3)

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

**Milestone v1.3 (Complete):**

- Phases: 5 (21-25)
- Plans: 15 complete
- Duration: 2 days
- Requirements: 17/17 complete (UI-01 through UI-04, ALB-01 through ALB-05, ART-01 through ART-06)

**Total shipped:** 25 phases, 72 plans

## Accumulated Context

### Key Decisions (from v1.0 + v1.1 + v1.2 + v1.3)

- MusicBrainz only for v1 (Discogs/Spotify deferred) — DISCOGS COMPLETE
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
- [25-01] Artist preview service supports Discogs via MBArtistData mapping
- [25-01] Discogs artist data mapped to MBArtistData format for reuse
- [25-01] Source detection via numeric ID check (Discogs IDs are numeric strings)
- [25-02] discogsId and imageUrl added to artist field selection types
- [25-02] Source-conditional external ID storage (musicbrainzId vs discogsId)
- [25-02] Artist.source field updated based on correction source
- [25-02] Cloudflare image caching queued when imageUrl changes
- [25-03] Renamed artistMbid to sourceArtistId (String!) for source flexibility
- [25-03] Added discogsId to Artist GraphQL type and field selections
- [25-03] Frontend uses CorrectionSource enum for type-safe source passing

### v1.3 Complete

All Discogs integration features implemented:

**Phase 21: Source Selection UI** (3 plans)
- Toggle UI to select source before searching
- Atomic state clearing on source switch
- Source badge in preview header

**Phase 22: Discogs Album Search** (3 plans)
- DISCOGS_SEARCH_ALBUM job type
- QueuedDiscogsService.searchAlbums()
- GraphQL resolver routing for album search
- Frontend integration with orange accent

**Phase 23: Discogs Album Apply** (4 plans)
- DISCOGS_GET_MASTER job type
- Preview/apply service source support
- GraphQL resolver routing for album preview
- Album apply source wiring

**Phase 24: Discogs Artist Search** (3 plans)
- Artist search backend (searchArtists method)
- Artist search GraphQL routing
- Artist search frontend integration

**Phase 25: Discogs Artist Apply** (3 plans)
- Artist preview backend (generatePreview with Discogs)
- Artist apply service source support
- GraphQL layer for artist preview/apply

### Blockers/Concerns

None.

## Session Continuity

Last session: 2026-02-09
Stopped at: Completed 25-03-PLAN.md (GraphQL layer source support)
Resume file: N/A

**Milestone v1.3 Complete!** All Discogs correction features are implemented.
