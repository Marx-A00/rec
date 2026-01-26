---
phase: 07-search-ui
plan: 02
subsystem: admin-ui
tags: [react, search, components, correction-modal]

dependency-graph:
  requires: [07-01]
  provides: [SearchResultCard, SearchResults, NoResultsState]
  affects: [07-03]

tech-stack:
  added: []
  patterns: [clickable-button-row, grouped-results-display, empty-state]

key-files:
  created:
    - src/components/admin/correction/search/SearchResultCard.tsx
    - src/components/admin/correction/search/SearchResults.tsx
    - src/components/admin/correction/search/NoResultsState.tsx
  modified:
    - src/components/admin/correction/search/index.ts

decisions:
  - "[07-02]: MB badge uses smaller 10px text for subtlety"
  - "[07-02]: Score shown as percentage with 'match' suffix"
  - "[07-02]: Results use divide-y for subtle row separation"

metrics:
  duration: 2m 34s
  completed: 2026-01-26
---

# Phase 7 Plan 2: Search Results Display Summary

Search result components showing album metadata, match scores, pagination, and empty state fallback for MusicBrainz correction candidates.

## What Was Built

**SearchResultCard** - Clickable result row with:
- 48x48 album thumbnail (AlbumImage component)
- Title with disambiguation + match score percentage
- Artist name and year in secondary row
- Release type (primaryType + secondaryTypes) with [MB] badge
- Hover/active states for click feedback
- Full accessibility with aria-label

**SearchResults** - Container component with:
- Renders list of SearchResultCard from GroupedSearchResult[]
- Shows NoResultsState when results empty
- Load more button with loading spinner
- Uses divide-y for subtle row separation

**NoResultsState** - Empty state with:
- AlertCircle icon and helpful message
- Link to Manual Edit as escape hatch
- Centered layout with proper spacing

## Key Implementation Details

**Type Integration:**
- SearchResultCard accepts ScoredSearchResult from scoring system
- SearchResults accepts GroupedSearchResult[] for deduplicated results
- Uses primaryResult from each group for display

**Match Score Display:**
- `Math.round(result.normalizedScore * 100)% match` format
- Positioned in title row with emeraled-green color
- Font-semibold for visibility without being overwhelming

**Source Badge:**
- Small [MB] badge (10px text) with outline variant
- zinc-500/zinc-700 colors for subtlety
- Positioned at end of metadata row with ml-auto

**Results List:**
- Maps over GroupedSearchResult using releaseGroupMbid as key
- Extracts primaryResult for each SearchResultCard
- divide-y divide-zinc-800/50 for subtle separation

## Files Created/Modified

**Created:**
- `src/components/admin/correction/search/SearchResultCard.tsx` - 90 lines
- `src/components/admin/correction/search/SearchResults.tsx` - 56 lines
- `src/components/admin/correction/search/NoResultsState.tsx` - 30 lines

**Modified:**
- `src/components/admin/correction/search/index.ts` - added new exports

## Decisions Made

- **MB badge styling**: Uses 10px text with outline variant for maximum subtlety (only one source in v1)
- **Score format**: "{N}% match" suffix clarifies the number's meaning
- **Row separation**: divide-y provides cleaner look than borders on each card

## Deviations from Plan

None - plan executed exactly as written.

## Testing Notes

- Type-check: passes
- Lint: passes (no warnings in new files)
- Manual verification: component structure matches requirements

## Next Phase Readiness

Ready for 07-03 (SearchView integration) which will:
- Wire SearchInputs, SearchResults, and GraphQL mutation
- Handle search state management
- Navigate to Preview on result selection
