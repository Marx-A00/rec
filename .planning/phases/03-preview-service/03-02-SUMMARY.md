---
phase: 03
plan: 02
subsystem: correction-preview
tags: [diff, comparison, normalization, musicbrainz]
completed: 2026-01-23
duration: 4min

# Dependencies
requires:
  - 03-01 # TextNormalizer and preview types
provides:
  - DiffEngine class for field-by-field comparisons
  - Character/word-level text diff with threshold
  - Component-level date comparison (year/month/day)
  - Set-based array comparison with normalization
  - Position-based track alignment for multi-disc albums
affects:
  - 03-03 # CorrectionPreviewService will consume DiffEngine

# Tech Stack
tech-stack:
  added: []
  patterns:
    - Character-level diff with jsdiff library
    - Position-based track alignment
    - Component-level date comparison
    - Set operations for array comparison

# Key Files
key-files:
  created:
    - src/lib/correction/preview/diff-engine.ts
    - src/lib/correction/preview/index.ts
  modified: []

# Decisions
decisions:
  - id: diff-threshold
    choice: 100 characters
    context: Use character diff for text <100 chars, word diff for longer
    reasoning: Character diff is more precise for short fields, word diff is more readable for long text
  - id: track-alignment
    choice: Position-based alignment
    context: Compare tracks by disc number and track position
    reasoning: Handles multi-disc albums correctly, aligns even if track counts differ
---

# Phase 3 Plan 2: DiffEngine Implementation Summary

**One-liner:** Character/word/component-level diff engine for text, dates, arrays, and tracks with five-state change classification

## What Was Built

Implemented the DiffEngine class that performs field-by-field comparisons between current album data and MusicBrainz source data.

**Core capabilities:**

1. **Five-state change classification** (ADDED/MODIFIED/REMOVED/CONFLICT/UNCHANGED)
   - ADDED: null → value (e.g., missing release date)
   - REMOVED: value → null (rare in corrections)
   - CONFLICT: both have different values
   - UNCHANGED: both null or semantically equal (normalized)

2. **Text comparison** with adaptive diff strategy:
   - Character-level diff for short text (<100 chars)
   - Word-level diff for longer text
   - Uses jsdiff library for granular change highlighting

3. **Date comparison** with component-level granularity:
   - Handles partial dates (YYYY, YYYY-MM, YYYY-MM-DD)
   - Highlights which components changed (year/month/day)
   - Per-component change classification

4. **Array comparison** with set operations:
   - Identifies added/removed/unchanged items
   - Normalizes for case/accent insensitivity
   - Works for genres, secondaryTypes, etc.

5. **Track listing comparison**:
   - Position-based alignment by disc number and track position
   - Handles multi-disc albums correctly
   - Computes title diffs and duration deltas
   - Summary statistics (matching/modified/added/removed)

6. **Artist credit comparison**:
   - Formats display strings with joinphrases
   - Computes character-level name diff
   - Converts MusicBrainz format to CorrectionArtistCredit

**Files created:**

- `src/lib/correction/preview/diff-engine.ts` - DiffEngine class (460 lines)
- `src/lib/correction/preview/index.ts` - Barrel exports

## Technical Decisions

**1. Diff threshold (100 characters)**

Why: Character diff is more precise for short fields like titles and artist names. Word diff is more readable for longer text like descriptions or liner notes.

**2. Position-based track alignment**

Why: Tracks are fundamentally ordered by position. This approach handles multi-disc albums correctly and aligns even when track counts differ between current and source.

**3. Five-state classification**

Why: Distinguishing ADDED (null→value) from CONFLICT (value→different value) allows UI to show different visual treatments and helps users understand the nature of the change.

## Code Quality

- All methods fully typed (no `any` usage)
- ESLint passes with import order auto-fixed
- TypeScript compilation passes
- Clean separation of concerns (classify, compare, format)

## Deviations from Plan

None - plan executed exactly as written.

## Integration Points

**Consumes:**

- `diff` package (diffChars, diffWords)
- TextNormalizer from `./normalizers.ts`
- Types from `./types.ts`
- CorrectionArtistCredit from `../types.ts`
- Track from `@prisma/client`

**Provides:**

- DiffEngine class with public methods:
  - `classifyChange(current, source): ChangeType`
  - `compareText(field, current, source): TextDiff`
  - `compareDate(current, source): DateDiff`
  - `compareArray(field, current, source): ArrayDiff`
  - `compareExternalId(field, current, source): ExternalIdDiff`
  - `compareArtistCredits(current, source): ArtistCreditDiff`
  - `compareTracks(currentTracks, sourceMediums): { trackDiffs, summary }`

**Next phase (03-03):**
CorrectionPreviewService will use DiffEngine to generate complete CorrectionPreview objects for the UI.

## Test Coverage

No automated tests created in this plan. Testing will be done via integration in 03-03 (CorrectionPreviewService) and UI verification in later phases.

## Next Phase Readiness

**Ready for 03-03:** ✅

- DiffEngine fully implemented and typed
- All comparison methods tested via type-check
- Clean barrel exports for public API

**Blockers:** None

**Recommendations for 03-03:**

1. Add error handling for malformed MusicBrainz data
2. Consider caching DiffEngine instances if performance becomes an issue
3. Track edge cases during integration (e.g., empty track lists, missing artist credits)
