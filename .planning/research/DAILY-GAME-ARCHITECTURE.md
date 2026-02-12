# Architecture Research: Daily Album Art Game

**Domain:** Daily puzzle game integration into music discovery platform  
**Researched:** 2026-02-12  
**Milestone:** v1.5  
**Mode:** Architecture dimension for subsequent milestone  

---

## Executive Summary

This document defines the data model, API design, client state management, and integration strategy for adding a daily album art guessing game to the existing rec platform. The game presents one album's cover art per day (same for all players), players guess the artist/album, and the system tracks attempts, wins, and streaks.

**Key architectural decisions:**

1. **Hybrid state model:** Client-side game state (Zustand + localStorage) for immediate UX, server-side persistence for authenticated users
2. **Server-side challenge generation:** Cron job or BullMQ scheduled job selects daily album, stored in database
3. **Optimistic locking:** `playedAt` timestamp prevents replay within same day
4. **Existing infrastructure reuse:** Album model, GraphQL layer, Zustand patterns all exist and can be extended

---

## Data Model

### New Prisma Models

```prisma
// ============================================================================
// Daily Album Art Game
// ============================================================================

/// Daily challenge - one album per day for all players
model DailyChallenge {
  id            String    @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  date          DateTime  @unique @db.Date  // The calendar date (no time component)
  albumId       String    @map("album_id") @db.Uuid
  album         Album     @relation(fields: [albumId], references: [id], onDelete: Cascade)
  
  // Challenge configuration
  maxAttempts   Int       @default(6) @map("max_attempts")
  
  // Metadata for analytics
  totalPlays    Int       @default(0) @map("total_plays")
  totalWins     Int       @default(0) @map("total_wins")
  avgAttempts   Float?    @map("avg_attempts")
  
  createdAt     DateTime  @default(now()) @map("created_at")
  updatedAt     DateTime  @updatedAt @map("updated_at")
  
  // Relations
  gameSessions  GameSession[]
  
  @@index([date])
  @@index([albumId])
  @@map("daily_challenges")
}

/// Player's game session for a specific daily challenge
model GameSession {
  id              String          @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  
  // Identifiers
  challengeId     String          @map("challenge_id") @db.Uuid
  userId          String?         @map("user_id")  // Nullable for anonymous play
  
  // Game state
  status          GameStatus      @default(IN_PROGRESS)
  attemptCount    Int             @default(0) @map("attempt_count")
  won             Boolean         @default(false)
  completedAt     DateTime?       @map("completed_at")
  
  // Reveal state (which hints have been shown)
  revealedHints   String[]        @default([]) @map("revealed_hints")  // ["genre", "year", "trackCount", "label", "partial_title"]
  
  // Timestamps
  startedAt       DateTime        @default(now()) @map("started_at")
  
  // Relations
  challenge       DailyChallenge  @relation(fields: [challengeId], references: [id], onDelete: Cascade)
  user            User?           @relation(fields: [userId], references: [id], onDelete: Cascade)
  guesses         GameGuess[]
  
  @@unique([challengeId, userId])  // One session per user per challenge
  @@index([userId])
  @@index([challengeId])
  @@index([status])
  @@map("game_sessions")
}

/// Individual guess within a game session
model GameGuess {
  id            String        @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  sessionId     String        @map("session_id") @db.Uuid
  guessNumber   Int           @map("guess_number")  // 1-6
  
  // What was guessed
  guessedAlbumId  String?     @map("guessed_album_id") @db.Uuid
  guessedText     String?     @map("guessed_text")  // Raw text if no album matched
  
  // Result
  isCorrect     Boolean       @default(false) @map("is_correct")
  
  // Timestamp
  guessedAt     DateTime      @default(now()) @map("guessed_at")
  
  // Relations
  session       GameSession   @relation(fields: [sessionId], references: [id], onDelete: Cascade)
  guessedAlbum  Album?        @relation(fields: [guessedAlbumId], references: [id], onDelete: SetNull)
  
  @@unique([sessionId, guessNumber])
  @@index([sessionId])
  @@map("game_guesses")
}

/// Player stats aggregate (denormalized for fast lookup)
model PlayerGameStats {
  id              String    @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  userId          String    @unique @map("user_id")
  
  // Lifetime stats
  gamesPlayed     Int       @default(0) @map("games_played")
  gamesWon        Int       @default(0) @map("games_won")
  totalAttempts   Int       @default(0) @map("total_attempts")  // Sum of attempts across all games
  
  // Streak tracking
  currentStreak   Int       @default(0) @map("current_streak")
  maxStreak       Int       @default(0) @map("max_streak")
  lastPlayedDate  DateTime? @db.Date @map("last_played_date")  // For streak continuity check
  
  // Distribution (attempts needed to win)
  winDistribution Int[]     @default([0,0,0,0,0,0]) @map("win_distribution")  // Index 0 = 1 attempt, etc.
  
  // Timestamps
  createdAt       DateTime  @default(now()) @map("created_at")
  updatedAt       DateTime  @updatedAt @map("updated_at")
  
  // Relations
  user            User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  @@index([userId])
  @@index([currentStreak(sort: Desc)])  // For leaderboards
  @@map("player_game_stats")
}

enum GameStatus {
  IN_PROGRESS
  WON
  LOST
}
```

### Model Relations to Add

Update existing models:

```prisma
// Add to User model
model User {
  // ... existing fields ...
  gameSessions    GameSession[]
  gameStats       PlayerGameStats?
}

// Add to Album model  
model Album {
  // ... existing fields ...
  dailyChallenges DailyChallenge[]
  gameGuesses     GameGuess[]
}
```

### Schema Design Rationale

**DailyChallenge (one per day):**
- `date` is unique, uses `@db.Date` to ignore time component
- `maxAttempts` allows future configurability (default 6 like Wordle)
- Aggregate stats (`totalPlays`, `totalWins`, `avgAttempts`) for analytics without querying all sessions

**GameSession (one per user per challenge):**
- `@@unique([challengeId, userId])` enforces single game per day per user
- `revealedHints` tracks progressive reveals as array of hint type strings
- `status` enum replaces boolean flags for cleaner state machine
- `userId` nullable for anonymous play (localStorage-only fallback)

**GameGuess (one per attempt):**
- Links to `Album` when player selects from autocomplete
- `guessedText` captures raw input if no album matched (for analytics)
- `guessNumber` enforces attempt ordering

**PlayerGameStats (denormalized aggregates):**
- Avoids expensive `COUNT(*)` queries on every page load
- `winDistribution` array: index = (attempts - 1), value = count
- `lastPlayedDate` enables streak continuity calculation

---

## API Design

### GraphQL Types

```graphql
# ============================================================================
# Daily Game Types
# ============================================================================

type DailyChallenge {
  id: UUID!
  date: DateTime!
  maxAttempts: Int!
  
  # Stats (only visible after completion or to admins)
  totalPlays: Int
  totalWins: Int
  avgAttempts: Float
  
  # Current user's session (if authenticated)
  currentSession: GameSession
}

type GameSession {
  id: UUID!
  status: GameStatus!
  attemptCount: Int!
  won: Boolean!
  completedAt: DateTime
  startedAt: DateTime!
  
  # Revealed hints for progressive disclosure
  revealedHints: [String!]!
  
  # Full guess history
  guesses: [GameGuess!]!
  
  # Album is only revealed after game completion
  album: Album
}

type GameGuess {
  id: UUID!
  guessNumber: Int!
  guessedText: String
  guessedAlbum: Album
  isCorrect: Boolean!
  guessedAt: DateTime!
}

type PlayerGameStats {
  id: UUID!
  gamesPlayed: Int!
  gamesWon: Int!
  totalAttempts: Int!
  currentStreak: Int!
  maxStreak: Int!
  lastPlayedDate: DateTime
  winDistribution: [Int!]!
  winRate: Float!  # Computed: gamesWon / gamesPlayed
  avgAttemptsPerWin: Float  # Computed: totalAttempts / gamesWon
}

enum GameStatus {
  IN_PROGRESS
  WON
  LOST
}

# Response for submitting a guess
type SubmitGuessResult {
  success: Boolean!
  session: GameSession!
  isCorrect: Boolean!
  gameOver: Boolean!
  
  # Progressive reveal: new hint unlocked after wrong guess
  newHint: GameHint
  
  # Only populated when game ends
  correctAlbum: Album
}

type GameHint {
  type: String!  # "genre", "year", "trackCount", "label", "partial_title"
  value: String!
}

# Response for today's challenge
type TodayChallengeResult {
  challenge: DailyChallenge!
  session: GameSession  # Null if not started, populated if exists
  alreadyPlayed: Boolean!
  
  # Progressive hints based on session state
  availableHints: [GameHint!]!
  
  # Cover art with progressive reveal
  coverArt: CoverArtReveal!
}

type CoverArtReveal {
  # Blur level: 100 (full blur) -> 0 (clear), decreases with each attempt
  blurLevel: Int!
  imageUrl: String!
  cloudflareImageId: String
}
```

### GraphQL Queries

```graphql
type Query {
  # Get today's challenge with current session state
  todayChallenge: TodayChallengeResult!
  
  # Get challenge by date (for viewing past games)
  challengeByDate(date: DateTime!): DailyChallenge
  
  # Current user's game stats
  myGameStats: PlayerGameStats
  
  # User game stats (public profile)
  userGameStats(userId: String!): PlayerGameStats
  
  # Leaderboard: top streaks
  gameLeaderboard(
    type: LeaderboardType = CURRENT_STREAK
    limit: Int = 10
  ): [LeaderboardEntry!]!
}

enum LeaderboardType {
  CURRENT_STREAK
  MAX_STREAK
  WIN_RATE
  GAMES_PLAYED
}

type LeaderboardEntry {
  user: User!
  value: Int!
  rank: Int!
}
```

### GraphQL Mutations

```graphql
type Mutation {
  # Start or resume today's game
  startDailyGame: GameSession!
  
  # Submit a guess
  submitGuess(input: SubmitGuessInput!): SubmitGuessResult!
  
  # Request next hint (costs an attempt)
  revealHint: SubmitGuessResult!
  
  # Admin: manually set tomorrow's album
  adminSetDailyAlbum(input: SetDailyAlbumInput!): DailyChallenge!
}

input SubmitGuessInput {
  # Either albumId (from autocomplete) or text (free-form)
  albumId: UUID
  guessText: String
}

input SetDailyAlbumInput {
  date: DateTime!
  albumId: UUID!
}
```

### Resolver Pattern

Follow existing thin resolver pattern - business logic in services:

```
src/lib/game/
├── challenge-service.ts      # Daily challenge CRUD, selection algorithm
├── session-service.ts        # Game session state management
├── guess-service.ts          # Guess validation, hint progression
├── stats-service.ts          # Stats aggregation, streak calculation
└── leaderboard-service.ts    # Leaderboard queries
```

---

## Client State

### Zustand Store Structure

Following the existing `useCorrectionStore.ts` and `useTourStore.ts` patterns:

```typescript
// src/stores/useDailyGameStore.ts

interface DailyGameState {
  // Current session state (mirrors server)
  sessionId: string | null;
  status: 'idle' | 'loading' | 'in_progress' | 'won' | 'lost';
  attemptCount: number;
  guesses: LocalGuess[];
  revealedHints: string[];
  
  // UI state
  currentGuess: string;
  isSubmitting: boolean;
  showStats: boolean;
  showShare: boolean;
  
  // Cover art reveal
  blurLevel: number;  // 100 -> 0
  
  // Actions
  setCurrentGuess: (guess: string) => void;
  submitGuess: () => Promise<void>;
  revealHint: () => void;
  openStats: () => void;
  closeStats: () => void;
  copyShareText: () => void;
  resetForNewDay: () => void;
}

interface LocalGuess {
  guessNumber: number;
  guessText: string;
  albumId?: string;
  isCorrect: boolean;
  timestamp: number;
}
```

### State Persistence Strategy

**Authenticated users:**
- Primary: Server-side via GraphQL mutations
- Secondary: localStorage as cache for offline/fast hydration
- Sync: On app load, compare localStorage timestamp with server, use newer

**Anonymous users:**
- Primary: localStorage only
- Upgrade: When user logs in, migrate localStorage session to server

**localStorage schema:**

```typescript
// Key: `daily-game-${date}` where date is YYYY-MM-DD
interface LocalGameState {
  date: string;
  sessionId: string | null;  // Server session ID if authenticated
  status: 'in_progress' | 'won' | 'lost';
  guesses: LocalGuess[];
  revealedHints: string[];
  blurLevel: number;
  timestamp: number;  // For conflict resolution
}

// Key: `daily-game-stats`
interface LocalStats {
  gamesPlayed: number;
  gamesWon: number;
  currentStreak: number;
  maxStreak: number;
  lastPlayedDate: string;
  winDistribution: number[];
}
```

### Zustand Persist Middleware

Following `useTourStore.ts` pattern:

```typescript
export const useDailyGameStore = create<DailyGameState>()(
  persist(
    (set, get) => ({
      // ... state and actions
    }),
    {
      name: 'daily-game',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        // Only persist game state, not UI state
        sessionId: state.sessionId,
        status: state.status,
        attemptCount: state.attemptCount,
        guesses: state.guesses,
        revealedHints: state.revealedHints,
        blurLevel: state.blurLevel,
      }),
    }
  )
);
```

---

## Daily Challenge System

### Challenge Selection Algorithm

**Option A: Pre-scheduled (Recommended)**
- Admin curates challenge queue via admin UI
- BullMQ job publishes next challenge at midnight UTC
- Fallback: random selection if queue empty

**Option B: Algorithmic**
- Filter: Only albums with `cloudflareImageId` (optimized images)
- Filter: Only albums with `dataQuality >= MEDIUM`
- Filter: Exclude albums used in last 365 days
- Prefer: Mix of genres, decades, popularity levels
- Randomize within constraints

### BullMQ Job

```typescript
// Add to existing queue-worker.ts

// Job: daily-game:select-challenge
// Runs: Every day at 00:00 UTC

interface SelectDailyChallengeJob {
  type: 'daily-game:select-challenge';
  data: {
    date: string;  // YYYY-MM-DD
  };
}

// Processor:
async function selectDailyChallenge(job: Job<SelectDailyChallengeJob>) {
  const { date } = job.data;
  
  // Check if already exists
  const existing = await prisma.dailyChallenge.findUnique({
    where: { date: new Date(date) },
  });
  if (existing) return existing;
  
  // Get from queue or select randomly
  const album = await getNextChallengeAlbum();
  
  return prisma.dailyChallenge.create({
    data: {
      date: new Date(date),
      albumId: album.id,
    },
  });
}
```

### Timezone Handling

**Server:** All dates stored as UTC midnight
**Client:** Display relative to user's timezone
**Boundary:** "New day" triggers based on UTC midnight

```typescript
// Helper: Is it a new day?
function isNewDay(lastPlayedUtc: Date | null): boolean {
  if (!lastPlayedUtc) return true;
  const todayUtc = startOfDayUtc(new Date());
  const lastDayUtc = startOfDayUtc(lastPlayedUtc);
  return todayUtc > lastDayUtc;
}
```

---

## Integration Points

### Existing Components to Modify

**User Model:**
- Add `gameSessions` and `gameStats` relations

**Album Model:**
- Add `dailyChallenges` and `gameGuesses` relations

**GraphQL Schema:**
- Add game types, queries, mutations

**BullMQ Worker:**
- Add `daily-game:select-challenge` job processor
- Add scheduler for midnight UTC execution

### New Files to Create

**Database:**
- `prisma/migrations/XXXXXX_add_daily_game/migration.sql`

**GraphQL:**
- `src/graphql/schema.graphql` (add types inline, following existing pattern)
- `src/graphql/queries/daily-game.graphql`

**Resolvers:**
- `src/lib/graphql/resolvers/daily-game-queries.ts`
- `src/lib/graphql/resolvers/daily-game-mutations.ts`

**Services:**
- `src/lib/game/challenge-service.ts`
- `src/lib/game/session-service.ts`
- `src/lib/game/guess-service.ts`
- `src/lib/game/stats-service.ts`

**Client State:**
- `src/stores/useDailyGameStore.ts`

**Hooks:**
- `src/hooks/useTodayChallenge.ts`
- `src/hooks/useSubmitGuess.ts`
- `src/hooks/useGameStats.ts`

**Components:**
- `src/components/game/DailyGame.tsx` (main container)
- `src/components/game/GameBoard.tsx` (cover art + guess input)
- `src/components/game/GuessInput.tsx` (autocomplete search)
- `src/components/game/GuessHistory.tsx` (past guesses)
- `src/components/game/HintDisplay.tsx` (progressive hints)
- `src/components/game/GameStats.tsx` (post-game stats modal)
- `src/components/game/ShareButton.tsx` (copy results)
- `src/components/game/StreakBadge.tsx` (streak display)

**Routes:**
- `src/app/(main)/game/page.tsx` (desktop)
- `src/app/m/game/page.tsx` (mobile)

### Image Handling

Use existing Cloudflare Images infrastructure:
- `cloudflareImageId` on Album model
- Progressive blur via CSS filter or Cloudflare transforms
- Fallback to `coverArtUrl` if no Cloudflare ID

---

## Build Order

### Phase 1: Data Foundation

1. **Prisma schema migration**
   - Add `DailyChallenge`, `GameSession`, `GameGuess`, `PlayerGameStats` models
   - Add relations to `User` and `Album`
   - Run `prisma migrate dev`

2. **BullMQ challenge scheduler**
   - Add `daily-game:select-challenge` job
   - Add scheduler to run at midnight UTC
   - Add manual trigger for testing

### Phase 2: API Layer

3. **GraphQL types**
   - Add types to `schema.graphql`
   - Run `pnpm codegen`

4. **Services**
   - `challenge-service.ts` (get/create daily challenge)
   - `session-service.ts` (start/resume session)
   - `guess-service.ts` (submit guess, validate)
   - `stats-service.ts` (update stats on completion)

5. **Resolvers**
   - `todayChallenge` query
   - `startDailyGame` mutation
   - `submitGuess` mutation

### Phase 3: Client State

6. **Zustand store**
   - `useDailyGameStore.ts` with persist middleware
   - Actions for guess submission, hint reveal

7. **Hooks**
   - `useTodayChallenge` (GraphQL query wrapper)
   - `useSubmitGuess` (GraphQL mutation wrapper)

### Phase 4: UI Components

8. **Game container**
   - `DailyGame.tsx` main layout
   - Cover art with progressive reveal

9. **Interaction components**
   - `GuessInput.tsx` with album autocomplete
   - `GuessHistory.tsx` showing past attempts
   - `HintDisplay.tsx` for progressive hints

10. **Completion components**
    - `GameStats.tsx` modal
    - `ShareButton.tsx` with clipboard API

### Phase 5: Routes & Polish

11. **Pages**
    - Desktop route: `/game`
    - Mobile route: `/m/game`

12. **Polish**
    - Animations (wrong guess shake, correct celebration)
    - Keyboard shortcuts
    - Accessibility (ARIA labels, focus management)
    - Error states

### Phase 6: Stats & Leaderboards

13. **Stats display**
    - User profile stats section
    - Public leaderboard

14. **Admin**
    - Challenge queue management
    - Manual album selection

---

## Confidence Assessment

| Area | Level | Notes |
|------|-------|-------|
| Data Model | HIGH | Follows existing Prisma patterns, standard game state design |
| API Design | HIGH | Extends existing GraphQL layer, thin resolver pattern |
| Client State | HIGH | Zustand with persist middleware already in use |
| Challenge System | MEDIUM | BullMQ scheduler exists, but new job type |
| Build Order | HIGH | Clear dependencies, phases align with existing patterns |

### Assumptions to Validate

1. **Album selection criteria:** What filters determine eligible challenge albums?
2. **Hint progression:** Exact order and content of hints
3. **Share format:** Emoji grid style (like Wordle) or text description?
4. **Leaderboard scope:** Friends only, global, or both?
5. **Anonymous play:** Support fully or require auth?

### Known Risks

- **Timezone edge cases:** Players near midnight may see inconsistent behavior
- **Streak fairness:** Different timezones have different "day" boundaries
- **Album coverage:** Database may lack sufficient variety for year-long rotation

---

## Sources

- Existing Prisma schema: `/Users/marcosandrade/roaming/projects/rec/prisma/schema.prisma`
- Existing GraphQL schema: `/Users/marcosandrade/roaming/projects/rec/src/graphql/schema.graphql`
- Zustand store patterns: `/Users/marcosandrade/roaming/projects/rec/src/stores/useTourStore.ts`
- Mutation hook patterns: `/Users/marcosandrade/roaming/projects/rec/src/hooks/useCreateRecommendationMutation.ts`
- Milestone context: `/Users/marcosandrade/roaming/projects/rec/.planning/MILESTONES.md`

**External research:**
- [Wordle game logic patterns (MariaDB)](https://mariadb.com/resources/blog/implementing-wordles-game-logic-in-sql/)
- [Daily puzzle game engagement patterns](https://www.filmogaz.com/137968)
- [Next.js localStorage persistence patterns](https://hackernoon.com/storing-and-retrieving-data-in-nextjs-using-localstorage-and-typescript)
