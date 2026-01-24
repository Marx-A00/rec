# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-01-23)

**Core value:** Admins can fix a broken album in under a minute without touching the database.
**Current focus:** Phase 3 - Preview Service

## Current Position

Phase: 3 of 12 (Preview Service)
Plan: 3 of 3 complete (Preview Service phase complete)
Status: Phase complete - ready for Phase 4

Progress: [████░░░░░░] 19%

## Accumulated Context

### Decisions

- [Roadmap]: MusicBrainz only for v1 (Discogs/Spotify deferred)
- [Roadmap]: Session-only state (no DB persistence for correction queue)
- [Roadmap]: Service layer before UI (thin resolver pattern)
- [01-01]: Priority values ADMIN=1, USER=5, ENRICHMENT=8, BACKGROUND=10
- [01-02]: Verification wrapper pattern - generic MbidVerificationResult<T> preserves original data
- [01-03]: Seven error codes for categorization
- [02-01]: Cover Art Archive URL always computed, UI handles 404 gracefully
- [02-02]: Scoring weights - title:40, artist:40, year:10, mbScore:10
- [02-02]: Tier thresholds - high:-1000, medium:-3000, low:-5000
- [02-03]: Type priority sorting - Album:1 > EP:2 > Single:3
- [03-01]: Five-state change classification (ADDED, MODIFIED, REMOVED, CONFLICT, UNCHANGED)
- [03-01]: NFD Unicode normalization for semantic comparison
- [03-02]: 100-char threshold for character vs word diff
- [03-02]: Position-based track alignment for multi-disc albums
- [03-03]: Three-parameter preview design (albumId, searchResult, releaseMbid)
- [03-03]: ADMIN priority tier for preview MusicBrainz calls

### Blockers/Concerns

- Research flagged: Mobile comparison layout patterns need attention in Phase 8/12

## Session Continuity

Last session: 2026-01-23
Stopped at: Completed 03-03-PLAN.md (Phase 3 complete)
Resume file: None
