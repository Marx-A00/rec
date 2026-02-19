# Phase 39: Stats & Streaks - Context

**Gathered:** 2026-02-16
**Status:** Ready for planning

<domain>
## Phase Boundary

Track player statistics (games played, win rate, streaks, guess distribution) with database persistence via the existing PlayerGameStats model. Stats sync across devices for logged-in users. Display stats after each game. No sharing functionality in this phase.

</domain>

<decisions>
## Implementation Decisions

### Streak definitions
- Two separate streaks tracked: **play streak** (consecutive days played, win or lose) and **win streak** (consecutive days won)
- Max versions of both streaks tracked (best play streak ever, best win streak ever)
- Streak resets at UTC midnight, matching the daily challenge reset
- Missing a day resets the relevant streak to zero (no grace period)

### Stats computation
- Running totals approach: update PlayerGameStats row after each game completes
- Do not recalculate from game history on each read (fast reads over perfect accuracy)
- Stats updated atomically when game ends (win or loss)

### Claude's Discretion
- Post-game stats display format (modal, inline, or page transition)
- Guess distribution chart style (horizontal bars, text list, etc.)
- Animation and timing of stats appearance
- Visual design and layout of stats components
- Whether to highlight today's result in the distribution

</decisions>

<specifics>
## Specific Ideas

No specific requirements — open to standard approaches. User is not concerned about stats display details at this stage; focus on getting the data layer right.

</specifics>

<deferred>
## Deferred Ideas

- Stats sharing (Wordle-style emoji grid or text summary) — future phase or backlog item

</deferred>

---

*Phase: 39-stats-streaks*
*Context gathered: 2026-02-16*
