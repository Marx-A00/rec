---
phase: 06-modal-entry-point
plan: 02
subsystem: admin-ui
tags: [modal, data-display, accordion, quality-badge]

dependency_graph:
  requires:
    - '06-01: CorrectionModal shell and step navigation'
    - '05-03: GraphQL types (DataQuality enum)'
  provides:
    - 'CurrentDataView component for Step 0 content'
    - 'DataQualityBadge for 4-level quality indication'
    - 'ExternalIdStatus for external ID presence/absence display'
    - 'TrackListing with auto-collapse for large albums'
  affects:
    - '06-03: SearchView will need same album type for comparison'

tech_stack:
  added: []
  patterns:
    - 'Accordion sections with multiple default expanded'
    - 'Auto-collapse threshold pattern (30 tracks)'
    - 'External link rendering with tooltip for full IDs'

key_files:
  created:
    - src/components/admin/correction/DataQualityBadge.tsx
    - src/components/admin/correction/ExternalIdStatus.tsx
    - src/components/admin/correction/TrackListing.tsx
    - src/components/admin/correction/CurrentDataView.tsx
  modified:
    - src/components/admin/correction/CorrectionModal.tsx

decisions:
  - id: quality-levels
    choice: '4-level badge: Excellent (HIGH+all IDs), Good (HIGH), Fair (MEDIUM), Poor (LOW)'
    rationale: 'Distinguish between high quality with/without complete external ID coverage'
  - id: track-collapse-threshold
    choice: '30 tracks triggers auto-collapse, showing first 10'
    rationale: 'Balances visibility for typical albums vs overwhelming for box sets'
  - id: id-truncation
    choice: 'MusicBrainz: 8 chars, Spotify: 12 chars with tooltip for full ID'
    rationale: 'MusicBrainz UUIDs are longer, Spotify IDs are more readable'

metrics:
  duration: '3.2min'
  completed: '2026-01-25'
---

# Phase 06 Plan 02: CurrentDataView Component Summary

**One-liner:** CurrentDataView displays album data in accordion sections with quality badge, external ID status, and auto-collapsing track listing.

## What Was Built

This plan completes Step 0 (Current Data) of the correction wizard with comprehensive album data display.

**Components:**

- **DataQualityBadge** - 4-level quality indicator
  - Excellent (green): HIGH quality + all 3 external IDs
  - Good (yellow): HIGH quality only
  - Fair (gray): MEDIUM quality
  - Poor (red): LOW quality
  - Uses project color palette (emeraled-green, maximum-yellow, zinc-600, dark-pastel-red)

- **ExternalIdStatus** - External ID presence display
  - Shows MusicBrainz, Spotify, Discogs IDs
  - Present: green checkmark + clickable link to external source
  - Missing: gray X icon + muted text
  - Tooltips show full ID on hover
  - Links open in new tab

- **TrackListing** - Track list with smart collapse
  - Auto-collapses when 30+ tracks (shows first 10)
  - Expand/collapse button for large albums
  - Supports multi-disc albums with disc grouping
  - Duration formatted as mm:ss

- **CurrentDataView** - Main Step 0 content
  - Header: Cover art (128x128), title, quality badge, artist
  - Accordion sections (all expanded by default):
    - Basic Info: title, artist, date, type, label, barcode
    - Tracks: uses TrackListing
    - External IDs: uses ExternalIdStatus

**Modal Integration:**

- CorrectionModal now accepts `album` prop (typed as CurrentDataViewAlbum)
- Header shows "Fixing: {album.title} by {primaryArtist}"
- Step 0 renders CurrentDataView with album data

## Commits

- `661b276` - feat(06-02): create DataQualityBadge and ExternalIdStatus components
- `ae01357` - feat(06-02): create TrackListing component with auto-collapse
- `9ddc027` - feat(06-02): create CurrentDataView and integrate into CorrectionModal

## Deviations from Plan

None - plan executed exactly as written.

## Type Definitions

The `CurrentDataViewAlbum` interface is exported from CurrentDataView.tsx for parent components:

```typescript
interface CurrentDataViewAlbum {
  id: string;
  title: string;
  releaseDate: string | null;
  releaseType: string | null;
  coverArtUrl: string | null;
  cloudflareImageId: string | null;
  musicbrainzId: string | null;
  spotifyId: string | null;
  discogsId: string | null;
  dataQuality: DataQuality | null;
  label: string | null;
  barcode: string | null;
  tracks: Track[];
  artists: AlbumArtist[];
}
```

## Integration Points

**For Plan 06-03 (SearchView/ApplyView):**

- SearchView can reuse same album type for comparison display
- ApplyView will need to show diff between current and selected candidate

**For Entry Point (future):**

- Parent component must fetch album data matching CurrentDataViewAlbum shape
- Pass album to CorrectionModal along with open state and onClose handler

## Next Phase Readiness

Phase 06-03 can proceed immediately. Step 0 is complete and integrated.

**Blockers:** None
**Concerns:** None
