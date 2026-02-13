---
phase: 23
plan: 03
subsystem: graphql-api
tags: [graphql, resolver, discogs, correction, preview]
dependency-graph:
  requires: ["23-01", "23-02"]
  provides: "GraphQL layer for Discogs correction previews"
  affects: ["24-01", "24-02"]
tech-stack:
  added: []
  patterns:
    - source-conditional resolver routing
    - default-scored Discogs results
key-files:
  created: []
  modified:
    - src/graphql/schema.graphql
    - src/lib/graphql/resolvers/queries.ts
    - src/generated/graphql.ts
    - src/generated/resolvers-types.ts
decisions:
  - id: 23-03-01
    area: graphql
    decision: "Add source field to CorrectionPreviewInput with MUSICBRAINZ default"
    rationale: "Backend-compatible change - existing callers work unchanged"
  - id: 23-03-02
    area: resolver
    decision: "Wrap Discogs results with default scoring (normalizedScore: 1.0)"
    rationale: "Discogs has no relevance scoring - treat all results as high confidence"
metrics:
  duration: 6 minutes
  completed: 2026-02-09
---

# Phase 23 Plan 03: GraphQL Layer Integration Summary

**One-liner:** Source-aware correctionPreview resolver routes DISCOGS requests to getMaster, wraps with scoring, passes source to preview service.

## What Was Built

The GraphQL layer now fully supports Discogs correction previews:

**Schema Updates:**
- Added `source: CorrectionSource = MUSICBRAINZ` to `CorrectionPreviewInput`
- Updated releaseGroupMbid documentation to mention Discogs master ID

**Resolver Changes:**
- Added import for `mapMasterToCorrectionSearchResult` mapper
- Extract `source` parameter from input with lowercase normalization
- Discogs path: Fetch master via `getQueuedDiscogsService().getMaster()`
- Map master to `CorrectionSearchResult` format using shared mapper
- Wrap with default scoring fields (normalizedScore: 1.0, displayScore: 100)
- Pass source to `generatePreview()` for source-aware processing

**Type Generation:**
- Regenerated `src/generated/graphql.ts` with updated input types
- Regenerated `src/generated/resolvers-types.ts` for resolvers
- Frontend can now pass `source: 'DISCOGS'` in preview input

## Key Implementation Details

**Resolver Data Flow:**
```
Input { albumId, releaseGroupMbid, source: 'DISCOGS' }
  ↓
getQueuedDiscogsService().getMaster(releaseGroupMbid)
  ↓
mapMasterToCorrectionSearchResult(master)
  ↓
Wrap with { normalizedScore: 1.0, displayScore: 100, breakdown, ... }
  ↓
generatePreview(albumId, scoredResult, releaseMbid, 'discogs')
  ↓
Transform to GraphQL CorrectionPreview response
```

**Default Scoring for Discogs:**
Since Discogs search has no relevance scoring, all Discogs results use:
- `normalizedScore: 1.0`
- `displayScore: 100`
- `isLowConfidence: false`
- `scoringStrategy: 'normalized'`

This matches the correctionSearch resolver's handling of Discogs results.

## Commits

- `11f81cb` feat(23-03): add source field to CorrectionPreviewInput in GraphQL schema
- `85c9188` feat(23-03): update correctionPreview resolver for Discogs source

## Verification Results

- [x] pnpm codegen runs successfully
- [x] pnpm type-check passes
- [x] CorrectionPreviewInput has source field in generated types
- [x] Resolver imports Discogs service and mapper
- [x] Resolver conditionally fetches from Discogs when source is DISCOGS
- [x] Preview generated with correct source parameter

## Deviations from Plan

None - plan executed exactly as written.

## Phase 23 Completion Status

With this plan complete, Phase 23 (Discogs Album Apply) is fully implemented:

- **23-01** Queue Infrastructure (DISCOGS_GET_MASTER job type)
- **23-02** Preview Generation Service (source-aware preview and apply)
- **23-03** GraphQL Layer (resolver routing for Discogs previews)

The frontend can now:
1. Search Discogs for albums (Phase 22)
2. Request preview for a Discogs master
3. Apply corrections from Discogs source

## Next Phase Readiness

Phase 24 (Discogs Artist Search) can proceed. Prerequisites met:
- Queue infrastructure pattern established
- Source-conditional resolver pattern proven
- Mapper pattern documented
