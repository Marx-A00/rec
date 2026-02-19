# Phase 35: Daily Challenge System - Research

**Researched:** 2026-02-16
**Domain:** Daily puzzle game challenge system with deterministic selection
**Confidence:** HIGH

## Summary

Phase 35 implements a daily challenge system for the Uncover album art guessing game. One album is selected per day (same for all players), with a UTC midnight reset. The phase focuses on the selection algorithm and challenge storage, not the game UI or player interactions (those are separate phases).

**Key architectural constraints from context:**
- Keep it simple — admin pre-curates a large ordered list of albums for daily challenges upfront
- No BullMQ scheduler needed — deterministic selection from the curated list
- Challenge row created on-demand (first request of the day) if it doesn't exist yet
- Deterministic mapping from date → album in the curated list (e.g., day index into the ordered list)
- Admin can pin specific albums to specific days (override)

**Primary recommendation:** Use a simple ordered list approach with date-to-index mapping. Store curated challenges in a separate table with sequence numbers. For deterministic selection: `albumIndex = daysSinceEpoch % totalCuratedAlbums`. This satisfies all requirements without scheduler complexity.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Prisma | ^6.9.0 | Database ORM | Already in use, models exist from Phase 33 |
| PostgreSQL | 17+ | Database | Already configured, supports Date type |
| GraphQL | 16.x | API layer | Existing pattern for queries/mutations |
| date-fns | N/A* | Date utilities | Lightweight, tree-shakeable (if needed) |

*Note: The project doesn't currently have date-fns installed, but it's not required for this phase — native JavaScript Date objects are sufficient for UTC date operations.

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| BullMQ | 5.x | Job scheduling | DEFERRED per context — not needed for v1.5 |
| seedrandom | 3.x | Seeded PRNG | ONLY if weighted random selection needed (deferred) |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Ordered list | Weighted random | More complex, deferred per context |
| On-demand creation | Pre-generation via scheduler | Adds scheduler complexity, deferred |
| Date modulo | Seeded shuffle | Adds dependency, unnecessary for ordered list |

**Installation:**
```bash
# No new dependencies needed — use existing Prisma, GraphQL, and native Date
```

## Architecture Patterns

### Recommended Project Structure
```
src/lib/daily-challenge/
├── selection-service.ts     # Deterministic date → album mapping
├── challenge-service.ts     # Challenge CRUD operations
└── curated-list-service.ts  # Admin curation management
```

### Pattern 1: Deterministic Date-to-Index Mapping

**What:** Map a date to an album index in a pre-curated ordered list using modulo arithmetic.

**When to use:** When you have a fixed, ordered pool and need deterministic, reproducible selection.

**Example:**
```typescript
// Deterministic selection from ordered curated list
function getAlbumIndexForDate(date: Date, totalAlbums: number): number {
  // Convert date to "days since epoch" (UTC midnight)
  const epochStart = new Date('2026-01-01T00:00:00Z'); // Game launch date
  const daysSinceEpoch = Math.floor(
    (date.getTime() - epochStart.getTime()) / (1000 * 60 * 60 * 24)
  );
  
  // Modulo ensures cycling through the list
  return daysSinceEpoch % totalAlbums;
}
```

**Rationale:** 
- Deterministic: Same date always yields same index
- Reproducible: For debugging, admin can calculate which album will appear on any date
- Simple: No external dependencies, no PRNG needed
- Cycles gracefully: When list is exhausted, starts from beginning

### Pattern 2: On-Demand Challenge Creation with Idempotency

**What:** Create challenge row on first request of the day. Prevent duplicates using database unique constraint.

**When to use:** When you want to avoid pre-generation complexity but ensure challenges exist when needed.

**Example:**
```typescript
// On-demand challenge creation
async function getOrCreateTodayChallenge(): Promise<UncoverChallenge> {
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0); // Normalize to UTC midnight
  
  // Try to find existing challenge
  const existing = await prisma.uncoverChallenge.findUnique({
    where: { date: today },
    include: { album: true },
  });
  
  if (existing) return existing;
  
  // Create new challenge deterministically
  const albumId = await selectAlbumForDate(today);
  
  try {
    return await prisma.uncoverChallenge.create({
      data: {
        date: today,
        albumId,
        maxAttempts: 6,
      },
      include: { album: true },
    });
  } catch (error) {
    // Handle race condition: another request created it first
    if (error.code === 'P2002') { // Unique constraint violation
      return await prisma.uncoverChallenge.findUnique({
        where: { date: today },
        include: { album: true },
      });
    }
    throw error;
  }
}
```

**Rationale:**
- No scheduler needed (simpler)
- Database unique constraint prevents duplicates
- Handles race conditions gracefully
- Challenge exists when first player of the day requests it

### Pattern 3: Admin Override with Pinned Challenges

**What:** Allow admin to manually pin a specific album to a specific date, overriding the deterministic selection.

**When to use:** For special occasions (album anniversaries, holidays, themed days).

**Example:**
```typescript
// Curated challenge list with optional pinned dates
model CuratedChallenge {
  id          String    @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  albumId     String    @map("album_id") @db.Uuid
  album       Album     @relation(fields: [albumId], references: [id])
  
  sequence    Int       @unique  // Position in ordered list (0, 1, 2, ...)
  pinnedDate  DateTime? @unique @db.Date  // Optional: Force this album on this date
  
  createdAt   DateTime  @default(now())
  
  @@index([sequence])
  @@index([pinnedDate])
}

// Selection logic with override
async function selectAlbumForDate(date: Date): Promise<string> {
  // 1. Check for pinned album on this date
  const pinned = await prisma.curatedChallenge.findUnique({
    where: { pinnedDate: date },
  });
  if (pinned) return pinned.albumId;
  
  // 2. Use deterministic selection from ordered list
  const totalCurated = await prisma.curatedChallenge.count();
  const index = getAlbumIndexForDate(date, totalCurated);
  
  const challenge = await prisma.curatedChallenge.findUnique({
    where: { sequence: index },
  });
  
  return challenge!.albumId;
}
```

**Rationale:**
- Admin override for special occasions
- Pinned albums still count as part of the sequence (used once)
- Deterministic fallback when no pin exists

### Anti-Patterns to Avoid

- **Random selection without seed:** Non-deterministic, can't reproduce for debugging
- **Pre-generating challenges 365 days ahead:** Adds complexity, BullMQ scheduler deferred per context
- **Using Date.now() for selection:** Includes time component, breaks midnight boundary
- **Ignoring UTC:** Timezone-dependent "new day" creates unfairness for global players

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| UTC date normalization | Custom timezone logic | `date.setUTCHours(0,0,0,0)` | Native Date handles UTC, avoid tz bugs |
| Seeded random number | Custom PRNG | N/A — use ordered list | Context defers weighted random |
| Unique date constraint | Application-level locking | Prisma `@@unique` | Database prevents race conditions |
| Days since epoch | Manual millisecond math | Standard formula | Well-tested, clear intent |

**Key insight:** The context explicitly defers scheduler complexity and weighted random selection. Don't build infrastructure you don't need. An ordered list with date modulo is sufficient for v1.5.

## Common Pitfalls

### Pitfall 1: Timezone Confusion (Midnight in Local vs UTC)

**What goes wrong:** Using local midnight instead of UTC causes different players to see different "today" challenges based on their timezone.

**Why it happens:** JavaScript's `new Date()` defaults to local timezone. Developers forget to normalize to UTC.

**How to avoid:** Always use UTC for challenge dates. Store dates as UTC midnight in database.

**Warning signs:**
- Players in different timezones report seeing different challenges
- Challenge date doesn't match server logs
- Tests fail when run in different timezones

**Prevention strategy:**
```typescript
// WRONG: Local timezone midnight
const today = new Date();
today.setHours(0, 0, 0, 0); // ❌ Uses local timezone

// CORRECT: UTC midnight
const today = new Date();
today.setUTCHours(0, 0, 0, 0); // ✅ UTC midnight for all players

// Or use ISO date strings
const today = new Date('2026-02-16T00:00:00Z'); // ✅ Explicit UTC
```

### Pitfall 2: Off-by-One Errors in Modulo Indexing

**What goes wrong:** Array index out of bounds or skipped albums when using modulo.

**Why it happens:** Forgetting that arrays are 0-indexed, or miscounting total albums.

**How to avoid:** Ensure `sequence` field starts at 0 and is contiguous. Use `findUnique({ where: { sequence } })` not array indexing.

**Warning signs:**
- Same album appears two days in a row unexpectedly
- Error: "Album not found" when challenge count changes
- First album in list never selected

**Prevention strategy:**
```typescript
// WRONG: Assumes array indexing
const albums = await prisma.curatedChallenge.findMany();
const index = daysSinceEpoch % albums.length;
return albums[index].albumId; // ❌ What if order changes?

// CORRECT: Use sequence field
const totalCount = await prisma.curatedChallenge.count();
const sequence = daysSinceEpoch % totalCount;
const challenge = await prisma.curatedChallenge.findUnique({
  where: { sequence },
});
return challenge!.albumId; // ✅ Stable, order-independent
```

### Pitfall 3: Race Condition on Challenge Creation

**What goes wrong:** Two concurrent requests for today's challenge both try to create it, causing duplicate key error.

**Why it happens:** "Check if exists, then create" is not atomic without transaction or unique constraint.

**How to avoid:** Let database enforce uniqueness with `@@unique([date])`. Catch `P2002` error and retry read.

**Warning signs:**
- Intermittent "unique constraint violation" errors in logs
- Challenge creation fails on high-traffic days
- Multiple challenge rows for same date (if constraint missing)

**Prevention strategy:**
```typescript
// WRONG: Check-then-create without handling race
const exists = await prisma.uncoverChallenge.findUnique({ where: { date } });
if (!exists) {
  await prisma.uncoverChallenge.create({ data: { date, albumId } }); // ❌ Race!
}

// CORRECT: Try to create, catch duplicate error
try {
  return await prisma.uncoverChallenge.create({
    data: { date, albumId },
  });
} catch (error) {
  if (error.code === 'P2002') { // Unique constraint violation
    return await prisma.uncoverChallenge.findUnique({ where: { date } }); // ✅
  }
  throw error;
}
```

### Pitfall 4: Empty Curated List Edge Case

**What goes wrong:** Modulo by zero error when curated list is empty.

**Why it happens:** Admin hasn't added albums yet, or all albums were removed.

**How to avoid:** Check for zero count before modulo. Return error or fallback.

**Warning signs:**
- Server crash with "division by zero" error
- "Cannot read property 'albumId' of null" when accessing challenge
- Challenge creation returns undefined

**Prevention strategy:**
```typescript
// Add validation
const totalCurated = await prisma.curatedChallenge.count();
if (totalCurated === 0) {
  throw new Error('No curated albums available. Admin must add albums to game pool.');
}

const sequence = daysSinceEpoch % totalCurated; // ✅ Safe
```

## Code Examples

Verified patterns for implementation:

### 1. UTC Date Normalization
```typescript
// Source: Native JavaScript Date API
// Purpose: Convert any date to UTC midnight for consistent challenge keys

function toUTCMidnight(date: Date): Date {
  const utcDate = new Date(date);
  utcDate.setUTCHours(0, 0, 0, 0);
  return utcDate;
}

// Usage in GraphQL resolver
const today = toUTCMidnight(new Date());
const challenge = await getOrCreateChallenge(today);
```

### 2. Deterministic Album Selection
```typescript
// Source: Modulo arithmetic pattern (date-based indexing)
// Purpose: Map date to album index deterministically

const GAME_EPOCH = new Date('2026-01-01T00:00:00Z'); // Game launch date

function getDaysSinceEpoch(date: Date): number {
  const normalizedDate = toUTCMidnight(date);
  const epochTime = GAME_EPOCH.getTime();
  const currentTime = normalizedDate.getTime();
  
  return Math.floor((currentTime - epochTime) / (1000 * 60 * 60 * 24));
}

async function selectAlbumForDate(date: Date): Promise<string> {
  const normalizedDate = toUTCMidnight(date);
  
  // 1. Check for admin pinned album
  const pinned = await prisma.curatedChallenge.findFirst({
    where: { pinnedDate: normalizedDate },
  });
  if (pinned) return pinned.albumId;
  
  // 2. Deterministic selection from ordered list
  const totalCurated = await prisma.curatedChallenge.count();
  if (totalCurated === 0) {
    throw new Error('No curated albums available');
  }
  
  const daysSinceEpoch = getDaysSinceEpoch(normalizedDate);
  const sequence = daysSinceEpoch % totalCurated;
  
  const challenge = await prisma.curatedChallenge.findUnique({
    where: { sequence },
  });
  
  if (!challenge) {
    throw new Error(`No album found at sequence ${sequence}`);
  }
  
  return challenge.albumId;
}
```

### 3. On-Demand Challenge Creation with Race Handling
```typescript
// Source: Prisma unique constraint + error handling pattern
// Purpose: Create challenge row on first request, handle concurrent creates

async function getOrCreateDailyChallenge(
  date: Date
): Promise<UncoverChallenge> {
  const normalizedDate = toUTCMidnight(date);
  
  // Try to find existing
  let challenge = await prisma.uncoverChallenge.findUnique({
    where: { date: normalizedDate },
    include: {
      album: {
        include: {
          artists: {
            include: { artist: true },
          },
        },
      },
    },
  });
  
  if (challenge) return challenge;
  
  // Select album deterministically
  const albumId = await selectAlbumForDate(normalizedDate);
  
  // Try to create
  try {
    challenge = await prisma.uncoverChallenge.create({
      data: {
        date: normalizedDate,
        albumId,
        maxAttempts: 6,
      },
      include: {
        album: {
          include: {
            artists: {
              include: { artist: true },
            },
          },
        },
      },
    });
    
    return challenge;
  } catch (error: any) {
    // Handle race condition: another request created it
    if (error.code === 'P2002') { // Unique constraint violation
      challenge = await prisma.uncoverChallenge.findUnique({
        where: { date: normalizedDate },
        include: {
          album: {
            include: {
              artists: {
                include: { artist: true },
              },
            },
          },
        },
      });
      
      if (!challenge) {
        throw new Error('Challenge creation race condition unresolved');
      }
      
      return challenge;
    }
    
    throw error;
  }
}
```

### 4. GraphQL Query for Today's Challenge (No Answer)
```typescript
// Source: Existing GraphQL resolver patterns in codebase
// Purpose: Return challenge info without revealing the answer album

// In schema.graphql (add to existing types)
type Query {
  dailyChallenge(date: DateTime): DailyChallengeInfo!
}

type DailyChallengeInfo {
  id: UUID!
  date: DateTime!
  maxAttempts: Int!
  totalPlays: Int!
  
  # Session info if user is authenticated
  mySession: UncoverSession
}

// Resolver
export const dailyChallenge = async (
  _parent: unknown,
  args: { date?: Date },
  context: GraphQLContext
) => {
  const targetDate = args.date 
    ? toUTCMidnight(new Date(args.date))
    : toUTCMidnight(new Date());
  
  const challenge = await getOrCreateDailyChallenge(targetDate);
  
  // Fetch user's session if authenticated
  let mySession = null;
  if (context.session?.userId) {
    mySession = await prisma.uncoverSession.findUnique({
      where: {
        challengeId_userId: {
          challengeId: challenge.id,
          userId: context.session.userId,
        },
      },
    });
  }
  
  // DO NOT return album field — that's the answer!
  return {
    id: challenge.id,
    date: challenge.date,
    maxAttempts: challenge.maxAttempts,
    totalPlays: challenge.totalPlays,
    mySession,
  };
};
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Pre-generate challenges via cron | On-demand creation with idempotency | 2020s (Wordle era) | Simpler, fewer moving parts |
| Random selection | Deterministic date-based | 2020s (daily puzzle games) | Reproducible, debuggable |
| Local midnight reset | UTC midnight reset | 2010s (global games) | Fair for all timezones |
| Store word list in frontend JS | Server-side selection | 2022 (NYT Wordle) | Prevents spoilers, admin control |

**Deprecated/outdated:**
- **Client-side challenge generation:** Wordle originally stored word list in frontend JS. NYT moved to server-side after acquisition to prevent spoilers and allow editorial control.
- **Random selection without seed:** Non-deterministic selection makes debugging impossible and creates unfair replays.

## Open Questions

Things that couldn't be fully resolved:

1. **Epoch start date**
   - What we know: Need a fixed reference point for "days since epoch" calculation
   - What's unclear: Should it be game launch date (2026-01-01?) or arbitrary epoch (1970-01-01)?
   - Recommendation: Use game launch date (more intuitive for debugging). Document in code comment.

2. **Curated list minimum size**
   - What we know: List should be large enough to avoid repetition for months
   - What's unclear: Exact target size (50? 100? 365?)
   - Recommendation: Start with ~100 albums (3+ months of daily challenges). Context mentions "large ordered list" but no specific number.

3. **Same-artist spacing enforcement**
   - What we know: Context says "minimum 14 days between albums by same artist"
   - What's unclear: Is this enforced when building the curated list, or at selection time?
   - Recommendation: Enforce when building the curated list (admin responsibility), not at runtime. Selection just uses sequence.

4. **Decade diversity enforcement**
   - What we know: Context says "soft rule — avoid same decade two days in a row"
   - What's unclear: How to enforce "soft rule" in ordered list approach?
   - Recommendation: Admin advisory when adding albums (show last N albums in UI). Don't block, just warn.

## Sources

### Primary (HIGH confidence)
- Prisma schema: `/Users/marcosandrade/roaming/projects/rec-game/prisma/schema.prisma` - UncoverChallenge model exists from Phase 33
- GraphQL schema: `/Users/marcosandrade/roaming/projects/rec-game/src/graphql/schema.graphql` - Existing query/mutation patterns
- Phase 34 context: Game pool (`gameStatus` enum) already implemented
- Phase 35 context: Explicit decisions on approach (ordered list, no scheduler, on-demand creation)
- BullMQ scheduler examples: `/Users/marcosandrade/roaming/projects/rec-game/src/lib/spotify/scheduler.ts` - Existing scheduler pattern (deferred for this phase)

### Secondary (MEDIUM confidence)
- [Rule34dle Daily Challenge](https://rule34dle.online/daily-challenge) - Uses UTC midnight reset and date-based seed system (verified pattern)
- [Daily & Weekly Reset Times Guide](https://flavor365.com/when-are-all-the-resets-a-guide-for-gamers-more/) - UTC reset as standard for global games
- [seedrandom library](https://github.com/davidbau/seedrandom) - Seeded PRNG for JS (deferred, but documented for future reference)
- [seed-shuffle library](https://github.com/yixizhang/seed-shuffle) - Deterministic array shuffle with seed (deferred)

### Tertiary (LOW confidence)
- Generic search results on deterministic selection algorithms - Not specific to daily puzzle games, not used for recommendations

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Native Date, existing Prisma/GraphQL patterns
- Architecture: HIGH - Context explicitly defines approach (ordered list, on-demand creation)
- Pitfalls: HIGH - UTC timezone issues, race conditions, modulo edge cases are well-documented

**Research date:** 2026-02-16
**Valid until:** 90 days (stable domain, context decisions locked)

**Key assumptions validated:**
- ✅ Prisma models exist from Phase 33 (UncoverChallenge, etc.)
- ✅ Phase 34 provides game pool (Album.gameStatus enum)
- ✅ No BullMQ scheduler needed per context
- ✅ Deterministic selection required per requirements (DAILY-05)
- ✅ UTC midnight reset required per requirements (DAILY-02)

**Implementation ready:** Yes. Context decisions are clear, technical patterns are proven, no blockers identified.
