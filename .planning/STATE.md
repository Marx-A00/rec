# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-01-23)

**Core value:** Admins can fix a broken album in under a minute without touching the database.
**Current focus:** Phase 10 - Manual Edit (In Progress)

## Current Position

Phase: 10 of 12 (Manual Edit)
Plan: 2 of 3 in current phase
Status: In progress
Last activity: 2026-01-28 — Completed 10-02-PLAN.md

Progress: [█████████████████░] 81%

## Performance Metrics

**Velocity:**

- Total plans completed: 29
- Average duration: 3.5min
- Total execution time: 116.2min

**By Phase:**

- Phase 01: 3 plans, 15.3min total, 5.1min avg
- Phase 02: 3 plans, 7.1min total, 2.4min avg
- Phase 03: 3 plans, 14min total, 4.7min avg
- Phase 04: 3 plans, 11min total, 3.7min avg
- Phase 05: 3 plans, 14.6min total, 4.9min avg
- Phase 06: 3 plans, 13.3min total, 4.4min avg
- Phase 07: 3 plans, 7.6min total, 2.5min avg
- Phase 08: 3 plans, 10.8min total, 3.6min avg (complete)
- Phase 09: 3 plans, 17min total, 5.7min avg (complete)
- Phase 10: 2 plans, 5.5min total, 2.75min avg (in progress)

**Recent Trend:**

- Last 5 plans: 09-02 (4min), 09-03 (7min), 10-01 (3min), 10-02 (2.5min)
- Trend: Input components complete, ready for ManualEditView (Plan 10-03)

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
- [05-03]: Prefix client operations to avoid type collisions (SearchCorrectionCandidates, GetCorrectionPreview, ApplyCorrection)
- [06-01]: 1100px modal width for side-by-side comparison layout
- [06-01]: Per-album session storage key pattern for multi-correction support
- [06-01]: Free step navigation (all steps clickable) for admin power users
- [06-02]: 4-level quality badge (Excellent/Good/Fair/Poor) based on DataQuality + external ID completeness
- [06-02]: Track collapse threshold at 30 tracks (shows first 10)
- [06-02]: ID truncation: MusicBrainz 8 chars, Spotify 12 chars with tooltip
- [06-03]: CorrectionModal fetches album data internally via GraphQL
- [06-03]: LOW quality albums show red/orange wrench icon
- [06-03]: Dark zinc color scheme for admin modal components
- [07-02]: MB badge uses smaller 10px text for subtlety
- [07-02]: Score shown as percentage with 'match' suffix
- [07-02]: Results use divide-y for subtle row separation
- [07-03]: Search only triggers on explicit button click (not auto-search on mount)
- [07-03]: Full skeleton replacement during loading per CONTEXT.md
- [07-03]: Auto-trigger search when returning from preview with saved state
- [08-01]: Skeleton mimics final layout with two-column structure
- [08-01]: 5-minute stale time for preview query caching
- [08-01]: Cover art comparison separate from ComparisonLayout
- [08-02]: InlineTextDiff uses green/red backgrounds for added/removed
- [08-02]: FieldComparisonList filters UNCHANGED fields automatically
- [08-03]: Track row styling per change type (color-coded backgrounds)
- [08-03]: Accordion default expansion based on sections with changes
- [08-03]: Change count badges show "(N changes)" in accordion triggers
- [09-01]: UIFieldSelections uses simpler structures than backend (direct booleans, Set for exclusions)
- [09-01]: No per-artist selection UI (artists applied as unit from MusicBrainz)
- [09-01]: Hybrid tracks selection (applyAll boolean + excludedPositions Set)
- [09-02]: Filter preview.fieldDiffs by UIFieldSelections before display (show only selected)
- [09-02]: Apply step itself is confirmation (no separate dialog)
- [09-02]: Empty selection shows amber warning, disables apply button
- [09-02]: Inline error display with expandable stack trace
- [09-03]: Toast shows field count + track count + data quality change
- [09-03]: 1.5s delay before auto-close after Applied! state
- [09-03]: expectedUpdatedAt from previewData.currentAlbum.updatedAt for optimistic locking
- [10-01]: releaseTypeSchema accepts any string (VARCHAR 50) for database flexibility
- [10-01]: RELEASE_TYPES constant provides common options for dropdown UI
- [10-01]: Modal state resets to step 0 when switching between search and manual modes
- [10-01]: StepIndicator uses mode prop to control labels (4 steps for search, 3 for manual)
- [10-02]: Click-to-edit pattern for EditableField reduces visual clutter
- [10-02]: Validate external IDs and dates on blur, not on change (better UX)
- [10-02]: Artist count validated immediately when last artist removed
- [10-02]: Clear button (X) explicitly sets null, not empty string (clearer intent)

### Pending Todos

None yet.

### Blockers/Concerns

- Research flagged: Mobile comparison layout patterns need attention in Phase 8/12
- Multi-admin scenarios not deeply researched (single admin at a time is fine for v1)

## Session Continuity

Last session: 2026-01-28
Stopped at: Completed 10-02-PLAN.md
Resume file: None

## Next Steps

Phase 10 (Manual Edit) in progress. Plan 10-02 complete, ready for Plan 10-03:
- ManualEditView component composing all input components
- Real-time validation feedback using Zod schemas
- Unsaved changes warning when navigating away
- Entry point button in SearchView ("None of these are right, I'll edit manually")
