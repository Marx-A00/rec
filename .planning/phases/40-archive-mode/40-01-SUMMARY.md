---
phase: 40-archive-mode
plan: 01
subsystem: database
tags: [prisma, archive, stats, game-service]
requires:
  - phase: 33-data-foundation
    provides: UncoverPlayerStats model pattern
  - phase: 37-game-state-logic
    provides: game-service.ts structure
provides:
  - UncoverArchiveStats Prisma model (separate from daily stats)
  - Archive stats service (updateArchiveStats, getArchiveStats)
  - Mode-aware game service (daily vs archive)
  - startArchiveSession function for date-based sessions
affects:
  - phase: 40-archive-mode
    plans: [40-02, 40-03, 40-04]
    reason: Archive calendar, UI, and GraphQL depend on this data layer
tech-stack:
  added: []
  patterns:
    - Separate archive stats tracking (no streaks)
    - Mode parameter pattern (daily|archive)
    - Conditional stats routing based on mode
key-files:
  created:
    - src/lib/uncover/archive-stats-service.ts
    - prisma/migrations/20260217001534_add_uncover_archive_stats/migration.sql
  modified:
    - prisma/schema.prisma
    - src/lib/uncover/game-service.ts
key-decisions:
  - decision: Archive stats in separate table, not flag in UncoverPlayerStats
    rationale: Clean separation, no streak fields, simpler queries
    alternatives: Flag in existing table (rejected - mixing concerns)
  - decision: Mode parameter on game functions (default 'daily')
    rationale: Backward compatible, explicit mode selection
    alternatives: Separate functions (rejected - code duplication)
patterns-established:
  - Archive games never update streaks (ARCHIVE-03)
  - Archive stats track wins/losses separately (ARCHIVE-04)
  - startArchiveSession takes challengeDate parameter
  - Game service routes stats based on mode parameter
duration: 3.6min
completed: 2026-02-16
---

# Phase 40 Plan 01: Archive Stats Model Summary

**One-liner:** Separate archive stats tracking with mode-aware game service (no streaks for archive games)

## What Was Built

### Database Model
Added `UncoverArchiveStats` Prisma model to track archive game statistics separately from daily stats:
- Fields: gamesPlayed, gamesWon, totalAttempts, winDistribution
- NO streak fields (currentStreak, maxStreak, lastPlayedDate)
- One-to-one relation with User
- Migration created and applied successfully

### Archive Stats Service
Created `archive-stats-service.ts` following the pattern from `stats-service.ts`:
- `updateArchiveStats`: Updates stats after archive game completion (no streak logic)
- `getArchiveStats`: Retrieves archive stats with calculated winRate
- Proper TypeScript types (no `any` types)
- Simpler than daily stats (no date comparison, no streak calculation)

### Mode-Aware Game Service
Extended `game-service.ts` with archive mode support:
- Added `mode?: 'daily' | 'archive'` parameter to `submitGuess` and `skipGuess`
- Conditional routing: `mode === 'daily'` → `updatePlayerStats`, `mode === 'archive'` → `updateArchiveStats`
- Added `startArchiveSession(userId, challengeDate, prisma)` for date-based sessions
- Backward compatible (defaults to 'daily' mode)

## Architecture Decisions

**Decision: Separate Stats Table**
- Archive games use UncoverArchiveStats table
- Daily games use UncoverPlayerStats table
- Clean separation prevents mixing concerns
- Archive stats have no streak-related fields

**Decision: Mode Parameter Pattern**
- Functions take `mode?: 'daily' | 'archive'` parameter
- Defaults to 'daily' for backward compatibility
- Explicit mode selection in function calls
- Avoided code duplication (rejected separate functions approach)

## Compliance with Requirements

**ARCHIVE-03: Archive games never affect daily streaks**
- ✅ Archive mode routes to `updateArchiveStats` (no streak logic)
- ✅ Daily mode routes to `updatePlayerStats` (maintains existing behavior)
- ✅ UncoverArchiveStats has no streak fields

**ARCHIVE-04: Archive games still track wins/losses**
- ✅ `updateArchiveStats` increments gamesPlayed, gamesWon, totalAttempts
- ✅ Win distribution tracked per attempt count
- ✅ `getArchiveStats` calculates winRate

## Code Quality

**Type Safety:**
- All functions use proper TypeScript types
- No `any` types used (per CLAUDE.md standards)
- PrismaClient type correctly imported

**Testing:**
- `pnpm type-check`: Passed
- `pnpm lint`: Passed (only pre-existing warnings)
- `pnpm prisma generate`: Successful
- Migration applied successfully to database

## Deviations from Plan

None - plan executed exactly as written.

## Next Phase Readiness

**Ready for 40-02 (Archive Calendar UI):**
- ✅ startArchiveSession function available
- ✅ Can create sessions for any past date
- ✅ Stats tracking ready for archive games

**Ready for 40-03 (Archive GraphQL API):**
- ✅ Archive stats service exports ready for resolvers
- ✅ getArchiveStats function for queries
- ✅ Mode parameter ready for mutations

**Ready for 40-04 (Stats Display Toggle):**
- ✅ Separate archive stats queryable
- ✅ Can fetch both daily and archive stats per user

## Performance Impact

- Minimal: New table with same indexes as daily stats
- One additional upsert per archive game completion
- No impact on daily game performance

## Files Changed

**Created:**
1. `src/lib/uncover/archive-stats-service.ts` (103 lines)
2. `prisma/migrations/20260217001534_add_uncover_archive_stats/migration.sql`

**Modified:**
1. `prisma/schema.prisma` (+22 lines: model + User relation)
2. `src/lib/uncover/game-service.ts` (+119/-22 lines: mode support + startArchiveSession)

## Commits

1. `dcb826b` - feat(40-01): add UncoverArchiveStats Prisma model
2. `194d96e` - feat(40-01): create archive stats service
3. `c10db67` - feat(40-01): extend game service with archive mode

## Verification

All verification criteria met:
- ✅ UncoverArchiveStats model exists in schema.prisma
- ✅ Migration created and applied
- ✅ Prisma client regenerated with new type
- ✅ archive-stats-service.ts exports both functions
- ✅ game-service.ts has mode parameter on submitGuess and skipGuess
- ✅ startArchiveSession function exists
- ✅ TypeScript type-check passes
- ✅ Linter passes

## Notes

The separation between daily and archive stats is clean and maintainable. The mode parameter pattern avoids code duplication while keeping the distinction explicit. Ready to proceed with UI and GraphQL layers.
