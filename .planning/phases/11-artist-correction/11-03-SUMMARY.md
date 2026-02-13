---
phase: 11-artist-correction
plan: 03
subsystem: artist-correction
tags: [apply-service, graphql, atomic-updates, audit-logging]
dependency-graph:
  requires: ['11-01', '11-02']
  provides:
    [
      'artist-apply-service',
      'artist-correction-graphql',
      'artist-audit-logging',
    ]
  affects: ['11-04']
tech-stack:
  added: []
  patterns:
    [
      'serializable-isolation',
      'optimistic-locking',
      'audit-logging',
      'singleton-factory',
    ]
key-files:
  created:
    - src/lib/correction/artist/apply/types.ts
    - src/lib/correction/artist/apply/apply-service.ts
    - src/lib/correction/artist/apply/index.ts
    - src/graphql/queries/artistCorrection.graphql
  modified:
    - src/graphql/schema.graphql
    - src/lib/graphql/resolvers/queries.ts
    - src/lib/graphql/resolvers/mutations.ts
    - src/generated/graphql.ts
    - src/generated/resolvers-types.ts
decisions:
  - key: biography-for-disambiguation
    choice: Store MusicBrainz disambiguation in Artist.biography field
    reason: Artist model lacks dedicated disambiguation field, biography serves similar purpose
  - key: formed-year-from-begin-date
    choice: Extract year from lifeSpan.begin and store in formedYear
    reason: Artist model stores formation year as integer, not full date
  - key: preview-before-apply
    choice: Generate preview inside artistCorrectionApply mutation
    reason: Consistent with album correction pattern - ensures selections match current preview
metrics:
  duration: 8.5min
  completed: 2026-01-28
---

# Phase 11 Plan 03: Artist Apply Service and GraphQL Summary

Artist apply service with atomic updates, audit logging, and complete GraphQL integration for search/preview/apply operations.

## One-liner

ArtistCorrectionApplyService uses Serializable isolation with optimistic locking, logs to enrichment_logs, and exposes all operations via GraphQL with admin role enforcement.

## What Was Built

**Task 1: Artist Apply Types and Service**

Types (`src/lib/correction/artist/apply/types.ts`):

- `ArtistMetadataSelections`: Field-by-field selection for name, disambiguation, countryCode, artistType, area, beginDate, endDate, gender
- `ArtistExternalIdSelections`: Selection for musicbrainzId, ipi, isni
- `ArtistFieldSelections`: Combined metadata and external ID selections
- `ArtistApplyInput`: Input with artistId, preview, selections, expectedUpdatedAt, adminUserId
- `ArtistApplyResult`: Union type (success with artist/changes or failure with error)
- `ArtistAppliedChanges`: Summary of what was updated
- `ArtistAuditLogPayload`: Before/after deltas for enrichment log

Service (`src/lib/correction/artist/apply/apply-service.ts`):

- `ArtistCorrectionApplyService.applyCorrection()`:
  - Fetches current artist for audit "before" state
  - Transaction with Serializable isolation level
  - Optimistic locking check against expectedUpdatedAt
  - Builds update data from preview + selections
  - Sets dataQuality: HIGH, enrichmentStatus: COMPLETED
  - Counts affected albums via albumArtist join
  - Post-transaction: creates enrichmentLog with entityType: 'ARTIST'
- `StaleDataError` for concurrent modification detection
- `getArtistCorrectionApplyService()` HMR-safe singleton factory

**Task 2: GraphQL Schema and Resolvers**

Schema additions:

- `ArtistTopRelease`, `ArtistCorrectionSearchResult`, `ArtistCorrectionSearchResponse` types
- `ArtistFieldDiff`, `ArtistPreviewSummary`, `ArtistCorrectionPreview` types
- `ArtistAppliedChanges`, `ArtistCorrectionApplyResult` types
- `ArtistMetadataSelectionsInput`, `ArtistExternalIdSelectionsInput`, `ArtistFieldSelectionsInput` inputs
- `ArtistCorrectionApplyInput` input

Query operations:

- `artistCorrectionSearch(query: String!, limit: Int)`: Returns artist search results with top releases
- `artistCorrectionPreview(artistId: UUID!, artistMbid: UUID!)`: Returns preview with diffs and album count

Mutation operation:

- `artistCorrectionApply(input: ArtistCorrectionApplyInput!)`: Applies selected corrections atomically

Query resolvers (`queries.ts`):

- `artistCorrectionSearch`: Admin role check, calls search service, maps response
- `artistCorrectionPreview`: Admin role check, calls preview service, maps response

Mutation resolver (`mutations.ts`):

- `artistCorrectionApply`: Admin role check, generates preview, maps selections, calls apply service

Client queries (`artistCorrection.graphql`):

- `SearchArtistCorrectionCandidates` query
- `GetArtistCorrectionPreview` query
- `ApplyArtistCorrection` mutation

Generated hooks:

- `useSearchArtistCorrectionCandidatesQuery`
- `useGetArtistCorrectionPreviewQuery`
- `useApplyArtistCorrectionMutation`

## Commits

- `0d3efa6` - feat(11-03): add artist correction apply service
- `919ef63` - feat(11-03): add artist correction GraphQL schema and resolvers

## Verification

- `pnpm codegen`: Passes, generates types and hooks
- `pnpm type-check`: Passes, all services compile
- Schema includes all three operations (artistCorrectionSearch, artistCorrectionPreview, artistCorrectionApply)
- Generated file includes `useSearchArtistCorrectionCandidatesQuery`
- All resolvers have admin role checks (`isAdmin(user.role)`)

## Decisions Made

- **biography-for-disambiguation**: Store MusicBrainz disambiguation in Artist.biography field since no dedicated field exists
- **formed-year-from-begin-date**: Extract year from lifeSpan.begin partial date and store in Artist.formedYear
- **preview-before-apply**: Mutation generates preview internally (consistent with album correction pattern)

## Deviations from Plan

None - plan executed exactly as written.

## Next Phase Readiness

**Ready for 11-04 (Artist Correction UI)**

Prerequisites met:

- GraphQL hooks generated for search, preview, and apply
- All three operations exposed with admin role enforcement
- Apply service handles atomic updates with audit logging

No blockers identified.
