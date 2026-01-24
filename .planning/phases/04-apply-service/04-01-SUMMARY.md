---
phase: 04-apply-service
plan: 01
subsystem: correction
tags: [types, track-matching, levenshtein, apply]

dependency-graph:
  requires:
    - 03-03 (CorrectionPreview types)
  provides:
    - Apply correction types (FieldSelections, ApplyInput, ApplyResult)
    - Track matcher with position-first strategy
  affects:
    - 04-02 (Apply service implementation)
    - 04-03 (GraphQL resolver)

tech-stack:
  added: [fastest-levenshtein]
  patterns:
    - Position-first matching with similarity fallback
    - Optimistic locking via expectedUpdatedAt
    - Five logical field selection groups

key-files:
  created:
    - src/lib/correction/apply/types.ts
    - src/lib/correction/apply/track-matcher.ts
    - src/lib/correction/apply/index.ts
  modified:
    - src/lib/correction/index.ts
    - package.json
    - pnpm-lock.yaml

decisions:
  - name: Track matching strategy
    choice: Position-first, similarity-fallback
    reason: Position match is most reliable; similarity handles reordered tracks
  - name: Similarity threshold
    choice: "0.8 (80%)"
    reason: Balance between false positives and legitimate matches
  - name: Field selection granularity
    choice: Five groups (metadata, artists, tracks, externalIds, coverArt)
    reason: Matches UI checkbox sections for intuitive selection

metrics:
  duration: 2.8min
  completed: 2026-01-24
---

# Phase 04 Plan 01: Apply Types and Track Matching Summary

**One-liner:** Apply correction types with five-group field selections and position-first track matching using Levenshtein similarity.

## What Was Built

**Apply Correction Types** (`src/lib/correction/apply/types.ts`):

- `FieldSelections` with five logical groups: metadata, artists, tracks, externalIds, coverArt
- `MetadataSelections`: title, releaseDate, releaseType, releaseCountry, barcode, label
- `ExternalIdSelections`: musicbrainzId, spotifyId, discogsId
- `CoverArtChoice`: 'use_source' | 'keep_current' | 'clear'
- `ApplyInput`: albumId, preview, selections, expectedUpdatedAt, adminUserId
- `ApplyResult`: discriminated union (success/failure)
- `ApplyErrorCode`: STALE_DATA, ALBUM_NOT_FOUND, TRANSACTION_FAILED, INVALID_SELECTION, VALIDATION_ERROR
- Audit log types: FieldDelta, TrackChangeLog, ArtistChangeLog, AuditLogPayload
- Factory functions: `createDefaultSelections()`, `selectAllFromPreview()`

**Track Matcher** (`src/lib/correction/apply/track-matcher.ts`):

- `matchTracks()` implements four-pass algorithm:
  1. Position match (disc + track number)
  2. Title similarity fallback (threshold 0.8)
  3. Mark NEW tracks (MB only)
  4. Mark ORPHANED tracks (DB only)
- `calculateTitleSimilarity()` using fastest-levenshtein
- `SIMILARITY_THRESHOLD = 0.8` exportable for testing
- `TrackMatchType`: POSITION | TITLE_SIMILARITY | NEW | ORPHANED
- Results sorted by disc number, then position

## Technical Decisions

**Position-first matching:** Most albums have stable track positions. Position matching has 100% confidence when disc+track numbers align.

**Similarity fallback:** Handles cases where tracks were reordered but titles match. Uses normalized comparison (lowercase, trim, NFD unicode).

**Optimistic locking:** `expectedUpdatedAt` ensures preview data hasn't gone stale. Apply fails with STALE_DATA if album was modified.

**Per-track/per-artist granularity:** Maps allow selective application of individual track/artist changes without all-or-nothing approach.

## Commits

- `9029046`: feat(04-01): create apply correction types
- `c3fabcb`: feat(04-01): implement track matching strategy
- `96cb30f`: feat(04-01): create barrel exports for apply module

## Deviations from Plan

None - plan executed exactly as written.

## Next Phase Readiness

Phase 04-02 can proceed:

- All apply types defined and exported
- Track matcher ready for use in apply service
- Integration with CorrectionPreview from Phase 3 verified
- Barrel exports allow clean imports from `@/lib/correction`
