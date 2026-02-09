---
phase: 24
plan: 01
subsystem: discogs-artist-search
tags: [discogs, artist-search, queue, mapper]

dependency-graph:
  requires: [22-01, 23-01]
  provides: [QueuedDiscogsService.searchArtists, mapDiscogsSearchResultToArtistSearchResult]
  affects: [24-02, 24-03]

tech-stack:
  added: []
  patterns: [queue-service-method, result-mapper, source-field-union-type]

key-files:
  created: []
  modified:
    - src/lib/correction/artist/types.ts
    - src/lib/discogs/mappers.ts
    - src/lib/queue/processors/discogs-processor.ts
    - src/lib/discogs/queued-service.ts

decisions:
  - id: DEC-24-01-01
    title: Reuse existing DISCOGS_SEARCH_ARTIST job
    choice: Modify existing job handler to return searchResults array
    rationale: Avoid creating new job type; handler already does the search
  - id: DEC-24-01-02
    title: Source field on ArtistSearchResult
    choice: Add optional 'musicbrainz' | 'discogs' union type
    rationale: Matches CorrectionSearchResult pattern for albums

metrics:
  duration: 4m 23s
  completed: 2026-02-09
---

# Phase 24 Plan 01: Discogs Artist Search Service Layer Summary

**One-liner:** QueuedDiscogsService.searchArtists() method using existing DISCOGS_SEARCH_ARTIST job with new artist result mapper

## What Was Built

Added Discogs artist search capability to the service layer for admin correction UI:

**ArtistSearchResult source field:**
- Added optional `source?: 'musicbrainz' | 'discogs'` field
- Enables UI to visually distinguish search result sources
- Matches existing CorrectionSearchResult (album) pattern

**Artist search result mapper:**
- `mapDiscogsSearchResultToArtistSearchResult()` in mappers.ts
- Maps minimal Discogs search data (id, title, thumb) to ArtistSearchResult format
- Sets `source: 'discogs'` for all mapped results
- Handles score conversion (0-1 to 0-100 scale)

**DISCOGS_SEARCH_ARTIST handler enhancement:**
- Added `searchResults` array to all 3 return paths (no_results, no_confident_match, found_and_queued)
- Backward-compatible: existing enrichment consumers ignore extra fields
- Correction UI can now access full search results for manual selection

**QueuedDiscogsService.searchArtists():**
- Uses existing DISCOGS_SEARCH_ARTIST job type (no new job type needed)
- ADMIN priority for immediate response in correction UI
- Maps raw Discogs results via new mapper function
- Returns DiscogsArtistSearchResponse with results array

## Commits

- `fcd8005`: Add source field to ArtistSearchResult type
- `2a61a5e`: Add artist search result mapper for Discogs
- `47a3b54`: Return searchResults from DISCOGS_SEARCH_ARTIST handler
- `46c8c5b`: Add searchArtists method to QueuedDiscogsService

## Deviations from Plan

None - plan executed exactly as written.

## Key Patterns Established

**Reusing existing job handlers for new use cases:**
- Modified DISCOGS_SEARCH_ARTIST (designed for enrichment) to also support correction UI
- Added optional return fields rather than creating separate job type
- Backward-compatible extension pattern

**Source field union type:**
- `source?: 'musicbrainz' | 'discogs'` allows UI to show source badges
- Optional field means existing code works unchanged
- Same pattern used for both album and artist search results

## Files Changed

- `src/lib/correction/artist/types.ts` - Added source field to ArtistSearchResult
- `src/lib/discogs/mappers.ts` - Added mapDiscogsSearchResultToArtistSearchResult
- `src/lib/queue/processors/discogs-processor.ts` - Added searchResults to handler returns
- `src/lib/discogs/queued-service.ts` - Added searchArtists method and types

## Next Phase Readiness

Phase 24-02 (GraphQL resolver) can now:
- Import QueuedDiscogsService.searchArtists()
- Route artistCorrectionSearch queries based on source parameter
- Return ArtistSearchResult[] with source: 'discogs' for Discogs searches
