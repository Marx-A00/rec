---
phase: 22-discogs-album-search
plan: 02
subsystem: graphql-layer
tags: [graphql, resolver, discogs, correction, routing]
dependency-graph:
  requires: [22-01]
  provides: [correction-source-enum, discogs-resolver-routing]
  affects: [22-03]
tech-stack:
  added: []
  patterns: [enum-parameter, conditional-routing, service-delegation]
key-files:
  created: []
  modified:
    - src/graphql/schema.graphql
    - src/lib/graphql/resolvers/queries.ts
    - src/generated/graphql.ts
    - src/generated/resolvers-types.ts
decisions: []
metrics:
  duration: "6 min"
  completed: "2026-02-09"
---

# Phase 22 Plan 02: GraphQL Resolver Integration Summary

**One-liner:** Extended GraphQL schema with CorrectionSource enum and added source-aware routing in correctionSearch resolver to delegate to QueuedDiscogsService.

## Completed Tasks

**Task 1: Add CorrectionSource enum and extend input**
- Added CorrectionSource enum after ScoringStrategy enum with values MUSICBRAINZ and DISCOGS
- Extended CorrectionSearchInput with source field defaulting to MUSICBRAINZ
- Verified ScoredSearchResult already has source: String! field for result attribution
- Commit: 221dd92

**Task 2: Update resolver to route by source via QueuedDiscogsService**
- Added import for getQueuedDiscogsService and CorrectionSource enum
- Added source extraction from input in correctionSearch resolver
- Implemented conditional routing: if source === DISCOGS, use QueuedDiscogsService
- Transformed Discogs results to GraphQL GroupedSearchResult format with default scoring
- MusicBrainz path remains unchanged (default behavior)
- Commit: 184d4a8

**Task 3: Regenerate GraphQL types**
- Ran pnpm codegen to regenerate types
- CorrectionSource enum exported from both graphql.ts and resolvers-types.ts
- source field available on CorrectionSearchInput type
- Commit: 1c856f2

## Key Implementation Details

**Schema Changes:**
```graphql
enum CorrectionSource {
  MUSICBRAINZ
  DISCOGS
}

input CorrectionSearchInput {
  # ... existing fields ...
  source: CorrectionSource = MUSICBRAINZ
}
```

**Resolver Routing:**
```typescript
if (source === GqlCorrectionSource.Discogs) {
  const queuedDiscogsService = getQueuedDiscogsService();
  const discogsResponse = await queuedDiscogsService.searchAlbums({
    albumId,
    albumTitle: searchAlbumTitle,
    artistName: searchArtistName,
    limit: limit ?? 10,
  });
  // Transform and return...
}
// MusicBrainz path (default)...
```

**Discogs Result Transformation:**
- Each Discogs result wrapped as single-item GroupedSearchResult
- Default scoring applied (normalizedScore: 1.0, displayScore: 100)
- No alternateVersions (Discogs masters are already deduplicated)
- hasMore: false (current implementation does not paginate)

## Deviations from Plan

None - plan executed exactly as written.

## Verification Results

- pnpm codegen: PASS
- pnpm type-check: PASS
- CorrectionSource enum in generated types: VERIFIED
- Resolver imports getQueuedDiscogsService: VERIFIED
- Resolver has conditional for source === DISCOGS: VERIFIED
- Resolver calls queuedDiscogsService.searchAlbums: VERIFIED

## Next Phase Readiness

Plan 22-03 can proceed. Frontend can now pass source parameter to correctionSearch query and receive Discogs results in the same GraphQL shape as MusicBrainz results.
