# Phase 34: Album Pool - Research

**Researched:** 2026-02-15
**Domain:** Admin UI, data modeling, GraphQL API, audit trails
**Confidence:** HIGH

## Summary

This phase adds a curated pool of game-eligible albums with three-state management (eligible, excluded, neutral) and admin controls. The implementation leverages existing patterns from the correction system admin UI, Prisma enum fields, LlamaLog audit trails, and GraphQL queries with filtering.

Key architectural decisions already locked in via CONTEXT.md:
- Three-state enum (ELIGIBLE/EXCLUDED/NONE) on Album model
- LlamaLog audit trail for all status changes
- Dedicated "Game Pool" admin page + inline toggles on album list
- Two-section UI: Eligible albums and Suggested albums (auto-suggest candidates)
- Hard requirements: must have `cloudflareImageId` (cover art) AND full metadata
- Auto-suggest uses external popularity (Spotify) - kept simple and swappable

The codebase already has all necessary infrastructure: admin layout/routing, GraphQL mutation patterns, LlamaLog category system, and sophisticated admin table UIs with filtering/sorting.

**Primary recommendation:** Extend existing admin patterns (Music Database page structure, LlamaLog USER_ACTION category, GraphQL mutations with optimistic locking) to build the Game Pool management interface.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Prisma | Current | Database ORM with enum support | Native enum fields, type-safe migrations, already in use |
| GraphQL | 16.x | API layer with codegen | Type-safe queries/mutations, already extensively used |
| TanStack Query v5 | Latest | Data fetching + caching | React Query hooks generated from GraphQL, existing pattern |
| Next.js 15 App Router | 15.x | Server/client components | Admin pages use server components + client interactivity |
| shadcn/ui | Latest | UI components (Table, Select, Badge) | Existing admin UI standard, themeable |
| Tailwind CSS | 3.x | Styling | Codebase standard |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| LlamaLog | Internal | Audit trail system | Track all game status changes (USER_ACTION category) |
| date-fns | Latest | Date formatting | Display timestamps in admin UI |
| sonner | Latest | Toast notifications | Success/error feedback |
| lucide-react | Latest | Icons | UI indicators (CheckCircle, XCircle, MinusCircle) |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Prisma enum | JSON field with validation | Enum is type-safe, indexed, standard in codebase |
| LlamaLog | Separate AuditLog table | LlamaLog already handles USER_ACTION category |
| GraphQL | REST API | GraphQL already standard, codegen provides type safety |

**Installation:**
No new packages needed - all dependencies already in project.

## Architecture Patterns

### Recommended Project Structure
```
src/
├── app/admin/
│   └── game-pool/           # New admin page
│       └── page.tsx         # Game Pool management UI
├── components/admin/
│   └── game-pool/           # New components
│       ├── AlbumStatusBadge.tsx       # Three-state indicator
│       ├── StatusToggle.tsx            # Inline status change
│       ├── EligibleAlbumsTable.tsx     # Eligible albums section
│       └── SuggestedAlbumsTable.tsx    # Auto-suggest section
├── lib/
│   ├── graphql/resolvers/
│   │   └── mutations.ts     # Add updateAlbumGameStatus mutation
│   └── game-pool/
│       ├── auto-suggest.ts  # Popularity-based suggestions
│       └── eligibility.ts   # Validation logic
├── graphql/
│   ├── schema.graphql       # Add gameStatus enum + mutations
│   └── queries/
│       └── gamePool.graphql # New queries for game pool
└── prisma/
    └── migrations/          # Add gameStatus enum to Album
```

### Pattern 1: Three-State Enum Field on Album Model

**What:** Prisma enum with three values for game eligibility status
**When to use:** Core data model change - foundation for all pool management

**Example:**
```prisma
// prisma/schema.prisma
enum AlbumGameStatus {
  ELIGIBLE  // Approved for game pool
  EXCLUDED  // Explicitly blocked
  NONE      // Neutral (default, not yet reviewed)
}

model Album {
  // ... existing fields
  gameStatus  AlbumGameStatus  @default(NONE)
  // ... rest of model
}
```

**Migration command:**
```bash
pnpm prisma migrate dev --name add_album_game_status
```

### Pattern 2: GraphQL Schema Extension

**What:** Add gameStatus field and mutations to GraphQL schema
**When to use:** Expose game pool functionality to admin UI

**Example:**
```graphql
# src/graphql/schema.graphql

enum AlbumGameStatus {
  ELIGIBLE
  EXCLUDED
  NONE
}

type Album {
  # ... existing fields
  gameStatus: AlbumGameStatus!
}

input UpdateAlbumGameStatusInput {
  albumId: UUID!
  gameStatus: AlbumGameStatus!
  reason: String  # Optional explanation for audit trail
}

type UpdateAlbumGameStatusResult {
  success: Boolean!
  album: Album
  error: String
}

type Mutation {
  updateAlbumGameStatus(input: UpdateAlbumGameStatusInput!): UpdateAlbumGameStatusResult!
}

type Query {
  # Query albums by game status
  albumsByGameStatus(
    status: AlbumGameStatus!
    limit: Int = 50
    offset: Int = 0
  ): [Album!]!
  
  # Get suggested albums (auto-suggest candidates)
  suggestedGameAlbums(
    limit: Int = 50
    minPopularity: Int = 100000  # Spotify followers threshold
  ): [Album!]!
  
  # Get game pool stats
  gamePoolStats: GamePoolStats!
}

type GamePoolStats {
  eligibleCount: Int!
  excludedCount: Int!
  neutralCount: Int!
  totalWithCoverArt: Int!
}
```

### Pattern 3: LlamaLog Audit Trail

**What:** Use existing LlamaLog system with USER_ACTION category
**When to use:** Track all game status changes for accountability

**Example:**
```typescript
// src/lib/graphql/resolvers/mutations.ts
import { createLlamaLogger } from '@/lib/logging/llama-logger';

const updateAlbumGameStatus = async (_, { input }, context) => {
  const { albumId, gameStatus, reason } = input;
  const userId = context.session?.user?.id;
  
  if (!userId || !isAdmin(context.session?.user?.role)) {
    throw new GraphQLError('Unauthorized');
  }
  
  const album = await prisma.album.update({
    where: { id: albumId },
    data: { gameStatus },
  });
  
  // Audit trail via LlamaLog
  const llamaLogger = createLlamaLogger(prisma);
  await llamaLogger.logEnrichment({
    entityType: 'ALBUM',
    entityId: albumId,
    operation: 'game_pool:status_change',
    category: 'USER_ACTION',
    sources: ['ADMIN_UI'],
    status: 'SUCCESS',
    reason: reason || `Changed game status to ${gameStatus}`,
    fieldsEnriched: ['gameStatus'],
    userId,
    metadata: {
      previousStatus: album.gameStatus,
      newStatus: gameStatus,
    },
  });
  
  return { success: true, album };
};
```

### Pattern 4: Admin UI with Dual-Section Layout

**What:** Game Pool page with Eligible and Suggested sections (inspired by Music Database page)
**When to use:** Admin needs separate views for approved albums vs candidates

**Example:**
```typescript
// src/app/admin/game-pool/page.tsx
'use client';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { EligibleAlbumsTable } from '@/components/admin/game-pool/EligibleAlbumsTable';
import { SuggestedAlbumsTable } from '@/components/admin/game-pool/SuggestedAlbumsTable';
import { useGetGamePoolStatsQuery } from '@/generated/graphql';

export default function GamePoolPage() {
  const { data: stats } = useGetGamePoolStatsQuery();
  
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Game Pool Management</h1>
      
      {/* Stats Overview */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <StatCard label="Eligible" value={stats?.gamePoolStats.eligibleCount} />
        <StatCard label="Excluded" value={stats?.gamePoolStats.excludedCount} />
        <StatCard label="Not Reviewed" value={stats?.gamePoolStats.neutralCount} />
      </div>
      
      <Tabs defaultValue="eligible">
        <TabsList>
          <TabsTrigger value="eligible">
            Eligible Albums ({stats?.gamePoolStats.eligibleCount})
          </TabsTrigger>
          <TabsTrigger value="suggested">
            Suggested Albums
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="eligible">
          <EligibleAlbumsTable />
        </TabsContent>
        
        <TabsContent value="suggested">
          <SuggestedAlbumsTable />
        </TabsContent>
      </Tabs>
    </div>
  );
}
```

### Pattern 5: Auto-Suggest Algorithm (Simple & Swappable)

**What:** Pluggable popularity-based suggestion logic
**When to use:** Identify candidate albums for admin review

**Example:**
```typescript
// src/lib/game-pool/auto-suggest.ts

/**
 * Auto-suggest albums for game pool based on popularity signals.
 * Kept simple and swappable - algorithm will evolve.
 */
export interface SuggestionCriteria {
  minSpotifyFollowers?: number;  // Default: 100k
  hasCloudflareImageId: boolean; // Required
  hasFullMetadata: boolean;      // Required (artist, year, etc.)
  excludeStatuses: AlbumGameStatus[]; // Don't re-suggest already reviewed
}

export async function getSuggestedAlbums(
  prisma: PrismaClient,
  criteria: SuggestionCriteria = {},
  limit: number = 50
): Promise<Album[]> {
  const {
    minSpotifyFollowers = 100000,
    hasCloudflareImageId = true,
    hasFullMetadata = true,
    excludeStatuses = ['ELIGIBLE', 'EXCLUDED'],
  } = criteria;
  
  // Build where clause
  const where: Prisma.AlbumWhereInput = {
    gameStatus: { notIn: excludeStatuses },
  };
  
  // Hard requirement: cover art
  if (hasCloudflareImageId) {
    where.cloudflareImageId = { not: null };
  }
  
  // Hard requirement: full metadata
  if (hasFullMetadata) {
    where.AND = [
      { releaseDate: { not: null } },
      { artists: { some: {} } }, // Has at least one artist
    ];
  }
  
  // Fetch albums with Spotify data joined
  const albums = await prisma.album.findMany({
    where,
    include: {
      artists: {
        include: {
          artist: {
            select: {
              spotifyId: true,
              // Note: Spotify followers stored in metadata JSON
              // Would need to filter in-memory or add denormalized field
            },
          },
        },
      },
    },
    take: limit * 2, // Over-fetch for filtering
  });
  
  // TODO: Filter by Spotify popularity (followers from artist metadata)
  // For now, return albums with cover art + metadata
  return albums.slice(0, limit);
}
```

### Pattern 6: Inline Status Toggle Component

**What:** Three-state dropdown for quick status changes in table rows
**When to use:** Allow admin to change status without modal

**Example:**
```typescript
// src/components/admin/game-pool/StatusToggle.tsx
import { Select, SelectContent, SelectItem, SelectTrigger } from '@/components/ui/select';
import { useUpdateAlbumGameStatusMutation } from '@/generated/graphql';
import { CheckCircle, XCircle, MinusCircle } from 'lucide-react';

export function StatusToggle({ albumId, currentStatus }) {
  const { mutate } = useUpdateAlbumGameStatusMutation({
    onSuccess: () => toast.success('Status updated'),
  });
  
  return (
    <Select
      value={currentStatus}
      onValueChange={(newStatus) => {
        mutate({ input: { albumId, gameStatus: newStatus } });
      }}
    >
      <SelectTrigger className="w-32">
        <StatusBadge status={currentStatus} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="ELIGIBLE">
          <CheckCircle className="inline mr-2" /> Eligible
        </SelectItem>
        <SelectItem value="EXCLUDED">
          <XCircle className="inline mr-2" /> Excluded
        </SelectItem>
        <SelectItem value="NONE">
          <MinusCircle className="inline mr-2" /> Neutral
        </SelectItem>
      </SelectContent>
    </Select>
  );
}
```

### Anti-Patterns to Avoid

- **Don't add bulk operations initially:** Context says "one-by-one management is fine" - defer bulk approve/reject
- **Don't build complex popularity algorithms:** Keep auto-suggest simple and swappable - it will evolve
- **Don't add low-pool warnings:** Deferred per context - revisit if actually needed
- **Don't use boolean gameEligible:** Context explicitly replaced with three-state enum
- **Don't skip audit trail:** Every status change must create LlamaLog entry for accountability

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Audit logging | Custom change tracking table | LlamaLog with USER_ACTION category | Already handles entity changes, user tracking, metadata |
| Admin authentication | Custom role checks | `isAdmin(user.role)` helper | Existing pattern in admin pages |
| GraphQL type generation | Manual TypeScript types | `pnpm codegen` | Generates hooks and types from schema |
| Enum field | JSON validation | Prisma enum | Type-safe, indexed, validated at DB level |
| Table filtering | Custom filter UI | Existing admin table patterns | Music Database page has proven patterns |
| Toast notifications | Custom toast system | sonner (already used) | Consistent UX across admin |

**Key insight:** The codebase has mature admin patterns from correction system (three-step modals, audit trails, status changes). Reuse these patterns rather than building new ones.

## Common Pitfalls

### Pitfall 1: Forgetting Migration for Enum Default Value
**What goes wrong:** Existing albums don't have gameStatus set, causing null errors
**Why it happens:** Enum addition doesn't automatically set default on existing rows
**How to avoid:** Use Prisma migration with `@default(NONE)` - Prisma handles backfill
**Warning signs:** GraphQL errors about null gameStatus on existing albums

### Pitfall 2: Not Validating Cover Art Requirement
**What goes wrong:** Albums without cloudflareImageId marked ELIGIBLE
**Why it happens:** UI allows status change without eligibility check
**How to avoid:** Validate in mutation resolver before allowing ELIGIBLE status
**Warning signs:** Daily challenge selection fails because album lacks cover art

**Example validation:**
```typescript
// Validate before setting ELIGIBLE
if (gameStatus === 'ELIGIBLE') {
  const album = await prisma.album.findUnique({
    where: { id: albumId },
    select: { cloudflareImageId: true, releaseDate: true },
  });
  
  if (!album.cloudflareImageId) {
    throw new GraphQLError('Album must have cover art to be eligible');
  }
  if (!album.releaseDate) {
    throw new GraphQLError('Album must have full metadata to be eligible');
  }
}
```

### Pitfall 3: Race Conditions on Status Changes
**What goes wrong:** Two admins change status simultaneously, last write wins
**Why it happens:** No optimistic locking or versioning
**How to avoid:** Use `updatedAt` timestamp check (existing pattern in corrections)
**Warning signs:** Status changes get overwritten, confusing audit trail

**Example with optimistic locking:**
```typescript
// Include expectedUpdatedAt in mutation input
const album = await prisma.album.update({
  where: {
    id: albumId,
    updatedAt: expectedUpdatedAt, // Fails if stale
  },
  data: { gameStatus },
});
```

### Pitfall 4: Missing LlamaLog Context
**What goes wrong:** Can't answer "why was this excluded?" weeks later
**Why it happens:** No reason field captured in status change
**How to avoid:** Always include reason in mutation input (optional but encouraged)
**Warning signs:** Admin can't explain historical decisions

### Pitfall 5: Auto-Suggest Over-Engineering
**What goes wrong:** Complex popularity algorithm that's slow and hard to change
**Why it happens:** Trying to be too clever on v1
**How to avoid:** Keep auto-suggest simple (cloudflareImageId + basic threshold), iterate later
**Warning signs:** Auto-suggest query takes >5 seconds, hard to swap algorithm

## Code Examples

Verified patterns from existing codebase:

### Example 1: GraphQL Query with Enum Filter
```typescript
// Source: Existing album queries pattern
query AlbumsByGameStatus($status: AlbumGameStatus!, $limit: Int) {
  albumsByGameStatus(status: $status, limit: $limit) {
    id
    title
    cloudflareImageId
    releaseDate
    gameStatus
    artists {
      artist {
        name
      }
    }
  }
}
```

### Example 2: LlamaLog USER_ACTION Category
```typescript
// Source: src/lib/logging/llama-logger.ts (inferred pattern)
// Category is auto-inferred, but can be explicit for user actions

await llamaLogger.logEnrichment({
  entityType: 'ALBUM',
  entityId: albumId,
  operation: 'game_pool:status_change',
  category: 'USER_ACTION', // Explicit category for admin actions
  sources: ['ADMIN_UI'],
  status: 'SUCCESS',
  reason: `Admin marked as ${gameStatus}: ${reason || 'No reason provided'}`,
  fieldsEnriched: ['gameStatus'],
  userId: session.user.id,
  metadata: {
    previousStatus: previousGameStatus,
    newStatus: gameStatus,
    changedAt: new Date().toISOString(),
  },
});
```

### Example 3: Admin Page with Stats Cards
```typescript
// Source: Inspired by src/app/admin/music-database/page.tsx pattern
function GamePoolStats() {
  const { data } = useGetGamePoolStatsQuery();
  
  return (
    <div className="grid grid-cols-4 gap-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Eligible</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-green-500">
            {data?.gamePoolStats.eligibleCount || 0}
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Excluded</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-red-500">
            {data?.gamePoolStats.excludedCount || 0}
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Not Reviewed</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-zinc-400">
            {data?.gamePoolStats.neutralCount || 0}
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">With Cover Art</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {data?.gamePoolStats.totalWithCoverArt || 0}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
```

### Example 4: Seed Script for Initial Pool
```typescript
// Source: Pattern from existing seed scripts
// prisma/seeds/game-pool-seed.ts

/**
 * Seed initial game pool with ~50 popular albums
 * Run via: npx tsx prisma/seeds/game-pool-seed.ts
 */
import { PrismaClient, AlbumGameStatus } from '@prisma/client';

const prisma = new PrismaClient();

async function seedGamePool() {
  console.log('🎮 Seeding initial game pool...');
  
  // Strategy 1: Use well-known album IDs (manual curation)
  const classicAlbumIds = [
    // TODO: Replace with actual album IDs from database
    // Examples: Dark Side of the Moon, OK Computer, Thriller, etc.
  ];
  
  // Strategy 2: Query albums with high Spotify data quality
  const popularAlbums = await prisma.album.findMany({
    where: {
      cloudflareImageId: { not: null },
      releaseDate: { not: null },
      spotifyId: { not: null },
      // Could filter by dataQuality: 'HIGH' if available
    },
    include: {
      artists: {
        include: {
          artist: {
            select: { name: true },
          },
        },
      },
    },
    take: 100, // Over-fetch for manual review
  });
  
  // Mark first 50 as ELIGIBLE
  let markedCount = 0;
  for (const album of popularAlbums.slice(0, 50)) {
    await prisma.album.update({
      where: { id: album.id },
      data: { gameStatus: 'ELIGIBLE' },
    });
    
    console.log(`✅ Marked "${album.title}" as ELIGIBLE`);
    markedCount++;
  }
  
  console.log(`🎉 Seeded ${markedCount} albums into game pool`);
}

seedGamePool()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Boolean flags for features | Multi-state enums (Prisma) | Standard practice | Better semantics, type safety |
| Separate audit tables | LlamaLog unified system | Phase 33 (recently) | Single source for all entity changes |
| REST endpoints | GraphQL with codegen | Project standard | Type-safe queries, auto-generated hooks |
| Manual admin auth checks | `isAdmin()` helper | Existing pattern | Consistent across admin pages |
| shadcn/ui | Previous UI library | Early 2025 | Modern, accessible components |

**Deprecated/outdated:**
- **Boolean `gameEligible` field:** Replaced with three-state `AlbumGameStatus` enum per CONTEXT.md
- **Separate EnrichmentLog table:** Merged into LlamaLog as of Phase 33
- **Custom filter components:** shadcn/ui Select/Dropdown now standard

## Open Questions

Questions that couldn't be fully resolved:

1. **Spotify Popularity Data Storage**
   - What we know: Spotify followers/popularity exist in external API
   - What's unclear: Where to store popularity data for auto-suggest (Album.metadata JSON? Denormalized field? Artist.metadata?)
   - Recommendation: Start with in-memory filtering on Artist.metadata, add denormalized field if performance becomes issue

2. **Auto-Suggest Refresh Frequency**
   - What we know: Auto-suggest should update as new albums sync
   - What's unclear: Real-time vs cached vs manual refresh
   - Recommendation: Cache suggested albums list (5-minute TTL), refresh on admin page load

3. **Phase 35 Integration**
   - What we know: Daily selection pulls from ELIGIBLE albums
   - What's unclear: Exact query pattern (random? weighted? sequential?)
   - Recommendation: Design query in Phase 35, ensure gameStatus index exists for performance

4. **Inline Toggle UX vs Modal**
   - What we know: Context says inline toggles on album list
   - What's unclear: Should exclude action require confirmation/reason?
   - Recommendation: ELIGIBLE/NONE are inline, EXCLUDED shows reason modal

## Sources

### Primary (HIGH confidence)
- **Prisma schema:** `/Users/marcosandrade/roaming/projects/rec-game/prisma/schema.prisma` - Verified enum patterns, Album model structure, LlamaLog model
- **CONTEXT.md:** `/Users/marcosandrade/roaming/projects/rec-game/.planning/phases/34-album-pool/34-CONTEXT.md` - User decisions and requirements
- **LlamaLog implementation:** `src/lib/logging/llama-logger.ts` - Audit trail patterns, USER_ACTION category
- **Admin layout:** `src/app/admin/layout.tsx` - Navigation, routing, auth patterns
- **GraphQL schema:** `src/graphql/schema.graphql` - Existing patterns for enums, mutations, queries
- **Album metadata types:** `src/types/album-metadata.ts` - Metadata structure for sync source tracking

### Secondary (MEDIUM confidence)
- **Admin UI patterns:** Music Database page (`src/app/admin/music-database/page.tsx`) - Table layouts, filtering, stats cards
- **Correction system:** `/src/components/admin/correction/*` - Multi-step UI patterns, status badges, audit trails
- **Next.js 15 admin patterns:** Web search results on shadcn/ui data tables, TanStack Table filtering
  - [shadcn/ui Data Table Filters](https://www.shadcn.io/template/openstatushq-data-table-filters)
  - [Tablecn Server-Side Tables](https://next.jqueryscript.net/shadcn-ui/data-table-tablecn/)

### Tertiary (LOW confidence)
- **Spotify popularity signals:** Inferred from schema (spotifyId on Album/Artist) but exact metadata structure for followers/popularity not verified in code
- **Auto-suggest algorithm details:** General approach based on context, specific implementation discretion

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All libraries already in use, verified in package.json and imports
- Architecture: HIGH - Patterns verified in existing admin pages, Prisma schema, GraphQL resolvers
- Pitfalls: HIGH - Based on correction system learnings (optimistic locking, validation, audit trails)

**Research date:** 2026-02-15
**Valid until:** 60 days (stable domain - admin patterns unlikely to change)
