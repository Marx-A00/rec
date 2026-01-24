# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-01-23)

**Core value:** Admins can fix a broken album in under a minute without touching the database.
**Current focus:** Phase 5 - GraphQL Integration (IN PROGRESS)

## Current Position

Phase: 5 of 12 (GraphQL Integration)
Plan: 2 of 3 in current phase
Status: In progress
Last activity: 2026-01-24 — Completed 05-02-PLAN.md

Progress: [████████░░] 38%

## Performance Metrics

**Velocity:**

- Total plans completed: 14
- Average duration: 3.7min
- Total execution time: 59.1min

**By Phase:**

| Phase | Plans | Total   | Avg/Plan |
| ----- | ----- | ------- | -------- |
| 01    | 3     | 15.3min | 5.1min   |
| 02    | 3     | 7.1min  | 2.4min   |
| 03    | 3     | 14min   | 4.7min   |
| 04    | 3     | 11min   | 3.7min   |
| 05    | 2     | 11.7min | 5.9min   |

**Recent Trend:**

- Last 5 plans: 04-01 (2.8min), 04-02 (2.2min), 04-03 (6min), 05-01 (5.2min), 05-02 (6.5min)
- Trend: Consistent execution times, resolver wiring slightly longer due to type transformations

*Updated after each plan completion*

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting current work:

- [Roadmap]: MusicBrainz only for v1 (Discogs/Spotify deferred)
- [Roadmap]: Session-only state (no DB persistence for correction queue)
- [Roadmap]: Service layer before UI (thin resolver pattern)
- [01-01]: Priority values ADMIN=1, USER=5, ENRICHMENT=8, BACKGROUND=10
- [01-02]: Verification wrapper pattern - generic MbidVerificationResult<T> preserves original data
- [01-03]: Seven error codes for categorization (RATE_LIMITED, NOT_FOUND, INVALID_MBID, NETWORK_ERROR, TIMEOUT, SERVICE_ERROR, UNKNOWN)
- [02-01]: Cover Art Archive URL always computed, UI handles 404 gracefully
- [02-02]: Scoring weights - title:40, artist:40, year:10, mbScore:10 for weighted strategy
- [02-02]: Tier thresholds - high:-1000, medium:-3000, low:-5000 fuzzysort scores
- [02-02]: Default low-confidence threshold 0.5
- [02-03]: Type priority sorting - Album:1 > EP:2 > Single:3 for group ordering
- [03-01]: Five-state change classification (ADDED, MODIFIED, REMOVED, CONFLICT, UNCHANGED)
- [03-01]: NFD Unicode normalization for semantic comparison ("Café" = "Cafe")
- [03-02]: Adaptive text diff - char-level for <100 chars, word-level for longer
- [03-03]: Preview fetches full MB release via queue with ADMIN priority
- [04-01]: Track matching strategy - position-first, similarity-fallback (threshold 0.8)
- [04-01]: Five field selection groups (metadata, artists, tracks, externalIds, coverArt)
- [04-02]: Conditional update objects - undefined fields mean no change in Prisma
- [04-02]: Cover art three-way choice (use_source, keep_current, clear)
- [04-02]: Track selection by database ID, not position
- [04-03]: Admin corrections always HIGH data quality
- [04-03]: Audit logging AFTER transaction (failure doesn't roll back)
- [04-03]: Serializable isolation level for transactions
- [05-01]: JSON scalar for fieldDiffs union type (flexibility over complexity)
- [05-02]: Strategy enum mapping via explicit switch statements
- [05-02]: Preview generated on-demand in correctionApply (not passed from client)

### Pending Todos

None yet.

### Blockers/Concerns

- Research flagged: Mobile comparison layout patterns need attention in Phase 8/12
- Multi-admin scenarios not deeply researched (single admin at a time is fine for v1)

## Session Continuity

Last session: 2026-01-24
Stopped at: Completed 05-02-PLAN.md
Resume file: None

## Next Steps

Continue Phase 5 (GraphQL Integration):
- 05-03: Wire up final integration and verify end-to-end
