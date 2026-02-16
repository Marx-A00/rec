---
phase: 37
plan: 04
subsystem: game-coordination
tags: [zustand, graphql, mutations, game-logic, react-hooks]
requires: [37-01, 37-02, 37-03, 36-01]
provides:
  - useUncoverGame coordination hook
  - UncoverGame container component
  - Game lifecycle management
  - State synchronization layer
affects: [38-01, 38-02, 38-03]
tech-stack:
  added: []
  patterns:
    - Custom hook coordination pattern
    - GraphQL mutation integration
    - Optimistic state updates
    - Auto-start session on mount
key-files:
  created:
    - src/hooks/useUncoverGame.ts
    - src/components/uncover/UncoverGame.tsx
  modified:
    - src/components/uncover/index.ts
decisions: []
metrics:
  duration: "~7 minutes"
  completed: 2026-02-15
---

# Phase 37 Plan 04: Game Coordination Layer Summary

**One-liner:** Game coordination layer connecting Zustand store, GraphQL mutations, and reveal engine for working Uncover gameplay

## What Was Built

Created the coordination layer that wires together all Phase 37 components into a working game:

**1. useUncoverGame Hook (`src/hooks/useUncoverGame.ts`)**
- Coordinates GraphQL mutations (startSession, submitGuess, skipGuess) with Zustand store updates
- Manages loading and error states across mutations
- Calculates reveal stage from attempt count (stage 1-6 based on attempts)
- Exposes unified game state and actions to UI components
- Handles auth state from NextAuth session
- Returns computed values (isGameOver, revealStage)

**2. UncoverGame Container (`src/components/uncover/UncoverGame.tsx`)**
- Auth gate (AUTH-01): Shows login prompt for unauthenticated users
- Auto-starts session on mount for authenticated users
- Loading state during session initialization
- Game board for IN_PROGRESS sessions with:
  - RevealImage at current stage
  - Attempt counter
  - Previous guesses list
  - Skip button (GAME-04)
- Results screen for completed sessions (DAILY-03):
  - Win/loss message
  - Full reveal (stage 6, GAME-07)
  - Complete guess history
- Error handling with retry option

**3. Barrel Export Update**
- Added UncoverGame to barrel exports
- Component accessible via `@/components/uncover`

## Architecture Decisions

**Coordination Pattern:**
- Hook acts as coordination layer between mutations and store
- Mutations update server state, hook syncs results to client store
- Single source of truth: server state for persistence, Zustand for UI reactivity

**Reveal Stage Calculation:**
- Stage = Math.min(attemptCount + 1, 6)
- Stage 6 forced on game over (full reveal)
- Skips count as attempts, advancing stage

**Auto-Start Session:**
- useEffect triggers startGame when authenticated + no sessionId
- Prevents duplicate starts with isInitializing flag
- Resumes existing session if sessionId in localStorage

**Error Handling:**
- Dual error state: game store error + local hook error
- Mutations catch errors, set error state, re-throw for caller
- UI shows error message with retry option

## Requirements Satisfied

**AUTH-01:** Login required
- Unauthenticated users see login prompt
- Game only starts after authentication

**DAILY-03:** Cannot replay after completion
- Completed sessions show results screen, not game board
- isGameOver check prevents game board rendering

**GAME-03:** Reveal advances with attempts
- revealStage calculated from attemptCount
- Each guess/skip increments attemptCount, advancing stage

**GAME-04:** Skip guess functionality
- Skip button calls game.skipGuess()
- Skip counts as wrong guess, advances reveal

**GAME-07:** Full reveal on game end
- Results screen shows stage 6 (full reveal)
- RevealImage receives stage={6} when gameOver

## Dependencies

**Imports from Phase 37 Plans:**
- Plan 01: useUncoverGameStore (Zustand store)
- Plan 02: Generated GraphQL mutations (useStartUncoverSessionMutation, etc.)
- Plan 03: Server-side mutation resolvers

**Imports from Phase 36:**
- RevealImage component
- useRevealStore for reveal style preference

**Imports from Core:**
- NextAuth useSession for authentication
- React hooks (useEffect, useState, useCallback)

## Testing Notes

**Manual Testing Required:**
1. Visit game page unauthenticated → should show login prompt
2. Sign in → should auto-start session
3. Click skip → should advance reveal stage
4. Refresh page mid-game → should resume session (localStorage persistence)
5. Complete game → should show results with full reveal
6. Return next day → should reset for new challenge

**Type Safety:**
- All TypeScript checks pass
- Generated GraphQL types ensure type safety across mutations
- Zustand store types enforced

## Known Limitations

**Phase 38 Required:**
- Album search input not yet implemented (placeholder shown)
- Cannot actually submit guesses (only skip works)
- Phase 38 will add DualAlbumSearch integration

**No Optimistic Updates Yet:**
- Current implementation waits for server response
- Future enhancement could add optimistic guess rendering

**No Animation:**
- State transitions are instant
- Future enhancement could add fade-in for results, reveal transitions

## Next Phase Readiness

**Phase 38 (Album Search Integration):**
- UncoverGame provides skeleton ready for search input
- game.submitGuess() ready to receive albumId, albumTitle, artistName
- DualAlbumSearch can be dropped into placeholder div

**Phase 39 (Results & Stats):**
- Results screen provides foundation
- game.guesses array ready for stats calculation
- correctAnswer will be available when gameOver

**Phase 40 (Daily Challenge Page):**
- UncoverGame is self-contained, ready for /uncover route
- Auto-start behavior works for initial page load
- Session persistence handles refresh

## Deviations from Plan

None - plan executed exactly as written.

## Files Changed

**Created:**
- src/hooks/useUncoverGame.ts (253 lines)
- src/components/uncover/UncoverGame.tsx (275 lines)

**Modified:**
- src/components/uncover/index.ts (added UncoverGame export)

**Total:** 3 files, ~530 lines of new code

## Commits

1. `e8fb406` - feat(37-04): create useUncoverGame coordination hook
2. `f6784e4` - feat(37-04): create UncoverGame container component
3. `ee1e7e3` - feat(37-04): export UncoverGame from barrel file
