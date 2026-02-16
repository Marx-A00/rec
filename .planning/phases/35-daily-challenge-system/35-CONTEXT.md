# Phase 35: Daily Challenge System - Context

**Gathered:** 2026-02-15
**Status:** Ready for planning

<domain>
## Phase Boundary

One album selected per day, same for all players, with UTC midnight reset. Includes the selection algorithm, BullMQ scheduling, and a public GraphQL query for the daily challenge. Game state, UI, and player interactions are separate phases.

</domain>

<decisions>
## Implementation Decisions

### Selection Algorithm
- Weighted random selection balancing freshness (time since last used) and popularity equally
- Deterministic via seeded PRNG — same date + same pool state = same result (for debugging)
- Admin override — admin can pin a specific album to a specific day
- Pinned albums still go on cooldown like any algorithmically selected album

### Scheduling & Creation
- Pre-generated via BullMQ repeatable job (runs before UTC midnight)
- On-demand fallback — if no challenge exists when a player loads the game, create it on the fly
- Buffer of 3-7 days of future challenges pre-generated for resilience
- Admin can view and modify upcoming pre-generated challenges

### Challenge Lifecycle
- If pool is too small to fill buffer, generate what's possible and warn admin
- Minimum healthy pool size: 30 albums (below this triggers admin warning)
- If an album is removed from the pool after being assigned to a future challenge, automatically replace it with a new selection
- Expose a `dailyChallenge(date)` GraphQL query that returns challenge info but NOT the answer

### Repeat Policy
- Cycle through the entire pool before any album can repeat
- Same-artist spacing: minimum 14 days between albums by the same artist
- Decade diversity: soft rule — avoid same decade two days in a row, but allow it if pool is limited

### Claude's Discretion
- Exact weighting formula for freshness vs popularity balance
- PRNG seed implementation details
- BullMQ job scheduling time (how far before midnight)
- Admin warning mechanism (email, in-app notification, dashboard indicator)
- How the on-demand fallback integrates with the deterministic algorithm

</decisions>

<specifics>
## Specific Ideas

- Selection should feel like Wordle's approach — deterministic and reproducible, but with smarter weighting instead of pure sequence
- Admin override is for special occasions (e.g., featuring an album on its anniversary)
- The system should be robust enough to survive worker crashes without players noticing

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 35-daily-challenge-system*
*Context gathered: 2026-02-15*
