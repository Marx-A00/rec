---
phase: 24-discogs-artist-search
plan: 02
subsystem: graphql
tags: [graphql, resolver, artist-search, discogs]
dependency-graph:
  requires: [24-01]
  provides: [artistCorrectionSearch-source-routing]
  affects: [24-03]
tech-stack:
  added: []
  patterns: [source-conditional-routing]
key-files:
  created: []
  modified:
    - src/graphql/schema.graphql
    - src/lib/graphql/resolvers/queries.ts
    - src/graphql/queries/artistCorrection.graphql
    - src/generated/graphql.ts
    - src/generated/resolvers-types.ts
decisions:
  - source-parameter-default: MUSICBRAINZ
  - hasMore-for-discogs: always false (no pagination)
  - source-field-in-results: lowercase string (musicbrainz/discogs)
metrics:
  duration: 9m
  completed: 2026-02-09
---

# Phase 24 Plan 02: GraphQL Source Routing Summary

**One-liner:** GraphQL artistCorrectionSearch query now accepts source parameter and routes to QueuedDiscogsService for Discogs searches

## What Was Built

Extended the existing artistCorrectionSearch GraphQL query to support Discogs as a data source, allowing the frontend to request artist searches from either MusicBrainz or Discogs through a unified API.

## Key Deliverables

**1. Schema Extension (src/graphql/schema.graphql)**
- Added `source: CorrectionSource = MUSICBRAINZ` parameter to artistCorrectionSearch query
- Added `source: String` field to ArtistCorrectionSearchResult type
- Updated query description to mention Discogs support

**2. Resolver Routing (src/lib/graphql/resolvers/queries.ts)**
- Added source parameter to resolver function signature
- Conditional routing: DISCOGS source calls QueuedDiscogsService.searchArtists()
- MusicBrainz remains the default path
- Both paths include source field in response mapping

**3. Client Query (src/graphql/queries/artistCorrection.graphql)**
- Added $source: CorrectionSource variable
- Added source field to results selection
- Regenerated TypeScript types with source support

## Technical Decisions

**Source Parameter Default**
- Default: MUSICBRAINZ (backward compatible)
- Frontend must explicitly pass source: DISCOGS to use Discogs

**Response Shape Consistency**
- Discogs results mapped to same ArtistCorrectionSearchResult shape
- Source field added to distinguish origin (lowercase string)
- hasMore always false for Discogs (no pagination support)

## Verification Results

- pnpm codegen: SUCCESS
- pnpm type-check: SUCCESS  
- Schema source parameter: PRESENT
- Resolver DISCOGS branch: PRESENT
- searchArtists call: PRESENT
- Client query source variable: PRESENT

## Deviations from Plan

None - plan executed exactly as written.

## Commits

1. `e759978` - feat(24-02): add source parameter to artistCorrectionSearch GraphQL query
2. `baab518` - feat(24-02): add source routing to artistCorrectionSearch resolver
3. `33977ff` - feat(24-02): update client query and regenerate types for artist search

## Dependencies Satisfied

- 24-01: QueuedDiscogsService.searchArtists() method (REQUIRED - used)
- 22-02: CorrectionSource enum in GraphQL schema (REQUIRED - reused)
- 22-02: GqlCorrectionSource import pattern (REQUIRED - already present)

## Next Phase Readiness

Phase 24-03 (Frontend Integration) can proceed:
- useSearchArtistCorrectionCandidatesQuery hook accepts source variable
- Results include source field for visual styling
- Same GraphQL shape as MusicBrainz for component compatibility
