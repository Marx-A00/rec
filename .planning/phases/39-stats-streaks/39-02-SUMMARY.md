---
phase: 39-stats-streaks
plan: 02
subsystem: game-stats-api
tags: [graphql, stats, api, authentication]

requires:
  - "39-01 (Stats service provides getPlayerStats)"
  - "Phase 33 (UncoverPlayerStats database schema)"

provides:
  - "GraphQL API for querying player stats"
  - "Generated useMyUncoverStatsQuery hook"
  - "Auth-protected stats endpoint"

affects:
  - "39-03+ (UI components can now query stats via GraphQL)"
  - "Stats modal implementation"
  - "Profile stats display"

tech-stack:
  added: []
  patterns:
    - "Dynamic imports for service layer in resolvers"
    - "GraphQL authentication guards"
    - "Generated React Query hooks for type-safe API calls"

key-files:
  created:
    - src/graphql/queries/uncoverStats.graphql
  modified:
    - src/graphql/schema.graphql
    - src/lib/graphql/resolvers/queries.ts

decisions:
  - id: STATS-API-AUTH
    choice: "Require authentication for myUncoverStats"
    rationale: "Stats are user-specific, unauthenticated requests should fail fast"
    alternatives: ["Return null for unauthenticated", "Return default zeros"]
    
  - id: STATS-API-DEFAULTS
    choice: "Return zeros for new users (via getPlayerStats)"
    rationale: "New users have no stats yet, service returns default zeros instead of error"
    alternatives: ["Return null", "Return error"]

metrics:
  duration: "3 minutes"
  completed: "2026-02-16"
  tasks: 3
  commits: 3
---

# Phase 39 Plan 02: GraphQL Stats API Summary

**One-liner:** GraphQL API for Uncover player stats with generated React Query hook and auth protection.

## What Was Built

Added GraphQL schema type, client query, and resolver to expose player statistics via API. The `myUncoverStats` query returns all stats fields and generates a type-safe React Query hook for client-side data fetching.

### GraphQL Schema (src/graphql/schema.graphql)

**UncoverPlayerStats Type:**
- `id: UUID!` - User ID
- `gamesPlayed: Int!` - Total games played
- `gamesWon: Int!` - Total games won
- `totalAttempts: Int!` - Sum of all attempts across games
- `currentStreak: Int!` - Current consecutive win streak
- `maxStreak: Int!` - Highest streak achieved
- `lastPlayedDate: DateTime` - Last game completion date (UTC)
- `winDistribution: [Int!]!` - Array of win counts by attempt number (index 0 = 1-guess wins)
- `winRate: Float!` - Computed field: gamesWon / gamesPlayed (0 if no games)

**Query Added:**
```graphql
myUncoverStats: UncoverPlayerStats
```

Added to Query type near other Uncover queries (after `dailyChallenge`).

### Client Query (src/graphql/queries/uncoverStats.graphql)

**MyUncoverStats Query:**
```graphql
query MyUncoverStats {
  myUncoverStats {
    id
    gamesPlayed
    gamesWon
    totalAttempts
    currentStreak
    maxStreak
    lastPlayedDate
    winDistribution
    winRate
  }
}
```

**Generated Hook:**
- `useMyUncoverStatsQuery()` - React Query hook with TypeScript types
- Located in: `src/generated/graphql.ts`

### Resolver (src/lib/graphql/resolvers/queries.ts)

**myUncoverStats Resolver:**
- **Authentication Check:** Returns GraphQLError if not authenticated (code: UNAUTHENTICATED)
- **Dynamic Import:** Imports `getPlayerStats` from stats-service (avoids circular deps)
- **Stats Fetching:** Calls `getPlayerStats(userId, prisma)`
- **lastPlayedDate:** Separate DB query to fetch from UncoverPlayerStats table
- **Error Handling:** Catches errors, logs with context, throws GraphQL error
- **Return:** Maps stats to GraphQL schema shape (id, all stats fields)

**Pattern Followed:**
- Same structure as `dailyChallenge` resolver
- Dynamic imports for service layer
- Proper error logging with graphqlLogger
- Auth guard at the top

## Deviations from Plan

**Minor Optimization (Rule 1 - Bug Prevention):**
- Plan suggested separate DB query for `totalAttempts`
- **Found:** `getPlayerStats` already returns `totalAttempts` in PlayerStats interface
- **Action:** Kept the note but used `stats.totalAttempts` directly
- **Still fetch DB for:** `lastPlayedDate` (not in service return)

This prevents an unnecessary database query while maintaining all required fields.

## Technical Implementation

### Type Safety

**GraphQL Schema → Generated Types:**
```typescript
// Generated in src/generated/resolvers-types.ts
type UncoverPlayerStats = {
  id: string; // UUID
  gamesPlayed: number;
  gamesWon: number;
  totalAttempts: number;
  currentStreak: number;
  maxStreak: number;
  lastPlayedDate?: Date | null;
  winDistribution: number[];
  winRate: number;
};
```

**Client Query Hook:**
```typescript
// Usage in components:
const { data, isLoading, error } = useMyUncoverStatsQuery();

// Type-safe access:
if (data?.myUncoverStats) {
  const { gamesPlayed, winRate, winDistribution } = data.myUncoverStats;
}
```

### Authentication Flow

```
1. Client calls useMyUncoverStatsQuery()
2. GraphQL request to /api/graphql
3. Context includes user from NextAuth session
4. Resolver checks context.user
   - If null: throw UNAUTHENTICATED error
   - If present: proceed to fetch stats
5. Return stats or error to client
```

### New User Handling

**Scenario:** User plays first game, stats modal queries myUncoverStats

**Flow:**
1. Resolver calls `getPlayerStats(userId)`
2. Service finds no stats in DB
3. Service returns default zeros:
   ```typescript
   {
     gamesPlayed: 0,
     gamesWon: 0,
     totalAttempts: 0,
     winRate: 0,
     currentStreak: 0,
     maxStreak: 0,
     winDistribution: [0, 0, 0, 0, 0, 0]
   }
   ```
4. Resolver adds `id: userId` and `lastPlayedDate: null`
5. Client receives valid stats object (not error)

This provides a smooth UX for new players without special error handling.

## Files Changed

**Created:**
- `src/graphql/queries/uncoverStats.graphql` (15 lines)
  - MyUncoverStats query definition

**Modified:**
- `src/graphql/schema.graphql` (+22 lines)
  - Added UncoverPlayerStats type
  - Added myUncoverStats query to Query type
  
- `src/lib/graphql/resolvers/queries.ts` (+40 lines)
  - Added myUncoverStats resolver function

## Testing Notes

### Manual Test Plan

1. **Authenticated user with games:**
   - Query myUncoverStats
   - Verify all fields populated correctly
   - Check winRate calculation
   - Verify winDistribution array

2. **Authenticated new user (no games):**
   - Query myUncoverStats
   - Verify returns zeros (not error)
   - Check lastPlayedDate is null

3. **Unauthenticated request:**
   - Query myUncoverStats without session
   - Verify UNAUTHENTICATED error returned

4. **Generated hook:**
   - Import useMyUncoverStatsQuery in component
   - Verify TypeScript types are correct
   - Check data shape matches schema

### Codegen Verification

**Steps:**
1. Run `pnpm codegen`
2. Check `src/generated/graphql.ts` for `useMyUncoverStatsQuery`
3. Check `src/generated/resolvers-types.ts` for `UncoverPlayerStats` type
4. Verify no schema validation errors

**Results:** All generated successfully, no errors.

## Decisions Made

**1. Authentication Required (STATS-API-AUTH)**
- **Decision:** Throw UNAUTHENTICATED error for non-logged-in requests
- **Rationale:** Stats are inherently user-specific. Fast failure is better than returning null/defaults which could mask auth issues.
- **Implementation:** Auth guard at top of resolver

**2. Default Zeros for New Users (STATS-API-DEFAULTS)**
- **Decision:** Service layer returns zeros for users with no stats (resolver passes through)
- **Rationale:** New users haven't played yet. Zeros are valid stats, not an error condition. Simplifies client code (no null checking needed).
- **Implementation:** `getPlayerStats` handles this logic, resolver just returns

**3. Dynamic Imports (follows 37-03 pattern)**
- **Decision:** Import stats-service dynamically in resolver
- **Rationale:** Prevents circular dependencies between GraphQL resolvers and service layers
- **Implementation:** `await import('@/lib/uncover/stats-service')`

## Next Phase Readiness

**Ready for:**
- 39-03: Stats modal UI (can now call `useMyUncoverStatsQuery()`)
- 39-04+: Any UI component needing stats display
- Profile page stats section
- Leaderboard queries (can extend with more resolvers)

**Provides:**
- Type-safe API for stats queries
- Authentication-protected endpoint
- Generated React Query hook with proper types

**No blockers for next plans.**

## Task Breakdown

**Task 1: Add UncoverPlayerStats type and query to GraphQL schema**
- Status: Complete
- Commit: 97fef37
- Files: src/graphql/schema.graphql
- Verified: codegen succeeded

**Task 2: Create client query for stats**
- Status: Complete
- Commit: 2ec3ce2
- Files: src/graphql/queries/uncoverStats.graphql
- Verified: Hook generated in src/generated/graphql.ts

**Task 3: Implement myUncoverStats resolver**
- Status: Complete
- Commit: f094907
- Files: src/lib/graphql/resolvers/queries.ts
- Verified: type-check and lint passed

## Validation

- GraphQL schema validation: PASS (codegen succeeded)
- TypeScript compilation: PASS (pnpm type-check)
- Lint: PASS (no errors, only pre-existing warnings)
- Generated hook: EXISTS (useMyUncoverStatsQuery)
- Auth check: IMPLEMENTED (throws UNAUTHENTICATED)
- Error handling: IMPLEMENTED (try/catch with logging)

---

**GraphQL stats API ready for client-side consumption via generated React Query hook.**
