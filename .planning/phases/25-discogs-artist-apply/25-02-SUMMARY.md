---
phase: 25
plan: 02
subsystem: artist-correction
tags: [discogs, apply, artist, source-detection, image-caching]

dependencies:
  requires:
    - 25-01 (Discogs artist preview service)
    - 23-02 (Album apply service source pattern)
  provides:
    - Source-conditional artist external ID storage
    - Cloudflare image caching on artist corrections
  affects:
    - 25-03 (GraphQL resolver routing)

tech-stack:
  patterns:
    - Source detection via numeric ID check
    - Source-conditional Prisma update building
    - BullMQ job queueing for image caching

key-files:
  created: []
  modified:
    - src/lib/correction/artist/apply/apply-service.ts
    - src/lib/correction/artist/apply/types.ts

decisions:
  - id: 25-02-001
    decision: Discogs IDs detected via numeric regex pattern
    rationale: Discogs IDs are purely numeric strings, MusicBrainz IDs are UUIDs
  - id: 25-02-002
    decision: Country, artistType, area, beginDate only applied for MusicBrainz source
    rationale: Discogs artist API does not provide these metadata fields
  - id: 25-02-003
    decision: Image caching queued with priority 6
    rationale: Medium priority for admin corrections (lower than ADMIN tier 1)

metrics:
  duration: 14m
  completed: 2026-02-09
---

# Phase 25 Plan 02: Artist Apply Service Source Support Summary

**Source-conditional external ID storage with Cloudflare image caching for Discogs artist corrections.**

## What Was Done

### Task 1: Add discogsId to field selection types
Extended ArtistExternalIdSelections and ArtistMetadataSelections interfaces:
- Added `discogsId?: boolean` to ArtistExternalIdSelections
- Added `imageUrl?: boolean` to ArtistMetadataSelections  
- Updated createDefaultArtistSelections to include both new fields

### Task 2: Update apply service for source-conditional external ID storage
Updated ArtistCorrectionApplyService with source-awareness:
- Added CorrectionSource type (`'musicbrainz' | 'discogs'`)
- Added determineSource method (numeric ID = Discogs, UUID = MusicBrainz)
- Updated buildArtistUpdateData to accept source parameter
- Source-conditional metadata: countryCode, artistType, area, beginDate only for MusicBrainz
- Source-conditional external IDs: musicbrainzId for MB, discogsId for Discogs
- Artist.source field updated based on correction source

### Task 3: Add Cloudflare image upload queueing and update audit logging
Added image caching and updated audit trail:
- Added queueImageUpload method using CACHE_ARTIST_IMAGE job
- Image caching queued when imageUrl changes during correction
- Updated logCorrection to use actual source (not hardcoded 'musicbrainz')
- Updated buildAuditPayload for source-conditional external ID deltas
- Updated buildAppliedChanges for source-conditional response

## Key Implementation Details

### Source Detection Pattern
```typescript
private determineSource(preview: ArtistCorrectionPreview): CorrectionSource {
  const id = preview.mbArtistData?.id;
  if (!id) return 'musicbrainz'; // Default for backward compatibility
  const isDiscogs = /^\d+$/.test(id);
  return isDiscogs ? 'discogs' : 'musicbrainz';
}
```

### Source-Conditional External ID Storage
```typescript
if (source === 'musicbrainz' && selections.externalIds.musicbrainzId && mbData.id) {
  updateData.musicbrainzId = mbData.id;
  updateData.source = 'MUSICBRAINZ';
} else if (source === 'discogs' && selections.externalIds.discogsId && mbData.id) {
  updateData.discogsId = mbData.id;
  updateData.source = 'DISCOGS';
}
```

### Image Caching Queue
```typescript
await queue.addJob(
  JOB_TYPES.CACHE_ARTIST_IMAGE,
  { artistId, requestId: \`artist-correction-\${artistId}-\${Date.now()}\` },
  { priority: 6, attempts: 3, backoff: { type: 'exponential', delay: 2000 } }
);
```

## Files Modified

**src/lib/correction/artist/apply/types.ts**
- Added discogsId to ArtistExternalIdSelections
- Added imageUrl to ArtistMetadataSelections
- Updated createDefaultArtistSelections

**src/lib/correction/artist/apply/apply-service.ts**
- Added queue imports
- Added CorrectionSource type
- Added determineSource method
- Updated buildArtistUpdateData for source-conditional logic
- Added queueImageUpload method
- Updated logCorrection with preview parameter and dynamic source
- Updated buildAuditPayload with source parameter
- Updated buildAppliedChanges with source parameter

## Commits

- `f8b45ed`: feat(25-02): add discogsId and imageUrl to artist field selections
- `ee9eb45`: feat(25-02): update artist apply service for Discogs source support

## Deviations from Plan

None - plan executed exactly as written.

## Next Phase Readiness

Ready for Plan 25-03: GraphQL resolver routing to wire up the source parameter from UI to apply service.
