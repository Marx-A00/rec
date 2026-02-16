---
phase: 39-stats-streaks
plan: 03
subsystem: game-ui
status: complete
tags: [ui, stats, modal, wordle-style]
requires:
  - "39-02: Stats query resolver"
provides:
  - "Post-game stats modal UI"
  - "Guess distribution chart"
affects:
  - "Game completion flow"
tech-stack:
  added: []
  patterns:
    - "CSS-based bar charts (no external chart library)"
    - "Modal auto-show on game end with delay"
    - "Conditional highlighting in distribution"
key-files:
  created:
    - src/components/uncover/GuessDistributionChart.tsx
    - src/components/uncover/StatsModal.tsx
  modified:
    - src/components/uncover/UncoverGame.tsx
decisions: []
metrics:
  tasks_completed: 3/3
  duration: "4 minutes"
  completed: "2026-02-16"
---

# Phase 39 Plan 03: Stats Modal UI Summary

**One-liner:** Wordle-style stats modal with 4-stat grid, horizontal bar distribution chart, auto-shows after game completion

## What Was Built

Created post-game stats modal with Wordle-inspired design:

1. **GuessDistributionChart** - Pure CSS horizontal bars showing wins by attempt count (1-6)
   - No external chart library dependency
   - Dynamic bar widths based on max count
   - Green highlight for today's result
   - Responsive design with proper spacing

2. **StatsModal** - Post-game stats display
   - 4-stat grid: games played, win %, current streak, max streak
   - Flame icon for current streak, Trophy for best streak
   - Fetches data via `useMyUncoverStatsQuery`
   - Only fetches when modal opens (enabled: open)
   - Shows "Loading stats..." and "No stats available" states
   - Dismissable with close button

3. **UncoverGame Integration**
   - Auto-shows stats modal 800ms after game ends (allows reveal animation)
   - Added `showStats` state management
   - "View Stats" button in game-over screen
   - Passes `won` and `attemptCount` props to modal

## Technical Decisions

**Why CSS bars instead of Recharts?**
- Simpler implementation for horizontal bars
- No external dependency
- More reliable styling control
- Matches Wordle's simple bar aesthetic

**Why 800ms delay for auto-show?**
- Allows game-over reveal animation to complete
- Prevents modal from appearing too abruptly
- Gives user moment to see full reveal before stats

**Why conditional fetch (enabled: open)?**
- Avoids unnecessary API calls
- Only fetches stats when user actually sees modal
- Improves performance for game page load

## Verification Results

- [x] `pnpm type-check` passes for all modified files
- [x] `pnpm lint` passes (no new warnings)
- [x] GuessDistributionChart renders with proper bar widths
- [x] StatsModal shows 4-stat grid with icons
- [x] Modal auto-shows after game completion
- [x] View Stats button allows re-opening modal
- [x] Today's result highlighted when won

## Deviations from Plan

None - plan executed exactly as written.

## Dependencies Satisfied

**Requires:**
- 39-02: `useMyUncoverStatsQuery` hook from GraphQL schema
- 39-01: Stats calculation logic (gamesPlayed, winRate, streaks, winDistribution)

**Provides:**
- StatsModal component for post-game display
- GuessDistributionChart reusable component
- Complete stats viewing experience

## Next Phase Readiness

**Ready for:** Phase 40+ (any future enhancements)

**Blockers:** None

**Notes:**
- Stats modal is fully functional and matches Wordle UX
- Distribution chart is reusable if needed elsewhere
- Modal handles all edge cases (loading, no data, won/lost)
- Auto-show behavior is configurable via delay constant

## Performance Impact

- **Positive:** Conditional fetch (only when modal opens)
- **Positive:** Pure CSS charts (no JS rendering)
- **Negligible:** Modal state management overhead

## User Experience Impact

**Improvements:**
- Wordle-familiar stats display reduces learning curve
- Auto-show ensures users see their stats
- Manual re-open button provides control
- Visual streak indicators (flame/trophy) add engagement
- Distribution chart shows performance trends at a glance

## Code Quality

- TypeScript strict types throughout
- Proper component documentation
- Accessible Dialog component from shadcn/ui
- Responsive design with Tailwind utilities
- Clean separation of concerns (chart, modal, game integration)

## Testing Recommendations

1. **Visual Tests:**
   - Stats modal appearance on win
   - Stats modal appearance on loss
   - Distribution chart with various data shapes (empty, full, uneven)
   - Today's result highlight in correct position

2. **Integration Tests:**
   - Modal auto-shows 800ms after game end
   - View Stats button re-opens modal
   - Modal closes on button click
   - Stats query only fires when modal opens

3. **Edge Cases:**
   - New user (no stats data)
   - Loading state during stats fetch
   - Network error handling
   - All-zero distribution (no wins yet)

## Commits

- 93ae8d7: feat(39-03): create GuessDistributionChart component
- ebbb003: feat(39-03): create StatsModal component  
- c6730b7: feat(39-03): integrate StatsModal into UncoverGame
