---
phase: 02
plan: 02
subsystem: search-scoring
tags: [scoring, string-similarity, fuzzysort, correction]
dependency-graph:
  requires: [02-01]
  provides: [SearchScoringService, ScoringStrategy, ScoredSearchResult]
  affects: [02-03, 03-01]
tech-stack:
  added: []
  patterns: [strategy-pattern, singleton]
key-files:
  created:
    - src/lib/correction/scoring/types.ts
    - src/lib/correction/scoring/normalized-scorer.ts
    - src/lib/correction/scoring/tiered-scorer.ts
    - src/lib/correction/scoring/weighted-scorer.ts
    - src/lib/correction/scoring/index.ts
  modified:
    - src/lib/correction/types.ts
    - src/lib/correction/index.ts
decisions:
  - id: scoring-weights
    choice: "title:40, artist:40, year:10, mbScore:10 for weighted strategy"
    rationale: "Equal emphasis on title/artist matching, bonus for metadata presence"
  - id: tier-thresholds
    choice: "high:-1000, medium:-3000, low:-5000 fuzzysort scores"
    rationale: "Based on fuzzysort score ranges used in existing fuzzy-match.ts"
  - id: default-threshold
    choice: "0.5 low-confidence threshold"
    rationale: "Per RESEARCH.md recommendation for flagging uncertain matches"
metrics:
  duration: 3min
  completed: 2026-01-24
---

# Phase 2 Plan 2: Scoring Strategies Summary

**One-liner:** Three pluggable scoring strategies (normalized/tiered/weighted) with SearchScoringService for runtime strategy switching and low-confidence flagging.

## What Was Built

### Scoring Types (`src/lib/correction/scoring/types.ts`)
- `ScoringStrategy`: Type union for 'normalized' | 'tiered' | 'weighted'
- `ConfidenceTier`: Type union for 'high' | 'medium' | 'low' | 'none'
- `ScoreBreakdown`: Interface for component scores (title, artist, year)
- `ScoredSearchResult`: Extends CorrectionSearchResult with scoring data
- `SearchScorer`: Interface for strategy implementations

### Three Scorer Implementations

**NormalizedScorer** (`normalized-scorer.ts`)
- Uses `calculateStringSimilarity` from string-similarity.ts
- Produces 0-1 scores for all components
- Weighted average: title + artist + (year * 0.5)
- Best for: Simple, interpretable scores

**TieredScorer** (`tiered-scorer.ts`)
- Uses fuzzysort for fuzzy matching
- Categorizes into high/medium/low/none tiers
- Thresholds: high >= -1000, medium >= -3000, low >= -5000
- Best for: Clear categorical feedback

**WeightedScorer** (`weighted-scorer.ts`)
- 0-100 scale with transparent point breakdown
- Title: 40 points, Artist: 40 points, Year: 10 points, MB Score: 10 points
- Best for: Fine-grained ranking with visible breakdown

### SearchScoringService (`scoring/index.ts`)
- `setStrategy(strategy)`: Switch between scoring approaches
- `getStrategy()`: Get current strategy
- `setLowConfidenceThreshold(threshold)`: Configure flagging (0-1)
- `scoreResults(results, albumQuery, artistQuery?)`: Score and sort results
- `scoreResult(result, albumQuery, artistQuery?)`: Score single result
- Singleton via `getSearchScoringService()`

## Key Patterns

**Strategy Pattern:** All scorers implement `SearchScorer` interface, allowing runtime switching.

**Singleton Service:** `getSearchScoringService()` provides consistent state across the app.

**Normalized Output:** All strategies produce `normalizedScore` (0-1) for consistent sorting regardless of strategy.

## API Usage

```typescript
import { getSearchScoringService, getCorrectionSearchService } from '@/lib/correction';

const searchService = getCorrectionSearchService();
const scoringService = getSearchScoringService();

// Configure strategy
scoringService.setStrategy('weighted');
scoringService.setLowConfidenceThreshold(0.4);

// Search and score
const searchResponse = await searchService.search({ albumTitle: 'OK Computer' });
const scored = scoringService.scoreResults(
  searchResponse.results,
  'OK Computer',
  'Radiohead'
);

// Results sorted by normalizedScore, flagged if below threshold
scored.forEach(result => {
  console.log(result.title, result.displayScore, result.isLowConfidence);
});
```

## Deviations from Plan

None - plan executed exactly as written.

## Commits

- `b2583a8`: feat(02-02): add scoring types for correction search
- `5f684f0`: feat(02-02): implement three scoring strategies
- `d204933`: feat(02-02): add SearchScoringService and update exports

## Next Phase Readiness

**For 02-03 (MusicBrainz Integration):**
- Scoring service ready to be applied to search results
- All types exported from `@/lib/correction`

**For 03-01 (GraphQL Layer):**
- ScoredSearchResult type ready for GraphQL schema mapping
- Service pattern established for resolver integration
