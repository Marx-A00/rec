---
phase: 08-preview-ui
plan: 03
subsystem: admin-correction-ui
tags: [react, track-comparison, cover-art, accordion, preview]
dependency-graph:
  requires: [08-01, 08-02]
  provides: [complete-preview-step, track-comparison, cover-art-comparison, modal-integration]
  affects: [09-apply-ui]
tech-stack:
  added: []
  patterns: [accordion-sections, inline-diff, position-aligned-comparison]
key-files:
  created:
    - src/components/admin/correction/preview/TrackComparison.tsx
    - src/components/admin/correction/preview/CoverArtComparison.tsx
  modified:
    - src/components/admin/correction/preview/PreviewView.tsx
    - src/components/admin/correction/preview/index.ts
    - src/components/admin/correction/CorrectionModal.tsx
decisions:
  - id: "08-03-01"
    title: "Track row styling per change type"
    choice: "Color-coded backgrounds and text per changeType"
    rationale: "MATCH=neutral, MODIFIED=yellow bg, ADDED=green bg, REMOVED=red bg with opacity"
  - id: "08-03-02"
    title: "Accordion default expansion"
    choice: "Expand sections with changes, collapse unchanged"
    rationale: "Focuses admin attention on what matters"
  - id: "08-03-03"
    title: "Change count badges"
    choice: "Show '(N changes)' in yellow next to section titles"
    rationale: "Quick visual indication of work needed per section"
metrics:
  duration: "5m 35s"
  completed: "2026-01-26"
---

# Phase 8 Plan 3: Track/Cover Art Comparison and Modal Integration Summary

Complete preview UI with track comparison, cover art, and modal integration.

## What Was Built

### TrackComparison Component (305 lines)
Position-aligned track listing with diff highlighting:
- Summary header with matching/modified/added/removed counts
- Two-column grid: current track | source track
- Color-coded rows per changeType:
  - MATCH: neutral zinc styling
  - MODIFIED: yellow background, InlineTextDiff for titles
  - ADDED: green text, left side shows "—"
  - REMOVED: red text with opacity, right side shows "—"
- Auto-collapse for 30+ tracks (shows first 10)
- Multi-disc support with disc.track position display
- Duration formatting to mm:ss

### CoverArtComparison Component (115 lines)
Side-by-side cover art display:
- Current: AlbumImage with Cloudflare support
- Source: Next/Image for CAA URLs
- Change badge below images:
  - ADDED: "New cover art available" (green)
  - MODIFIED: "Cover art differs" (yellow)
  - REMOVED: "Cover art would be removed" (red)
- 128x128 thumbnails with placeholder fallback

### PreviewView Update (242 lines)
Complete preview with all sections:
- Summary change counts bar at top
- Cover art comparison header
- Album title with source comparison info
- Accordion sections:
  - Basic Info: FieldComparisonList with artist credits
  - Tracks: TrackComparison with summary
  - External IDs: Separated field diffs for IDs
- Change count badges on accordion triggers
- Default expanded based on sections with changes

### CorrectionModal Integration
Step 2 now renders PreviewView:
- Passes albumId and selectedResultMbid
- Guard for missing selection with helpful message
- Back button preserves search state via modalState

## Commits

- `b5e5fe7`: feat(08-03): create TrackComparison component
- `e759958`: feat(08-03): add CoverArtComparison and assemble PreviewView
- `9c7ff82`: feat(08-03): integrate PreviewView into CorrectionModal

## Verification Results

- `pnpm type-check`: Pass
- `pnpm lint`: Pass (no errors in correction components)
- All must_have artifacts created with required line counts
- key_link pattern verified: `currentStep === 2` renders `PreviewView`

## Success Criteria Verification

1. **Clicking search result navigates to step 2 showing full preview**: Done - handleResultSelect stores MBID and calls nextStep()
2. **Cover art comparison visible at top with change indicator**: Done - CoverArtComparison renders in header with badges
3. **Field diffs shown with inline highlighting**: Done - FieldComparisonList with InlineTextDiff from 08-02
4. **Track listing shows matched pairs with title diffs**: Done - TrackComparison with InlineTextDiff for MODIFIED
5. **Accordion sections expand/collapse with change counts**: Done - badges show "(N changes)" per section
6. **Back button returns to search with query/results preserved**: Done - prevStep() uses persisted modalState
7. **All components follow dark zinc color scheme**: Done - consistent zinc-700/800/900 styling

## Deviations from Plan

None - plan executed exactly as written.

## Next Phase Readiness

Phase 9 (Apply UI) can proceed:
- Preview step complete with full comparison display
- Modal integration done with proper state flow
- Apply button placeholder ready for Phase 9 implementation
