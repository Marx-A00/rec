---
phase: 08
plan: 01
subsystem: preview-ui
tags: [react, graphql, ui, skeleton, layout]
dependency-graph:
  requires: [phase-07]
  provides: [preview-shell, comparison-layout, loading-skeleton]
  affects: [08-02, 08-03]
tech-stack:
  added: []
  patterns: [two-column-grid, skeleton-loading, graphql-query-hook]
file-tracking:
  key-files:
    created:
      - src/components/admin/correction/preview/PreviewView.tsx
      - src/components/admin/correction/preview/ComparisonLayout.tsx
      - src/components/admin/correction/preview/PreviewSkeleton.tsx
      - src/components/admin/correction/preview/index.ts
    modified: []
decisions:
  - id: 08-01-01
    description: 'Skeleton mimics final layout with two-column structure'
  - id: 08-01-02
    description: '5-minute stale time for preview query caching'
  - id: 08-01-03
    description: 'Cover art comparison separate from ComparisonLayout'
metrics:
  duration: 2.6min
  completed: '2026-01-26'
---

# Phase 8 Plan 1: Preview Container and Layout Foundation Summary

**One-liner:** PreviewView shell with GraphQL integration, two-column ComparisonLayout, and animated loading skeleton.

## What Was Built

### PreviewView Container (203 lines)

- Main container component for correction preview workflow
- Fetches data via `useGetCorrectionPreviewQuery` GraphQL hook
- Three states: loading (skeleton), error (red message), success (preview data)
- Renders summary change counts, cover art comparison, and placeholder content
- 5-minute stale time for query caching

### ComparisonLayout (46 lines)

- Reusable two-column grid layout (`grid grid-cols-2 gap-6`)
- Left column: "Current" header with zinc-400 uppercase styling
- Right column: "MusicBrainz Source" header
- Accepts any React children for flexible content

### PreviewSkeleton (117 lines)

- Animated loading skeleton matching preview layout structure
- Two-column skeleton with:
  - Summary change counts placeholder
  - Cover art placeholders (128x128)
  - Field row placeholders (varied widths)
  - Track listing section placeholders
- Uses `animate-pulse` on `bg-zinc-800` elements

### Module Barrel Export

- `src/components/admin/correction/preview/index.ts`
- Exports: `PreviewView`, `ComparisonLayout`, `PreviewSkeleton`

## Decisions Made

**[08-01-01] Skeleton mimics final layout:**
Two-column skeleton structure mirrors actual PreviewView layout for realistic loading experience.

**[08-01-02] 5-minute query cache:**
Preview data cached for 5 minutes to avoid refetching during step navigation.

**[08-01-03] Cover art separate from ComparisonLayout:**
Cover art comparison rendered outside ComparisonLayout to allow different sizing and positioning.

## Commits

- `30f41a5`: feat(08-01): create preview module with ComparisonLayout
- `2eb0d7d`: feat(08-01): add PreviewSkeleton loading state
- `ee27304`: feat(08-01): add PreviewView container with GraphQL integration

## Deviations from Plan

None - plan executed exactly as written.

## Next Phase Readiness

Ready for Plan 08-02 (Field Comparison):

- PreviewView provides `fieldDiffs` and `artistDiff` data from query
- ComparisonLayout ready to host field comparison components
- Placeholder content marked for replacement

Ready for Plan 08-03 (Track Comparison):

- PreviewView provides `trackDiffs` and `trackSummary` data
- Track summary preview already displayed in placeholder section
