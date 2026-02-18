# Phase 37: Game State & Logic - Research

**Researched:** 2026-02-15
**Domain:** Game state management with Zustand, server-side validation, and session persistence
**Confidence:** HIGH

## Summary

Phase 37 implements the core game logic for the Uncover daily challenge, connecting the daily challenge system (Phase 35) and image reveal engine (Phase 36) into a playable game. The phase handles player interactions (guesses, skips), win/loss detection, state persistence, and server-side validation.

**Architecture approach:**
- **Client state**: Zustand store manages ephemeral game state (current reveal stage, guess history, UI state)
- **Server state**: PostgreSQL via Prisma tracks persistent session data (UncoverSession, UncoverGuess)
- **State sync**: GraphQL mutations update server and return updated state to client
- **Validation**: Server validates guesses, prevents cheating, enforces game rules
- **Persistence**: Mid-game state persists to database; client can refresh and resume

The codebase already has:
- Prisma models (UncoverChallenge, UncoverSession, UncoverGuess) from Phase 33
- Daily challenge service (deterministic selection, on-demand creation) from Phase 35
- Reveal engine Zustand store (reveal style preference) from Phase 36
- GraphQL context with authentication (context.user) for protected mutations

**Primary recommendation:** Use Zustand slices pattern for client game state (separate concerns: session, guesses, UI). Implement GraphQL mutations for game actions (startSession, submitGuess, skipGuess) with server-side validation. Use existing authentication context to enforce AUTH-01 (login required). Leverage React Query (already in codebase) for mutation state management and optimistic updates.

## Standard Stack

### Core

**Library** | **Version** | **Purpose** | **Why Standard**
--- | --- | --- | ---
Zustand | ^5.0.8 | Client game state | Already in codebase; lightweight (3KB); selective re-renders
Zustand persist middleware | 5.x | localStorage sync | Already in codebase (useRevealStore, useSearchStore); SSR-safe
Prisma | ^6.17.1 | Database ORM | Already in codebase; models exist from Phase 33
GraphQL (Apollo) | 16.x | API layer | Already in codebase; mutation-based validation pattern
TanStack Query (React Query) | v5 | Query/mutation state | Already in codebase; optimistic updates, cache management
NextAuth | v5 beta | Authentication | Already in codebase; GraphQL context integration

### Supporting

**Library** | **Version** | **Purpose** | **When to Use**
--- | --- | --- | ---
date-fns | N/A* | Date utilities | If native Date methods insufficient (currently not installed)
Zod | ^3.25.67 | Input validation | Already in codebase; validate mutation inputs
immer | Built into Zustand 5 | Immutable updates | If using Zustand immer middleware (optional)

*Note: Native Date methods are sufficient for UTC date operations needed in this phase.

### Alternatives Considered

**Instead of** | **Could Use** | **Tradeoff**
--- | --- | --- | ---
Zustand slices | Single flat store | Slices provide better organization for complex game state
Server validation | Client validation only | Client validation alone allows cheating via DevTools
GraphQL mutations | REST endpoints | GraphQL already used; mutations fit existing pattern
Optimistic updates | Wait for server | Optimistic updates improve perceived performance
React Query | Manual fetch | React Query handles loading/error states automatically

**Installation:**
```bash
# No new dependencies needed - all libraries already in package.json
```

## Architecture Patterns

### Recommended Project Structure

```
src/
├── components/
│   └── uncover/
│       ├── UncoverGame.tsx              # Main game container
│       ├── UncoverGameBoard.tsx         # Game board with reveal image
│       ├── UncoverGuessInput.tsx        # Album search + guess input
│       ├── UncoverGuessList.tsx         # Previous guesses display
│       ├── UncoverGameOver.tsx          # Win/loss result screen
│       └── UncoverSkipButton.tsx        # Skip guess button
├── stores/
│   └── useUncoverGameStore.ts           # Zustand game state (slices pattern)
├── lib/
│   └── uncover/
│       ├── game-service.ts              # Server-side game logic
│       └── game-validation.ts           # Server-side validation rules
├── graphql/
│   ├── schema.graphql                   # Add game mutations
│   └── queries/
│       └── uncover-game.graphql         # Client queries/mutations
└── lib/graphql/resolvers/
    └── mutations.ts                     # Add game mutation resolvers
```

### Pattern 1: Zustand Slices Pattern for Game State

**What:** Split game state into modular slices (session, guesses, UI) combined into single store
**When to use:** Complex state with multiple concerns; prevents monolithic store
**Example:**
```typescript
// Source: https://zustand.docs.pmnd.rs/guides/slices-pattern
// Pattern: https://github.com/pmndrs/zustand/blob/main/docs/guides/slices-pattern.md

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

// Session slice - tracks current game session
interface SessionSlice {
  sessionId: string | null;
  challengeId: string | null;
  status: 'IN_PROGRESS' | 'WON' | 'LOST';
  attemptCount: number;
  won: boolean;
  
  setSession: (session: { id: string; challengeId: string }) => void;
  updateAttemptCount: (count: number) => void;
  endSession: (won: boolean) => void;
  resetSession: () => void;
}

const createSessionSlice = (set: any): SessionSlice => ({
  sessionId: null,
  challengeId: null,
  status: 'IN_PROGRESS',
  attemptCount: 0,
  won: false,
  
  setSession: (session) => set({ 
    sessionId: session.id, 
    challengeId: session.challengeId,
    status: 'IN_PROGRESS' as const
  }),
  updateAttemptCount: (count) => set({ attemptCount: count }),
  endSession: (won) => set({ 
    status: won ? 'WON' as const : 'LOST' as const, 
    won 
  }),
  resetSession: () => set({
    sessionId: null,
    challengeId: null,
    status: 'IN_PROGRESS' as const,
    attemptCount: 0,
    won: false,
  }),
});

// Guesses slice - tracks guess history
interface GuessesSlice {
  guesses: Array<{ 
    guessNumber: number; 
    albumId: string; 
    albumTitle: string;
    isCorrect: boolean; 
  }>;
  
  addGuess: (guess: any) => void;
  clearGuesses: () => void;
}

const createGuessesSlice = (set: any): GuessesSlice => ({
  guesses: [],
  
  addGuess: (guess) => set((state: any) => ({
    guesses: [...state.guesses, guess]
  })),
  clearGuesses: () => set({ guesses: [] }),
});

// UI slice - ephemeral UI state
interface UISlice {
  isGuessing: boolean;
  showResults: boolean;
  
  setGuessing: (guessing: boolean) => void;
  setShowResults: (show: boolean) => void;
}

const createUISlice = (set: any): UISlice => ({
  isGuessing: false,
  showResults: false,
  
  setGuessing: (guessing) => set({ isGuessing: guessing }),
  setShowResults: (show) => set({ showResults: show }),
});

// Combine slices into single store
type UncoverGameStore = SessionSlice & GuessesSlice & UISlice;

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
      // Only persist session and guesses, not UI state
      partialize: (state) => ({
        sessionId: state.sessionId,
        challengeId: state.challengeId,
        status: state.status,
        attemptCount: state.attemptCount,
        won: state.won,
        guesses: state.guesses,
      }),
    }
  )
);
```

**Rationale:**
- Slices separate concerns (session vs guesses vs UI)
- Persist middleware syncs to localStorage (mid-game state survives refresh)
- `partialize` excludes ephemeral UI state from persistence
- Follows existing codebase pattern (useRevealStore, useSearchStore)

### Pattern 2: Server-Side Validation in GraphQL Mutations

**What:** Validate game actions server-side; never trust client; return validation errors
**When to use:** All game actions (guesses, skips, session creation)
**Example:**
```typescript
// Source: https://graphql.org/learn/authorization/
// Security: https://cheatsheetseries.owasp.org/cheatsheets/GraphQL_Cheat_Sheet.html

// In mutations.ts
export const submitGuess = async (
  _parent: unknown,
  args: { sessionId: string; albumId: string },
  context: GraphQLContext
) => {
  // AUTH-01: Require authentication
  if (!context.user) {
    throw new Error('Authentication required to play');
  }
  
  // Fetch session with challenge data
  const session = await context.prisma.uncoverSession.findUnique({
    where: { id: args.sessionId },
    include: { 
      challenge: true,
      guesses: { orderBy: { guessNumber: 'asc' } }
    },
  });
  
  if (!session) {
    throw new Error('Session not found');
  }
  
  // Validate: user owns this session
  if (session.userId !== context.user.id) {
    throw new Error('Not authorized to submit guess for this session');
  }
  
  // Validate: game not already over
  if (session.status !== 'IN_PROGRESS') {
    throw new Error('Game already completed');
  }
  
  // GAME-10: Prevent duplicate guesses (same album twice)
  const alreadyGuessed = session.guesses.some(
    g => g.guessedAlbumId === args.albumId
  );
  if (alreadyGuessed) {
    throw new Error('You have already guessed this album');
  }
  
  // Validate: not exceeded max attempts
  if (session.attemptCount >= session.challenge.maxAttempts) {
    throw new Error('Maximum attempts exceeded');
  }
  
  // Check if guess is correct (CRITICAL: answer is session.challenge.albumId)
  const isCorrect = args.albumId === session.challenge.albumId;
  const guessNumber = session.attemptCount + 1;
  
  // Create guess record
  const guess = await context.prisma.uncoverGuess.create({
    data: {
      sessionId: session.id,
      guessNumber,
      guessedAlbumId: args.albumId,
      isCorrect,
    },
    include: {
      guessedAlbum: {
        select: {
          id: true,
          title: true,
          cloudflareImageId: true,
          artists: {
            select: {
              artist: { select: { name: true } }
            }
          }
        }
      }
    }
  });
  
  // Update session state
  const newAttemptCount = guessNumber;
  const gameWon = isCorrect;
  const gameOver = gameWon || newAttemptCount >= session.challenge.maxAttempts;
  
  const updatedSession = await context.prisma.uncoverSession.update({
    where: { id: session.id },
    data: {
      attemptCount: newAttemptCount,
      won: gameWon,
      status: gameOver 
        ? (gameWon ? 'WON' : 'LOST')
        : 'IN_PROGRESS',
      completedAt: gameOver ? new Date() : null,
    },
  });
  
  return {
    guess,
    session: updatedSession,
    gameOver,
    correctAnswer: gameOver ? session.challenge.album : null, // Only reveal on game end
  };
};
```

**Rationale:**
- Server validates ALL rules (auth, ownership, game state, duplicates, max attempts)
- Answer (challenge.albumId) NEVER sent to client until game over
- Database enforces `@@unique([sessionId, guessNumber])` prevents race conditions
- Returns structured result (guess, updated session, game over flag)

### Pattern 3: Optimistic Updates with React Query

**What:** Update client state immediately, rollback on server error
**When to use:** Improve perceived performance for guesses/skips
**Example:**
```typescript
// Source: https://tanstack.com/query/latest/docs/framework/react/guides/optimistic-updates
// Pattern: Already used in codebase for recommendations

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useSubmitGuessMutation } from '@/generated/graphql';

function useOptimisticGuess() {
  const queryClient = useQueryClient();
  const gameStore = useUncoverGameStore();
  
  return useMutation({
    mutationFn: async (albumId: string) => {
      // Call GraphQL mutation
      const result = await submitGuessMutation({
        variables: {
          sessionId: gameStore.sessionId!,
          albumId,
        },
      });
      return result.data.submitGuess;
    },
    
    // Optimistic update BEFORE server responds
    onMutate: async (albumId) => {
      // Cancel outgoing queries to avoid race conditions
      await queryClient.cancelQueries({ queryKey: ['uncoverSession'] });
      
      // Snapshot previous state for rollback
      const previousGuesses = gameStore.guesses;
      
      // Optimistically update client state
      gameStore.addGuess({
        guessNumber: gameStore.attemptCount + 1,
        albumId,
        albumTitle: '...', // Placeholder until server responds
        isCorrect: false,  // Don't know yet
      });
      gameStore.updateAttemptCount(gameStore.attemptCount + 1);
      
      return { previousGuesses };
    },
    
    // On success: replace optimistic guess with server data
    onSuccess: (data) => {
      gameStore.addGuess({
        guessNumber: data.guess.guessNumber,
        albumId: data.guess.guessedAlbum.id,
        albumTitle: data.guess.guessedAlbum.title,
        isCorrect: data.guess.isCorrect,
      });
      
      if (data.gameOver) {
        gameStore.endSession(data.session.won);
      }
    },
    
    // On error: rollback optimistic update
    onError: (error, variables, context) => {
      if (context?.previousGuesses) {
        // Restore previous state
        gameStore.clearGuesses();
        context.previousGuesses.forEach(g => gameStore.addGuess(g));
      }
    },
  });
}
```

**Rationale:**
- Immediate UI feedback (no loading spinner for guesses)
- Rollback on validation error (duplicate guess, max attempts, etc.)
- Follows existing codebase pattern (recommendations use optimistic updates)

### Pattern 4: Session Persistence and Resumption

**What:** Store session ID in Zustand persist; resume game on page load
**When to use:** DAILY-04 (persist mid-game state on refresh)
**Example:**
```typescript
// Source: https://www.joshwcomeau.com/react/persisting-react-state-in-localstorage/
// Pattern: Similar to existing useRevealStore, useTourStore

// In UncoverGame.tsx
function UncoverGame() {
  const gameStore = useUncoverGameStore();
  const { data: todayChallenge } = useDailyChallengeQuery();
  
  // On mount: resume session if exists in localStorage
  useEffect(() => {
    if (!todayChallenge) return;
    
    // Check if localStorage has a session for today's challenge
    if (
      gameStore.sessionId && 
      gameStore.challengeId === todayChallenge.id
    ) {
      // Session exists for today - resume it
      console.log('Resuming session:', gameStore.sessionId);
      // No action needed - Zustand persist already restored state
    } else {
      // No session or different challenge - reset state
      gameStore.resetSession();
    }
  }, [todayChallenge?.id]);
  
  // Render game based on session status
  if (gameStore.status === 'WON' || gameStore.status === 'LOST') {
    return <UncoverGameOver />;
  }
  
  return <UncoverGameBoard />;
}
```

**Rationale:**
- Zustand persist automatically saves/restores state from localStorage
- Challenge ID check ensures old session not resumed for new day's challenge
- No server call needed for resumption - state already in localStorage

### Pattern 5: Prevent Replay with Server-Side Check

**What:** Block completed sessions from accepting new guesses
**When to use:** DAILY-03 (cannot replay after completing)
**Example:**
```typescript
// In submitGuess mutation (validation section)

// DAILY-03: Prevent replay after completion
if (session.status !== 'IN_PROGRESS') {
  throw new Error('This game has already been completed. Come back tomorrow!');
}

// Also check completedAt timestamp (defense in depth)
if (session.completedAt) {
  throw new Error('Cannot submit guess for completed session');
}
```

**Rationale:**
- Database column `status` tracks completion state
- Mutation rejects guesses for completed sessions
- Client can attempt replay, but server enforces rule

### Pattern 6: Skip Guess Implementation

**What:** Skip counts as a wrong guess (advances reveal, increments attempt count)
**When to use:** GAME-04 (player can skip a guess)
**Example:**
```typescript
// GraphQL mutation for skip
export const skipGuess = async (
  _parent: unknown,
  args: { sessionId: string },
  context: GraphQLContext
) => {
  if (!context.user) {
    throw new Error('Authentication required');
  }
  
  const session = await context.prisma.uncoverSession.findUnique({
    where: { id: args.sessionId },
    include: { challenge: true, guesses: true },
  });
  
  if (!session || session.userId !== context.user.id) {
    throw new Error('Session not found or unauthorized');
  }
  
  if (session.status !== 'IN_PROGRESS') {
    throw new Error('Game already completed');
  }
  
  if (session.attemptCount >= session.challenge.maxAttempts) {
    throw new Error('Maximum attempts exceeded');
  }
  
  // Create a guess record with NULL albumId (represents skip)
  const guessNumber = session.attemptCount + 1;
  const skipGuess = await context.prisma.uncoverGuess.create({
    data: {
      sessionId: session.id,
      guessNumber,
      guessedAlbumId: null,  // NULL = skipped
      guessedText: '(skipped)',
      isCorrect: false,
    },
  });
  
  // Update session attempt count
  const newAttemptCount = guessNumber;
  const gameOver = newAttemptCount >= session.challenge.maxAttempts;
  
  const updatedSession = await context.prisma.uncoverSession.update({
    where: { id: session.id },
    data: {
      attemptCount: newAttemptCount,
      status: gameOver ? 'LOST' : 'IN_PROGRESS',
      completedAt: gameOver ? new Date() : null,
    },
  });
  
  return {
    guess: skipGuess,
    session: updatedSession,
    gameOver,
    correctAnswer: gameOver ? session.challenge.album : null,
  };
};
```

**Rationale:**
- Skip = guess with NULL albumId + isCorrect=false
- Increments attemptCount (advances reveal level in Phase 36 reveal engine)
- Can trigger game over if maxAttempts reached
- Database unique constraint `@@unique([sessionId, guessNumber])` still enforced

### Pattern 7: Reveal Stage Calculation from Attempt Count

**What:** Map attemptCount (0-6) to reveal stage (1-6)
**When to use:** Connecting game state to reveal engine (Phase 36)
**Example:**
```typescript
// In UncoverGameBoard.tsx
function UncoverGameBoard() {
  const gameStore = useUncoverGameStore();
  const revealStore = useRevealStore();
  
  // Calculate reveal stage from attempt count
  // Stage 1 (most obscured) = 0 attempts
  // Stage 6 (clear) = 5+ attempts or game over
  const revealStage = Math.min(gameStore.attemptCount + 1, 6);
  
  return (
    <div>
      {/* Pass reveal stage to RevealImage from Phase 36 */}
      <RevealImage 
        imageUrl={challengeImageUrl}
        stage={revealStage}
        style={revealStore.preferredStyle}
      />
      
      <div>Attempt {gameStore.attemptCount} / 6</div>
    </div>
  );
}
```

**Rationale:**
- Reveal stage directly derived from attemptCount (no separate state)
- Stage 1 = 0 guesses (most obscured)
- Stage increases with each wrong guess or skip
- Stage 6 reached at 5 attempts OR game over (full reveal)

### Anti-Patterns to Avoid

- **Storing answer in client state** — Never send `challenge.albumId` to client until game over; prevents DevTools cheating
- **Client-only validation** — Always validate server-side; client validation is UX only
- **Trusting client timestamps** — Use server `now()` for `guessedAt`, `completedAt`; prevent time manipulation
- **Global game state** — Use Zustand slices pattern, not monolithic store; improves maintainability
- **Polling for session updates** — Use mutations that return updated state; avoid unnecessary queries
- **Separate reveal stage state** — Calculate from `attemptCount`; single source of truth

## Don't Hand-Roll

Problems that look simple but have existing solutions:

**Problem** | **Don't Build** | **Use Instead** | **Why**
--- | --- | --- | ---
State persistence | Custom localStorage hooks | Zustand persist middleware | Already in codebase; handles SSR, JSON serialization, partialize
Optimistic updates | Manual state rollback | React Query mutations | Handles rollback, retries, error states automatically
Input validation | Manual checks | Zod schemas | Already in codebase; type-safe, reusable validation
Date normalization | Custom UTC logic | date-utils from Phase 35 | `toUTCMidnight()` already implemented and tested
GraphQL types | Manual typing | Codegen hooks | Already in codebase; `useSubmitGuessMutation` auto-generated
Session management | Custom session logic | NextAuth context | Already integrated in GraphQL context

**Key insight:** This phase connects existing infrastructure (Prisma models, GraphQL context, Zustand patterns, React Query) rather than building new primitives. Focus on business logic (game rules, validation) not infrastructure.

## Common Pitfalls

### Pitfall 1: Exposing Answer to Client Before Game Over

**What goes wrong:** Sending `challenge.albumId` to client allows cheating via DevTools
**Why it happens:** Developer includes full challenge object in initial query response
**How to avoid:** 
- Never include `albumId` or `album` in `dailyChallenge` query response
- Only return answer in `submitGuess` / `skipGuess` mutations when `gameOver === true`
- Use separate GraphQL types (`DailyChallengeInfo` without answer vs internal `DailyChallengeWithAlbum`)

**Warning signs:**
- Network tab shows `albumId` in query response
- Players report "the answer is visible in DevTools"
- Challenge album appears in GraphQL response before completion

**Prevention strategy:**
```typescript
// WRONG: Exposes answer
type Query {
  dailyChallenge: DailyChallenge! # Includes album field
}

// CORRECT: Hides answer
type Query {
  dailyChallenge: DailyChallengeInfo! # NO album/albumId fields
}

type DailyChallengeInfo {
  id: UUID!
  date: DateTime!
  maxAttempts: Int!
  # Note: NO albumId or album field - that's the answer!
}
```

### Pitfall 2: Race Conditions on Simultaneous Guesses

**What goes wrong:** User double-clicks submit, creates two guesses with same `guessNumber`
**Why it happens:** Client sends multiple mutations before first completes
**How to avoid:**
- Database unique constraint `@@unique([sessionId, guessNumber])` prevents duplicates
- Disable submit button while `isGuessing === true` (Zustand UI slice)
- React Query mutation state (`isPending`) disables button during mutation

**Warning signs:**
- Database unique constraint error (P2002) in logs
- User reports "guess counted twice"
- `attemptCount` increments by 2 on single guess

**Prevention strategy:**
```typescript
// In UncoverGuessInput.tsx
function UncoverGuessInput() {
  const { mutate, isPending } = useOptimisticGuess();
  const gameStore = useUncoverGameStore();
  
  return (
    <button
      onClick={() => mutate(selectedAlbumId)}
      disabled={isPending || gameStore.isGuessing} // Prevent double-click
    >
      {isPending ? 'Submitting...' : 'Submit Guess'}
    </button>
  );
}
```

### Pitfall 3: Stale Session After Midnight

**What goes wrong:** User starts game before midnight, continues after midnight (new challenge day)
**Why it happens:** Session created for yesterday's challenge, not validated against today's
**How to avoid:**
- On component mount, check `challengeId` matches today's challenge
- Reset session if challenge ID mismatch (new day started)
- Server validation: check `challenge.date === today` before accepting guesses

**Warning signs:**
- User reports "playing yesterday's puzzle"
- Session `challengeId` doesn't match today's challenge ID
- Guess submitted for wrong day's album

**Prevention strategy:**
```typescript
// In UncoverGame.tsx
useEffect(() => {
  if (!todayChallenge) return;
  
  // Reset if localStorage session is for different challenge
  if (
    gameStore.challengeId && 
    gameStore.challengeId !== todayChallenge.id
  ) {
    console.log('New challenge detected - resetting session');
    gameStore.resetSession();
  }
}, [todayChallenge?.id]);
```

### Pitfall 4: Not Handling Anonymous Users

**What goes wrong:** Anonymous users can't play (AUTH-01 requires login)
**Why it happens:** Mutation checks `context.user` and throws if null
**How to avoid:**
- Phase 37 requirement: AUTH-01 explicitly requires login
- Show login prompt before game starts
- Do NOT implement anonymous play in this phase (deferred to future enhancement)

**Warning signs:**
- Anonymous users see game board but can't guess
- Mutation errors: "Authentication required"
- Confusion about whether game supports anonymous play

**Prevention strategy:**
```typescript
// In UncoverGame.tsx
function UncoverGame() {
  const { data: session } = useSession();
  
  if (!session?.user) {
    return (
      <div>
        <h2>Login Required</h2>
        <p>Please sign in to play the daily challenge.</p>
        <LoginButton />
      </div>
    );
  }
  
  return <UncoverGameBoard />;
}
```

### Pitfall 5: Incorrect Reveal Stage After Skip

**What goes wrong:** Skipping a guess doesn't advance reveal stage
**Why it happens:** Reveal stage calculation excludes skipped guesses
**How to avoid:**
- Calculate reveal stage from `attemptCount` (includes skips)
- Skip mutation increments `attemptCount` same as wrong guess
- Phase 36 reveal engine receives correct stage

**Warning signs:**
- Image doesn't reveal more after skip
- Stage stuck at same level despite incrementing attempt count
- `attemptCount` increases but reveal stage doesn't

**Prevention strategy:**
```typescript
// WRONG: Only count non-skipped guesses
const revealStage = gameStore.guesses.filter(g => g.albumId !== null).length + 1;

// CORRECT: Use attemptCount (includes skips)
const revealStage = Math.min(gameStore.attemptCount + 1, 6);
```

### Pitfall 6: Optimistic Update Doesn't Rollback

**What goes wrong:** Failed guess stays in UI (duplicate guess, max attempts exceeded)
**Why it happens:** Missing `onError` handler in mutation; no rollback logic
**How to avoid:**
- Always implement `onError` in optimistic mutations
- Store snapshot of previous state in `onMutate` context
- Restore previous state in `onError` handler

**Warning signs:**
- Duplicate guess appears in UI after error
- Attempt count increments despite validation error
- UI shows game over but session still in progress

**Prevention strategy:**
```typescript
// See Pattern 3 example - full rollback implementation
onError: (error, variables, context) => {
  // Restore previous state
  if (context?.previousGuesses) {
    gameStore.clearGuesses();
    context.previousGuesses.forEach(g => gameStore.addGuess(g));
  }
  
  // Show error to user
  toast.error(error.message);
}
```

## Code Examples

Verified patterns from official sources:

### GraphQL Schema for Game Mutations

```graphql
# Add to src/graphql/schema.graphql

"""
Daily challenge info (safe to expose - does NOT include answer)
"""
type DailyChallengeInfo {
  id: UUID!
  date: DateTime!
  maxAttempts: Int!
  totalPlays: Int!
  totalWins: Int!
  avgAttempts: Float
  
  # User's session for this challenge (if authenticated)
  mySession: UncoverSessionInfo
}

"""
User's session info for a daily challenge
"""
type UncoverSessionInfo {
  id: UUID!
  status: UncoverSessionStatus!
  attemptCount: Int!
  won: Boolean!
  startedAt: DateTime!
  completedAt: DateTime
  guesses: [UncoverGuessInfo!]!
  
  # Only populated if game is over
  correctAnswer: AlbumInfo
}

"""
Individual guess within a session
"""
type UncoverGuessInfo {
  id: UUID!
  guessNumber: Int!
  guessedAlbum: AlbumInfo # NULL if skipped
  guessedText: String
  isCorrect: Boolean!
  guessedAt: DateTime!
}

"""
Album info (minimal - for guess display)
"""
type AlbumInfo {
  id: UUID!
  title: String!
  cloudflareImageId: String
  artists: [ArtistInfo!]!
}

type ArtistInfo {
  id: UUID!
  name: String!
}

enum UncoverSessionStatus {
  IN_PROGRESS
  WON
  LOST
}

"""
Result of submitting a guess
"""
type SubmitGuessResult {
  guess: UncoverGuessInfo!
  session: UncoverSessionInfo!
  gameOver: Boolean!
  correctAnswer: AlbumInfo # Only populated if gameOver
}

"""
Result of starting a new session
"""
type StartSessionResult {
  session: UncoverSessionInfo!
  challenge: DailyChallengeInfo!
}

extend type Query {
  """
  Get today's daily challenge (does NOT include answer)
  """
  dailyChallenge: DailyChallengeInfo!
  
  """
  Get a specific session (must be user's own session)
  """
  uncoverSession(sessionId: UUID!): UncoverSessionInfo
}

extend type Mutation {
  """
  Start a new session for today's challenge (requires auth)
  """
  startUncoverSession: StartSessionResult!
  
  """
  Submit a guess for the current session (requires auth)
  """
  submitGuess(sessionId: UUID!, albumId: UUID!): SubmitGuessResult!
  
  """
  Skip current guess (counts as wrong guess)
  """
  skipGuess(sessionId: UUID!): SubmitGuessResult!
}
```

### Start Session Mutation Resolver

```typescript
// In src/lib/graphql/resolvers/mutations.ts
// Source: Existing mutation patterns in codebase

export const startUncoverSession = async (
  _parent: unknown,
  _args: unknown,
  context: GraphQLContext
) => {
  // AUTH-01: Require authentication
  if (!context.user) {
    throw new Error('Authentication required to play the Uncover game');
  }
  
  // Get today's challenge (creates if doesn't exist)
  const challenge = await getTodayChallenge(); // From Phase 35 challenge-service
  
  // Check if user already has a session for today
  const existingSession = await context.prisma.uncoverSession.findUnique({
    where: {
      challengeId_userId: {
        challengeId: challenge.id,
        userId: context.user.id,
      },
    },
    include: {
      guesses: { orderBy: { guessNumber: 'asc' } },
    },
  });
  
  if (existingSession) {
    // User already started today's challenge - return existing session
    return {
      session: existingSession,
      challenge: {
        id: challenge.id,
        date: challenge.date,
        maxAttempts: challenge.maxAttempts,
        totalPlays: challenge.totalPlays,
        totalWins: challenge.totalWins,
        avgAttempts: challenge.avgAttempts,
      },
    };
  }
  
  // Create new session
  const newSession = await context.prisma.uncoverSession.create({
    data: {
      challengeId: challenge.id,
      userId: context.user.id,
      status: 'IN_PROGRESS',
      attemptCount: 0,
      won: false,
    },
    include: {
      guesses: true,
    },
  });
  
  // Increment challenge totalPlays counter
  await context.prisma.uncoverChallenge.update({
    where: { id: challenge.id },
    data: { totalPlays: { increment: 1 } },
  });
  
  return {
    session: newSession,
    challenge: {
      id: challenge.id,
      date: challenge.date,
      maxAttempts: challenge.maxAttempts,
      totalPlays: challenge.totalPlays + 1,
      totalWins: challenge.totalWins,
      avgAttempts: challenge.avgAttempts,
    },
  };
};
```

### Client Game Store with TypeScript Types

```typescript
// src/stores/useUncoverGameStore.ts
// Source: Existing stores (useRevealStore, useSearchStore)

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

// Types
type SessionStatus = 'IN_PROGRESS' | 'WON' | 'LOST';

interface Guess {
  guessNumber: number;
  albumId: string | null; // null = skipped
  albumTitle: string;
  artistName: string;
  isCorrect: boolean;
}

interface SessionSlice {
  sessionId: string | null;
  challengeId: string | null;
  status: SessionStatus;
  attemptCount: number;
  won: boolean;
  
  setSession: (session: { id: string; challengeId: string }) => void;
  updateAttemptCount: (count: number) => void;
  endSession: (won: boolean) => void;
  resetSession: () => void;
}

interface GuessesSlice {
  guesses: Guess[];
  
  addGuess: (guess: Guess) => void;
  clearGuesses: () => void;
}

interface UISlice {
  isGuessing: boolean;
  showResults: boolean;
  
  setGuessing: (guessing: boolean) => void;
  setShowResults: (show: boolean) => void;
}

// Slice creators
const createSessionSlice = (set: any): SessionSlice => ({
  sessionId: null,
  challengeId: null,
  status: 'IN_PROGRESS',
  attemptCount: 0,
  won: false,
  
  setSession: (session) => set({ 
    sessionId: session.id, 
    challengeId: session.challengeId,
    status: 'IN_PROGRESS' as SessionStatus,
  }),
  
  updateAttemptCount: (count) => set({ attemptCount: count }),
  
  endSession: (won) => set({ 
    status: (won ? 'WON' : 'LOST') as SessionStatus, 
    won 
  }),
  
  resetSession: () => set({
    sessionId: null,
    challengeId: null,
    status: 'IN_PROGRESS' as SessionStatus,
    attemptCount: 0,
    won: false,
  }),
});

const createGuessesSlice = (set: any): GuessesSlice => ({
  guesses: [],
  
  addGuess: (guess) => set((state: any) => ({
    guesses: [...state.guesses, guess],
  })),
  
  clearGuesses: () => set({ guesses: [] }),
});

const createUISlice = (set: any): UISlice => ({
  isGuessing: false,
  showResults: false,
  
  setGuessing: (guessing) => set({ isGuessing: guessing }),
  setShowResults: (show) => set({ showResults: show }),
});

// Combined store type
type UncoverGameStore = SessionSlice & GuessesSlice & UISlice;

// Create store with persist middleware
export const useUncoverGameStore = create<UncoverGameStore>()(
  persist(
    (set, get) => ({
      ...createSessionSlice(set),
      ...createGuessesSlice(set),
      ...createUISlice(set),
    }),
    {
      name: 'uncover-game-state', // localStorage key
      storage: createJSONStorage(() => localStorage),
      
      // Only persist session and guesses, not UI state
      partialize: (state) => ({
        sessionId: state.sessionId,
        challengeId: state.challengeId,
        status: state.status,
        attemptCount: state.attemptCount,
        won: state.won,
        guesses: state.guesses,
        // Exclude: isGuessing, showResults (ephemeral UI state)
      }),
    }
  )
);
```

### Game Component with Session Resumption

```typescript
// src/components/uncover/UncoverGame.tsx
// Source: React Query patterns from existing codebase

'use client';

import { useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useDailyChallengeQuery, useStartUncoverSessionMutation } from '@/generated/graphql';
import { useUncoverGameStore } from '@/stores/useUncoverGameStore';
import { UncoverGameBoard } from './UncoverGameBoard';
import { UncoverGameOver } from './UncoverGameOver';
import { LoginButton } from '@/components/auth/LoginButton';

export function UncoverGame() {
  const { data: session } = useSession();
  const gameStore = useUncoverGameStore();
  
  // Fetch today's challenge
  const { data: challengeData, isLoading } = useDailyChallengeQuery();
  
  // Mutation to start new session
  const { mutate: startSession, isPending: isStarting } = 
    useStartUncoverSessionMutation({
      onSuccess: (data) => {
        // Initialize game store with new session
        gameStore.setSession({
          id: data.startUncoverSession.session.id,
          challengeId: data.startUncoverSession.challenge.id,
        });
        gameStore.clearGuesses();
      },
    });
  
  // On mount: check if need to resume or start new session
  useEffect(() => {
    if (!challengeData?.dailyChallenge || !session?.user) return;
    
    const todayChallengeId = challengeData.dailyChallenge.id;
    
    // Check if existing session in mySession (server-side)
    if (challengeData.dailyChallenge.mySession) {
      const serverSession = challengeData.dailyChallenge.mySession;
      
      // Server has session - sync to client store
      gameStore.setSession({
        id: serverSession.id,
        challengeId: todayChallengeId,
      });
      gameStore.updateAttemptCount(serverSession.attemptCount);
      
      if (serverSession.status !== 'IN_PROGRESS') {
        gameStore.endSession(serverSession.won);
      }
      
      // Restore guesses
      gameStore.clearGuesses();
      serverSession.guesses.forEach(g => {
        gameStore.addGuess({
          guessNumber: g.guessNumber,
          albumId: g.guessedAlbum?.id || null,
          albumTitle: g.guessedAlbum?.title || '(skipped)',
          artistName: g.guessedAlbum?.artists[0]?.name || '',
          isCorrect: g.isCorrect,
        });
      });
      
    } else if (!gameStore.sessionId || gameStore.challengeId !== todayChallengeId) {
      // No server session and (no local session OR wrong challenge) - start new
      gameStore.resetSession();
      startSession({});
    }
  }, [challengeData?.dailyChallenge?.id, session?.user?.id]);
  
  // AUTH-01: Require login
  if (!session?.user) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-bold mb-4">Login Required</h2>
        <p className="text-gray-600 mb-6">
          Please sign in to play the Uncover daily challenge.
        </p>
        <LoginButton />
      </div>
    );
  }
  
  // Loading state
  if (isLoading || isStarting) {
    return <div className="text-center py-12">Loading today's challenge...</div>;
  }
  
  // Game over - show results
  if (gameStore.status === 'WON' || gameStore.status === 'LOST') {
    return <UncoverGameOver />;
  }
  
  // Active game
  return <UncoverGameBoard />;
}
```

## State of the Art

**Old Approach** | **Current Approach** | **When Changed** | **Impact**
--- | --- | --- | ---
Redux for game state | Zustand with slices | Zustand 5.0 (2024) | 90% less boilerplate; persist middleware built-in
Client-side validation only | Server-side validation with GraphQL | GraphQL best practices (2020+) | Prevents cheating; enforces game rules
Manual localStorage sync | Zustand persist middleware | Zustand 3.0 (2021) | SSR-safe; automatic JSON serialization
Polling for state updates | Mutation returns updated state | GraphQL mutation design (2018+) | Reduces unnecessary queries
Manual optimistic updates | React Query mutations | TanStack Query v5 (2023) | Automatic rollback; loading states
Flat game state | Slices pattern | Zustand community pattern (2022+) | Better organization; separation of concerns

**Deprecated/outdated:**

- **Redux Toolkit for game state**: Zustand is lighter, faster, and requires less boilerplate for game state management. Redux is still valuable for complex app-wide state, but overkill for game sessions.
- **localStorage without SSR safety**: Zustand persist middleware handles SSR automatically by checking `typeof window !== 'undefined'`
- **Polling mutations**: Modern GraphQL design returns updated entities in mutation responses, eliminating need to refetch after mutations
- **Context API for complex state**: Context causes unnecessary re-renders; Zustand's selective subscriptions are more performant for game state

## Open Questions

Things that couldn't be fully resolved:

1. **Anonymous play support**
   - What we know: AUTH-01 requires login for this phase
   - What's unclear: Future enhancement for anonymous sessions (localStorage-only, migrate on login)?
   - Recommendation: Defer anonymous play to Phase 38+. This phase implements authenticated-only gameplay per requirements.

2. **Stats tracking granularity**
   - What we know: UncoverPlayerStats model exists from Phase 33 (denormalized stats)
   - What's unclear: When to update stats (after each game? async job? mutation side effect?)
   - Recommendation: Update stats in `submitGuess` / `skipGuess` mutations when game ends. Simple, synchronous, no queue needed.

3. **Leaderboard implementation**
   - What we know: PlayerStats has `currentStreak` indexed for leaderboards
   - What's unclear: Is leaderboard part of Phase 37 or separate phase?
   - Recommendation: Leaderboard is separate feature (Phase 39+). This phase focuses on core game loop.

4. **Undo last guess feature**
   - What we know: No requirement for undo in Phase 37
   - What's unclear: Would users expect an undo button?
   - Recommendation: Don't implement undo in Phase 37. Guesses are final (matches Wordle pattern). Can add as enhancement if user feedback requests it.

5. **Hint system integration**
   - What we know: `UncoverSession.revealedHints` field exists (from Phase 33 schema)
   - What's unclear: Is hint system part of Phase 37 or future enhancement?
   - Recommendation: Defer hint system to Phase 38+. Core game doesn't require hints. Field reserved for future use.

## Sources

### Primary (HIGH confidence)

- [GitHub - pmndrs/zustand](https://github.com/pmndrs/zustand) - Zustand documentation and patterns
- [Zustand Slices Pattern](https://zustand.docs.pmnd.rs/guides/slices-pattern) - Official slices guide
- [GraphQL Best Practices](https://graphql.org/learn/best-practices/) - Official GraphQL guidance
- [GraphQL Authorization](https://graphql.org/learn/authorization/) - Server-side auth patterns
- [GraphQL Mutations](https://graphql.org/learn/mutations/) - Mutation design patterns
- [TanStack Query Optimistic Updates](https://tanstack.com/query/latest/docs/framework/react/guides/optimistic-updates) - React Query patterns
- Codebase: `/src/stores/useRevealStore.ts` - Existing Zustand persist pattern
- Codebase: `/src/lib/graphql/context.ts` - GraphQL context with auth
- Codebase: `/prisma/schema.prisma` - Uncover models (Phase 33)
- Codebase: `/src/lib/daily-challenge/challenge-service.ts` - Challenge service (Phase 35)

### Secondary (MEDIUM confidence)

- [State Management in React 2025](https://www.developerway.com/posts/react-state-management-2025) - Zustand vs Redux comparison
- [Zustand for State Management](https://frontendmasters.com/blog/introducing-zustand/) - Introduction and best practices
- [GraphQL Security Best Practices](https://cheatsheetseries.owasp.org/cheatsheets/GraphQL_Cheat_Sheet.html) - OWASP security guide
- [GraphQL Authentication Strategies](https://www.browserstack.com/guide/graphql-authentication) - Auth patterns
- [Persisting React State in localStorage](https://www.joshwcomeau.com/react/persisting-react-state-in-localstorage/) - Persistence patterns
- [Stop Duplicating Validation Logic in Next.js with Zod](https://www.danywalls.com/stop-duplicate-logic-nextjs-zod) - Validation patterns
- [A Slice-Based Zustand Store for Next.js 14](https://engineering.atlys.com/a-slice-based-zustand-store-for-next-js-14-and-typescript-6b92385a48f5) - TypeScript slices implementation

### Tertiary (LOW confidence - for context only)

- [Daily Logic Word Games Guide](https://crosswordle.com/blog/daily-logic-word-games) - Game design patterns
- [Mastermind Board Game Rules](https://officialgamerules.org/game-rules/mastermind-rules/) - Guess-based game patterns
- Various Zustand GitHub discussions on TypeScript + slices - Community patterns

## Metadata

**Confidence breakdown:**

- Standard stack: HIGH - All libraries already in codebase; versions verified in package.json
- Architecture: HIGH - Patterns match existing codebase (Zustand persist, GraphQL mutations, React Query)
- Pitfalls: HIGH - Based on common game logic issues, GraphQL security best practices, and state management anti-patterns
- Integration: HIGH - Phase 35 and 36 infrastructure complete and tested

**Research date:** 2026-02-15
**Valid until:** ~60 days (stable domain; Zustand, GraphQL, React Query are mature)

**Key assumptions validated:**

- ✅ Zustand 5.0.8 installed (package.json)
- ✅ Prisma models exist (UncoverChallenge, UncoverSession, UncoverGuess)
- ✅ GraphQL context has authentication (context.user from NextAuth)
- ✅ Daily challenge service implemented (Phase 35)
- ✅ Reveal engine with Zustand store exists (Phase 36)
- ✅ React Query v5 in use (TanStack Query)
- ✅ Existing mutation patterns in codebase (recommendations, collections)

**Implementation ready:** Yes. All dependencies exist, patterns are proven in codebase, no new infrastructure needed. Focus on implementing game-specific mutations and connecting existing pieces.
