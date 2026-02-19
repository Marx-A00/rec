---
phase: 35
plan: 03
subsystem: daily-challenge
tags: [graphql, api, admin, daily-challenge]
requires: [35-01, 35-02]
provides: [daily-challenge-graphql-api]
affects: [35-04]
tech-stack:
  added: []
  patterns: [graphql-resolvers, react-query-hooks, admin-auth-checks]
key-files:
  created:
    - src/graphql/queries/dailyChallenge.graphql
  modified:
    - src/graphql/schema.graphql
    - src/lib/graphql/resolvers/queries.ts
    - src/lib/graphql/resolvers/mutations.ts
    - src/generated/graphql.ts
    - src/generated/resolvers-types.ts
decisions:
  - Use dynamic imports for challenge services in resolvers
  - Admin operations check user.role for ADMIN or OWNER
  - dailyChallenge query does NOT expose the answer album (security)
  - Remove operation resequences remaining entries for contiguous sequence
metrics:
  tasks-completed: 4
  commits: 4
  duration: 9 minutes
  completed: 2026-02-16
---

# Phase 35 Plan 03: Daily Challenge GraphQL API Summary

**One-liner:** GraphQL API for daily challenges with public query (no answer) and admin CRUD operations for curated list management

## What Was Built

### GraphQL Schema Additions

**Types:**
- DailyChallengeInfo - Challenge metadata without the answer album
- UncoverSessionInfo - User's session state for a challenge
- UncoverSessionStatus enum - IN_PROGRESS, WON, LOST
- CuratedChallengeEntry - Admin management of curated list
- UpcomingChallenge - Admin preview of future challenges

**Queries:**
- dailyChallenge(date?) - Get challenge for a date (defaults to today), returns info WITHOUT answer
- curatedChallenges(limit, offset) - Admin: get ordered curated list
- curatedChallengeCount - Admin: get count of curated entries
- upcomingChallenges(days) - Admin: preview next N days of challenges

**Mutations:**
- addCuratedChallenge(albumId, pinnedDate?) - Admin: add album to curated list
- removeCuratedChallenge(id) - Admin: remove entry and resequence
- pinCuratedChallenge(id, date) - Admin: pin entry to specific date
- unpinCuratedChallenge(id) - Admin: remove date override

### Query Resolvers

**dailyChallenge resolver:**
- Uses toUTCMidnight for date normalization
- Calls getOrCreateDailyChallenge (safe - doesn't expose answer)
- Fetches user's session if authenticated
- Returns challenge metadata only (no album reference)

**Admin resolvers:**
- curatedChallenges - Fetches ordered list with album details
- curatedChallengeCount - Simple count query
- upcomingChallenges - Loops through dates, calls getSelectionInfo, fetches albums
- All check user.role for ADMIN or OWNER access

### Mutation Resolvers

**addCuratedChallenge:**
- Validates album exists and is ELIGIBLE
- Requires cloudflareImageId (cover art)
- Checks for duplicates
- Assigns next sequential sequence number
- Supports optional pinnedDate

**removeCuratedChallenge:**
- Deletes entry
- Resequences remaining entries to maintain contiguous sequence (0, 1, 2, ...)

**pinCuratedChallenge:**
- Validates no other entry pinned to same date
- Updates pinnedDate

**unpinCuratedChallenge:**
- Sets pinnedDate to null

### Client-Side Operations

Created src/graphql/queries/dailyChallenge.graphql with 8 operations.

**Generated hooks:**
- useDailyChallengeQuery
- useCuratedChallengesQuery
- useCuratedChallengeCountQuery
- useUpcomingChallengesQuery
- useAddCuratedChallengeMutation
- useRemoveCuratedChallengeMutation
- usePinCuratedChallengeMutation
- useUnpinCuratedChallengeMutation

## Technical Approach

**Dynamic imports:** Resolvers use dynamic imports for challenge services to avoid circular dependencies and reduce bundle size.

**Admin authorization:** All admin operations check `user?.role` and require ADMIN or OWNER.

**Security:** The dailyChallenge query intentionally does NOT return the album field - that would spoil the game. Only returns challenge metadata and user's session state.

**Sequencing:** Curated list maintains contiguous sequence numbers. Remove operation resequences all remaining entries.

**Date handling:** All dates normalized to UTC midnight via toUTCMidnight utility.

## Integration Points

**Consumes:**
- challenge-service (getOrCreateDailyChallenge, getDailyChallengeInfo)
- selection-service (getSelectionInfo)
- date-utils (toUTCMidnight)
- Prisma models (UncoverChallenge, UncoverSession, CuratedChallenge)

**Provides:**
- GraphQL API for daily challenges
- React Query hooks for client components
- Admin API for curated list management

## Files Changed

**Created:**
- src/graphql/queries/dailyChallenge.graphql (8 operations)

**Modified:**
- src/graphql/schema.graphql (+138 lines: types, queries, mutations)
- src/lib/graphql/resolvers/queries.ts (+161 lines: 4 resolvers)
- src/lib/graphql/resolvers/mutations.ts (+205 lines: 4 resolvers)
- src/generated/graphql.ts (codegen output)
- src/generated/resolvers-types.ts (codegen output)

## Deviations from Plan

None - plan executed exactly as written.

## Testing Notes

**Manual testing needed:**
- dailyChallenge query returns challenge without album
- Admin queries require authentication
- Add mutation validates album eligibility and cover art
- Remove mutation resequences correctly
- Pin mutation prevents duplicate date pins

**Type safety:** All resolvers type-checked successfully. Codegen produced valid hooks.

## Next Phase Readiness

**For 35-04 (Game UI Components):**
- ✅ useDailyChallengeQuery available for fetching today's challenge
- ✅ Challenge metadata available (maxAttempts, totalPlays, etc.)
- ✅ User session state available (status, attemptCount, won)
- ⚠️ Note: Album answer NOT in query response - game flow will need separate query for album after win

**For future admin UI:**
- ✅ Full CRUD API for curated list management
- ✅ Preview of upcoming challenges
- ✅ Pin/unpin functionality for special dates

## Open Questions

None.

## Commits

1. 140e7d1 - Add GraphQL schema for daily challenge
2. dd47326 - Implement daily challenge query resolvers
3. ee5e620 - Implement daily challenge mutation resolvers
4. 0320cae - Create client-side GraphQL operations and generate hooks
