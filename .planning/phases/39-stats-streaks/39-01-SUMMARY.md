---
phase: 39-stats-streaks
plan: 01
subsystem: game-stats
tags: [stats, streaks, game-service, utc]

requires:
  - "37-game-state-logic (game service layer)"
  - "Phase 33 (UncoverPlayerStats schema)"

provides:
  - "Stats service with UTC-aware streak logic"
  - "Game service stats integration"
  - "Idempotent stats updates"

affects:
  - "39-02 (GraphQL stats queries will use getPlayerStats)"
  - "39-03 (Leaderboard will query currentStreak/maxStreak)"

tech-stack:
  added: []
  patterns:
    - "UTC date normalization for timezone consistency"
    - "Idempotent updates with same-day check"
    - "Denormalized stats with upsert pattern"

key-files:
  created:
    - src/lib/uncover/stats-service.ts
  modified:
    - src/lib/uncover/game-service.ts

decisions:
  - id: STATS-UTC-MIDNIGHT
    choice: "Use UTC midnight for date normalization"
    rationale: "Consistent daily reset across all timezones"
    alternatives: ["User timezone", "Server timezone"]
    
  - id: STATS-IDEMPOTENT
    choice: "Check lastPlayedDate before updating"
    rationale: "Prevent duplicate stats if submitGuess called multiple times"
    alternatives: ["Database constraints", "Transaction isolation"]
    
  - id: STATS-STREAK-RESET
    choice: "Reset streak to 0 on loss, 1 on non-consecutive win"
    rationale: "Clear streak rules matching daily game UX expectations"
    alternatives: ["Maintain streak on loss", "Grace period"]

metrics:
  duration: "3 minutes"
  completed: "2026-02-16"
  tasks: 2
  commits: 3
---

# Phase 39 Plan 01: Stats Service & Game Integration Summary

**One-liner:** UTC-aware stats service with streak calculation, integrated into game service on game completion.

## What Was Built

Created stats service layer to handle player statistics updates when Uncover games complete. Implemented UTC date normalization for consistent daily reset across timezones, streak calculation logic, and idempotent updates to prevent duplicates.

### Stats Service Features

**UTC Date Helpers:**
- `toUTCMidnight(date)` - Normalizes dates to UTC midnight
- `isConsecutiveDay(lastPlayed, challengeDate)` - Checks if dates are exactly 1 day apart
- `isSameDay(date1, date2)` - Prevents duplicate updates

**Stats Update Logic:**
- Fetch existing stats for user
- Early return if already updated for this challenge date (idempotent)
- Calculate streak:
  - Win + consecutive day: increment currentStreak
  - Win + NOT consecutive: reset to 1
  - Loss: reset to 0
- Update maxStreak if currentStreak exceeds it
- Update winDistribution array (index = attemptCount - 1) for wins
- Upsert stats with increments for gamesPlayed, gamesWon, totalAttempts

**Stats Retrieval:**
- `getPlayerStats(userId)` - Returns stats with calculated winRate
- Returns zeros if no stats exist yet

### Game Service Integration

Modified game service to call `updatePlayerStats` when game ends:

**In `submitGuess` function:**
- After session update, before challenge stats update
- Passes `userId`, `won: isCorrect`, `attemptCount`, `challengeDate`

**In `skipGuess` function:**
- After session update
- Passes `userId`, `won: false`, `attemptCount`, `challengeDate`

Both integrations check `gameResult.gameOver` before calling stats update.

## Deviations from Plan

None - plan executed exactly as written.

## Technical Implementation

### Streak Calculation Logic

```typescript
// Calculate streak
let currentStreak = 0;
if (won) {
  if (isConsecutiveDay(existingStats.lastPlayedDate, challengeDate)) {
    // Consecutive day win - increment streak
    currentStreak = existingStats.currentStreak + 1;
  } else {
    // First win or non-consecutive - reset to 1
    currentStreak = 1;
  }
}
// If lost, currentStreak stays 0
```

### Idempotent Updates

```typescript
// Prevent duplicate updates for same-day games
if (existingStats && isSameDay(existingStats.lastPlayedDate, challengeDate)) {
  return; // Already updated for this challenge date
}
```

### Win Distribution Tracking

```typescript
// Update win distribution if won and attemptCount is valid (1-6)
const winDistribution = existingStats
  ? [...existingStats.winDistribution]
  : [0, 0, 0, 0, 0, 0];

if (won && attemptCount >= 1 && attemptCount <= 6) {
  const index = attemptCount - 1;
  winDistribution[index] = (winDistribution[index] || 0) + 1;
}
```

## Files Changed

**Created:**
- `src/lib/uncover/stats-service.ts` (202 lines)
  - UTC date helpers (toUTCMidnight, isConsecutiveDay, isSameDay)
  - updatePlayerStats with streak logic and upsert
  - getPlayerStats with winRate calculation

**Modified:**
- `src/lib/uncover/game-service.ts`
  - Added stats-service import
  - Added stats update in submitGuess (after session update)
  - Added stats update in skipGuess (after session update)

## Testing Notes

### Manual Test Plan

1. **Initial game completion:**
   - Complete first game
   - Verify stats created with gamesPlayed=1, appropriate streak

2. **Consecutive day streak:**
   - Complete game on day 1 (win)
   - Complete game on day 2 (win)
   - Verify currentStreak=2

3. **Streak break:**
   - Have active streak
   - Lose a game
   - Verify currentStreak=0

4. **Idempotent updates:**
   - Complete game
   - Call submitGuess again for same session (should fail validation)
   - Verify stats not duplicated

5. **Win distribution:**
   - Win on attempt 1
   - Verify winDistribution[0] incremented
   - Win on attempt 3
   - Verify winDistribution[2] incremented

### Type Safety

- All functions use proper TypeScript types
- No `any` types used
- Exports match plan specification (UpdateStatsInput, PlayerStats interfaces)

## Decisions Made

**1. UTC Midnight Normalization (STATS-UTC-MIDNIGHT)**
- **Decision:** Normalize all dates to UTC midnight before comparison
- **Rationale:** Ensures consistent daily reset across all timezones. A player in California and a player in Tokyo both get the same "day" boundary.
- **Implementation:** `toUTCMidnight()` sets hours/minutes/seconds to 0 in UTC

**2. Idempotent Same-Day Check (STATS-IDEMPOTENT)**
- **Decision:** Check `lastPlayedDate` matches `challengeDate` before updating
- **Rationale:** Prevents duplicate stats if somehow a game completion fires twice
- **Implementation:** `isSameDay()` comparison before upsert

**3. Streak Reset Rules (STATS-STREAK-RESET)**
- **Decision:** Loss = 0, non-consecutive win = 1, consecutive win = increment
- **Rationale:** Matches user expectations for daily games (Wordle pattern)
- **Implementation:** Conditional logic based on `won` and `isConsecutiveDay()`

## Next Phase Readiness

**Ready for:**
- 39-02: GraphQL stats queries (can now call `getPlayerStats()`)
- 39-03: Leaderboard implementation (currentStreak and maxStreak tracked)

**Provides:**
- Stats service layer ready for GraphQL integration
- Game completion triggers stats updates automatically

**No blockers for next plans.**

## Task Breakdown

**Task 1: Create stats-service.ts**
- Status: Complete
- Commit: 754fe25
- Files: src/lib/uncover/stats-service.ts

**Task 2: Integrate stats into game-service.ts**
- Status: Complete
- Commit: 4fdb342
- Files: src/lib/uncover/game-service.ts

**Lint Fixes**
- Commit: 345309e
- Fixed import order, formatting

## Validation

- TypeScript compilation: PASS
- Lint: PASS (after auto-fix)
- Exports verified: updatePlayerStats, getPlayerStats
- Game service imports verified
- Stats update calls added in submitGuess and skipGuess

---

**Stats service ready for GraphQL queries and leaderboard implementation.**
