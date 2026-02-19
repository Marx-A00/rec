---
phase: 37
plan: 02
subsystem: graphql-api
completed: 2026-02-15
duration: 4m
tags: [graphql, schema, mutations, codegen, react-query]

# Dependency graph
requires:
  - 35-02  # Daily challenge system (UncoverChallenge, UncoverSession models)
  - 33-01  # Database schema (Prisma models)
provides:
  - GraphQL game mutation types (StartSessionResult, GuessResult, UncoverGuessInfo)
  - Client operations file (uncoverGame.graphql)
  - Generated React Query hooks (useStartUncoverSessionMutation, useSubmitGuessMutation, useSkipGuessMutation)
affects:
  - 37-03  # Mutation resolvers will implement these schemas

# Tech stack tracking
tech-stack:
  added: []
  patterns:
    - GraphQL schema extension pattern
    - Fragment composition pattern
    - React Query mutation hooks

# File tracking
key-files:
  created:
    - src/graphql/queries/uncoverGame.graphql
  modified:
    - src/graphql/schema.graphql
    - src/generated/graphql.ts
    - src/generated/resolvers-types.ts

decisions:
  - id: GAME-SCHEMA-01
    what: Use minimal album info types for guesses (UncoverGuessAlbumInfo)
    why: Reduce payload size, only expose necessary fields for display
    alternatives: Reuse full Album type
    chosen: Minimal type
  
  - id: GAME-SCHEMA-02
    what: GuessResult returns correctAlbum only when gameOver is true
    why: Prevent answer leakage, only reveal after completion
    alternatives: Never return answer, separate query
    chosen: Conditional return in mutation response
  
  - id: GAME-SCHEMA-03
    what: Session includes guesses array in UncoverSessionInfo
    why: Client needs guess history for display, avoid separate query
    alternatives: Separate query for guesses
    chosen: Include in session type
---

# Phase 37 Plan 02: GraphQL Schema & Operations Summary

**One-liner:** GraphQL mutation schema and client operations for game actions with generated React Query hooks

## What Was Built

Extended GraphQL schema with game mutation types and created client-side operations file for the Uncover daily challenge game.

**Schema additions:**
- UncoverGuessAlbumInfo type - Minimal album info for guess display (id, title, cloudflareImageId, artistName)
- UncoverGuessInfo type - Individual guess data (guessNumber, guessedAlbum, isSkipped, isCorrect, guessedAt)
- StartSessionResult type - Response for starting new session (session, challengeId, imageUrl)
- GuessResult type - Response for guess/skip actions (guess, session, gameOver, correctAlbum)
- Added guesses field to UncoverSessionInfo type
- Three mutations: startUncoverSession, submitGuess, skipGuess

**Client operations:**
- Fragment-based composition (UncoverGuessAlbumFields, UncoverGuessFields, UncoverSessionFields)
- Three mutations with proper variable typing
- Reusable fragments for nested data

**Generated artifacts:**
- useStartUncoverSessionMutation hook
- useSubmitGuessMutation hook (sessionId, albumId params)
- useSkipGuessMutation hook (sessionId param)
- TypeScript types for all schema additions

## Task Breakdown

**Task 1: Add game mutation types to GraphQL schema**
- Status: Complete
- Duration: ~2m
- Commit: 93fb503
- Files: src/graphql/schema.graphql
- Outcome: 4 new types, 3 mutations, guesses field added to UncoverSessionInfo

**Task 2: Create client-side GraphQL operations**
- Status: Complete
- Duration: ~1m
- Commit: 41eb811
- Files: src/graphql/queries/uncoverGame.graphql
- Outcome: 3 fragments, 3 mutations with proper composition

**Task 3: Run GraphQL codegen**
- Status: Complete
- Duration: ~1m
- Commit: 7995070
- Files: src/generated/graphql.ts, src/generated/resolvers-types.ts
- Outcome: Generated React Query hooks and TypeScript types, type-check passes

## Technical Approach

**Schema design:**
- Minimal types (UncoverGuessAlbumInfo) reduce payload size
- GuessResult conditionally returns correctAlbum only when gameOver is true
- Session includes guesses array to avoid separate query

**Fragment composition:**
- Bottom-up approach: Album fields → Guess fields → Session fields
- Reusable fragments reduce duplication
- Follows existing codebase pattern (dailyChallenge.graphql)

**Codegen integration:**
- Generated hooks match naming convention (use*Mutation)
- TypeScript types auto-generated from schema
- React Query integration automatic

## Deviations from Plan

None - plan executed exactly as written.

## Testing Notes

Verification completed:
- pnpm codegen completed without errors
- pnpm type-check passed (no TypeScript errors)
- Generated hooks verified: useStartUncoverSessionMutation, useSubmitGuessMutation, useSkipGuessMutation
- Generated types verified: GuessResult, UncoverGuessInfo

Ready for Plan 03 (mutation resolvers) to implement business logic.

## Next Phase Readiness

**Blockers:** None

**Risks:** None

**Dependencies satisfied:**
- Phase 35 daily challenge system provides UncoverChallenge and UncoverSession models
- Phase 33 database schema provides Prisma types
- GraphQL context with authentication (context.user) exists

**Ready for Plan 03:**
- Schema types defined and validated
- Client operations ready for resolver implementation
- Generated hooks ready for component integration (Plan 04+)

## Performance Notes

**Schema efficiency:**
- Minimal album types reduce over-fetching
- Fragment composition enables client-side caching
- Single mutation returns updated session state (no additional queries needed)

**Generated code:**
- React Query hooks provide automatic caching, retry, and error handling
- TypeScript types ensure type safety at compile time
- Codegen runs in < 10 seconds

## Lessons Learned

**What went well:**
- Fragment composition pattern from existing codebase (dailyChallenge.graphql) was easy to follow
- Codegen automatically generated all necessary hooks and types
- Minimal types (UncoverGuessAlbumInfo) keep schema focused

**What could be improved:**
- Schema file had duplicate type definitions (UncoverSessionInfo, UncoverSessionStatus) from previous phase
- Python script approach for file editing was more reliable than awk/sed

**For future phases:**
- Continue using fragment composition for nested types
- Consider schema linting to catch duplicates
- Generate types early in phase to catch schema errors
