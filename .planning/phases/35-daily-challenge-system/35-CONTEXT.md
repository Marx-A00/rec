# Phase 35: Daily Challenge System - Context

**Gathered:** 2026-02-15
**Status:** Ready for planning

<domain>
## Phase Boundary

One album selected per day, same for all players, with UTC midnight reset. Includes the selection algorithm and a public GraphQL query for the daily challenge. Game state, UI, and player interactions are separate phases.

</domain>

<decisions>
## Implementation Decisions

### Overall Approach
- Keep it simple — focus on getting the game working, not on scheduling infrastructure
- Admin pre-curates a large ordered list of albums for daily challenges upfront
- No BullMQ scheduler needed for now — deterministic selection from the curated list
- Challenge row created on-demand (first request of the day) if it doesn't exist yet

### Selection Algorithm
- Deterministic mapping from date → album in the curated list (e.g., day index into the ordered list)
- Admin override — admin can pin a specific album to a specific day
- Pinned albums still count as "used" in the sequence

### Repeat Policy
- Cycle through the entire curated list before any album repeats
- Same-artist spacing: minimum 14 days between albums by the same artist
- Decade diversity: soft rule — avoid same decade two days in a row, but allow it if pool is limited
- These rules apply when building/ordering the curated list, not at selection time (selection is just "next in list")

### Challenge Query
- Expose a `dailyChallenge(date)` GraphQL query that returns challenge info but NOT the answer
- Admin can view and modify upcoming challenges (reorder the curated list)

### Claude's Discretion
- Exact deterministic mapping implementation (date offset, modular index, etc.)
- How on-demand creation handles edge cases (race conditions, etc.)
- Admin UI for managing the curated challenge order

</decisions>

<specifics>
## Specific Ideas

- Pre-curate a big batch of albums so the system is good for a while without maintenance
- Think Wordle — dead simple daily selection, no fancy algorithms needed
- The game experience matters more than the selection infrastructure right now

</specifics>

<deferred>
## Deferred Ideas

- BullMQ scheduler for pre-generating challenges — add when scale warrants it
- Admin pool health warnings (minimum pool size alerts) — not needed with pre-curated list
- Weighted random selection (freshness + popularity balancing) — overkill for now
- Pre-generation buffer (3-7 days ahead) — unnecessary with deterministic list approach

</deferred>

---

*Phase: 35-daily-challenge-system*
*Context gathered: 2026-02-15*
