---
phase: 2
plan: 1
subsystem: correction-service
tags: [musicbrainz, search, admin, priority-queue]
dependency-graph:
  requires: [phase-1]
  provides: [correction-search-service, correction-types]
  affects: [02-02, 02-03, phase-4]
tech-stack:
  added: []
  patterns: [singleton-service, admin-priority-tier, lucene-query-builder]
key-files:
  created:
    - src/lib/correction/types.ts
    - src/lib/correction/search-service.ts
    - src/lib/correction/index.ts
  modified: []
decisions:
  - id: cover-art-url-pattern
    choice: Always compute CAA URL, UI handles 404 gracefully
    rationale: Simpler than checking existence, matches existing AlbumImage pattern
metrics:
  duration: 1m 45s
  completed: 2026-01-24
---

# Phase 2 Plan 1: CorrectionSearchService Summary

**One-liner:** MusicBrainz search wrapper with ADMIN priority for sub-second admin response times.

## What Was Built

Created the `src/lib/correction/` module with:

- **types.ts**: Type definitions for correction search
  - `CorrectionSearchOptions`: Search parameters (albumTitle, artistName, yearFilter, limit, offset)
  - `CorrectionSearchResult`: Normalized result with MBID, title, artist credits, CAA URL
  - `CorrectionSearchResponse`: Paginated response with query metadata

- **search-service.ts**: Core search service
  - `CorrectionSearchService` class wrapping `getQueuedMusicBrainzService()`
  - Uses `PRIORITY_TIERS.ADMIN` (value=1) for queue priority
  - Builds Lucene queries via existing `buildDualInputQuery()` utility
  - Maps MusicBrainz results to correction-specific format
  - Computes Cover Art Archive URLs: `https://coverartarchive.org/release-group/{mbid}/front-250`
  - HMR-safe singleton via `getCorrectionSearchService()`

- **index.ts**: Barrel exports for clean imports

## Key Implementation Details

**Priority Queue Integration:**
```typescript
const results = await this.mbService.searchReleaseGroups(
  query,
  limit,
  offset,
  PRIORITY_TIERS.ADMIN  // Value 1, highest priority
);
```

**Year Filter Support:**
```typescript
if (options.yearFilter) {
  query += ` AND firstreleasedate:${options.yearFilter}*`;
}
```

**Artist Credit Handling:**
- Extracts MBID and name from each credit
- Joins names with comma for display: "Artist A, Artist B"
- Defaults to "Unknown Artist" if empty

## Verification

- `pnpm type-check`: Passes
- `pnpm eslint src/lib/correction/`: No errors
- Key links verified:
  - Imports `PRIORITY_TIERS` from `@/lib/queue`
  - Imports `getQueuedMusicBrainzService` from `@/lib/musicbrainz/queue-service`
  - Exports `getCorrectionSearchService` from barrel

## Deviations from Plan

None - plan executed exactly as written.

## Commits

- `d5d9c52`: feat(02-01): add correction search type definitions
- `dd19447`: feat(02-01): implement CorrectionSearchService with ADMIN priority

## Next Phase Readiness

- **02-02 (GraphQL Resolver)**: Ready - can import `getCorrectionSearchService` and types
- **02-03 (Scoring)**: Ready - types defined for extension with scoring fields
- **Phase 4 (Correction Flow)**: Ready - service layer foundation complete
