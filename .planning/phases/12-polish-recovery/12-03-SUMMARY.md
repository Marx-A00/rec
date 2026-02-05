---
phase: 12
plan: 03
subsystem: correction-enrichment
tags: [admin, correction, enrichment, UX]
requires: [12-01, 12-02]
provides:
  - re-enrichment-checkbox-album
  - re-enrichment-checkbox-artist
affects: []
tech-stack:
  added: []
  patterns:
    - checkbox-trigger-mutation
    - optional-post-action
decisions:
  - id: D12-03-1
    choice: Enrichment checkbox unchecked by default
    rationale: Avoid unnecessary API load, user opts in when needed
  - id: D12-03-2
    choice: Enrichment failure doesn't block correction success
    rationale: Correction is the primary action, enrichment is optional enhancement
  - id: D12-03-3
    choice: Pass enrichment flag via onApply callback
    rationale: Keeps ApplyView stateless, parent handles side effects
key-files:
  created: []
  modified:
    - src/components/admin/correction/apply/ApplyView.tsx
    - src/components/admin/correction/CorrectionModal.tsx
    - src/components/admin/correction/artist/apply/ArtistApplyView.tsx
    - src/components/admin/correction/artist/ArtistCorrectionModal.tsx
metrics:
  duration: 12min
  completed: 2026-02-03
---

# Phase 12 Plan 03: Re-enrichment Checkbox Summary

**One-liner:** Add optional "Re-enrich after correction" checkbox to both album and artist apply views with HIGH priority queue integration

## What Was Built

Added re-enrichment checkbox to correction apply flows that triggers MusicBrainz enrichment after successful correction.

**Key features:**

- Checkbox in both album and artist ApplyView components
- Integrated with existing enrichment mutation hooks (useTriggerAlbumEnrichmentMutation, useTriggerArtistEnrichmentMutation)
- HIGH priority enrichment queue (gets processed before normal enrichment jobs)
- Success toast shows "Enrichment queued" when checkbox is checked
- Enrichment failure logged but doesn't block correction success

## Implementation Details

**Pattern used:**

1. ApplyView checkbox passes boolean flag via onApply callback
2. Parent modal stores flag in state (setShouldEnrich)
3. onSuccess handler checks flag and triggers enrichment mutation
4. Enrichment mutation has its own success/error handlers

**Album flow:**

- ApplyView: Added Checkbox component + triggerEnrichment state
- CorrectionModal: Added shouldEnrich state + enrichMutation + onSuccess enrichment trigger
- Modified handleApply to accept optional triggerEnrichment parameter

**Artist flow:**

- ArtistApplyView: Added Checkbox component + triggerEnrichment state
- ArtistCorrectionModal: Added shouldEnrich state + enrichMutation + onSuccess enrichment trigger
- Modified handleApply to accept optional triggerEnrichment parameter

## Deviations from Plan

None - plan executed exactly as written.

**Note:** Task 1 (album ApplyView) was already completed in a previous session/commit (07baa49). This execution completed Task 2 (artist ApplyView).

## Testing Notes

**Manual verification required:**

1. Open correction modal for an album
2. Complete search → preview → apply flow
3. Check enrichment checkbox before clicking "Confirm & Apply"
4. Verify "Enrichment queued" toast appears after correction succeeds
5. Check admin panel to verify enrichment job was queued with HIGH priority
6. Repeat for artist correction flow

**Edge cases:**

- Enrichment mutation failure: Logged to console, no user-visible error (correction already succeeded)
- Unchecked checkbox: No enrichment triggered (default behavior)

## Technical Decisions Made

**Checkbox default state: Unchecked**

- Avoids unnecessary API load on MusicBrainz
- Most corrections don't need immediate re-enrichment
- User explicitly opts in when they want fresh data

**Enrichment priority: HIGH**

- User explicitly requested it
- Should process before automatic/background enrichment
- Still subject to rate limiting (1 req/sec to MusicBrainz)

**Error handling: Silent failure**

- Correction is primary action (already succeeded)
- Enrichment is bonus enhancement
- Log error but don't show toast (avoid confusion)

**State management: Parent stores preference**

- ApplyView passes flag via callback (stateless component)
- Parent modal stores flag until onSuccess fires
- Clean separation of concerns

## Next Phase Readiness

**Blockers:** None

**Concerns:** None

**Recommendations:**

- Consider adding enrichment status indicator to show when job completes
- Could add tooltip explaining what "re-enrich" does for users
- May want to track enrichment success rate in metrics

## Commits

- 22028f5: chore(12-04): clean up backup files (pre-existing)
- 07baa49: feat(12-04): add keyboard shortcuts (included Task 1 changes)
- 0f6f072: feat(12-03): add re-enrichment checkbox to artist ApplyView

## Files Changed

**Modified (4 files):**

1. `src/components/admin/correction/apply/ApplyView.tsx`
   - Added Checkbox import
   - Added triggerEnrichment state (unchecked by default)
   - Added checkbox UI below empty selection warning
   - Modified handleApply to pass triggerEnrichment to onApply callback
   - Updated onApply prop signature to accept optional triggerEnrichment parameter

2. `src/components/admin/correction/CorrectionModal.tsx`
   - Added useTriggerAlbumEnrichmentMutation and EnrichmentPriority imports
   - Added shouldEnrich state
   - Added enrichMutation hook
   - Modified handleApply to accept and store triggerEnrichment parameter
   - Added enrichment logic to applyMutation onSuccess handler

3. `src/components/admin/correction/artist/apply/ArtistApplyView.tsx`
   - Added Checkbox import
   - Added triggerEnrichment state (unchecked by default)
   - Added checkbox UI below empty selection warning
   - Modified handleApply to pass triggerEnrichment to onApply callback
   - Updated onApply prop signature to accept optional triggerEnrichment parameter

4. `src/components/admin/correction/artist/ArtistCorrectionModal.tsx`
   - Added useTriggerArtistEnrichmentMutation and EnrichmentPriority imports
   - Added shouldEnrich state
   - Added enrichMutation hook
   - Modified handleApply to accept and store triggerEnrichment parameter
   - Added enrichment logic to applyMutation onSuccess handler
