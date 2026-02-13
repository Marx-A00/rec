---
phase: 05
plan: 03
subsystem: graphql-client
tags: [graphql, codegen, react-query, hooks, typescript]
dependency-graph:
  requires: ['05-01', '05-02']
  provides:
    [
      'useSearchCorrectionCandidatesQuery',
      'useGetCorrectionPreviewQuery',
      'useApplyCorrectionMutation',
    ]
  affects: ['06-admin-ui']
tech-stack:
  added: []
  patterns: ['GraphQL codegen', 'React Query hooks', 'typed operations']
key-files:
  created:
    - src/graphql/queries/correctionSearch.graphql
    - src/graphql/queries/correctionPreview.graphql
    - src/graphql/mutations/correctionApply.graphql
  modified:
    - src/generated/graphql.ts
decisions:
  - id: '05-03-01'
    area: 'naming'
    choice: 'Prefix client operations to avoid type collisions'
    rationale: 'Schema has CorrectionSearchQuery type; client query named CorrectionSearch would generate conflicting CorrectionSearchQuery type'
metrics:
  duration: '2.9min'
  completed: '2026-01-24'
---

# Phase 5 Plan 3: Client Queries and Hook Generation Summary

**One-liner:** React Query hooks generated via codegen for correction search, preview, and apply operations with full type safety.

## What Was Built

Created client-side GraphQL query/mutation files and generated typed React Query hooks:

**Query/Mutation Files:**

- `correctionSearch.graphql` - SearchCorrectionCandidates operation with grouped results, scoring breakdown
- `correctionPreview.graphql` - GetCorrectionPreview operation with all diff fields and MB release data
- `correctionApply.graphql` - ApplyCorrection operation with success/error union response

**Generated Hooks:**

- `useSearchCorrectionCandidatesQuery` - Query hook for correction candidate search
- `useGetCorrectionPreviewQuery` - Query hook for correction preview generation
- `useApplyCorrectionMutation` - Mutation hook for applying corrections

## Key Implementation Details

### Operation Naming Convention

Operations were named to avoid type collisions with schema types:

- `SearchCorrectionCandidates` (not `CorrectionSearch`) to avoid collision with `CorrectionSearchQuery` schema type
- `GetCorrectionPreview` (not `CorrectionPreview`) for consistency
- `ApplyCorrection` (not `CorrectionApply`) for consistency

### Field Selection

**Search query selects:**

- Grouped results with primary and alternate versions
- Full scoring breakdown (titleScore, artistScore, yearScore, mbScore, confidenceTier)
- Artist credits, release dates, types, cover art URLs
- Query metadata (what was searched for)
- Scoring metadata (strategy, threshold, low-confidence count)

**Preview query selects:**

- Album identification (id, title, updatedAt for optimistic locking)
- Source result with scoring
- Full MusicBrainz release data (media, tracks, artist credits)
- Field diffs (as JSON for flexibility)
- Artist diff with current/source credits and display strings
- Track diffs with position, change type, title diff parts, duration delta
- Track summary statistics
- Cover art diff
- Preview summary counts

**Apply mutation selects:**

- Success/error discriminator
- Updated album with tracks and artists on success
- Applied changes summary (metadata, artists, tracks, externalIds, coverArt, dataQuality)
- Error code, message, context on failure

## Decisions Made

**05-03-01: Prefix client operations to avoid type collisions**

- Schema defines `CorrectionSearchQuery` type
- Client query named `CorrectionSearch` would generate conflicting `CorrectionSearchQuery` type
- Solution: Use prefixed names (SearchCorrectionCandidates, GetCorrectionPreview, ApplyCorrection)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed schema type mismatches in query files**

- **Found during:** Task 3 (codegen)
- **Issue:** Initial query files assumed nested structures (searchResult, scoring) but ScoredSearchResult has flat fields
- **Fix:** Rewrote queries to match actual schema structure
- **Files modified:** All three .graphql files
- **Commit:** 50557bc

**2. [Rule 3 - Blocking] Resolved TypeScript duplicate identifier error**

- **Found during:** Task 3 (type-check)
- **Issue:** Generated `CorrectionSearchQuery` type collided with schema type of same name
- **Fix:** Renamed client operation from `CorrectionSearch` to `SearchCorrectionCandidates`
- **Files modified:** correctionSearch.graphql, correctionPreview.graphql, correctionApply.graphql
- **Commit:** 50557bc

## Verification Results

All verification criteria met:

- Query files exist with correct operations
- Codegen runs without errors
- All three hooks are generated in `src/generated/graphql.ts`
- TypeScript compiles successfully

## Commits

- c331df1: Add client query files for correction search and preview
- 56c481f: Add client mutation file for correction apply
- 50557bc: Run codegen and generate typed React Query hooks

## Next Phase Readiness

**Prerequisites for Phase 6 (Admin UI):**

- Schema types defined (05-01)
- Resolvers wired (05-02)
- Client hooks available (05-03)

**Ready to build:**

- SearchPanel component using `useSearchCorrectionCandidatesQuery`
- PreviewPanel component using `useGetCorrectionPreviewQuery`
- ApplyButton component using `useApplyCorrectionMutation`
