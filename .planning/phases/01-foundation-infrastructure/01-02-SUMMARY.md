---
phase: 01-foundation-infrastructure
plan: 02
subsystem: musicbrainz-integration
tags: [mbid, verification, redirect-detection, type-safety]

dependency_graph:
  requires: []
  provides: [mbid-verification-utility, lookup-handler-verification]
  affects: [01-03, 02-01]

tech_stack:
  added: []
  patterns: [type-guard, generic-wrapper, result-wrapper]

key_files:
  created:
    - src/lib/musicbrainz/mbid-verifier.ts
  modified:
    - src/lib/musicbrainz/index.ts
    - src/lib/queue/processors/musicbrainz-processor.ts

decisions:
  - key: verification-wrapper-pattern
    choice: 'Generic MbidVerificationResult<T> wrapper that preserves original data'
    rationale: 'Allows downstream code to access data.wasRedirected without changing return types'

metrics:
  duration: 2.5min
  completed: 2026-01-23
---

# Phase 01 Plan 02: MBID Verification Utility Summary

**One-liner:** MBID redirect detection via verifyMbid wrapper comparing requested vs returned IDs

## What Was Built

Created MBID verification utility that detects when MusicBrainz returns a redirected (canonical) MBID different from the requested one.

**Key Deliverables:**

- `src/lib/musicbrainz/mbid-verifier.ts` - Core verification utility
  - `MbidVerificationResult<T>` interface wrapping data with redirect metadata
  - `verifyMbid<T>()` generic function comparing requested vs returned MBIDs
  - `hasIdProperty()` type guard for safe verification
  - Console warning logged on redirect detection

- Updated `src/lib/queue/processors/musicbrainz-processor.ts`
  - Four lookup handlers now wrap results with verification
  - handleLookupArtist, handleLookupRelease, handleLookupRecording, handleLookupReleaseGroup
  - Browse handler unchanged (returns list, not single entity by MBID)

## Implementation Details

The verification pattern:

1. Lookup handler calls MusicBrainz API with requested MBID
2. Result is passed through `verifyMbid(requestedMbid, result)`
3. Function compares `requestedMbid !== result.id`
4. Returns `MbidVerificationResult` with:
   - `data`: Original MusicBrainz response
   - `requestedMbid`: What was requested
   - `returnedMbid`: What was returned
   - `wasRedirected`: Boolean flag

**Type Safety:**

- Generic `<T extends { id: string }>` ensures only objects with id property are verified
- `hasIdProperty()` type guard for runtime checking before verification

## Decisions Made

- **Verification Wrapper Pattern**: Used generic wrapper that preserves original data rather than modifying the response structure. This allows gradual adoption - existing code accessing response directly still works.

- **Browse Handler Excluded**: Browse operations query by artist MBID but return a list of release groups with their own IDs. Verification not applicable.

- **Console Warning**: Simple console.warn for redirect detection. Future phases may add metrics/alerting.

## Deviations from Plan

None - plan executed exactly as written.

## Files Changed

**Created:**

- `src/lib/musicbrainz/mbid-verifier.ts` (new file, 65 lines)

**Modified:**

- `src/lib/musicbrainz/index.ts` (added exports)
- `src/lib/queue/processors/musicbrainz-processor.ts` (verification integration)

## Verification Results

- `pnpm type-check` - PASSED
- `pnpm lint` - PASSED (modified file clean)
- Export verification - PASSED (verifyMbid, MbidVerificationResult exported)
- Import link verification - PASSED (processor imports from musicbrainz)

## Next Phase Readiness

**Provides for 01-03:**

- MbidVerificationResult type for redirect-aware operations
- verifyMbid function for any lookup operation

**Ready for Phase 2:**

- Lookup handlers now return redirect metadata
- Downstream code can check `.wasRedirected` to identify stale MBIDs
