---
phase: 07-search-ui
plan: 03
subsystem: admin-ui
tags: [react, graphql, state-management, correction-modal]

dependency-graph:
  requires: [07-01, 07-02]
  provides: [SearchView, search-state-persistence]
  affects: [08-preview-ui]

tech-stack:
  added: []
  patterns:
    [graphql-hook-integration, session-storage-persistence, controlled-search]

key-files:
  created:
    - src/components/admin/correction/search/SearchView.tsx
  modified:
    - src/components/admin/correction/search/index.ts
    - src/components/admin/correction/CorrectionModal.tsx
    - src/hooks/useCorrectionModalState.ts

decisions:
  - '[07-03]: Search only triggers on explicit button click (not auto-search on mount)'
  - '[07-03]: Full skeleton replacement during loading per CONTEXT.md'
  - '[07-03]: Auto-trigger search when returning from preview with saved state'

metrics:
  duration: ~5min (session crashed, resumed)
  completed: 2026-01-26
---

# Phase 7 Plan 3: SearchView Integration Summary

Wire search components into the correction modal with GraphQL integration and state persistence.

## What Was Built

**SearchView Container** - Main search step wiring:

- Connects SearchInputs, SearchResults, and GraphQL query
- Pre-populates inputs with current album title and artist
- Shows skeleton during initial search load
- Displays results after search completes
- Initial state prompt: "Search MusicBrainz for the correct album data"
- Error state with retry messaging

**useCorrectionModalState Extended** - Search state persistence:

- Added `searchQuery?: { albumTitle, artistName }` to state
- Added `searchOffset?: number` for pagination
- Added `selectedResultMbid?: string` for tracking selection
- New setters: `setSearchQuery`, `setSearchOffset`, `setSelectedResult`, `clearSearchState`
- All search state persisted in sessionStorage per albumId

**CorrectionModal Integration**:

- Step 1 renders SearchView when album data is ready
- `handleResultSelect` stores MBID and navigates to preview step
- `handleManualEdit` placeholder for Phase 10
- Proper loading/error guards for step 1

## Key Implementation Details

**GraphQL Integration:**

```typescript
const { data, isLoading, error, isFetching } =
  useSearchCorrectionCandidatesQuery(
    { input: { albumId, albumTitle, artistName, limit: 10, offset } },
    { enabled: isSearchTriggered && !!(albumTitle || artistName) }
  );
```

**State Persistence Pattern:**

- `isSearchTriggered` tracks whether user has submitted search
- If returning from preview with saved `searchQuery`, auto-triggers search on mount
- Results persist when navigating back from preview step

**Type Extraction from GraphQL:**

```typescript
type GraphQLGroupedResult =
  SearchCorrectionCandidatesQuery['correctionSearch']['results'][number];
type GraphQLScoredResult = GraphQLGroupedResult['primaryResult'];
```

## Files Created/Modified

**Created:**

- `src/components/admin/correction/search/SearchView.tsx` - 165 lines

**Modified:**

- `src/components/admin/correction/search/index.ts` - added SearchView export
- `src/components/admin/correction/CorrectionModal.tsx` - integrated SearchView at step 1
- `src/hooks/useCorrectionModalState.ts` - extended with search state

## Decisions Made

- **Search trigger**: Explicit button click only (no auto-search on initial load)
- **Loading state**: Full skeleton replacement (SearchSkeleton) during initial search
- **Return from preview**: Auto-triggers search if searchQuery exists in state

## Deviations from Plan

None - plan executed as written.

## Testing Notes

- Type-check: passes
- Lint: passes (after formatting fixes)
- Manual verification: approved by user
  - Search inputs pre-populate correctly
  - Search triggers GraphQL query
  - Results display with thumbnails, scores, [MB] badges
  - Result click advances to preview step
  - State persists when navigating back

## Phase 7 Complete

All 3 plans executed:

- 07-01: Search inputs with pre-population and loading skeleton
- 07-02: Search result cards and results list with pagination
- 07-03: SearchView integration with GraphQL and state persistence

Ready for Phase 8 (Preview UI).
