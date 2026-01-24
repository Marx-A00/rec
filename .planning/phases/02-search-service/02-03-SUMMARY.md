---
phase: 02
plan: 03
subsystem: search-integration
tags: [scoring, grouping, deduplication, search-service]
dependency-graph:
  requires: [02-01, 02-02]
  provides: [searchWithScoring, groupByReleaseGroup, ScoredSearchResponse]
  affects: [03-01, phase-4]
tech-stack:
  added: []
  patterns: [release-group-deduplication, type-priority-sorting]
key-files:
  created: []
  modified:
    - src/lib/correction/types.ts
    - src/lib/correction/search-service.ts
    - src/lib/correction/index.ts
decisions:
  - id: type-priority-sorting
    choice: "Album:1 > EP:2 > Single:3 > Broadcast:4 > Other:5"
    rationale: "Albums are primary use case, group best version first"
metrics:
  duration: 2m 19s
  completed: 2026-01-24
---

# Phase 2 Plan 3: Scoring Integration Summary

**One-liner:** searchWithScoring() combines raw MusicBrainz search with fuzzy scoring and release group deduplication for UI-ready results.

## What Was Built

### New Types (`src/lib/correction/types.ts`)

- **ScoredSearchOptions**: Extends search options with `strategy` and `lowConfidenceThreshold`
- **GroupedSearchResult**: Groups versions by release group MBID
  - `primaryResult`: Best version to display
  - `alternateVersions`: Deluxe, remaster, etc.
  - `versionCount`: Total versions in group
  - `bestScore`: Highest score for group sorting
- **ScoredSearchResponse**: Full response with scoring metadata
  - `results`: Grouped results
  - `allResults`: Ungrouped for debugging
  - `scoring`: Strategy, threshold, lowConfidenceCount

### New Methods (`src/lib/correction/search-service.ts`)

**searchWithScoring(options)**
```typescript
const response = await searchService.searchWithScoring({
  albumTitle: 'OK Computer',
  artistName: 'Radiohead',
  strategy: 'weighted',
  lowConfidenceThreshold: 0.4,
});
// returns ScoredSearchResponse
```

Pipeline:
1. Execute raw search via `search()`
2. Apply scoring via `scoringService.scoreResults()`
3. Group by release group MBID
4. Sort by type priority, then score
5. Return with scoring metadata

**groupByReleaseGroup(results)**
- Groups scored results by `releaseGroupMbid`
- Sorts within groups: type priority first, then score descending
- First result becomes `primaryResult`, rest become `alternateVersions`
- Groups sorted by: primary type priority, then best score

**loadMore(options)**
- Convenience method for pagination
- Passes offset to searchWithScoring

### Type Priority Sorting

```typescript
const TYPE_PRIORITY = {
  Album: 1,    // Highest priority
  EP: 2,
  Single: 3,
  Broadcast: 4,
  Other: 5,    // Default for unknown types
};
```

Ensures albums appear before EPs/singles in search results.

## Key Implementation Details

**Scoring Integration:**
```typescript
const scoredResults = scoringService.scoreResults(
  rawResponse.results,
  albumQuery,
  artistQuery,
  { strategy, lowConfidenceThreshold: threshold }
);
```

**Grouping Algorithm:**
```typescript
// Group by MBID
const groups = new Map<string, ScoredSearchResult[]>();
for (const result of results) {
  const existing = groups.get(result.releaseGroupMbid) || [];
  existing.push(result);
  groups.set(result.releaseGroupMbid, existing);
}
```

**Response Shape:**
```typescript
{
  results: GroupedSearchResult[],       // Deduplicated
  allResults: ScoredSearchResult[],     // Original scored
  totalGroups: number,
  hasMore: boolean,
  query: { albumTitle, artistName, yearFilter },
  scoring: { strategy, threshold, lowConfidenceCount }
}
```

## API Usage Example

```typescript
import { getCorrectionSearchService } from '@/lib/correction';

const searchService = getCorrectionSearchService();

// Full scored search with grouping
const response = await searchService.searchWithScoring({
  albumTitle: 'OK Computer',
  artistName: 'Radiohead',
  limit: 10,
  strategy: 'weighted',
  lowConfidenceThreshold: 0.5,
});

// Iterate grouped results
for (const group of response.results) {
  console.log('Primary:', group.primaryResult.title);
  console.log('  Score:', group.primaryResult.normalizedScore);
  console.log('  Versions:', group.versionCount);
  
  for (const alt of group.alternateVersions) {
    console.log('  Alt:', alt.title, alt.disambiguation);
  }
}

// Check scoring metadata
console.log('Strategy:', response.scoring.strategy);
console.log('Low confidence:', response.scoring.lowConfidenceCount);
```

## Verification

- `pnpm type-check`: Passes
- `pnpm eslint src/lib/correction/`: Passes
- All exports verified from `@/lib/correction`

## Deviations from Plan

None - plan executed exactly as written.

## Commits

- `c900e23`: feat(02-03): add grouped result types for deduplicated search
- `91248c9`: feat(02-03): implement searchWithScoring and groupByReleaseGroup
- `d937608`: feat(02-03): update exports with grouped result types

## Phase 2 Complete

This plan completes Phase 2 (Search Service). The correction module now provides:

1. **Raw search** (`search()`) - MusicBrainz search with ADMIN priority
2. **Scoring** (`scoreResults()`) - Three pluggable scoring strategies
3. **Scored search** (`searchWithScoring()`) - Integrated search with scoring and grouping

**Ready for Phase 3 (GraphQL Layer):**
- Types exported for GraphQL schema mapping
- Service patterns established for resolver integration
- `ScoredSearchResponse` shape ready for query response

**Ready for Phase 4 (Correction Flow):**
- Complete search service foundation
- Grouped results ready for correction selection UI
- Low-confidence flagging ready for admin workflow
