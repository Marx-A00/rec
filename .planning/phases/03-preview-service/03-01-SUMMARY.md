---
phase: 03-preview-service
plan: 01
subsystem: correction-preview
tags: [types, normalization, foundation, diff]

# Dependency Graph
requires:
  - phase: 02-search-service
    plan: all
    artifacts: [CorrectionSearchResult, ScoredSearchResult types]
provides:
  - ChangeType enum (5 states: ADDED, MODIFIED, REMOVED, CONFLICT, UNCHANGED)
  - Preview type definitions (TextDiff, DateDiff, ArrayDiff, TrackDiff, CorrectionPreview)
  - Text normalization utilities (NFD Unicode, diacritics removal)
  - Date parsing utilities (YYYY, YYYY-MM, YYYY-MM-DD)
affects:
  - phase: 03-preview-service
    plan: 02
    reason: "Diff-engine will use these types and normalizers"
  - phase: 03-preview-service
    plan: 03
    reason: "Preview service will consume CorrectionPreview type"

# Tech Stack
tech-stack:
  added:
    - name: diff
      version: 8.0.3
      purpose: Character-level text diffing (jsdiff)
    - name: deep-object-diff
      version: 1.1.9
      purpose: Deep object comparison
  patterns:
    - Five-state change classification
    - Unicode NFD normalization
    - Position-based track comparison
    - Component-level date diffing

# File Tracking
key-files:
  created:
    - src/lib/correction/preview/types.ts
    - src/lib/correction/preview/normalizers.ts
  modified:
    - package.json

# Decisions
decisions:
  - id: preview-change-states
    title: "Five-state change classification"
    context: "Need to classify field changes for preview UI"
    decision: "Use ADDED, MODIFIED, REMOVED, CONFLICT, UNCHANGED states"
    rationale: "Covers all comparison scenarios, supports conflict detection for manual review"
    alternatives:
      - "Three-state (added/modified/removed) - lacks conflict detection"
      - "Four-state (no CONFLICT) - can't flag problematic changes"
    affects: [03-02, 03-03]

  - id: text-normalization
    title: "NFD Unicode normalization"
    context: "MusicBrainz uses different Unicode encodings than Spotify/local data"
    decision: "Use NFD decomposition + diacritic removal for comparison"
    rationale: "Ensures 'Café' and 'Cafe' are semantically equal, handles accents consistently"
    alternatives:
      - "NFC normalization - doesn't separate diacritics"
      - "No normalization - false negatives on accent differences"
    affects: [03-02]

  - id: date-granularity
    title: "Component-level date diffing"
    context: "MusicBrainz dates can be YYYY, YYYY-MM, or YYYY-MM-DD"
    decision: "Parse into components, diff year/month/day separately"
    rationale: "Allows highlighting which part changed (e.g., year changed but month/day same)"
    alternatives:
      - "String comparison - loses granularity"
      - "Full date objects - can't handle partial dates"
    affects: [03-02]

  - id: track-comparison
    title: "Position-based track comparison"
    context: "Tracks need to be compared by position, not just title"
    decision: "Compare by disc + track number, then diff title/duration"
    rationale: "Handles reordered tracks, renamed tracks, duration fixes"
    alternatives:
      - "Title-only comparison - misses position changes"
      - "MBID-only - local tracks lack MBIDs"
    affects: [03-02]

# Metrics
metrics:
  duration: "3 minutes"
  completed: "2026-01-24"
---

# Phase 3 Plan 01: Preview Types and Normalizers Summary

**One-liner:** NFD Unicode normalization, five-state change classification, and component-level date diffing for preview system foundation.

## What Was Built

**Dependencies installed:**
- `diff` (jsdiff) 8.0.3 for character-level text diffing
- `deep-object-diff` 1.1.9 for nested object comparison

**Type definitions (`src/lib/correction/preview/types.ts`):**
- `ChangeType` enum with 5 states: ADDED, MODIFIED, REMOVED, CONFLICT, UNCHANGED
- `TextDiff` with character-level diff parts
- `DateDiff` with component-level granularity (year/month/day)
- `ArrayDiff` for genres, secondaryTypes, etc.
- `TrackDiff` for position-based track comparison
- `ArtistCreditDiff` for artist comparison
- `ExternalIdDiff` for MBID, Spotify, Discogs IDs
- `MBReleaseData` for MusicBrainz release structure
- `CorrectionPreview` as main preview result type

**Normalization utilities (`src/lib/correction/preview/normalizers.ts`):**
- `TextNormalizer` class:
  - `normalize()` - NFD decomposition + diacritic removal + lowercase + whitespace collapse
  - `areEqual()` - Semantic equality check
  - `normalizeWhitespace()` - Display normalization (preserves case/accents)
- `parseDateComponents()` - Parse YYYY, YYYY-MM, YYYY-MM-DD formats
- `formatDateComponents()` - Format DateComponents back to string

## Task Breakdown

**Task 1: Install diff dependencies**
- Files: package.json, pnpm-lock.yaml
- Commit: dfb68e1
- Added diff and deep-object-diff packages

**Task 2: Create preview types**
- Files: src/lib/correction/preview/types.ts
- Commit: ddcfa89
- 333 lines of comprehensive type definitions
- No `any` types - strict TypeScript

**Task 3: Create text normalizers**
- Files: src/lib/correction/preview/normalizers.ts
- Commit: 453bdec
- 149 lines of normalization utilities
- Unicode NFD support, date parsing

## Deviations from Plan

None - plan executed exactly as written.

## Key Technical Decisions

**1. Five-state change classification**
- Added CONFLICT state for ambiguous changes needing manual review
- More nuanced than typical three-state (add/modify/remove)

**2. NFD Unicode normalization**
- Decomposes Unicode characters (é → e + ́)
- Removes combining diacritical marks
- Ensures "Café" = "Cafe" semantically

**3. Component-level date diffing**
- Parses partial dates (YYYY, YYYY-MM, YYYY-MM-DD)
- Allows highlighting which component changed
- Handles MusicBrainz's varying date precision

**4. Position-based track comparison**
- Compare by disc + track number first
- Then diff title and duration
- Handles reordering and renaming

## Dependencies

**Requires:**
- Phase 2 Search Service (CorrectionSearchResult, ScoredSearchResult types)
- Prisma schema (Album, Track models)

**Provides for:**
- Plan 03-02 (Diff Engine) - Uses these types and normalizers
- Plan 03-03 (Preview Service) - Consumes CorrectionPreview type

## Testing Notes

- Type checking: `pnpm type-check` passes
- Linting: `pnpm eslint src/lib/correction/preview/` passes
- No runtime tests yet - integration testing will come in 03-02/03-03

## Next Phase Readiness

**Ready for 03-02 (Diff Engine):**
- All types defined
- Normalization utilities ready
- No blockers

**Assumptions for next phase:**
- Diff engine will use jsdiff for character-level text diffs
- deep-object-diff may be used for nested object comparison
- Track position logic will match (disc + trackNumber)
- Date parsing handles all MusicBrainz date formats

## Known Limitations

1. No conflict detection rules yet - CONFLICT state exists but diff-engine needs to define when to use it
2. No normalization for artist credit join phrases (e.g., " & " vs " and ") - may add if needed
3. Duration delta calculation not implemented - just type defined

## Files Modified

**Created:**
- src/lib/correction/preview/types.ts
- src/lib/correction/preview/normalizers.ts

**Modified:**
- package.json (diff dependencies)

## Commits

- dfb68e1: chore(03-01): install diff dependencies
- ddcfa89: feat(03-01): create preview type definitions
- 453bdec: feat(03-01): create text normalization utilities
