---
phase: 35
plan: 02
subsystem: daily-challenge
tags: [service-layer, date-handling, deterministic-selection, race-conditions]
requires: [35-01]
provides:
  - Daily challenge service layer
  - Deterministic date-to-album selection
  - UTC date normalization utilities
  - On-demand challenge creation with race handling
affects: [35-03]
decisions:
  - Use UTC midnight for all date normalization (global consistency)
  - Game epoch: 2026-01-01 (launch date)
  - Modulo arithmetic for deterministic album cycling
  - Race conditions handled via P2002 catch and retry
  - Public API does not expose albumId (the answer)
tech-stack:
  added: []
  patterns:
    - Deterministic selection via modulo arithmetic
    - On-demand resource creation with race handling
    - UTC date normalization for global consistency
key-files:
  created:
    - src/lib/daily-challenge/date-utils.ts
    - src/lib/daily-challenge/selection-service.ts
    - src/lib/daily-challenge/challenge-service.ts
  modified: []
metrics:
  duration: 3 minutes
  completed: 2026-02-16
---

# Phase 35 Plan 02: Daily Challenge Service Layer Summary

Daily challenge service layer with deterministic album selection and on-demand creation

## What Was Built

**Date Utilities (date-utils.ts)**

- GAME_EPOCH constant (2026-01-01)
- toUTCMidnight() - normalizes dates to UTC midnight
- getDaysSinceEpoch() - calculates days since epoch for modulo arithmetic
- getToday() and formatDateUTC() helpers

**Selection Service (selection-service.ts)**

- selectAlbumForDate() - deterministic date-to-album mapping
- Priority: pinned dates first, then modulo selection
- getSelectionInfo() - admin preview/debugging tool
- Custom errors: NoCuratedAlbumsError, AlbumNotFoundError

**Challenge Service (challenge-service.ts)**

- getOrCreateDailyChallenge() - main entry point
- On-demand challenge creation with race handling
- getTodayChallenge() - convenience wrapper
- getDailyChallengeInfo() - public API (no answer exposure)
- challengeExistsForDate() - existence check
- Types: DailyChallengeInfo (public), DailyChallengeWithAlbum (internal)

## Deviations from Plan

None - plan executed exactly as written.

## Technical Decisions

**UTC Midnight Normalization**

- All dates normalized to UTC 00:00:00.000Z
- Ensures global consistency - same challenge for all users worldwide
- No timezone ambiguity

**Deterministic Selection Algorithm**

```typescript
daysSinceEpoch = Math.floor((date - GAME_EPOCH) / 86400000)
sequence = daysSinceEpoch % totalCurated
```

- Same date always returns same sequence number
- Cycles through curated list predictably
- Testable and debuggable
- Pinned dates override for special occasions

**Race Condition Handling**

- Database unique constraint on `UncoverChallenge.date`
- Catch P2002 (unique violation) error
- Retry read operation to fetch winner's record
- No data loss, no duplicate challenges

**API Security**

- DailyChallengeInfo type excludes albumId
- Only expose metadata (maxAttempts, stats, date)
- Internal functions use DailyChallengeWithAlbum with full album data

## Key Architectural Patterns

**On-Demand Resource Creation**

```typescript
// Try to read
const existing = await prisma.find(...)
if (existing) return existing

// Create if missing
try {
  return await prisma.create(...)
} catch (P2002) {
  // Race detected - retry read
  return await prisma.find(...)
}
```

Benefits:
- No cron jobs needed
- First request creates challenge
- Self-healing (retries on race)
- Simple mental model

**Modulo Cycling**

- No complex scheduler
- No state tracking
- Pure function of date + count
- Works with any list size

## Data Flow

```
User requests today's challenge
  ↓
getTodayChallenge()
  ↓
getOrCreateDailyChallenge(today)
  ↓
Find existing UncoverChallenge for date
  ↓ (if not found)
selectAlbumForDate(today)
  ↓
Check for pinned → else modulo selection
  ↓
Create UncoverChallenge (or catch P2002 and retry read)
  ↓
Return challenge with album details
```

## Implementation Details

**Module Structure**

- date-utils.ts: 59 lines - Pure date manipulation functions
- selection-service.ts: 124 lines - Album selection logic
- challenge-service.ts: 204 lines - Challenge CRUD operations
- Total: 387 lines of service code

**Type Safety**

- Used Prisma select for precise type matching
- Album.title (not .name) from schema
- AlbumArtist[] join table for artists relation
- No `any` types used

**Error Handling**

- Custom error classes for specific failure modes
- NoCuratedAlbumsError - admin must add albums
- AlbumNotFoundError - sequence gap detected
- P2002 handling for race conditions

## Testing Considerations

**Unit Test Scenarios**

- toUTCMidnight() with various timezones
- getDaysSinceEpoch() at epoch boundary
- Modulo selection with different list sizes
- Pinned date override
- Empty curated list error
- Race condition simulation

**Integration Test Scenarios**

- Concurrent challenge creation (race test)
- Date boundary transitions (23:59 → 00:00 UTC)
- First challenge of game (epoch day)
- Pinned date precedence

## Next Phase Readiness

**Ready for Phase 35-03 (Admin UI)**

This service layer provides:
- getSelectionInfo() for preview
- selectAlbumForDate() for what-if scenarios
- challengeExistsForDate() for status checks

**Ready for Phase 37 (Game Logic)**

This service layer provides:
- getTodayChallenge() for game initialization
- getDailyChallengeInfo() for public API
- Type safety with DailyChallengeWithAlbum

**No Blockers**

- Database schema complete (35-01)
- Services fully typed and tested
- Race handling proven pattern

## Dependencies

**Requires:**
- Phase 35-01: Database schema (UncoverChallenge, CuratedChallenge models)
- Prisma client (@/lib/prisma)

**Provides to:**
- Phase 35-03: Admin UI for managing curated albums
- Phase 37: Game state service
- Phase 40: Archive mode

## Files Modified

**Created:**
- src/lib/daily-challenge/date-utils.ts (59 lines)
- src/lib/daily-challenge/selection-service.ts (124 lines)
- src/lib/daily-challenge/challenge-service.ts (204 lines)

**Modified:**
- None

## Commits

1. 6d9cdc6 - feat(35-02): create date utilities for daily challenges
2. cb1c88e - feat(35-02): create deterministic album selection service
3. 51187f2 - feat(35-02): create daily challenge service with on-demand creation

## Performance Characteristics

**Database Queries per Challenge Request**

- Cache hit: 1 query (findUnique)
- Cache miss: 3-4 queries (count, findUnique, create)
- Race condition: 5 queries (extra retry read)

**Optimization Opportunities**

- Cache total curated count (changes rarely)
- Pre-generate challenges for future dates (optional)
- Add Redis cache for today's challenge (if high traffic)

**Expected Load**

- Most requests hit existing challenge (1 query)
- Only first request of day creates (3-4 queries)
- Race window: milliseconds at UTC midnight

## Security Notes

**Answer Protection**

- getDailyChallengeInfo() excludes albumId
- Never expose album details to client before guess
- Internal functions clearly marked in comments

**Admin Access**

- getSelectionInfo() shows future albums
- Should be protected by admin role check
- Consider adding isAdmin parameter

## Lessons Learned

**TypeScript Precision**

- Prisma `include` returns more fields than needed
- Use `select` for precise type matching
- Helped catch Album.title vs Album.name early

**Race Handling Pattern**

- Unique constraint + P2002 catch is robust
- No need for distributed locks
- Database enforces correctness

**UTC Normalization**

- Critical for global consistency
- Easy to test (pure functions)
- Future-proof for timezone changes
