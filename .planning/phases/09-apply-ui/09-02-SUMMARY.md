---
phase: 09
plan: 02
subsystem: correction-workflow
tags:
  - ui
  - apply-step
  - diff-summary
  - field-selection
  - confirmation
  - react
  - typescript
requires:
  - 09-01
provides:
  - ApplyView container component
  - DiffSummary component for change preview
  - Two-column responsive layout
  - Step transition confirmation model
affects:
  - 09-03 (will integrate ApplyView into modal)
tech-stack:
  added: []
  patterns:
    - Two-column responsive layout pattern
    - Inline error display with expandable details
    - calculateHasSelections validation helper
key-files:
  created:
    - src/components/admin/correction/apply/DiffSummary.tsx
    - src/components/admin/correction/apply/ApplyView.tsx
  modified:
    - src/components/admin/correction/apply/index.ts
decisions:
  - key: diff-summary-filtering
    choice: Filter preview.fieldDiffs by UIFieldSelections before display
    rationale: Show only what admin selected, not all available diffs
  - key: apply-step-is-confirmation
    choice: No separate confirmation dialog, apply step itself is confirmation
    rationale: Step transition model - admin reviews and clicks "Confirm & Apply"
  - key: empty-state-handling
    choice: Show amber warning when no fields selected, disable button
    rationale: Clear feedback prevents accidental no-op applies
  - key: error-display-pattern
    choice: Inline error with expandable stack trace
    rationale: Admin context - show technical details on demand
metrics:
  duration: 4min
  completed: 2026-01-26
---

# Phase 09 Plan 02: Apply View Container Summary

**One-liner:** Two-column apply view with diff summary, field selection, and inline confirmation

## What Was Built

Created the ApplyView container that combines field selection with change summary for the apply workflow step:

1. **DiffSummary Component:**
   - Filters preview.fieldDiffs by UIFieldSelections to show only selected changes
   - Type guards for DateDiff, ArrayDiff, ExternalIdDiff union types
   - Before → after display with color coding (red line-through → green)
   - Value truncation (30 chars for text, 8 chars for IDs)
   - Section grouping: Metadata, Tracks, External IDs, Cover Art
   - Empty state: "No changes selected" message
   - Compact summary format for quick review

2. **ApplyView Container:**
   - Two-column responsive layout (lg:grid-cols-2, stacked on mobile)
   - Left column: FieldSelectionForm for field selection
   - Right column: DiffSummary + apply button
   - State management for UIFieldSelections (initialized with createDefaultUISelections)
   - calculateHasSelections helper validates any fields selected
   - "Confirm & Apply" button with loading state (spinner animation)
   - Inline error display with expandable stack trace (red border, collapsible details)
   - Empty selection warning (amber alert box)
   - "Back to preview" link with chevron icon
   - Disabled button states (no selections or isApplying)

3. **Export Updates:**
   - Added DiffSummary and ApplyView to index.ts exports
   - All apply components now available from single import path

## Key Changes

**DiffSummary.tsx (376 lines):**

- Props: preview, selections
- Filters fieldDiffs, trackDiffs, coverArt by selections
- Type guards: isDateDiff(), isArrayDiff()
- Rendering: FieldChange, ExternalIdChange components
- Formatters: formatFieldLabel, formatIdType, formatValue, formatId, formatDateComponents

**ApplyView.tsx (215 lines):**

- Props: albumId (future use), preview, onApply, onBack, isApplying, error
- Layout: header, two-column grid, summary, actions
- calculateHasSelections: metadata || tracks || externalIds || coverArt
- Error display: conditional with show/hide details toggle
- Button: disabled when !hasSelections || isApplying

**index.ts:**

- Added exports: DiffSummary, ApplyView
- Utility exports: createDefaultUISelections, toGraphQLSelections

## Decisions Made

**Diff Summary Filtering:**
Filter preview.fieldDiffs by UIFieldSelections before rendering. Only show changes the admin selected, not all available diffs. Cleaner summary, less cognitive load.

**Apply Step Is Confirmation:**
No separate confirmation dialog. The apply step itself is the confirmation - admin reviews DiffSummary and clicks "Confirm & Apply". Step transition model matches existing preview-to-apply flow.

**Empty State Handling:**
Show amber warning box when no fields selected, disable apply button. Clear visual feedback prevents accidental no-op applies. calculateHasSelections checks all categories (metadata, tracks, externalIds, coverArt).

**Error Display Pattern:**
Inline error with red border, expandable stack trace. Admin context - show technical details on demand. No modal, keeps user in flow.

**Layout Responsiveness:**
Two columns on desktop (lg:grid-cols-2), stacked on mobile. Form on left, summary on right. Mobile users scroll form → summary → button sequentially.

## Technical Patterns

**Type Guards for Union Types:**

```typescript
function isDateDiff(diff: FieldDiff): diff is DateDiff {
  return diff.field === 'releaseDate';
}
```

Narrows FieldDiff union to specific type for safe property access.

**Selection Validation Helper:**

```typescript
function calculateHasSelections(selections, preview): boolean {
  const hasMetadata = selections.metadata.title || ...;
  const hasTracks = preview.trackDiffs.filter(...).length > 0;
  return hasMetadata || hasTracks || hasExternalIds || hasCoverArt;
}
```

Centralized validation prevents duplication, easy to test.

**Expandable Error Details:**

```typescript
const [showErrorDetails, setShowErrorDetails] = useState(false);
// Toggle button + conditional <pre> with error.stack
```

Admin-friendly pattern: show error message always, stack trace on demand.

## Testing Notes

**Manual verification needed:**

1. DiffSummary shows only selected fields (toggle selections in form)
2. Empty selection shows amber warning, disables button
3. Apply button loading state (spinner) during isApplying
4. Error display with expandable stack trace
5. Responsive layout (desktop two-column, mobile stacked)
6. Back link returns to preview step

**Type safety verified:**

- TypeScript compiles without errors
- Type guards narrow FieldDiff union correctly
- All props interfaces match component usage

## Next Phase Readiness

**For Plan 09-03 (Apply mutation integration):**

- ApplyView provides onApply callback interface
- Expects UIFieldSelections parameter
- Ready to connect to GraphQL mutation
- Error prop interface ready for GraphQL errors
- isApplying prop ready for mutation loading state

**Components ready:**

- FieldSelectionForm (09-01) ✓
- DiffSummary (09-02) ✓
- ApplyView (09-02) ✓
- Next: Integrate into CorrectionModal, wire up mutation

## Metrics

**Files:**

- Created: 2 (DiffSummary.tsx, ApplyView.tsx)
- Modified: 1 (index.ts)
- Total lines: ~600

**Commits:** 3

- 3ab6c38: DiffSummary component
- 41b8240: ApplyView container
- d0fa8b1: Exports and lint fixes

**Duration:** 4 minutes
**Complexity:** Medium (union type handling, responsive layout)
