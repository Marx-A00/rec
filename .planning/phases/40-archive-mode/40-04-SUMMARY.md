---
phase: 40-archive-mode
plan: 04
subsystem: ui
tags: [archive, game, stats, modal, hooks]
requires:
  - phase: 40-02
    provides: GraphQL hooks for archive operations
  - phase: 40-03
    provides: Archive routes and calendar component
provides:
  - ArchiveGame component for playing past puzzles
  - useArchiveGame hook with archive session management
  - Updated StatsModal with archive stats section
  - Archive entry points on main game pages
affects: []
tech-stack:
  added: []
  patterns: [mode-aware game hook, combined daily+archive stats display, session invalidation on completion]
key-files:
  created:
    - src/components/uncover/ArchiveGame.tsx
    - src/hooks/useArchiveGame.ts
  modified:
    - src/components/uncover/StatsModal.tsx
    - src/components/uncover/UncoverGame.tsx
    - src/app/(main)/game/archive/[date]/page.tsx
    - src/app/m/game/archive/[date]/page.tsx
    - src/app/m/game/MobileGameClient.tsx
key-decisions: []
patterns-established: []
duration: 6min
completed: 2026-02-17
---

# Phase 40 Plan 04: Archive Game UI Summary

**One-liner:** Archive game component with session management, combined stats display, and calendar integration

## What Was Built

**useArchiveGame Hook:**
- Coordination hook for archive game sessions
- Takes challengeDate parameter (not "today")
- Uses useStartArchiveSessionMutation with date
- Invalidates MyUncoverSessions query on game completion (updates calendar)
- Same return shape as useUncoverGame for consistency

**ArchiveGame Component:**
- Client component for playing past challenges
- Shows formatted date in header (e.g., "January 5, 2026")
- Back to Calendar navigation button
- Auto-starts archive session on mount
- Auto-shows stats modal 800ms after completion
- Passes mode='archive' to StatsModal
- Desktop and mobile variants via mobile prop

**StatsModal Updates:**
- Add mode prop: 'daily' | 'archive' (default: 'daily')
- Fetch archive stats alongside daily stats
- Show archive section only when gamesPlayed > 0
- Archive section: 3 columns (Played, Win %, Wins) - no streaks
- Separate GuessDistributionChart for archive wins
- Highlight current attempt in correct chart based on mode
- Different closing message based on mode

**Route Integration:**
- Desktop: /game/archive/[date] renders ArchiveGame
- Mobile: /m/game/archive/[date] renders ArchiveGame
- Both maintain date validation (>= GAME_EPOCH, < today)
- Pass mobile={true/false} appropriately

**Entry Points:**
- Desktop game: Archive link below header with CalendarDays icon
- Mobile game: Archive link below header with CalendarDays icon
- Subtle styling (text-muted-foreground)
- Client-side navigation via Next.js Link

## How It Works

**Archive Session Flow:**

1. User selects date from calendar → /game/archive/2026-01-05
2. ArchiveGame mounts, useArchiveGame hook initializes
3. Hook calls startArchiveSession mutation with date
4. Backend creates/resumes UncoverSession for that challenge
5. Session state synced to Zustand store (same as daily game)
6. Player makes guesses via AlbumGuessInput
7. On game completion: invalidate MyUncoverSessions query
8. Calendar updates to show date as completed (won/lost)
9. Stats modal shows with mode='archive', highlights attempt count

**Stats Display:**

Daily section:
- Games Played, Win %, Current Streak, Max Streak
- Guess distribution (1-6 attempts)
- Highlight current attempt if mode='daily' and won

Archive section (only if gamesPlayed > 0):
- Games Played, Win %, Wins (no streaks)
- Guess distribution (1-6 attempts)
- Highlight current attempt if mode='archive' and won

**Query Invalidation:**

On archive game completion (win or loss):
```typescript
queryClient.invalidateQueries({
  queryKey: useMyUncoverSessionsQuery.getKey(),
});
```

This triggers calendar refetch, updating status dots immediately.

## Code Patterns

**useArchiveGame Hook Structure:**
```typescript
export function useArchiveGame(challengeDate: Date) {
  const gameStore = useUncoverGameStore();
  const queryClient = useQueryClient();
  
  const startMutation = useStartArchiveSessionMutation();
  
  const startGame = useCallback(async () => {
    const result = await startMutation.mutateAsync({
      date: challengeDate, // Date object, not string
    });
    // ... sync to store
  }, [challengeDate]);
  
  const submitGuess = useCallback(async (...) => {
    // ... on gameOver:
    queryClient.invalidateQueries({
      queryKey: useMyUncoverSessionsQuery.getKey(),
    });
  }, [gameStore, submitMutation, queryClient]);
  
  return { /* same API as useUncoverGame */ };
}
```

**ArchiveGame Component:**
```typescript
<ArchiveGame challengeDate={normalizedDate} mobile={false} />
```

**StatsModal Mode Handling:**
```typescript
<StatsModal
  mode='archive'
  won={game.won}
  attemptCount={game.attemptCount}
  // ...
/>

// Inside StatsModal:
const { data: dailyData } = useMyUncoverStatsQuery({}, { enabled: open });
const { data: archiveData } = useMyArchiveStatsQuery({}, { enabled: open });

// Highlight in distribution:
todayAttempts={mode === 'archive' && won ? attemptCount : null}
```

## Verification Steps

1. Type check: `pnpm type-check` → PASS
2. Lint: `pnpm lint` → PASS (no new warnings)
3. Archive route accessible: /game/archive/2026-01-05
4. useArchiveGame hook uses startArchiveSession mutation
5. StatsModal fetches both daily and archive stats
6. Archive section only shows if gamesPlayed > 0
7. Entry points visible on main game pages

## Next Phase Readiness

**Phase 41 (Music Discovery):**
- Archive mode complete
- All game states functional (daily + archive)
- Stats tracking separated correctly
- Ready for music discovery features

**Deviations from Plan:** None

**Blockers:** None

**Technical Debt:** None

---

*Completed: 2026-02-17*
*Duration: 6 minutes*
