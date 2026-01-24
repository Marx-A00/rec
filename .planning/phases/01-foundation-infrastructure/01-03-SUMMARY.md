---
phase: 01-foundation-infrastructure
plan: 03
subsystem: infrastructure
tags: [error-handling, queue, observability, musicbrainz]

# Dependency graph
requires:
  - 01-01: Priority queue foundation (PRIORITY_TIERS used in queue inspection)
provides:
  - Structured error types for MusicBrainz API failures
  - Queue position observability for debugging
  - Consistent error format for UI interpretation
affects:
  - 02: Admin UI (will use error codes for user feedback)
  - 03: Search/comparison (will display queue position)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Structured error types with categorization codes
    - Factory methods for error creation
    - Type guards for error handling
    - Queue position polling

# File tracking
key-files:
  created: []
  modified:
    - src/lib/musicbrainz/errors.ts
    - src/lib/musicbrainz/queue-service.ts
    - src/lib/queue/processors/index.ts
    - src/lib/queue/processors/utils.ts

# Decisions made
decisions:
  - id: error-code-categories
    context: Need consistent error categorization for admin UI
    choice: Seven error codes (RATE_LIMITED, NOT_FOUND, INVALID_MBID, NETWORK_ERROR, TIMEOUT, SERVICE_ERROR, UNKNOWN)
    rationale: Covers all MusicBrainz API failure modes with actionable categories
  - id: structured-error-class
    context: Legacy error classes exist, need new structured format
    choice: Add MusicBrainzApiError alongside existing classes for backward compatibility
    rationale: Gradual migration without breaking existing code

# Metrics
metrics:
  duration: 7min
  completed: 2026-01-24
---

# Phase 01 Plan 03: Error Handling & Queue Observability Summary

**One-liner:** Structured MusicBrainz error types with categorized codes and queue position visibility for admin debugging.

## What Was Built

### 1. Structured Error Types (errors.ts)

Added `MusicBrainzApiError` class with categorization:

- **Error codes:** `RATE_LIMITED | NOT_FOUND | INVALID_MBID | NETWORK_ERROR | TIMEOUT | SERVICE_ERROR | UNKNOWN`
- **Properties:** `code`, `statusCode`, `retryable`, `retryAfterMs`
- **Factory methods:** `fromStatus()`, `networkError()`, `timeout()`, `fromLegacyError()`
- **Type guard:** `isMusicBrainzApiError()`
- **Converter:** `toMusicBrainzApiError()` - converts any error to structured format

Preserved existing legacy error classes for backward compatibility.

### 2. Queue Position Observability (queue-service.ts)

Added methods to `QueuedMusicBrainzService`:

- **`getQueuePosition(jobId)`** - Returns position, counts, and estimated wait time
  - Position is 1-indexed for user display
  - Estimated wait based on 1 req/sec rate limit
  - Returns null if job not found or completed

- **`getQueueSummary()`** - Returns breakdown by priority tier
  - Jobs grouped by priority (ADMIN=1, USER=5, ENRICHMENT=8, BACKGROUND=10)
  - Total waiting count
  - Oldest job age for staleness detection

### 3. Processor Error Handling (processors/index.ts, utils.ts)

Updated job processor to use structured errors:

- Added `toStructuredJobError()` function in utils.ts
- Job results now include `error.code`, `error.retryable`, `error.retryAfterMs`
- Error logging shows structured code and retryable status
- Consistent error format for UI interpretation

## Technical Details

### Error Code Mapping

| HTTP Status | Error Code | Retryable | Retry After |
|-------------|------------|-----------|-------------|
| 400 | INVALID_MBID | No | - |
| 404 | NOT_FOUND | No | - |
| 429, 503 | RATE_LIMITED | Yes | 5000ms |
| 500, 502, 504 | SERVICE_ERROR | Yes | 10000ms |
| Network errors | NETWORK_ERROR | Yes | 3000ms |
| Timeout | TIMEOUT | Yes | 5000ms |

### Queue Position Interface

```typescript
interface QueuePositionInfo {
  position: number;      // 1-indexed, 0 if currently processing
  waitingCount: number;  // Total jobs waiting
  activeCount: number;   // Jobs currently processing
  estimatedWaitMs: number; // position * 1000 (1 req/sec)
}
```

## Commits

- `edba4cb`: Add structured MusicBrainz API error types
- `fe30359`: Add queue position observability methods  
- `4849785`: Use structured errors in processor error handling

## Files Modified

- `src/lib/musicbrainz/errors.ts` - Added MusicBrainzApiError class and helpers
- `src/lib/musicbrainz/queue-service.ts` - Added getQueuePosition, getQueueSummary
- `src/lib/queue/processors/index.ts` - Updated error handling to use structured format
- `src/lib/queue/processors/utils.ts` - Added toStructuredJobError and re-exports

## Deviations from Plan

None - plan executed exactly as written.

## Next Phase Readiness

**Phase 1 Complete:** All three foundation plans (01-01, 01-02, 01-03) are now complete.

Ready for Phase 2 (Admin Correction UI) with:
- Priority queue system for admin priority handling
- MBID verification with redirect detection
- Structured error types for clear user feedback
- Queue observability for debugging slow responses

**Blockers:** None identified.
