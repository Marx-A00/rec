---
phase: 05
plan: 02
subsystem: graphql-resolvers
tags: [graphql, resolvers, admin, authorization, correction]
dependency-graph:
  requires: [05-01]
  provides: ["correctionSearch resolver", "correctionPreview resolver", "correctionApply resolver"]
  affects: [05-03, 06-xx, 07-xx]
tech-stack:
  added: []
  patterns: ["thin resolver pattern", "admin authorization guard", "GraphQL error codes"]
key-files:
  created: []
  modified:
    - src/lib/graphql/resolvers/queries.ts
    - src/lib/graphql/resolvers/mutations.ts
decisions:
  - "[05-02] Strategy enum mapping via explicit switch statements"
  - "[05-02] Preview generated on-demand in correctionApply (not passed from client)"
metrics:
  duration: 6.5min
  completed: 2026-01-24
---

# Phase 5 Plan 2: Thin Resolvers Summary

**One-liner:** GraphQL resolvers wire correctionSearch/correctionPreview/correctionApply to service layer with admin auth guards

## What Was Built

1. **correctionSearch Query Resolver**
   - Authentication check (throws UNAUTHENTICATED if no user)
   - Authorization check via isAdmin() (throws FORBIDDEN if not admin)
   - Fetches album data when title/artist not provided in input
   - Maps GraphQL ScoringStrategy enum to service strategy type
   - Delegates to getCorrectionSearchService().searchWithScoring()
   - Transforms grouped results to GraphQL format

2. **correctionPreview Query Resolver**
   - Same auth/authz pattern as correctionSearch
   - Searches for specific release group via searchWithScoring()
   - Generates preview via getCorrectionPreviewService().generatePreview()
   - Transforms all diffs, artist comparison, track comparison to GraphQL format

3. **correctionApply Mutation Resolver**
   - Same auth/authz pattern
   - Generates preview internally (release group MBID from input)
   - Transforms GraphQL FieldSelectionsInput to service FieldSelections (arrays to Maps)
   - Calls applyCorrectionService.applyCorrection() with proper input
   - Handles StaleDataError specifically (returns STALE_DATA error code)
   - Returns AppliedChanges with all change summaries

## Key Patterns

**Authorization Guard:**
```typescript
if (!user) {
  throw new GraphQLError('Authentication required', {
    extensions: { code: 'UNAUTHENTICATED' },
  });
}
if (!isAdmin(user.role)) {
  throw new GraphQLError('Admin access required', {
    extensions: { code: 'FORBIDDEN' },
  });
}
```

**Type Transformation (enum mapping):**
```typescript
function mapGqlStrategyToService(strategy: GqlScoringStrategy): ServiceScoringStrategy {
  switch (strategy) {
    case GqlScoringStrategy.Normalized: return 'normalized';
    case GqlScoringStrategy.Tiered: return 'tiered';
    case GqlScoringStrategy.Weighted: return 'weighted';
    default: return 'normalized';
  }
}
```

**Selections Input Transformation:**
```typescript
function transformSelectionsInput(input): FieldSelections {
  // Convert arrays of { key, selected } to Map<string, boolean>
  const artists = new Map<string, boolean>();
  for (const entry of input.artists) {
    artists.set(entry.key, entry.selected);
  }
  // ... same for tracks
}
```

## Commits

- d749495: feat(05-02): add correctionSearch and correctionPreview query resolvers
- 6803e4c: feat(05-02): add correctionApply mutation resolver

## Verification

- TypeScript compiles: `pnpm type-check` passes
- All three resolvers implemented with proper auth guards
- Error codes match GraphQL schema (UNAUTHENTICATED, FORBIDDEN, STALE_DATA)

## Deviations from Plan

None - plan executed exactly as written.

## Next Phase Readiness

Phase 5 Plan 3 can proceed:
- All resolvers are implemented and type-safe
- Services are properly wired
- Admin authorization is in place
