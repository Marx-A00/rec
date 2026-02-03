---
phase: 09
plan: 01
subsystem: ui-apply
tags: [react, typescript, ui, checkboxes, accordion, field-selection]
dependencies:
  requires:
    - 08-03-SUMMARY.md # Preview UI components
    - 05-02-SUMMARY.md # GraphQL field selections input types
  provides:
    - Field selection form with hierarchical checkboxes
    - UI state types with conversion utilities
    - Accordion sections for metadata/tracks/external IDs
  affects:
    - 09-02-PLAN.md # Apply view will integrate this form
tech-stack:
  added: []
  patterns:
    - Hybrid tracks selection (applyAll + excludedPositions Set)
    - Type guards for FieldDiff union type narrowing
    - Controlled checkbox state with indeterminate support
key-files:
  created:
    - src/components/admin/correction/apply/types.ts
    - src/components/admin/correction/apply/FieldSelectionForm.tsx
    - src/components/admin/correction/apply/MetadataSection.tsx
    - src/components/admin/correction/apply/TrackSection.tsx
    - src/components/admin/correction/apply/ExternalIdSection.tsx
    - src/components/admin/correction/apply/index.ts
  modified: []
decisions:
  - id: apply-ui-state-types
    what: UIFieldSelections interface uses simpler structures than backend FieldSelections
    why: Direct boolean properties and Set<string> are more ergonomic for React state than Maps
    alternatives: Use Maps directly in UI (harder to work with in React)
    impact: Requires conversion functions (createDefaultUISelections, toGraphQLSelections)
  - id: no-per-artist-selection
    what: UI does not expose per-artist selection (applies all artists as unit)
    why: Artist credits are typically applied together from MusicBrainz; per-artist adds complexity without clear benefit
    alternatives: Add artists.excludedMbids following tracks pattern
    impact: Simpler UI, all artist changes apply together
  - id: hybrid-tracks-selection
    what: Tracks use "apply all with exclusions" pattern (applyAll boolean + excludedPositions Set)
    why: Most corrections apply all tracks; exclusions are rare edge case
    alternatives: Per-track boolean Map (more verbose for common case)
    impact: Cleaner default state, collapsible individual track UI
metrics:
  tasks: 3
  commits: 3
  duration: 6 minutes
  files-created: 6
  completed: 2026-01-26
---

# Phase 09 Plan 01: Field Selection Form Summary

**One-liner:** Hierarchical checkbox form with accordion sections for granular field selection (metadata, tracks, external IDs)

## Overview

Created the field selection form UI for the apply workflow step. Admins can granularly control which fields to apply from a MusicBrainz correction using checkboxes organized in accordion sections. Features include master checkboxes with indeterminate state, hybrid track selection, and global select all/deselect all.

## What Was Built

### 1. UI Selection State Types (types.ts)

**UIFieldSelections interface:**

- metadata: Direct boolean properties for title, releaseDate, releaseType, etc.
- tracks: Hybrid pattern with applyAll boolean + excludedPositions Set<string>
- externalIds: Boolean properties for musicbrainzId, spotifyId, discogsId
- coverArt: Choice enum ('use_source' | 'keep_current' | 'clear')

**Factory and conversion functions:**

- createDefaultUISelections(preview): Returns selections with all fields true
- toGraphQLSelections(ui, preview): Converts UI state to GraphQL FieldSelectionsInput format

### 2. Accordion Section Components

**MetadataSection:**

- Checkboxes for title, releaseDate, releaseType, releaseCountry, barcode, label
- Master checkbox with indeterminate state when partially selected
- Shows current → source value preview for each field
- Only displays fields with changes (changeType !== 'UNCHANGED')
- Type guards to narrow FieldDiff union type (TextDiff | DateDiff)

**TrackSection:**

- Implements hybrid "apply all with exclusions" pattern
- Main "Apply all tracks" checkbox
- Collapsible "Show individual tracks" section
- Color-coded change indicators (yellow=modified, green=added, red=removed)
- Track summary showing counts by change type

**ExternalIdSection:**

- Checkboxes for MusicBrainz ID, Spotify ID, Discogs ID
- ID value truncation (8 chars for MB, 12 for Spotify)
- Current → source value comparison
- Type guard for ExternalIdDiff narrowing

### 3. FieldSelectionForm Container

**Main form structure:**

- Global select all / deselect all buttons
- Accordion with type="multiple" for collapsible sections
- Auto-expand sections that have changes
- Selection summary showing total fields selected + breakdown

**Features:**

- Passes preview data to section components
- Controlled state via selections prop and onSelectionsChange callback
- Calculates selection counts per category
- Dark zinc theme matching admin modal

## Technical Implementation

### Type Narrowing Pattern

FieldDiff is a union type (TextDiff | DateDiff | ArrayDiff | ExternalIdDiff). Used type guards to narrow:

```typescript
function isMetadataFieldDiff(diff: FieldDiff): diff is TextDiff | DateDiff {
  return (
    diff.field !== 'musicbrainzId' &&
    diff.field !== 'spotifyId' &&
    diff.field !== 'discogsId'
  );
}

const changedFields = fieldDiffs.filter(
  (diff): diff is TextDiff | DateDiff =>
    isMetadataFieldDiff(diff) &&
    metadataFields.includes(diff.field) &&
    diff.changeType !== 'UNCHANGED'
);
```

### Hybrid Track Selection

Instead of per-track boolean Map, used "apply all with exclusions" pattern:

```typescript
tracks: {
  applyAll: boolean;
  excludedPositions: Set<string>; // "disc-track" keys like "1-3"
}
```

Benefits:

- Default case (apply all) is simple: `applyAll: true, excludedPositions: new Set()`
- Deselecting individual tracks adds to excludedPositions Set
- Cleaner for common case where all tracks are applied

### Indeterminate Checkbox State

Radix UI Checkbox supports indeterminate via data-state attribute:

```typescript
<Checkbox
  checked={allSelected}
  {...(indeterminate && { 'data-state': 'indeterminate' })}
/>
```

### GraphQL Conversion

toGraphQLSelections converts:

- metadata: direct object mapping
- artists: all artists from preview.artistDiff.source with selected=true
- tracks: maps to SelectionEntry[] array based on excludedPositions Set
- externalIds: direct object mapping
- coverArt: maps string to CoverArtChoice enum

## Integration Points

**Inputs:**

- CorrectionPreview from preview step (preview types)
- UIFieldSelections state (managed by parent ApplyView)

**Outputs:**

- FieldSelectionsInput for GraphQL correctionApply mutation
- Selection change callbacks to parent component

**Used by:**

- ApplyView (next plan) will integrate this form
- Passes selections to toGraphQLSelections for mutation

## Deviations from Plan

None - plan executed exactly as written.

## Next Phase Readiness

**Ready for 09-02 (ApplyView integration):**

- FieldSelectionForm is complete and exported
- createDefaultUISelections ready to initialize state
- toGraphQLSelections ready to convert for mutation
- All section components handle their respective field types

**Blockers:** None

**Concerns:** None

## Testing Notes

**TypeScript:** All types compile without errors
**Linting:** All files pass with no errors (auto-formatted)
**Manual testing:** Will be tested in next plan when integrated into ApplyView

## Lessons Learned

1. **Type guards for union types:** Essential for FieldDiff union type. TypeScript won't let you access TextDiff.currentValue without narrowing first.

2. **Hybrid selection pattern:** "Apply all with exclusions" is cleaner than per-item booleans for common case of selecting everything.

3. **Radix UI indeterminate:** data-state attribute works well, no need for custom indeterminate prop.

4. **Set for excluded items:** Set<string> is perfect for tracking exclusions - has(), add(), delete() operations are clear.

## Related Documentation

- Preview types: src/lib/correction/preview/types.ts
- GraphQL input types: src/graphql/schema.graphql (FieldSelectionsInput)
- Phase 8 preview UI: .planning/phases/08-preview-ui/
