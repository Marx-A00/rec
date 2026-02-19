# Phase 40: Archive Mode - Research

**Researched:** 2026-02-16
**Domain:** Archive calendar navigation, historical puzzle playback, separate stats tracking
**Confidence:** HIGH

## Summary

Phase 40 implements an archive system for past daily Uncover puzzles, allowing players to access and play any challenge they missed since the game's launch (2026-01-01 epoch). The archive features a calendar-grid navigation showing play history with color-coded status indicators, separate stats tracking that doesn't affect daily streaks, and both desktop/mobile route support.

**Architecture approach:**

- **Calendar navigation**: Month-view grid using React calendar component (shadcn/ui Calendar with react-day-picker)
- **Date-based routing**: `/game/archive/[date]` for desktop, `/m/game/archive/[date]` for mobile
- **Play history display**: Query all UncoverSession records for user, color-code calendar cells (green=won, red=lost, gray=missed)
- **Archive game state**: Reuse existing game service but load challenge by date instead of today
- **Separate stats**: New `UncoverArchiveStats` table or flag on existing stats to differentiate daily vs archive
- **No streak impact**: Archive games never increment/reset currentStreak (daily-only concept)

The codebase already has:

- `getOrCreateDailyChallenge(date)` function accepts any date (not just today)
- `UncoverSession` table with challengeId and userId (can query by date range)
- `UncoverPlayerStats` with winDistribution for daily stats
- Game service functions (`startSession`, `submitGuess`, `skipGuess`) work for any challenge
- Date utilities (`toUTCMidnight`, `formatDateUTC`, `GAME_EPOCH`)
- Desktop/mobile route pattern established

**Primary recommendation:** Add shadcn/ui Calendar component for month navigation. Create archive routes that pass date parameter to existing game service. Build archive stats service with separate tracking. Query user's session history to populate calendar status. Use date-fns for calendar logic (already in package.json).

## Standard Stack

### Core

| **Library** | **Version** | **Purpose** | **Why Standard** |
|-------------|-------------|-------------|-----------------|
| react-day-picker | ^9.x (via shadcn) | Calendar grid component | Industry standard, used by shadcn/ui Calendar, accessible |
| date-fns | ^4.1.0 | Date manipulation | Already in codebase, lightweight alternative to moment.js |
| Prisma | ^6.17.1 | Database queries | Already in codebase, session history lookups |
| Next.js Dynamic Routes | 15.x | `/game/archive/[date]` | Already in codebase, path-based routing |

### Supporting

| **Library** | **Version** | **Purpose** | **When to Use** |
|-------------|-------------|-------------|-----------------|
| shadcn/ui Calendar | Latest | Pre-styled calendar | Month view with day cells, keyboard navigation |
| Radix UI Popover | Latest | Month picker dropdown | Quick month/year navigation (behind shadcn) |
| Lucide React | Latest | Calendar icon | Entry point button on main game page |
| TanStack Query | v5 | Session history cache | Fetch user's play history for calendar |

### Alternatives Considered

| **Instead of** | **Could Use** | **Tradeoff** |
|----------------|---------------|--------------|
| react-day-picker | react-calendar, react-datepicker | react-day-picker is more customizable, better TypeScript support |
| Separate archive stats table | Flag on existing stats | Separate table cleaner (no mixing daily/archive), easier to query |
| Route param `/[date]` | Query param `?date=` | Route param better for SEO, cleaner URLs, easier back button |
| Calendar grid | List view with date filter | Calendar visual matches Wordle pattern, better UX for browsing |

**Installation:**

```bash
# Add shadcn/ui Calendar component (includes react-day-picker)
pnpm dlx shadcn@latest add calendar

# date-fns already installed (verify)
pnpm list date-fns
```

## Architecture Patterns

### Recommended Project Structure

```
src/
├── app/
│   ├── (main)/
│   │   ├── game/
│   │   │   ├── page.tsx                      # Daily game (existing)
│   │   │   └── archive/
│   │   │       ├── page.tsx                  # NEW: Calendar view
│   │   │       └── [date]/
│   │   │           └── page.tsx              # NEW: Archive game for date
│   └── m/
│       └── game/
│           ├── page.tsx                       # Mobile daily (existing)
│           └── archive/
│               ├── page.tsx                   # NEW: Mobile calendar
│               └── [date]/
│                   └── page.tsx               # NEW: Mobile archive game
├── components/
│   └── uncover/
│       ├── ArchiveCalendar.tsx               # NEW: Month view calendar
│       ├── ArchiveStatsDisplay.tsx           # NEW: Separate archive stats
│       └── StatsModal.tsx                     # UPDATED: Show daily + archive stats
├── lib/
│   └── uncover/
│       ├── archive-stats-service.ts          # NEW: Archive stats CRUD
│       └── game-service.ts                    # UPDATED: Handle archive mode
├── graphql/
│   ├── schema.graphql                        # ADD: UncoverArchiveStats type
│   └── queries/
│       ├── archive-history.graphql           # NEW: Query user's session history
│       └── archive-stats.graphql             # NEW: Query archive stats
└── prisma/
    └── schema.prisma                         # ADD: UncoverArchiveStats model
```

### Pattern 1: Calendar Component with Play History

**What:** Calendar grid showing past challenges with color-coded status
**When to use:** ARCHIVE-02 (archive shows which days were played/missed)
**Example:**

```typescript
// src/components/uncover/ArchiveCalendar.tsx
'use client';

import { useState } from 'react';
import { Calendar } from '@/components/ui/calendar';
import { useUserArchiveHistoryQuery } from '@/generated/graphql';
import { GAME_EPOCH, toUTCMidnight } from '@/lib/daily-challenge/date-utils';
import { format, isBefore, isAfter, isSameDay } from 'date-fns';
import { useRouter } from 'next/navigation';
import { CalendarDays } from 'lucide-react';

interface ArchiveCalendarProps {
  /** Whether this is mobile view (affects navigation) */
  mobile?: boolean;
}

/**
 * Calendar view for browsing and accessing past daily challenges.
 * Color codes: green = won, red = lost, gray = missed, neutral = not played
 */
export function ArchiveCalendar({ mobile = false }: ArchiveCalendarProps) {
  const router = useRouter();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  
  // Fetch user's session history for calendar status
  const { data, isLoading } = useUserArchiveHistoryQuery();
  
  const sessionMap = new Map<string, 'won' | 'lost'>();
  
  // Build lookup map: date -> session status
  if (data?.myUncoverSessions) {
    data.myUncoverSessions.forEach(session => {
      const dateKey = format(session.challenge.date, 'yyyy-MM-dd');
      sessionMap.set(dateKey, session.won ? 'won' : 'lost');
    });
  }
  
  const today = toUTCMidnight(new Date());
  
  // Custom day cell renderer with status colors
  const modifiers = {
    won: (date: Date) => {
      const key = format(date, 'yyyy-MM-dd');
      return sessionMap.get(key) === 'won';
    },
    lost: (date: Date) => {
      const key = format(date, 'yyyy-MM-dd');
      return sessionMap.get(key) === 'lost';
    },
    missed: (date: Date) => {
      // Missed = past date with no session
      const key = format(date, 'yyyy-MM-dd');
      const isBeforeToday = isBefore(date, today);
      const isAfterEpoch = isAfter(date, GAME_EPOCH) || isSameDay(date, GAME_EPOCH);
      return isBeforeToday && isAfterEpoch && !sessionMap.has(key);
    },
    beforeEpoch: (date: Date) => isBefore(date, GAME_EPOCH),
    future: (date: Date) => isAfter(date, today),
  };
  
  const modifiersStyles = {
    won: { backgroundColor: 'hsl(var(--success) / 0.3)', color: 'hsl(var(--success))' },
    lost: { backgroundColor: 'hsl(var(--destructive) / 0.2)', color: 'hsl(var(--destructive))' },
    missed: { backgroundColor: 'hsl(var(--muted))', color: 'hsl(var(--muted-foreground))' },
  };
  
  const handleDayClick = (date: Date | undefined) => {
    if (!date) return;
    
    const normalized = toUTCMidnight(date);
    
    // Don't allow clicks before epoch or future dates
    if (isBefore(normalized, GAME_EPOCH) || isAfter(normalized, today)) {
      return;
    }
    
    // If today, navigate to main game page
    if (isSameDay(normalized, today)) {
      router.push(mobile ? '/m/game' : '/game');
      return;
    }
    
    // Navigate to archive game for this date
    const dateStr = format(normalized, 'yyyy-MM-dd');
    router.push(mobile ? `/m/game/archive/${dateStr}` : `/game/archive/${dateStr}`);
  };
  
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <CalendarDays className="h-5 w-5" />
        <h2 className="text-lg font-semibold">Archive</h2>
      </div>
      
      {isLoading ? (
        <div className="flex h-80 items-center justify-center">
          <div className="text-muted-foreground">Loading calendar...</div>
        </div>
      ) : (
        <Calendar
          mode="single"
          selected={undefined}
          onSelect={handleDayClick}
          month={currentMonth}
          onMonthChange={setCurrentMonth}
          modifiers={modifiers}
          modifiersStyles={modifiersStyles}
          disabled={(date) => 
            isBefore(date, GAME_EPOCH) || isAfter(date, today)
          }
          className="rounded-md border"
          captionLayout="dropdown-buttons" // Year/month dropdowns
          fromDate={GAME_EPOCH}
          toDate={today}
        />
      )}
      
      {/* Legend */}
      <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
        <div className="flex items-center gap-2">
          <div className="h-4 w-4 rounded bg-success/30" />
          <span>Won</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-4 w-4 rounded bg-destructive/20" />
          <span>Lost</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-4 w-4 rounded bg-muted" />
          <span>Missed</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-4 w-4 rounded border" />
          <span>Not Played</span>
        </div>
      </div>
    </div>
  );
}
```

**Rationale:**

- react-day-picker (via shadcn Calendar) handles month navigation, keyboard support, accessibility
- `modifiers` system color-codes days based on session status
- `disabled` prop prevents clicks before epoch or future dates
- Today's date navigates to main game (not archive) per CONTEXT.md
- Lookup map avoids O(n) searches for each day cell
- `captionLayout="dropdown-buttons"` adds quick month/year navigation

### Pattern 2: Archive Route with Date Parameter

**What:** Dynamic route loads challenge for specific date instead of today
**When to use:** ARCHIVE-01 (player can access past daily puzzles)
**Example:**

```typescript
// src/app/(main)/game/archive/[date]/page.tsx
import { notFound } from 'next/navigation';
import { getOrCreateDailyChallenge } from '@/lib/daily-challenge/challenge-service';
import { GAME_EPOCH, toUTCMidnight } from '@/lib/daily-challenge/date-utils';
import { ArchiveGame } from '@/components/uncover/ArchiveGame';
import { isAfter, isBefore, parseISO } from 'date-fns';

interface PageProps {
  params: {
    date: string; // Format: YYYY-MM-DD
  };
}

export default async function ArchiveGamePage({ params }: PageProps) {
  const { date: dateParam } = params;
  
  // Validate date format
  let challengeDate: Date;
  try {
    challengeDate = parseISO(dateParam);
    challengeDate = toUTCMidnight(challengeDate);
  } catch {
    notFound();
  }
  
  // Validate date is within valid range
  const today = toUTCMidnight(new Date());
  
  if (isBefore(challengeDate, GAME_EPOCH) || isAfter(challengeDate, today)) {
    notFound();
  }
  
  // Fetch challenge for this date (creates if doesn't exist)
  const challenge = await getOrCreateDailyChallenge(challengeDate);
  
  return (
    <div className="container mx-auto max-w-4xl py-8">
      <ArchiveGame
        challengeDate={challengeDate}
        challengeId={challenge.id}
      />
    </div>
  );
}
```

**Rationale:**

- Validates date parameter before loading challenge
- Rejects dates before epoch or in future (same logic as calendar)
- Uses existing `getOrCreateDailyChallenge` with date parameter
- Server component fetches challenge data before client loads

### Pattern 3: Archive Game Component

**What:** Game UI for archive puzzles (not daily challenge)
**When to use:** ARCHIVE-01 (play past puzzles), ARCHIVE-03 (no streak impact)
**Example:**

```typescript
// src/components/uncover/ArchiveGame.tsx
'use client';

import { useState, useEffect } from 'react';
import { UncoverGame } from './UncoverGame';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Calendar } from 'lucide-react';
import { format } from 'date-fns';

interface ArchiveGameProps {
  challengeDate: Date;
  challengeId: string;
}

/**
 * Archive game wrapper - plays past daily puzzles.
 * Archive games don't affect streaks (ARCHIVE-03).
 */
export function ArchiveGame({ challengeDate, challengeId }: ArchiveGameProps) {
  const router = useRouter();
  const [showBackButton, setShowBackButton] = useState(false);
  
  const formattedDate = format(challengeDate, 'MMMM d, yyyy');
  
  // Show "Back to Archive" button after game completion
  const handleGameComplete = () => {
    setShowBackButton(true);
  };
  
  return (
    <div className="space-y-4">
      {/* Header with date and back button */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Calendar className="h-5 w-5 text-muted-foreground" />
          <h1 className="text-xl font-semibold">
            Archive: {formattedDate}
          </h1>
        </div>
        
        <Button
          variant="outline"
          size="sm"
          onClick={() => router.push('/game/archive')}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Calendar
        </Button>
      </div>
      
      {/* Game component (reuse existing) */}
      <UncoverGame
        mode="archive"
        challengeDate={challengeDate}
        onGameComplete={handleGameComplete}
      />
      
      {/* Post-game "Back to Archive" button */}
      {showBackButton && (
        <Button
          onClick={() => router.push('/game/archive')}
          className="w-full"
        >
          <Calendar className="mr-2 h-4 w-4" />
          Back to Archive Calendar
        </Button>
      )}
    </div>
  );
}
```

**Rationale:**

- Displays date context (not "today's challenge")
- "Back to Calendar" always visible (easy escape)
- Post-game button encourages browsing more archive puzzles
- Reuses existing `UncoverGame` component with `mode="archive"` flag

### Pattern 4: Separate Archive Stats Tracking

**What:** Archive stats tracked separately from daily stats
**When to use:** ARCHIVE-03 (no streak impact), ARCHIVE-04 (archive stats tracked)
**Example:**

```typescript
// src/lib/uncover/archive-stats-service.ts
import type { PrismaClient } from '@prisma/client';

interface UpdateArchiveStatsInput {
  userId: string;
  won: boolean;
  attemptCount: number;
}

interface ArchiveStats {
  gamesPlayed: number;
  gamesWon: number;
  winRate: number;
  winDistribution: number[];
}

/**
 * Update archive stats after archive game completion.
 * ARCHIVE-03: Archive games never affect currentStreak (daily-only)
 * ARCHIVE-04: Archive games still track win/loss stats
 */
export async function updateArchiveStats(
  input: UpdateArchiveStatsInput,
  prisma: PrismaClient
) {
  const { userId, won, attemptCount } = input;
  
  const existing = await prisma.uncoverArchiveStats.findUnique({
    where: { userId },
  });
  
  // Calculate new win distribution
  let newDistribution = existing?.winDistribution || [0, 0, 0, 0, 0, 0];
  if (won && attemptCount >= 1 && attemptCount <= 6) {
    newDistribution = [...newDistribution];
    newDistribution[attemptCount - 1] += 1;
  }
  
  // Upsert archive stats (no streak tracking)
  return prisma.uncoverArchiveStats.upsert({
    where: { userId },
    create: {
      userId,
      gamesPlayed: 1,
      gamesWon: won ? 1 : 0,
      totalAttempts: attemptCount,
      winDistribution: newDistribution,
    },
    update: {
      gamesPlayed: { increment: 1 },
      gamesWon: won ? { increment: 1 } : undefined,
      totalAttempts: { increment: attemptCount },
      winDistribution: newDistribution,
    },
  });
}

/**
 * Get archive stats for display.
 */
export async function getArchiveStats(
  userId: string,
  prisma: PrismaClient
): Promise<ArchiveStats> {
  const stats = await prisma.uncoverArchiveStats.findUnique({
    where: { userId },
  });
  
  if (!stats) {
    return {
      gamesPlayed: 0,
      gamesWon: 0,
      winRate: 0,
      winDistribution: [0, 0, 0, 0, 0, 0],
    };
  }
  
  const winRate = stats.gamesPlayed > 0 ? stats.gamesWon / stats.gamesPlayed : 0;
  
  return {
    gamesPlayed: stats.gamesPlayed,
    gamesWon: stats.gamesWon,
    winRate,
    winDistribution: stats.winDistribution,
  };
}
```

**Rationale:**

- Separate table (`UncoverArchiveStats`) keeps daily/archive stats isolated
- No `currentStreak` or `maxStreak` fields (streaks are daily-only)
- No `lastPlayedDate` needed (archive games can be played in any order)
- Identical distribution tracking to daily stats (consistent UX)

### Pattern 5: Prisma Schema for Archive Stats

**What:** Database model for archive stats (separate from daily)
**When to use:** ARCHIVE-03 (separate tracking), ARCHIVE-04 (stats update)
**Example:**

```prisma
// Add to prisma/schema.prisma

/// Archive stats aggregate (denormalized for fast lookup)
/// Separate from daily stats - archive games never affect streaks
model UncoverArchiveStats {
  id              String    @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  userId          String    @unique @map("user_id")
  
  gamesPlayed     Int       @default(0) @map("games_played")
  gamesWon        Int       @default(0) @map("games_won")
  totalAttempts   Int       @default(0) @map("total_attempts")
  
  winDistribution Int[]     @default([0,0,0,0,0,0]) @map("win_distribution")
  
  createdAt       DateTime  @default(now()) @map("created_at")
  updatedAt       DateTime  @updatedAt @map("updated_at")
  
  user            User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  @@index([userId])
  @@map("uncover_archive_stats")
}

// Add to User model:
model User {
  // ... existing fields
  uncoverArchiveStats UncoverArchiveStats?
}
```

**Rationale:**

- Mirrors `UncoverPlayerStats` structure but without streak fields
- No `lastPlayedDate` (archive games can be out of order)
- Same `winDistribution` array for consistent UI
- One-to-one with User (unique userId)

### Pattern 6: Updated Stats Modal with Archive Section

**What:** Show daily + archive stats in post-game modal
**When to use:** ARCHIVE-04 (archive stats visible)
**Example:**

```typescript
// Update src/components/uncover/StatsModal.tsx

interface StatsModalProps {
  open: boolean;
  onClose: () => void;
  won: boolean;
  attemptCount: number;
  mode?: 'daily' | 'archive'; // NEW: differentiate daily vs archive
}

export function StatsModal({ 
  open, 
  onClose, 
  won, 
  attemptCount,
  mode = 'daily' // Default to daily
}: StatsModalProps) {
  const { data: dailyStats } = useMyUncoverStatsQuery({}, { enabled: open });
  const { data: archiveStats } = useMyArchiveStatsQuery({}, { enabled: open });
  
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {won ? '🎉 You Won!' : 'Game Over'}
            {mode === 'archive' && ' (Archive)'}
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6 py-4">
          {/* Daily Stats Section */}
          <div>
            <h3 className="mb-3 text-sm font-medium text-muted-foreground">
              Daily Stats
            </h3>
            <div className="grid grid-cols-4 gap-4 text-center">
              {/* ... existing daily stats grid ... */}
            </div>
            <GuessDistributionChart
              distribution={dailyStats?.myUncoverStats.winDistribution}
              todayAttempts={mode === 'daily' && won ? attemptCount : null}
            />
          </div>
          
          {/* Archive Stats Section (if any archive games played) */}
          {archiveStats?.myArchiveStats && archiveStats.myArchiveStats.gamesPlayed > 0 && (
            <div className="border-t pt-6">
              <h3 className="mb-3 text-sm font-medium text-muted-foreground">
                Archive Stats
              </h3>
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <div className="text-2xl font-bold">
                    {archiveStats.myArchiveStats.gamesPlayed}
                  </div>
                  <div className="text-xs text-muted-foreground">Played</div>
                </div>
                <div>
                  <div className="text-2xl font-bold">
                    {Math.round(archiveStats.myArchiveStats.winRate * 100)}%
                  </div>
                  <div className="text-xs text-muted-foreground">Win Rate</div>
                </div>
                <div>
                  <div className="text-2xl font-bold">
                    {archiveStats.myArchiveStats.gamesWon}
                  </div>
                  <div className="text-xs text-muted-foreground">Wins</div>
                </div>
              </div>
              <GuessDistributionChart
                distribution={archiveStats.myArchiveStats.winDistribution}
                todayAttempts={mode === 'archive' && won ? attemptCount : null}
              />
            </div>
          )}
          
          <button onClick={onClose} className="...">Close</button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
```

**Rationale:**

- Shows both daily and archive stats in same modal (consistent experience)
- Archive section only appears if player has archive games (progressive disclosure)
- Highlights current game result in appropriate chart (daily vs archive)
- Clear visual separation (border-top) between daily/archive sections

### Pattern 7: GraphQL Schema for Archive History

**What:** Query user's session history for calendar status
**When to use:** ARCHIVE-02 (calendar shows played/missed status)
**Example:**

```graphql
# Add to src/graphql/schema.graphql

type UncoverSessionHistory {
  id: UUID!
  won: Boolean!
  attemptCount: Int!
  completedAt: DateTime
  challenge: UncoverChallengeInfo!
}

type UncoverChallengeInfo {
  id: UUID!
  date: DateTime!
}

extend type Query {
  # Get all sessions for current user (for calendar display)
  myUncoverSessions(
    fromDate: DateTime
    toDate: DateTime
  ): [UncoverSessionHistory!]!
  
  # Get archive stats for current user
  myArchiveStats: UncoverArchiveStats
}
```

```typescript
// In src/lib/graphql/resolvers/queries.ts
export const myUncoverSessions = async (
  _parent: unknown,
  args: { fromDate?: Date; toDate?: Date },
  context: GraphQLContext
) => {
  if (!context.user) {
    throw new Error('Authentication required');
  }
  
  const sessions = await context.prisma.uncoverSession.findMany({
    where: {
      userId: context.user.id,
      challenge: {
        date: {
          gte: args.fromDate,
          lte: args.toDate,
        },
      },
    },
    include: {
      challenge: {
        select: {
          id: true,
          date: true,
        },
      },
    },
    orderBy: {
      challenge: {
        date: 'desc',
      },
    },
  });
  
  return sessions;
};
```

**Rationale:**

- Query all sessions in date range (efficient for calendar month)
- Returns minimal data (won/lost status, date) to keep payload small
- Ordered by date descending (most recent first)
- Optional date filters for pagination if needed

### Pattern 8: Game Service Mode Flag

**What:** Extend game service to handle archive mode
**When to use:** ARCHIVE-03 (don't update streaks), ARCHIVE-04 (update archive stats)
**Example:**

```typescript
// Update src/lib/uncover/game-service.ts

import { updatePlayerStats } from './stats-service';
import { updateArchiveStats } from './archive-stats-service';

interface SubmitGuessOptions {
  sessionId: string;
  albumId: string;
  userId: string;
  mode?: 'daily' | 'archive'; // NEW
}

export async function submitGuess(
  { sessionId, albumId, userId, mode = 'daily' }: SubmitGuessOptions,
  prisma: PrismaClient
): Promise<SubmitGuessResult> {
  // ... existing validation and guess logic ...
  
  // Update session
  const updatedSession = await prisma.uncoverSession.update({
    where: { id: sessionId },
    data: {
      attemptCount: newAttemptCount,
      status: gameResult.status,
      won: isCorrect,
      completedAt: gameResult.gameOver ? new Date() : null,
    },
    include: { guesses: { orderBy: { guessNumber: 'asc' } } },
  });
  
  // Update stats if game ended
  if (gameResult.gameOver) {
    if (mode === 'daily') {
      // ARCHIVE-03: Only daily games affect streaks
      await updatePlayerStats(
        {
          userId,
          won: isCorrect,
          attemptCount: newAttemptCount,
          challengeDate: session.challenge.date,
        },
        prisma
      );
    } else {
      // ARCHIVE-04: Archive games track separate stats (no streaks)
      await updateArchiveStats(
        {
          userId,
          won: isCorrect,
          attemptCount: newAttemptCount,
        },
        prisma
      );
    }
  }
  
  // ... rest of function ...
}
```

**Rationale:**

- Single game service handles both daily and archive modes
- Mode flag determines which stats service to call
- Daily mode updates streaks, archive mode doesn't
- No code duplication (validation, guess creation identical)

### Anti-Patterns to Avoid

- **Allowing replay of daily challenge** — Archive is for past puzzles only, today's game is on `/game` route
- **Mixing daily and archive stats** — Use separate tables; mixing makes queries complex and breaks streak logic
- **Creating archive sessions for future dates** — Validate date <= today in route and game service
- **Allowing archive games before epoch** — Calendar and routes must enforce `date >= GAME_EPOCH`
- **Updating streaks from archive games** — ARCHIVE-03: Archive games NEVER affect currentStreak
- **No "Back to Archive" button** — Players need easy way to return to calendar after completing puzzle
- **Fetching all sessions on calendar mount** — Use date range filter (fromDate/toDate) for current month only
- **Complex calendar from scratch** — Use react-day-picker (via shadcn); handles keyboard nav, accessibility, month navigation
- **LocalStorage for archive history** — Query database for authoritative session history (cross-device sync)

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| **Problem** | **Don't Build** | **Use Instead** | **Why** |
|-------------|-----------------|-----------------|---------|
| Calendar month view | Custom grid with date math | shadcn/ui Calendar (react-day-picker) | Handles keyboard nav, ARIA labels, month navigation, date ranges |
| Date validation | Manual year/month/day checks | date-fns parseISO, isBefore, isAfter | Handles leap years, timezone edge cases |
| Month navigation | Custom prev/next buttons | react-day-picker's built-in navigation | Handles year rollover, disabled dates, keyboard support |
| Color-coded day cells | Custom CSS classes | react-day-picker modifiers system | Type-safe, handles multiple states per day |
| Date formatting | String concatenation | date-fns format() | i18n support, locale-aware, consistent output |
| Session history lookup | Client-side filtering | Prisma date range queries | Database indexes, efficient pagination |
| Archive/daily mode split | Separate game services | Mode flag + conditional stats update | Shares validation logic, single source of truth |

**Key insight:** Calendar UI is deceptively complex (keyboard navigation, accessibility, month boundaries, disabled dates). react-day-picker handles all edge cases. Focus on business logic (session history, separate stats) not reinventing date pickers.

## Common Pitfalls

### Pitfall 1: Not Enforcing GAME_EPOCH Minimum Date

**What goes wrong:** Players access challenges before game launch (2026-01-01), breaking selection logic
**Why it happens:** Route validation missing or calendar allows clicks before epoch
**How to avoid:**

- Validate `date >= GAME_EPOCH` in route `page.tsx` (return 404 if before)
- Set calendar `disabled` prop to block before-epoch dates
- Set calendar `fromDate={GAME_EPOCH}` to prevent month navigation before launch

**Warning signs:**

- 404 errors on calendar clicks for early 2026 dates
- Selection service errors (no curated albums for pre-epoch dates)
- Negative `daysSinceEpoch` values

**Prevention strategy:**

```typescript
// In route:
if (isBefore(challengeDate, GAME_EPOCH)) {
  notFound();
}

// In calendar:
<Calendar
  disabled={(date) => isBefore(date, GAME_EPOCH) || isAfter(date, today)}
  fromDate={GAME_EPOCH}
  toDate={today}
/>
```

### Pitfall 2: Updating Daily Streaks from Archive Games

**What goes wrong:** Archive game completion increments `currentStreak` or resets it
**Why it happens:** Forgot to check mode flag before calling `updatePlayerStats`
**How to avoid:**

- Always pass `mode` parameter to game service functions
- Archive games must call `updateArchiveStats`, NOT `updatePlayerStats`
- Add guard condition: `if (mode === 'daily')` before streak updates

**Warning signs:**

- Streak increments after playing archive puzzle
- Streak resets when losing archive game
- `lastPlayedDate` updates to archive game date (should only update for daily)

**Prevention strategy:**

```typescript
if (gameResult.gameOver) {
  if (mode === 'daily') {
    await updatePlayerStats({ ... }, prisma); // Updates streaks
  } else {
    await updateArchiveStats({ ... }, prisma); // No streaks
  }
}
```

### Pitfall 3: Allowing Today's Date in Archive Route

**What goes wrong:** Players access `/game/archive/2026-02-16` when 2026-02-16 is today
**Why it happens:** Route validation checks `<= today` instead of `< today`
**How to avoid:**

- Per CONTEXT.md: "Today's date links to main game page (not archive)"
- Calendar click handler redirects today to `/game` not `/game/archive/[today]`
- Route can accept today's date but should be accessed via calendar only
- Alternatively, enforce `date < today` in route and return 404

**Warning signs:**

- Two separate sessions for same challenge (one daily, one archive)
- Stats update twice for today's puzzle
- User confusion about which route to use for today

**Prevention strategy:**

```typescript
// In calendar click handler:
if (isSameDay(normalized, today)) {
  router.push(mobile ? '/m/game' : '/game'); // Main game, not archive
  return;
}

// Route can still accept today (edge case: user types URL directly)
// But calendar doesn't link to it
```

### Pitfall 4: Session History Query Performance

**What goes wrong:** Calendar fetches ALL user sessions (hundreds of rows) on mount
**Why it happens:** No date filter on GraphQL query
**How to avoid:**

- Add `fromDate` and `toDate` parameters to `myUncoverSessions` query
- Calendar passes current month range (first/last day of month)
- Use Prisma `where` clause to filter by date range
- Add database index on `UncoverChallenge.date` for fast lookups

**Warning signs:**

- Slow calendar load time
- Large GraphQL response payloads (>100KB)
- Database slow query logs show full table scan

**Prevention strategy:**

```typescript
// Calendar query with date range:
const { data } = useUserArchiveHistoryQuery({
  fromDate: startOfMonth(currentMonth),
  toDate: endOfMonth(currentMonth),
});

// Resolver with indexed query:
const sessions = await prisma.uncoverSession.findMany({
  where: {
    userId: context.user.id,
    challenge: {
      date: {
        gte: args.fromDate,
        lte: args.toDate,
      },
    },
  },
  // ... rest
});
```

### Pitfall 5: Calendar State Not Invalidating After Archive Game

**What goes wrong:** Player completes archive puzzle, returns to calendar, day still shows "missed"
**Why it happens:** React Query cache not invalidated after session completion
**How to avoid:**

- Invalidate `myUncoverSessions` query after archive game ends
- Use `queryClient.invalidateQueries()` in post-game handler
- Alternative: Optimistically update cache with new session status

**Warning signs:**

- Calendar status doesn't update until page refresh
- Player sees wrong status (missed instead of won/lost)
- Inconsistent state between calendar and database

**Prevention strategy:**

```typescript
// In archive game component:
import { useQueryClient } from '@tanstack/react-query';

function ArchiveGame({ ... }) {
  const queryClient = useQueryClient();
  
  const handleGameComplete = () => {
    // Invalidate calendar data
    queryClient.invalidateQueries({ queryKey: ['myUncoverSessions'] });
    setShowBackButton(true);
  };
  
  // Pass to game component
  return <UncoverGame onGameComplete={handleGameComplete} />;
}
```

### Pitfall 6: Mobile Calendar Usability

**What goes wrong:** Calendar grid too small on mobile, day cells hard to tap
**Why it happens:** Desktop calendar styles don't scale down well
**How to avoid:**

- Use responsive sizing for calendar cells (--cell-size CSS variable)
- Minimum 44px tap target on mobile (iOS HIG guideline)
- Consider compact month view or simplified list on mobile
- Test on actual devices, not just browser DevTools

**Warning signs:**

- User reports difficulty tapping specific dates
- Calendar overflows viewport horizontally
- Day numbers truncated or overlapping

**Prevention strategy:**

```typescript
// Mobile-specific calendar styling:
<Calendar
  className={cn(
    "rounded-md border",
    mobile && "[--cell-size:44px]" // Ensure minimum tap target
  )}
  // ... rest of props
/>

// Or use simplified view on mobile:
{mobile ? (
  <ArchiveListView /> // Simple list of dates
) : (
  <ArchiveCalendar /> // Full month grid
)}
```

### Pitfall 7: Missing Archive Stats Migration

**What goes wrong:** Production deploy fails because `UncoverArchiveStats` table doesn't exist
**Why it happens:** Forgot to create/run Prisma migration
**How to avoid:**

- Always run `pnpm prisma migrate dev` after schema changes
- Test migration on local database before production
- Add migration to deployment checklist
- Verify table exists in production after deploy

**Warning signs:**

- GraphQL resolver errors: "Table 'uncover_archive_stats' doesn't exist"
- Prisma errors on archive stats upsert
- 500 errors on archive game completion

**Prevention strategy:**

```bash
# After adding UncoverArchiveStats to schema.prisma:
pnpm prisma migrate dev --name add-archive-stats

# Verify migration created:
ls prisma/migrations

# Test migration rollback/reapply:
pnpm prisma migrate reset
pnpm prisma migrate deploy
```

## Code Examples

Verified patterns from research:

### Complete Archive Calendar Component

```typescript
// src/components/uncover/ArchiveCalendar.tsx
'use client';

import { useState } from 'react';
import { Calendar } from '@/components/ui/calendar';
import { useUserArchiveHistoryQuery } from '@/generated/graphql';
import { GAME_EPOCH, toUTCMidnight } from '@/lib/daily-challenge/date-utils';
import { 
  format, 
  isBefore, 
  isAfter, 
  isSameDay,
  startOfMonth,
  endOfMonth 
} from 'date-fns';
import { useRouter } from 'next/navigation';

interface Props {
  mobile?: boolean;
}

export function ArchiveCalendar({ mobile = false }: Props) {
  const router = useRouter();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  
  // Fetch sessions for current month only
  const { data, isLoading } = useUserArchiveHistoryQuery({
    fromDate: startOfMonth(currentMonth),
    toDate: endOfMonth(currentMonth),
  });
  
  // Build lookup map
  const sessionMap = new Map<string, 'won' | 'lost'>();
  data?.myUncoverSessions?.forEach(session => {
    const dateKey = format(session.challenge.date, 'yyyy-MM-dd');
    sessionMap.set(dateKey, session.won ? 'won' : 'lost');
  });
  
  const today = toUTCMidnight(new Date());
  
  const modifiers = {
    won: (date: Date) => sessionMap.get(format(date, 'yyyy-MM-dd')) === 'won',
    lost: (date: Date) => sessionMap.get(format(date, 'yyyy-MM-dd')) === 'lost',
    missed: (date: Date) => {
      const key = format(date, 'yyyy-MM-dd');
      const isPast = isBefore(date, today);
      const isAfterEpoch = isAfter(date, GAME_EPOCH) || isSameDay(date, GAME_EPOCH);
      return isPast && isAfterEpoch && !sessionMap.has(key);
    },
  };
  
  const handleDayClick = (date: Date | undefined) => {
    if (!date) return;
    
    const normalized = toUTCMidnight(date);
    
    if (isBefore(normalized, GAME_EPOCH) || isAfter(normalized, today)) {
      return;
    }
    
    if (isSameDay(normalized, today)) {
      router.push(mobile ? '/m/game' : '/game');
      return;
    }
    
    const dateStr = format(normalized, 'yyyy-MM-dd');
    router.push(mobile ? `/m/game/archive/${dateStr}` : `/game/archive/${dateStr}`);
  };
  
  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">Archive</h2>
      
      <Calendar
        mode="single"
        onSelect={handleDayClick}
        month={currentMonth}
        onMonthChange={setCurrentMonth}
        modifiers={modifiers}
        modifiersStyles={{
          won: { backgroundColor: 'hsl(142 76% 36% / 0.3)' },
          lost: { backgroundColor: 'hsl(0 84% 60% / 0.2)' },
          missed: { backgroundColor: 'hsl(var(--muted))' },
        }}
        disabled={(date) => isBefore(date, GAME_EPOCH) || isAfter(date, today)}
        fromDate={GAME_EPOCH}
        toDate={today}
        captionLayout="dropdown-buttons"
        className="rounded-md border"
      />
      
      {/* Legend */}
      <div className="flex gap-4 text-xs">
        <div className="flex items-center gap-2">
          <div className="h-4 w-4 rounded" style={{ backgroundColor: 'hsl(142 76% 36% / 0.3)' }} />
          Won
        </div>
        <div className="flex items-center gap-2">
          <div className="h-4 w-4 rounded" style={{ backgroundColor: 'hsl(0 84% 60% / 0.2)' }} />
          Lost
        </div>
        <div className="flex items-center gap-2">
          <div className="h-4 w-4 rounded bg-muted" />
          Missed
        </div>
      </div>
    </div>
  );
}
```

### Archive Route Implementation

```typescript
// src/app/(main)/game/archive/[date]/page.tsx
import { notFound } from 'next/navigation';
import { getOrCreateDailyChallenge } from '@/lib/daily-challenge/challenge-service';
import { GAME_EPOCH, toUTCMidnight } from '@/lib/daily-challenge/date-utils';
import { ArchiveGameClient } from './ArchiveGameClient';
import { isAfter, isBefore, parseISO } from 'date-fns';

export default async function ArchiveGamePage({ 
  params 
}: { 
  params: { date: string } 
}) {
  let challengeDate: Date;
  
  try {
    challengeDate = toUTCMidnight(parseISO(params.date));
  } catch {
    notFound();
  }
  
  const today = toUTCMidnight(new Date());
  
  if (isBefore(challengeDate, GAME_EPOCH) || isAfter(challengeDate, today)) {
    notFound();
  }
  
  const challenge = await getOrCreateDailyChallenge(challengeDate);
  
  return (
    <div className="container mx-auto max-w-4xl py-8">
      <ArchiveGameClient
        challengeDate={challengeDate}
        challengeId={challenge.id}
      />
    </div>
  );
}
```

### Archive Stats Service

```typescript
// src/lib/uncover/archive-stats-service.ts
import type { PrismaClient } from '@prisma/client';

interface UpdateArchiveStatsInput {
  userId: string;
  won: boolean;
  attemptCount: number;
}

export async function updateArchiveStats(
  input: UpdateArchiveStatsInput,
  prisma: PrismaClient
) {
  const { userId, won, attemptCount } = input;
  
  const existing = await prisma.uncoverArchiveStats.findUnique({
    where: { userId },
  });
  
  let newDistribution = existing?.winDistribution || [0, 0, 0, 0, 0, 0];
  if (won && attemptCount >= 1 && attemptCount <= 6) {
    newDistribution = [...newDistribution];
    newDistribution[attemptCount - 1] += 1;
  }
  
  return prisma.uncoverArchiveStats.upsert({
    where: { userId },
    create: {
      userId,
      gamesPlayed: 1,
      gamesWon: won ? 1 : 0,
      totalAttempts: attemptCount,
      winDistribution: newDistribution,
    },
    update: {
      gamesPlayed: { increment: 1 },
      gamesWon: won ? { increment: 1 } : undefined,
      totalAttempts: { increment: attemptCount },
      winDistribution: newDistribution,
    },
  });
}

export async function getArchiveStats(userId: string, prisma: PrismaClient) {
  const stats = await prisma.uncoverArchiveStats.findUnique({
    where: { userId },
  });
  
  if (!stats) {
    return {
      gamesPlayed: 0,
      gamesWon: 0,
      winRate: 0,
      winDistribution: [0, 0, 0, 0, 0, 0],
    };
  }
  
  return {
    gamesPlayed: stats.gamesPlayed,
    gamesWon: stats.gamesWon,
    winRate: stats.gamesPlayed > 0 ? stats.gamesWon / stats.gamesPlayed : 0,
    winDistribution: stats.winDistribution,
  };
}
```

## State of the Art

| **Old Approach** | **Current Approach** | **When Changed** | **Impact** |
|------------------|----------------------|------------------|------------|
| List of dates with filter | Calendar grid with visual status | Game archive evolution (2020+) | Better UX, visual scanning vs text filtering |
| Shared stats table with flags | Separate archive stats table | Database normalization (2015+) | Cleaner queries, no mixing daily/archive |
| Custom calendar components | react-day-picker library | React ecosystem maturity (2022+) | Accessibility, i18n, less maintenance |
| Server-side date validation only | Client + server validation | Security best practices (2018+) | Better UX (instant feedback) + security |
| localStorage session history | Database-backed with GraphQL | Cross-device sync era (2020+) | Authoritative source, multi-device support |
| Separate game implementations | Shared game logic with mode flag | Code reuse patterns (ongoing) | DRY principle, single source of truth |

**Deprecated/outdated:**

- **Custom calendar grids**: react-day-picker handles all edge cases (keyboard nav, accessibility, RTL)
- **moment.js**: Replaced by date-fns (lighter, tree-shakeable, immutable)
- **Mixing archive/daily stats**: Separate tables cleaner for queries and prevents streak contamination
- **URL query params for date**: Route params (`/archive/[date]`) better for SEO and back button

## Open Questions

Things that couldn't be fully resolved:

1. **Should archive games count toward total games played in profile stats?**
   - What we know: ARCHIVE-04 says archive stats are tracked
   - What's unclear: Public profile shows "X games played" — is that daily only, or daily + archive?
   - Recommendation: Show both separately ("X daily games, Y archive games") to avoid confusion

2. **What happens if user navigates to today's date via URL (`/game/archive/2026-02-16`)?**
   - What we know: Calendar redirects today to main game page
   - What's unclear: Should route block today's date (404) or allow it?
   - Recommendation: Allow route to accept today (edge case: direct URL entry), but calendar doesn't link to it

3. **Should completed archive puzzles be replayable?**
   - What we know: CONTEXT says "clicking completed day shows read-only review"
   - What's unclear: Can user start new session for same archive date?
   - Recommendation: Read-only review only (no replay) to keep stats clean; would need duplicate session handling otherwise

4. **Mobile calendar: full grid or simplified list?**
   - What we know: CONTEXT defers mobile calendar layout to Claude's discretion
   - What's unclear: Is month grid usable on mobile, or should we use list view?
   - Recommendation: Try month grid first with responsive cell sizes (44px min); fall back to list if testing shows usability issues

5. **Archive session cleanup: delete old archive sessions?**
   - What we know: Sessions persist indefinitely in database
   - What's unclear: Should archive sessions be deleted after X days/months?
   - Recommendation: Keep all sessions (disk is cheap, data is valuable); calendar pagination prevents performance issues

6. **Should archive stats affect global leaderboards (if implemented)?**
   - What we know: Phase 40 has no leaderboard requirement
   - What's unclear: Future leaderboard features — daily-only or include archive?
   - Recommendation: Defer to leaderboard phase; likely daily-only to keep competitive integrity

## Sources

### Primary (HIGH confidence)

- [shadcn/ui Calendar Documentation](https://ui.shadcn.com/docs/components/radix/calendar) - Calendar component implementation and customization
- [react-day-picker Documentation](https://react-day-picker.js.org/) - Modifiers, styling, month navigation
- [date-fns Documentation](https://date-fns.org/) - Date formatting, comparison, manipulation
- [Solitaire Archive Calendar](https://solitaire.net/challenges) - Real-world example of game archive calendar
- [Sudoku Archive Calendar](https://sudoku.com/challenges) - Another game archive calendar pattern
- [Wordle Archive Implementations](https://wordlearchive.com/) - Historical puzzle playback patterns
- Codebase: `/src/lib/daily-challenge/challenge-service.ts` - `getOrCreateDailyChallenge(date)` accepts any date
- Codebase: `/src/lib/daily-challenge/date-utils.ts` - GAME_EPOCH, toUTCMidnight, date validation
- Codebase: `/prisma/schema.prisma` - UncoverSession, UncoverChallenge models
- Codebase: `/src/lib/uncover/stats-service.ts` - Stats update patterns to mirror for archive

### Secondary (MEDIUM confidence)

- [Next.js Dynamic Routes](https://nextjs.org/docs/app/building-your-application/routing/dynamic-routes) - `/[date]` route parameter handling
- [TanStack Query Invalidation](https://tanstack.com/query/latest/docs/framework/react/guides/query-invalidation) - Cache updates after game completion
- [React Aria Calendar](https://react-spectrum.adobe.com/react-aria/Calendar.html) - Accessibility patterns for calendars
- [Wordle Archive Tools](https://wordlesolver.pro/past-wordle-words/2026-02/) - Archive navigation UX patterns
- [Mobile Calendar UX Guidelines](https://www.nngroup.com/articles/mobile-calendar/) - Touch target sizing, mobile calendar patterns
- [Game State Management Best Practices](https://www.numberanalytics.com/blog/mastering-game-state-management) - Separating game modes and stats

### Tertiary (LOW confidence - for context only)

- Various game archive discussions - Community preferences for calendar vs list
- Board game stats apps - Stats separation patterns
- Mobile game analytics - Archive engagement metrics

## Metadata

**Confidence breakdown:**

- Standard stack: HIGH - react-day-picker (via shadcn), date-fns, Prisma all in codebase or easy to add
- Architecture: HIGH - Existing game service accepts any date, route patterns established, stats patterns proven
- Pitfalls: HIGH - GAME_EPOCH validation, streak contamination, today's date handling are known problem areas
- Integration: HIGH - Reuses existing models, game service, GraphQL patterns

**Research date:** 2026-02-16
**Valid until:** ~60 days (stable domain; archive patterns are mature, calendar components stable)

**Key assumptions validated:**

- ✅ `getOrCreateDailyChallenge(date)` accepts any date parameter (not just today)
- ✅ `UncoverSession` table has challengeId foreign key (can query by date)
- ✅ Game service (`submitGuess`, `skipGuess`) works for any challenge
- ✅ Date utilities (`toUTCMidnight`, `GAME_EPOCH`) already implemented
- ✅ Desktop/mobile route pattern established (`(main)` vs `m/`)
- ✅ Stats service patterns exist to mirror for archive stats
- ✅ date-fns ^4.1.0 already in package.json

**Implementation ready:** Yes. Core game infrastructure supports archive mode via date parameter. Need to add: shadcn Calendar component, archive routes, archive stats table/service, session history query, calendar UI component. All patterns proven in existing codebase.
