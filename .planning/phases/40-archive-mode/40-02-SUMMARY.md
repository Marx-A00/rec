---
phase: 40-archive-mode
plan: 02
subsystem: api
tags: [graphql, archive, resolvers, codegen]
requires:
  - phase: 40-01
    provides: UncoverArchiveStats model, archive-stats-service, mode-aware game service
provides:
  - GraphQL types for archive stats and session history
  - Archive query resolvers (myArchiveStats, myUncoverSessions)
  - Archive mutation resolvers (startArchiveSession)
  - Generated React Query hooks for archive operations
affects: [40-03, 40-04]
tech-stack:
  added: []
  patterns: [date-range filtering for session history, mode parameter on mutations]
key-files:
  created: [src/graphql/queries/archive.graphql]
  modified: [src/graphql/schema.graphql, src/lib/graphql/resolvers/queries.ts, src/lib/graphql/resolvers/mutations.ts]
key-decisions: []
patterns-established: []
duration: 5min
completed: 2026-02-16
---

# Phase 40 Plan 02: Archive GraphQL API Summary

**One-liner:** GraphQL API for archive game stats, session history calendar queries, and date-based archive session mutations

## What Was Delivered

### GraphQL Schema Types (schema.graphql)

**UncoverArchiveStats Type:**
- Separate stats type for archive games (no streak fields)
- Tracks gamesPlayed, gamesWon, totalAttempts, winDistribution
- Computed winRate field
- Returns null if user has no archive games

**UncoverSessionHistory Type:**
- Calendar display data for played/missed days
- Fields: id, challengeDate, won, attemptCount, completedAt
- Enables visual calendar indicators for game completion status

**New Query Operations:**
- `myArchiveStats`: Get user's archive stats (null if no games)
- `myUncoverSessions(fromDate, toDate)`: Session history with optional date filters

**New Mutation Operations:**
- `startArchiveSession(date)`: Start archive session for specific past date
- Updated `submitGuess(sessionId, albumId, mode)`: Optional mode parameter
- Updated `skipGuess(sessionId, mode)`: Optional mode parameter

### Client-Side Queries (queries/archive.graphql)

**Generated React Query Hooks:**
1. `useMyArchiveStatsQuery` - Fetch archive stats
2. `useMyUncoverSessionsQuery` - Fetch session history with date filters
3. `useStartArchiveSessionMutation` - Start archive game for past date

All hooks follow existing codegen patterns with proper TypeScript types.

### Query Resolvers (queries.ts)

**myArchiveStats Resolver:**
- Requires authentication (UNAUTHENTICATED error if not logged in)
- Dynamic import of getArchiveStats from archive-stats-service
- Returns null if gamesPlayed === 0
- Maps service response to GraphQL type shape
- Error logging with user context

**myUncoverSessions Resolver:**
- Requires authentication
- Query UncoverSession with optional fromDate/toDate filters
- Only returns completed sessions (completedAt not null)
- Includes challenge.challengeDate for calendar display
- Orders by challengeDate desc (most recent first)
- Maps to UncoverSessionHistory shape

### Mutation Resolvers (mutations.ts)

**startArchiveSession Resolver:**
- Requires authentication
- Dynamic imports: startArchiveSession from game-service, toUTCMidnight/GAME_EPOCH from date-utils
- Date validation:
  - Must be >= GAME_EPOCH (2026-01-01)
  - Must be < today (not today or future dates)
  - Throws GraphQLError if validation fails
- Normalizes date to UTC midnight
- Returns StartSessionResult with session, challengeId, imageUrl, cloudflareImageId
- Logs session creation with challengeDate

**Updated submitGuess Resolver:**
- Added optional `mode` parameter (defaults to 'daily')
- Passes mode to game-service submitGuess function
- Maintains existing authentication and validation logic

**Updated skipGuess Resolver:**
- Added optional `mode` parameter (defaults to 'daily')
- Passes mode to game-service skipGuess function
- Maintains existing authentication and validation logic

## Technical Implementation

**Resolver Patterns:**
- All archive resolvers follow existing patterns (dynamic imports, auth checks, error handling)
- GraphQLError for client-facing errors
- graphqlLogger for server-side tracking
- Type safety via generated resolvers-types

**Date Handling:**
- UTC midnight normalization for all dates
- GAME_EPOCH boundary check prevents impossible archive dates
- Date range filters on myUncoverSessions enable efficient month pagination

**Mode Parameter Pattern:**
- Optional mode parameter on submitGuess/skipGuess
- Defaults to 'daily' if not provided
- Game service routes to correct stats update (daily vs archive)

## Code Generation

**Executed codegen 3 times:**
1. After schema types added - validated syntax
2. After archive.graphql queries added - generated hooks
3. After resolvers added - regenerated with resolver types

**Generated Files:**
- src/generated/graphql.ts - Client hooks and types
- src/generated/resolvers-types.ts - Server resolver types

## Verification Results

**type-check:** Passed (no TypeScript errors)
**codegen:** Passed (3 successful runs)
**lint:** Passed (no new errors in archive code)

**Generated Hooks Verified:**
- useMyArchiveStatsQuery exists
- useMyUncoverSessionsQuery exists with date params
- useStartArchiveSessionMutation exists with date param

## Deviations from Plan

None - plan executed exactly as written.

## Next Phase Readiness

**40-03 (Archive Calendar UI) Dependencies Met:**
- ✓ useMyUncoverSessionsQuery available for calendar data
- ✓ Date range filtering for month-by-month pagination
- ✓ Session history returns played/won/lost status

**40-04 (Archive Stats Display) Dependencies Met:**
- ✓ useMyArchiveStatsQuery available
- ✓ Stats separated from daily stats (no streak confusion)
- ✓ Win distribution and rates computed

**40-03 and 40-04 can now proceed in parallel** - all API dependencies delivered.

---

**Tasks Completed:** 3/3
**Commits:** ce445a9, eb23e32, e216f83
**Duration:** 5 minutes
**Status:** Complete
