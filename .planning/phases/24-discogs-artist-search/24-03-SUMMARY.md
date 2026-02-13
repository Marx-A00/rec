---
phase: 24-discogs-artist-search
plan: 03
subsystem: admin-ui
tags: [react, graphql, discogs, artist-search, frontend]

dependency-graph:
  requires: [24-02]
  provides: [artist-search-discogs-ui]
  affects: [25]

tech-stack:
  added: []
  patterns:
    - source-conditional-styling
    - graphql-enum-mapping
    - source-toggle-integration

file-tracking:
  key-files:
    created: []
    modified:
      - src/components/admin/correction/artist/search/ArtistSearchView.tsx
      - src/components/admin/correction/artist/search/ArtistSearchCard.tsx

decisions:
  - id: D-24-03-01
    title: "Reuse graphqlSource mapping pattern from album SearchView"
    rationale: "Consistent source mapping: lowercase store value → uppercase GraphQL enum"
  - id: D-24-03-02
    title: "Match album SearchResultCard styling for Discogs results"
    rationale: "Orange accent (border-orange-900/30, hover:bg-orange-950/20) and DG badge for visual consistency"
  - id: D-24-03-03
    title: "Use cn() utility for conditional className composition"
    rationale: "Cleaner ternary handling, consistent with other components"

metrics:
  duration: 8m
  completed: 2026-02-09
---

# Phase 24 Plan 03: Frontend Integration Summary

**One-liner:** Artist search UI wired to Discogs with orange accent styling for Discogs results.

## What Changed

### ArtistSearchView.tsx
- Added `CorrectionSource` enum import from generated GraphQL types
- Added `graphqlSource` mapping: `correctionSource === 'discogs' ? CorrectionSource.Discogs : CorrectionSource.Musicbrainz`
- Updated `useSearchArtistCorrectionCandidatesQuery` to include `source: graphqlSource` parameter
- Removed Discogs placeholder section ("Discogs artist search coming soon")
- Enabled query for both MusicBrainz and Discogs sources (`enabled: isSearchTriggered && !!searchQuery`)
- Updated initial state message to be source-aware: `Search {sourceLabel} for the correct artist data`

### ArtistSearchCard.tsx
- Added source detection: `const isDiscogs = result.source === 'discogs'`
- Added dynamic badge text: `const badgeText = isDiscogs ? 'DG' : 'MB'`
- Applied conditional button styling using `cn()`:
  - Discogs: `border border-orange-900/30 hover:bg-orange-950/20 active:bg-orange-950/30`
  - MusicBrainz: `hover:bg-zinc-800/50 active:bg-zinc-800`
- Applied conditional badge styling:
  - Discogs: `text-orange-400 border-orange-700`
  - MusicBrainz: `text-zinc-500 border-zinc-700`

## Commits

- `5f34245`: feat(24-03): add source parameter to artist search and support Discogs
- `92482e7`: feat(24-03): add visual distinction for Discogs artist results

## Verification Results

All checks passed:
- `pnpm type-check`: No errors
- `pnpm lint`: Only unrelated warnings in other files
- ArtistSearchView uses source parameter in query
- Discogs placeholder removed
- ArtistSearchCard has conditional Discogs styling
- No TypeScript errors in search components

## Deviations from Plan

None - plan executed exactly as written.

## Data Flow

```
Admin selects "Discogs" in SourceToggle
  ↓
ArtistSearchView.correctionSource = 'discogs'
  ↓
graphqlSource = CorrectionSource.Discogs
  ↓
useSearchArtistCorrectionCandidatesQuery({ source: CorrectionSource.Discogs })
  ↓
GraphQL resolver routes to QueuedDiscogsService.searchArtists()
  ↓
Results return with source: 'discogs'
  ↓
ArtistSearchCard detects isDiscogs = true
  ↓
Orange accent styling + 'DG' badge rendered
  ↓
Admin clicks result
  ↓
store.selectResult(result.artistMbid) stores Discogs artist ID
  ↓
Step transitions to preview (Phase 25 handles Discogs preview)
```

## Next Phase Readiness

Phase 25 can now begin:
- Artist search UI complete for both MusicBrainz and Discogs
- Discogs artist ID stored in `selectedArtistMbid` field
- Preview step will need to detect source and use `QueuedDiscogsService.getArtist()`
