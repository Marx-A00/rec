---
phase: 25-discogs-artist-apply
plan: 03
subsystem: correction
tags: [graphql, artist-correction, discogs, resolvers]
requires: ["25-01", "25-02"]
provides:
  - artistCorrectionPreview query with source parameter
  - artistCorrectionApply mutation with source parameter
  - Frontend components updated for Discogs source support
affects: ["25-04"]
tech-stack:
  patterns: ["source parameter threading", "enum conversion pattern"]
key-files:
  modified:
    - src/graphql/schema.graphql
    - src/lib/graphql/resolvers/queries.ts
    - src/lib/graphql/resolvers/mutations.ts
    - src/graphql/queries/artistCorrection.graphql
    - src/generated/graphql.ts
    - src/generated/resolvers-types.ts
    - src/components/admin/correction/artist/ArtistCorrectionModal.tsx
    - src/components/admin/correction/artist/preview/ArtistPreviewView.tsx
    - src/components/admin/correction/artist/apply/ArtistApplyView.tsx
decisions:
  - decision: "Renamed artistMbid to sourceArtistId (String!) to support both MusicBrainz UUIDs and Discogs numeric IDs"
    rationale: "Unified parameter name that works for both sources"
  - decision: "Added discogsId to Artist GraphQL type and ArtistExternalIdSelectionsInput"
    rationale: "Enable frontend to display and select Discogs ID field"
  - decision: "Updated frontend components to use CorrectionSource enum"
    rationale: "Type-safe source parameter passing"
metrics:
  duration: 14 minutes
  completed: 2026-02-09
---

# Phase 25 Plan 03: GraphQL Layer for Discogs Artist Correction Summary

GraphQL schema, resolvers, and frontend updated to support Discogs artist correction preview and apply operations.

## One-liner

GraphQL layer extended with source parameter on artistCorrectionPreview query and artistCorrectionApply mutation, enabling frontend to request Discogs artist corrections.

## What Was Done

### Task 1: Schema Updates for artistCorrectionPreview Query
- Added `sourceArtistId: String!` parameter (renamed from `artistMbid: UUID!`)
- Added `source: CorrectionSource = MUSICBRAINZ` parameter
- Added `source: CorrectionSource!` field to `ArtistCorrectionPreview` type
- Updated type description from "MusicBrainz source" to "external source"

### Task 2: Preview Resolver Update
- Modified `artistCorrectionPreview` resolver to:
  - Extract `sourceArtistId` and `source` from args
  - Convert GraphQL enum to lowercase string (`'discogs'` or `'musicbrainz'`)
  - Pass source to `previewService.generatePreview(artistId, sourceArtistId, sourceStr)`
  - Include source in response

### Task 3: Apply Mutation and Resolver Update
- Added `sourceArtistId: String!` to `ArtistCorrectionApplyInput` (renamed from `artistMbid`)
- Added `source: CorrectionSource = MUSICBRAINZ` to `ArtistCorrectionApplyInput`
- Added `discogsId: Boolean` to `ArtistExternalIdSelectionsInput`
- Added `discogsId: String` to `Artist` GraphQL type
- Updated `artistCorrectionApply` resolver to:
  - Convert GraphQL enum to lowercase string for service layer
  - Pass source to preview service
  - Include `discogsId` in external IDs selections

### Task 4: Query File and Frontend Updates
- Updated `artistCorrection.graphql`:
  - `GetArtistCorrectionPreview`: uses `sourceArtistId` and `source` parameters
  - Query returns `source` field and `discogsId` on artist
- Regenerated TypeScript types with `pnpm codegen`
- Updated frontend components:
  - `ArtistPreviewView.tsx`: passes source to preview query
  - `ArtistCorrectionModal.tsx`: passes source to apply mutation
  - `ArtistApplyView.tsx`: added `discogsId` to field selections

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Frontend type errors after schema change**
- **Found during:** Task 4 verification
- **Issue:** Frontend components used old `artistMbid` parameter name and string literals for source
- **Fix:** Updated `ArtistPreviewView.tsx`, `ArtistCorrectionModal.tsx`, and `ArtistApplyView.tsx` to use:
  - `sourceArtistId` instead of `artistMbid`
  - `CorrectionSource.Discogs` / `CorrectionSource.Musicbrainz` instead of string literals
  - Added `discogsId` to `UIArtistFieldSelections` interface and `externalIdFields` array
- **Files modified:** 3 frontend component files
- **Commit:** 72008a3

**2. [Rule 3 - Blocking] Missing discogsId on Artist GraphQL type**
- **Found during:** Task 4 - codegen validation
- **Issue:** Query requested `discogsId` on Artist but field didn't exist in GraphQL schema
- **Fix:** Added `discogsId: String` field to `type Artist` in schema (already exists in Prisma)
- **Files modified:** `src/graphql/schema.graphql`
- **Commit:** 72008a3

## Verification Results

All verification criteria passed:

- [x] pnpm codegen runs successfully
- [x] pnpm type-check passes
- [x] artistCorrectionPreview query has source parameter in schema
- [x] ArtistCorrectionPreview type has source field
- [x] artistCorrectionApply mutation has source parameter in schema
- [x] ArtistExternalIdSelectionsInput has discogsId field
- [x] Preview resolver passes source to generatePreview
- [x] Apply resolver handles source parameter

## Data Flow

```
Frontend (ArtistPreviewView)
    ↓ passes source: CorrectionSource.Discogs
GraphQL Query (artistCorrectionPreview)
    ↓ extracts sourceArtistId, source
Resolver (queries.ts)
    ↓ converts enum to 'discogs' | 'musicbrainz'
Preview Service (generatePreview)
    ↓ routes to Discogs or MusicBrainz
Returns preview with source field
```

## Key Decisions Made

1. **Parameter rename**: `artistMbid: UUID!` → `sourceArtistId: String!` to support both UUID (MusicBrainz) and numeric string (Discogs) IDs

2. **Enum conversion pattern**: GraphQL uses `CorrectionSource.Discogs` (uppercase), service layer uses `'discogs'` (lowercase)

3. **Field selections extension**: Added `discogsId` to both schema and frontend selections to allow selecting Discogs ID field during apply

## Files Changed

- `src/graphql/schema.graphql` - Schema updates
- `src/lib/graphql/resolvers/queries.ts` - Preview resolver update
- `src/lib/graphql/resolvers/mutations.ts` - Apply resolver update  
- `src/graphql/queries/artistCorrection.graphql` - Query file updates
- `src/generated/graphql.ts` - Regenerated types
- `src/generated/resolvers-types.ts` - Regenerated resolver types
- `src/components/admin/correction/artist/ArtistCorrectionModal.tsx` - Apply mutation call
- `src/components/admin/correction/artist/preview/ArtistPreviewView.tsx` - Preview query call
- `src/components/admin/correction/artist/apply/ArtistApplyView.tsx` - Field selections type

## Next Phase Readiness

Phase 25 (Discogs Artist Apply) is now complete:
- [x] 25-01: Preview service supports Discogs source
- [x] 25-02: Apply service supports Discogs source  
- [x] 25-03: GraphQL layer supports Discogs source

The frontend can now:
1. Search for artist correction candidates from Discogs
2. Preview artist correction from Discogs source
3. Apply artist correction from Discogs source
4. Select `discogsId` as an external ID field

No blockers for next phase (if any).
