---
phase: 05
plan: 01
subsystem: graphql-api
tags: [graphql, schema, types, correction-system]

dependency-graph:
  requires: [phase-04]
  provides: [correction-schema, correction-types, correction-operations]
  affects: [phase-05-02, phase-05-03]

tech-stack:
  added: []
  patterns: [graphql-enums, input-types, json-scalar-for-unions]

key-files:
  created: []
  modified:
    - src/graphql/schema.graphql
    - src/generated/graphql.ts
    - src/generated/resolvers-types.ts

decisions:
  - id: "05-01-01"
    decision: "Use JSON scalar for fieldDiffs union type"
    rationale: "GraphQL unions are complex; JSON provides flexibility for heterogeneous diff types"

metrics:
  duration: "5.2min"
  completed: "2026-01-24"
---

# Phase 5 Plan 1: GraphQL Schema Definitions Summary

**One-liner:** Complete GraphQL schema for correction system with 5 enums, 30+ types, 7 inputs, and 3 operations

## What Was Built

This plan added comprehensive GraphQL schema definitions for the admin album correction workflow, enabling typed operations for search, preview, and apply functionality.

### Enums Added (5)

- **ChangeType**: ADDED, MODIFIED, REMOVED, CONFLICT, UNCHANGED
- **CoverArtChoice**: USE_SOURCE, KEEP_CURRENT, CLEAR
- **ScoringStrategy**: NORMALIZED, TIERED, WEIGHTED
- **ConfidenceTier**: HIGH, MEDIUM, LOW, NONE
- **ApplyErrorCode**: STALE_DATA, ALBUM_NOT_FOUND, TRANSACTION_FAILED, INVALID_SELECTION, VALIDATION_ERROR

### Types Added (30+)

**Search Types:**
- CorrectionArtistCredit, ScoreBreakdown, ScoredSearchResult
- GroupedSearchResult, CorrectionSearchResponse
- CorrectionSearchQuery, CorrectionScoringInfo

**Preview/Diff Types:**
- TextDiffPart, TextDiff, DateComponents, DateDiff
- DateComponentChanges, ArrayDiff, TrackDiff
- TrackData, TrackSourceData, TrackListSummary
- ArtistCreditDiff, CoverArtDiff, PreviewSummary
- CorrectionPreview

**MusicBrainz Data Types:**
- MBRecording, MBMediumTrack, MBMedium
- MBArtist, MBArtistCredit, MBReleaseData

**Apply Types:**
- AppliedArtistChanges, AppliedTrackChanges, AppliedChanges
- CorrectionApplySuccess, CorrectionApplyError, CorrectionApplyResult

### Input Types Added (7)

- CorrectionSearchInput
- CorrectionPreviewInput
- MetadataSelectionsInput
- ExternalIdSelectionsInput
- SelectionEntry
- FieldSelectionsInput
- CorrectionApplyInput

### Operations Added (3)

**Queries:**
- `correctionSearch(input: CorrectionSearchInput!): CorrectionSearchResponse!`
- `correctionPreview(input: CorrectionPreviewInput!): CorrectionPreview!`

**Mutations:**
- `correctionApply(input: CorrectionApplyInput!): CorrectionApplyResult!`

## Technical Decisions

### JSON Scalar for Field Diffs

Used JSON scalar type for `fieldDiffs` in CorrectionPreview instead of GraphQL union types. This provides flexibility for the heterogeneous diff types (TextDiff, DateDiff, ArrayDiff) while avoiding the complexity of GraphQL union type handling on the client side.

### Type Mapping from TypeScript

All GraphQL types map directly to the TypeScript types defined in the correction service layer:
- `src/lib/correction/types.ts` - Base correction types
- `src/lib/correction/scoring/types.ts` - Scoring types
- `src/lib/correction/preview/types.ts` - Preview/diff types
- `src/lib/correction/apply/types.ts` - Apply types

### Optimistic Locking

The `CorrectionApplyInput` includes `expectedUpdatedAt: DateTime!` for optimistic locking, preventing stale data overwrites when the album was modified between preview generation and correction application.

## Verification

- Schema parses without syntax errors
- `pnpm codegen` generates types successfully
- Generated types include all enums, types, and operations

## Deviations from Plan

None - plan executed exactly as written.

## Next Phase Readiness

Phase 5 Plan 2 (Resolver Implementation) can begin immediately:
- Schema definitions provide complete type contracts
- Generated resolver types ready for implementation
- Correction services from Phase 4 ready to be called

## Commits

- `7f23654`: feat(05-01): add GraphQL schema definitions for correction system
