# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-04)

**Core value:** Admins can fix a broken album in under a minute without touching the database.
**Current focus:** Milestone v1.1 — Zustand Correction Modal Refactor

## Current Position

Phase: 13 of 14 (Album Correction Store)
Plan: 2 of 3 (CorrectionModal and SearchView migrated)
Status: In progress
Last activity: 2026-02-04 — Completed 13-02-PLAN.md (CorrectionModal and SearchView migrated to Zustand)

Progress: [██░░░░░░░░░░░░░░░░░░░░░░░░░░░] 2/5 plans (40%)

## Performance Metrics

**Milestone v1.0 (Completed 2026-02-03):**

- Phases: 12
- Plans: 37
- Duration: 11 days (2026-01-23 to 2026-02-03)
- Requirements covered: 35/35

**Milestone v1.1 (In Progress):**

- Phases: 2 (13-14)
- Plans: 5 (1 complete, 4 remaining)
- Requirements: 30/30 mapped
- Estimated duration: 2-3 days (focused refactor)
- Current velocity: 1 plan per 2 minutes

## Accumulated Context

### Decisions

**v1.0 Carried Forward:**

- MusicBrainz only for v1 (Discogs/Spotify deferred)
- Session-only state (no DB persistence for correction queue)
- Thin resolver pattern — all business logic in services

**v1.1 New Decisions:**

- Separate stores for album and artist (different state shapes: dual mode vs search-only)
- Accept one-time sessionStorage format reset on migration (admin-only, corrections are short-lived)
- pendingAction (closure) excluded from persistence — not serializable
- ManualEditView internal form state stays local (formState, errors, showValidationBanner)
- StepIndicator stays prop-driven (reused by both modals, no store needed)

**Plan 13-01 Decisions:**

**Plan 13-02 Decisions:**
- **ACHILD-01:** SearchView props reduced to album-only (all search state in store)
- **AMODAL-03:** Mutation callbacks remain in CorrectionModal (orchestrate toast + store + queryClient)
- **CLEAN-04:** StepIndicator stays prop-driven (reusable across modals, no store dependency)

- **STORE-PERSIST:** Only 6 fields persist to sessionStorage (step, mode, searchQuery, searchOffset, selectedMbid, manualEditState); 7 transient fields excluded (previewData, applySelections, manualPreviewData, shouldEnrich, showAppliedState, pendingAction, showUnsavedDialog)
- **STORE-FACTORY:** Factory pattern with Map cache instead of singleton for better encapsulation and cleanup
- **ATOMIC-ACTIONS:** Multi-field updates in single set() call (selectResult, setPreviewLoaded, confirmUnsavedDiscard) to prevent intermediate states

### Pending Todos

**Phase 13 (In Progress):**

1. ✅ Create useCorrectionStore with persist middleware (sessionStorage keyed by albumId)
2. ✅ Refactor CorrectionModal to initialize/reset store on open/close
3. ⏳ Refactor SearchView (✅), PreviewView, ApplyView, ManualEditView to read from store
4. ⏳ Delete useCorrectionModalState.ts after verifying zero imports

**Phase 14:**

1. Create useArtistCorrectionStore (simpler than album — no dual mode)
2. Refactor ArtistCorrectionModal and child components
3. Delete useArtistCorrectionModalState.ts

### Blockers/Concerns

None. Zustand already in codebase (v5.0.8), patterns established. Store creation passed type checking with zero errors.

## Session Continuity

Last session: 2026-02-04 19:58 UTC
Stopped at: Completed 13-02-PLAN.md (CorrectionModal and SearchView migrated)
Resume file: .planning/phases/13-album-correction-store/13-03-PLAN.md (next)

**Next action:** Execute Phase 13 Plan 2 (refactor CorrectionModal to use store)

**Store readiness:**

- `src/stores/useCorrectionStore.ts` created (478 lines)
- Zero consumers yet (ready for Plan 02)
- Export verification complete (11 exports)
- Type checking passes
