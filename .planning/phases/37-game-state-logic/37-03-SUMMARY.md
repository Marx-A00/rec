---
phase: 37
plan: 03
subsystem: game-logic
completed: 2026-02-15
duration: "10 minutes"

tech-stack:
  added: []
  patterns:
    - "Dynamic imports for circular dependency avoidance"
    - "Service layer pattern for business logic"
    - "GraphQL resolver authentication guards"

file-tracking:
  created:
    - src/lib/uncover/game-service.ts
  modified:
    - src/lib/graphql/resolvers/mutations.ts

key-decisions:
  - id: GAME-SERVICE-PATTERN
    decision: "Separate game service layer from GraphQL resolvers"
    rationale: "Enables testing, reuse, and clear separation of concerns"
    alternatives: "Inline logic in resolvers"
    
  - id: DYNAMIC-IMPORTS
    decision: "Use dynamic imports for game-service in resolvers"
    rationale: "Avoids circular dependencies, follows established pattern"
    alternatives: "Direct imports with restructuring"
    
  - id: ANSWER-SECURITY
    decision: "Only expose answer album when gameOver is true"
    rationale: "Prevents cheating by inspecting network responses"
    alternatives: "Client-side hiding (insecure)"

tags:
  - graphql
  - game-logic
  - mutations
  - authentication
  - validation
---

# Phase 37 Plan 03: Game State & Logic Summary

**One-liner:** Server-side game flow with startSession, submitGuess, skipGuess mutations enforcing all validation rules

## What Was Built

**Game Service (`src/lib/uncover/game-service.ts`)**
- `startSession(userId, prisma)` - Get/create session for today's challenge
  - Retrieves daily challenge via getOrCreateDailyChallenge()
  - Returns existing session (no replay) or creates new session
  - Increments challenge.totalPlays on new session
  - Returns session + challenge (with album image URLs for RevealImage)
  
- `submitGuess(sessionId, albumId, userId, prisma)` - Submit album guess
  - Validates user ownership (session.userId === userId)
  - Calls validateGuess() from game-validation.ts
  - Checks correctness: albumId === challenge.albumId
  - Creates UncoverGuess record with incremented guessNumber
  - Updates session state (attemptCount, status, won, completedAt)
  - Updates challenge stats on win (totalWins, avgAttempts)
  - Returns guess + session + gameOver + correctAlbum (only if gameOver)
  
- `skipGuess(sessionId, userId, prisma)` - Skip current guess
  - Validates user ownership
  - Calls validateSkip() from game-validation.ts
  - Creates UncoverGuess with guessedAlbumId = null
  - Updates session state (attemptCount, status, completedAt)
  - Returns guess + session + gameOver + correctAlbum (only if gameOver)

**GraphQL Mutation Resolvers (`src/lib/graphql/resolvers/mutations.ts`)**
- `startUncoverSession` - AUTH check, dynamic import, call startSession()
- `submitGuess` - AUTH check, dynamic import, call submitGuess()
- `skipGuess` - AUTH check, dynamic import, call skipGuess()
- `formatGuessResult()` helper - Shared formatting logic for guess results

## Game Rules Enforced

**From validation utilities:**
- GAME-02: Max 6 attempts (validateGuess, validateSkip)
- GAME-05: Win detection (albumId === challenge.albumId)
- GAME-06: Loss detection (attemptCount >= maxAttempts)
- GAME-10: No duplicate guesses (validateGuess checks previous guesses)
- DAILY-03: No replay (session status must be IN_PROGRESS)
- AUTH-01: Authentication required (all resolvers check user?.id)

**From service implementation:**
- Answer album only returned when gameOver is true (SECURITY)
- Challenge stats updated only on win
- Atomic database operations with proper includes

## Technical Patterns

**Service Layer Pattern:**
```typescript
// Clean separation: resolvers call service, service calls validation
const { startSession } = await import('@/lib/uncover/game-service');
const result = await startSession(user.id, prisma);
```

**Dynamic Imports:**
```typescript
// Avoids circular dependencies
const { submitGuess } = await import('@/lib/uncover/game-service');
```

**Authentication Guards:**
```typescript
if (!user?.id) {
  throw new GraphQLError('Authentication required to play');
}
```

**Session Ownership Validation:**
```typescript
if (session.userId !== userId) {
  throw new GraphQLError('You do not own this session');
}
```

**Answer Security:**
```typescript
// Only populate correctAlbum when game is over
let correctAlbumInfo = null;
if (gameResult.gameOver) {
  correctAlbumInfo = { id, title, cloudflareImageId, artistName };
}
```

## Type Safety

**No `any` types used** - All types properly defined:
- `SessionWithGuesses extends UncoverSession` - Prisma type extension
- `ChallengeWithAlbum` - Challenge with album relations
- `GuessedAlbumInfo` - Album info for responses
- `GuessServiceResult` - Interface for formatGuessResult helper

**Proper TypeScript patterns:**
- Used Prisma generated types (`UncoverSession`, `UncoverGuess`)
- Defined interfaces for service return types
- Type guards for error handling (`error instanceof GraphQLError`)

## Database Updates

**Session state transitions:**
```
IN_PROGRESS → WON (correct guess)
IN_PROGRESS → LOST (6 failed attempts)
IN_PROGRESS → IN_PROGRESS (ongoing game)
```

**Challenge stats updates (on win only):**
```typescript
const newAvgAttempts = 
  currentWins === 0
    ? newAttemptCount
    : (currentAvg * currentWins + newAttemptCount) / newTotalWins;
```

## Verification Results

**Type Check:** ✓ Passed
```bash
pnpm type-check
```

**Lint:** ✓ Passed (auto-fixed formatting)
```bash
pnpm lint:fix
```

**Service functions:** ✓ All three functions implemented and exportable
**Resolvers:** ✓ All three mutations registered in mutationResolvers

## Commits

**Task 1 - Game Service:**
```
ad48d4d feat(37-03): implement game service with business logic
```

**Task 2 - Mutation Resolvers:**
```
87a452b feat(37-03): add uncover game mutation resolvers
```

## Integration Points

**Dependencies:**
- `src/lib/uncover/game-validation.ts` - Validation utilities (Plan 01)
- `src/lib/daily-challenge/challenge-service.ts` - Daily challenge creation (Phase 35)
- `@prisma/client` - Database access
- `graphql` - GraphQLError for user-friendly errors

**Provides to:**
- Phase 37 Plan 04 (Frontend Integration) - Working mutations to call
- Phase 38 (Hint System) - Session state management
- Phase 39 (Reveal Engine) - Game over detection + answer exposure

## Next Phase Readiness

**Ready for frontend integration (Plan 04):**
- ✓ All three mutations callable via GraphQL
- ✓ Authentication enforced
- ✓ Validation rules applied server-side
- ✓ Answer security implemented
- ✓ Session state persisted correctly
- ✓ User-friendly error messages

**Blockers:** None

**Concerns:** None - all success criteria met

## Deviations from Plan

None - plan executed exactly as written.

## Dependencies Graph

**Requires:**
- 37-01: Validation utilities (validateGuess, validateSkip, calculateGameResult)
- 35-03: Daily challenge service (getOrCreateDailyChallenge)

**Provides:**
- Server-side game flow mutations
- Session state management
- Challenge stats tracking
- Answer security enforcement

**Affects:**
- 37-04: Frontend integration will consume these mutations
- 38-*: Hint system will extend session state
- 39-*: Reveal engine will use gameOver detection
