---
phase: 37
plan: 01
subsystem: game-state
tags: [zustand, state-management, validation, game-logic]
requires: [33-01, 35-01, 36-01]
provides:
  - Client game state management (Zustand store)
  - Server-side validation utilities
affects: [37-02, 37-03, 38-01]
tech-stack:
  added: []
  patterns:
    - Zustand slices pattern for modular state
    - Persist middleware with partialize
    - Server-side validation functions
key-files:
  created:
    - src/stores/useUncoverGameStore.ts
    - src/lib/uncover/game-validation.ts
  modified: []
decisions:
  - id: 37-01-slices
    title: Use Zustand slices pattern for game state
    rationale: Separates concerns (session, guesses, UI) and follows existing codebase pattern
  - id: 37-01-partialize
    title: Persist only session and guesses, not UI state
    rationale: UI state (isSubmitting, error) is ephemeral and should not survive page refresh
  - id: 37-01-validation
    title: Server-side validation for all game actions
    rationale: Client validation alone allows cheating via DevTools
metrics:
  duration: 2 minutes
  completed: 2026-02-16
---

# Phase 37 Plan 01: Game State & Validation Summary

**One-liner:** Zustand store with session/guesses/UI slices and server-side validation for game rules (AUTH-01, GAME-02/05/06/10, DAILY-03)

## What Was Built

Created the foundation for game state management and validation:

**Client State (Zustand Store):**
- **SessionSlice:** Tracks current session (sessionId, challengeId, status, attemptCount, won)
- **GuessesSlice:** Manages guess history with add/set/clear actions
- **UISlice:** Ephemeral UI state (isSubmitting, error) for form handling
- **Persist middleware:** Syncs session and guesses to localStorage, excludes UI state

**Server Validation:**
- **validateSessionStart:** Enforces AUTH-01 (authentication required)
- **validateGuess:** Checks DAILY-03 (IN_PROGRESS), GAME-02/06 (max attempts), GAME-10 (no duplicates)
- **validateSkip:** Validates session status and attempt limits
- **calculateGameResult:** Implements GAME-05 (win) and GAME-06 (loss) conditions

## Technical Implementation

**Zustand Store Pattern:**
```typescript
// Slices pattern for separation of concerns
const createSessionSlice = (set: any): SessionSlice => ({ ... });
const createGuessesSlice = (set: any): GuessesSlice => ({ ... });
const createUISlice = (set: any): UISlice => ({ ... });

// Combined with persist middleware
export const useUncoverGameStore = create<UncoverGameStore>()(
  persist(
    (set, get) => ({
      ...createSessionSlice(set),
      ...createGuessesSlice(set),
      ...createUISlice(set),
    }),
    {
      name: 'uncover-game-state',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ /* only session and guesses */ }),
    }
  )
);
```

**Validation Pattern:**
```typescript
// Server-side validation with clear error messages
export function validateGuess(
  session: SessionWithGuesses,
  albumId: string,
  maxAttempts: number
): ValidationResult {
  if (session.status !== 'IN_PROGRESS') {
    return { valid: false, error: 'This game has already been completed' };
  }
  // ... additional validations
}
```

## Requirements Coverage

**Implemented:**
- AUTH-01: Authentication required (validateSessionStart)
- GAME-02: Attempt counting (validateGuess checks)
- GAME-05: Win condition (calculateGameResult)
- GAME-06: Loss condition (calculateGameResult)
- GAME-10: No duplicate guesses (validateGuess checks previous guesses)
- DAILY-03: Cannot replay completed session (status validation)

**Deferred to next plans:**
- GraphQL mutations using these validations
- UI components consuming the Zustand store
- Optimistic updates with React Query

## Key Design Decisions

**1. Slices Pattern (Decision 37-01-slices)**
- Separates state into logical domains (session, guesses, UI)
- Follows existing codebase pattern (useRevealStore, useSearchStore)
- Improves maintainability as game features expand

**2. Partial Persistence (Decision 37-01-partialize)**
- Session and guesses persist to localStorage (mid-game resume)
- UI state excluded (isSubmitting, error are ephemeral)
- Prevents stale loading states after page refresh

**3. Server-Side Validation (Decision 37-01-validation)**
- All game rules validated server-side (cannot be bypassed)
- Client validation deferred to UI components (UX optimization)
- User-friendly error messages for validation failures

## Files Modified

**Created:**
- `src/stores/useUncoverGameStore.ts` (126 lines)
  - Exports: useUncoverGameStore, SessionStatus, Guess, UncoverGameStore
- `src/lib/uncover/game-validation.ts` (163 lines)
  - Exports: validateSessionStart, validateGuess, validateSkip, calculateGameResult

**No files modified** - This plan creates new infrastructure without touching existing code.

## Integration Points

**For GraphQL Mutations (37-02):**
```typescript
import { validateGuess, calculateGameResult } from '@/lib/uncover/game-validation';

// In submitGuess resolver
const validation = validateGuess(session, albumId, maxAttempts);
if (!validation.valid) {
  throw new Error(validation.error);
}
```

**For UI Components (38-01):**
```typescript
import { useUncoverGameStore } from '@/stores/useUncoverGameStore';

function UncoverGame() {
  const gameStore = useUncoverGameStore();
  const { sessionId, attemptCount, status } = gameStore;
  // Use store state in UI
}
```

## Deviations from Plan

None - plan executed exactly as written.

## Next Phase Readiness

**Phase 37 Plan 02 (GraphQL Mutations) is ready:**
- Validation utilities exist and are importable
- Error messages defined for all validation failures
- Prisma models unchanged (no database migrations needed)

**Phase 38 (Game UI) is ready:**
- Zustand store provides all client state needed
- SessionStatus type exported for UI conditionals
- Guess interface exported for guess list rendering

**No blockers identified.**

## Testing Notes

**Type Safety Verified:**
- `pnpm type-check` passes with no errors
- All imports use proper TypeScript types
- Prisma types (UncoverSession, UncoverGuess) imported correctly

**Lint Checks:**
- Prettier formatting applied
- No ESLint errors in new files

**Manual Testing Deferred:**
- Store can be tested after GraphQL mutations implemented
- Validation functions will be tested via mutation integration tests

## Performance Considerations

**Zustand Store:**
- Minimal bundle size (3KB gzipped)
- Selective re-renders (components subscribe to specific state slices)
- localStorage sync is synchronous (negligible performance impact)

**Validation:**
- Validation functions are pure (no async operations)
- Database queries happen in GraphQL resolvers, not validation functions
- No N+1 query risks (validations use data already fetched)

## Links to Related Work

**Dependencies:**
- Phase 33-01: Prisma models (UncoverSession, UncoverGuess, UncoverSessionStatus)
- Phase 35-01: Daily challenge system (getTodayChallenge service)
- Phase 36-01: Reveal engine (will use attemptCount for stage calculation)

**Dependents:**
- Phase 37-02: GraphQL mutations will import validation functions
- Phase 37-03: Session management will use store actions
- Phase 38-01: Game UI will consume store state

**Related Patterns:**
- `src/stores/useRevealStore.ts` - Similar persist pattern
- `src/stores/useSearchStore.ts` - Similar slices pattern
