# Phase 40: Archive Mode - Context

**Gathered:** 2026-02-16
**Status:** Ready for planning

<domain>
## Phase Boundary

Players can access and play past daily puzzles they missed. Calendar-based navigation shows play history with color-coded status. Archive games track separate stats from daily games and never affect streaks. Both desktop and mobile routes supported.

</domain>

<decisions>
## Implementation Decisions

### Archive Navigation
- Calendar grid layout (month view with clickable day cells, like Wordle)
- Goes all the way back to game launch (2026-01-01 epoch)
- Arrow buttons for prev/next month navigation
- Today's date is visible in the calendar but links to the main game page (not archive)
- Days before game epoch don't render (calendar starts at launch date)
- Future dates don't render

### Puzzle Status Display
- Color-coded calendar cells: green = won, red = lost, gray = missed, empty/neutral = not yet played
- Simple green for any win — no intensity variation by guess count
- Clicking a completed day shows read-only review (guesses made, album revealed)
- Clicking an unplayed past day starts the archive game for that date

### Entry Point & Flow
- Calendar icon / button on the main game page (near the game area)
- Archive games load on a separate route: `/game/archive/2026-01-15` (desktop) and `/m/game/archive/2026-01-15` (mobile)
- Follows the established desktop/mobile route pattern
- After finishing an archive puzzle: same post-game screen as daily (stats modal, album reveal) with a "Back to Archive" button added

### Stats Integration
- Archive stats tracked separately from daily stats (not mixed)
- No streak tracking for archive — streaks are daily-only concept
- Stats modal shows archive section below daily stats: archive games played, archive win rate, archive guess distribution
- Post-game screen after archive puzzle shows the same full stats modal (consistent experience)

### Claude's Discretion
- Calendar visual styling and spacing
- Month navigation animation/transitions
- Archive route page layout details
- How to handle the calendar on mobile (compact grid vs full grid)
- Loading states for archive calendar and puzzle loading

</decisions>

<specifics>
## Specific Ideas

- Calendar grid inspired by Wordle's calendar archive — clean month view with day cells
- "Back to Archive" button in post-game to encourage playing more past puzzles
- Read-only review for completed puzzles — player can revisit their results without replaying

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 40-archive-mode*
*Context gathered: 2026-02-16*
