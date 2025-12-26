# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 🔍 Search Components - IMPORTANT

**ACTIVE Search Components (Use These):**
- `src/components/ui/SimpleSearchBar.tsx` - Main search bar in header/topbar
- `src/components/ui/UniversalSearchBar.tsx` - Used in mobile navigation and search page
- `src/components/recommendations/AlbumSearchBackwardCompatible.tsx` - Used in recommendation flows

**DEPRECATED Search Components (Do NOT Use):**
- `src/components/ui/SearchBar.tsx` ❌
- `src/components/ui/AlbumSearch.tsx` ❌
- `src/components/ui/AlbumSearchWrapper.tsx` ❌
- `src/components/ui/SearchResultRenderer.tsx` ❌
- `src/components/ui/SearchResults.tsx` ❌

All deprecated files are marked with `@deprecated` comments at the top.

## Core Development Commands

### Daily Development

```bash
pnpm dev                    # Start Next.js dev server (http://localhost:3000)
pnpm queue:dev             # Start BullMQ dashboard + worker (http://localhost:3001/admin/queues)
pnpm build                 # Build for production
pnpm lint                  # Run ESLint
pnpm lint:fix              # Fix linting issues
pnpm format                # Format code with Prettier
pnpm type-check            # TypeScript type checking
pnpm check-all             # Run all checks (type-check, lint, format)
pnpm fix-all               # Fix all auto-fixable issues
```

### Database & Prisma

```bash
pnpm prisma generate       # Generate Prisma client
pnpm prisma migrate dev    # Create and apply migration (PREFERRED - creates migration files)
pnpm prisma db push        # Push schema changes directly (prototyping only - no migration files)
pnpm db:seed              # Seed database with initial data
pnpm db:reset             # Reset and re-seed database
```

**IMPORTANT**: Always use `pnpm prisma migrate dev` for schema changes in this project. This creates version-controlled migration files that can be deployed to production. Only use `db push` for quick prototyping when you don't need migration history.

### GraphQL Code Generation

```bash
pnpm codegen              # Generate TypeScript types and React Query hooks
pnpm codegen:watch        # Watch mode for GraphQL changes
```

### Testing

```bash
pnpm test                 # Run all Playwright tests
pnpm test:ui             # Run tests with interactive UI
npx playwright test --grep "test name"  # Run specific test
pnpm test:debug          # Debug tests with DevTools
pnpm test:setup          # Initial test environment setup
pnpm test:reset          # Reset test database
```

### Queue System (BullMQ)

```bash
pnpm queue:dev           # Start dashboard + worker together
pnpm worker              # Start production worker only
pnpm dashboard           # Start Bull Board dashboard only
pnpm queue:add           # Add single test job
pnpm queue:slow          # Add 30-second test job
pnpm queue:mock          # Generate varied test jobs
```

### Task Master Commands

```bash
task-master next         # Get next task to work on
task-master show <id>    # View task details
task-master set-status --id=<id> --status=done    # Mark task complete
task-master update-subtask --id=<id> --prompt="notes"  # Log progress
```

📚 **Full Task Master guide**: See `.taskmaster/docs/procedures/taskmaster-workflow.md`

## Architecture Overview

### Technology Stack

- **Framework**: Next.js 15 with App Router
- **Database**: PostgreSQL with Prisma ORM
- **API Layer**: GraphQL (Apollo Server) + REST endpoints
- **State Management**: TanStack Query (React Query) v5
- **Authentication**: NextAuth.js v5 beta
- **Queue System**: BullMQ with Redis for rate-limited API calls
- **Styling**: Tailwind CSS with custom design system
- **Type Safety**: TypeScript with generated GraphQL types

### Data Flow Architecture

```
[React Components]
    ↓ (use generated hooks)
[Generated GraphQL Hooks] ← codegen.yml
    ↓ (queries/mutations)
[Apollo GraphQL Server] ← /api/graphql/route.ts
    ↓ (resolvers)
[Prisma ORM] ← schema.prisma
    ↓
[PostgreSQL Database]
```

### GraphQL System

- **Schema**: `/src/graphql/schema.graphql` - Defines types and operations
- **Queries**: `/src/graphql/queries/*.graphql` - Client-side queries/mutations
- **Resolvers**: `/src/lib/graphql/resolvers/` - Server-side data fetching
- **Generated Code**: `/src/generated/graphql.ts` - Auto-generated hooks and types
- **Code Generation**: Run `pnpm codegen` after modifying `.graphql` files
- **📚 IMPORTANT**: See `.taskmaster/docs/procedures/graphql-data-fetching.md` for the complete step-by-step guide on implementing GraphQL data fetching

### Database Schema (Key Models)

- **User**: Authentication and profile data
- **Album**: Music album with MusicBrainz integration
- **Artist**: Music artist information
- **Recommendation**: User-created album pairings with scores
- **Collection**: User's saved albums with metadata
- **UserFollow**: Social following relationships

### Queue System & Schedulers

**BullMQ Integration:**
- **Rate Limiting**: 1 request/second via BullMQ
- **Queue Service**: `/src/lib/musicbrainz/queue-service.ts`
- **Worker**: `/src/workers/queue-worker.ts` (handles all background jobs)
- **Job Types**: `search-artists`, `search-releases`, `get-artist`, `get-release`, `spotify:sync-new-releases`, `spotify:sync-featured-playlists`, `musicbrainz:sync-new-releases`

**Automated Schedulers (BullMQ Repeatable Jobs):**
- **Spotify Scheduler** (`/src/lib/spotify/scheduler.ts`):
  - New releases sync (configurable interval, default: 60 min)
  - Featured playlists sync (configurable interval, default: 180 min)
  - Uses BullMQ repeatable jobs - schedules persist in Redis across worker restarts
  - No duplicate processing on worker restart
- **MusicBrainz Scheduler** (`/src/lib/musicbrainz/new-releases-scheduler.ts`):
  - New releases sync (configurable interval, default: 7 days)
  - Genre-based filtering with date ranges
  - Uses BullMQ repeatable jobs for reliability

**Key Pattern**: Schedulers use BullMQ's repeatable jobs API (`repeat: { every: ms }`) instead of `setInterval`. This ensures:
- Schedules persist in Redis and survive worker restarts
- No duplicate job execution on worker restart
- Centralized schedule management via Bull Board dashboard

### Component Patterns

#### Data Fetching with Generated Hooks

```typescript
// Use generated GraphQL hooks instead of manual queries
import { useGetRecommendationFeedQuery } from '@/generated/graphql';

const { data, isLoading, error } = useGetRecommendationFeedQuery(
  { limit: 10 },
  { enabled: !!userId }
);
```

#### Infinite Scroll Pattern

```typescript
// Use generated infinite query hooks for pagination
const { data, fetchNextPage, hasNextPage } =
  useInfiniteGetRecommendationFeedQuery(
    { limit: 10 },
    {
      initialPageParam: undefined,
      getNextPageParam: lastPage => lastPage.recommendationFeed?.cursor,
    }
  );
```

### File Organization

```
src/
├── app/                    # Next.js app router pages
│   ├── (main)/            # Authenticated routes
│   ├── api/               # API routes (REST + GraphQL)
│   └── auth/              # Authentication pages
├── components/            # React components
│   ├── ui/               # Reusable UI components
│   └── [feature]/        # Feature-specific components
├── generated/            # Generated GraphQL code (DO NOT EDIT)
├── graphql/             # GraphQL schemas and queries
│   ├── schema.graphql   # Server schema definition
│   └── queries/         # Client queries/mutations
├── hooks/               # Custom React hooks
├── lib/                 # Core business logic
│   ├── graphql/        # GraphQL resolvers
│   ├── musicbrainz/    # MusicBrainz API integration
│   └── queries/        # Query utilities
├── types/              # TypeScript type definitions
└── workers/            # Background job processors
```

### Authentication Flow

- **Providers**: Google, Spotify, Email/Password
- **Session Management**: JWT-based with NextAuth
- **Protected Routes**: Wrapped in `(main)` route group
- **User Context**: Access via `useSession()` hook

### Environment Variables

Required environment variables:

- `DATABASE_URL` - PostgreSQL connection string
- `NEXTAUTH_SECRET` - NextAuth encryption key
- `NEXTAUTH_URL` - Application URL
- `REDIS_URL` - Redis connection for BullMQ
- `GOOGLE_CLIENT_ID/SECRET` - Google OAuth
- `SPOTIFY_CLIENT_ID/SECRET` - Spotify OAuth
- AWS S3 credentials for image storage

**Scheduler Configuration (BullMQ Repeatable Jobs):**

Schedulers now use BullMQ repeatable jobs which persist in Redis. No need for `SKIP_INITIAL_SYNC` flags - schedules automatically avoid duplicates on worker restart.

- `SPOTIFY_SYNC_NEW_RELEASES=true` - Enable Spotify new releases sync
- `SPOTIFY_NEW_RELEASES_INTERVAL_MINUTES=10080` - Sync interval (default: 7 days)
- `SPOTIFY_NEW_RELEASES_LIMIT=50` - Number of releases to fetch
- `SPOTIFY_SYNC_FEATURED_PLAYLISTS=true` - Enable featured playlists sync
- `SPOTIFY_FEATURED_PLAYLISTS_INTERVAL_MINUTES=10080` - Sync interval (default: 7 days)
- `SPOTIFY_COUNTRY=US` - Market/country code for Spotify API
- `MUSICBRAINZ_SYNC_NEW_RELEASES=true` - Enable MusicBrainz new releases sync
- `MUSICBRAINZ_NEW_RELEASES_INTERVAL_MINUTES=10080` - Sync interval (default: 7 days)
- `MUSICBRAINZ_NEW_RELEASES_LIMIT=50` - Number of releases to fetch
- `MUSICBRAINZ_NEW_RELEASES_DATE_RANGE_DAYS=7` - Look back period for releases

### Development Workflow

1. **GraphQL Changes** (See `.taskmaster/docs/procedures/graphql-data-fetching.md` for detailed guide):

   - Modify schema in `/src/graphql/schema.graphql`
   - Add queries in `/src/graphql/queries/`
   - Run `pnpm codegen` to generate types and hooks
   - Use generated hooks in components

2. **Database Changes**:

   - Update `prisma/schema.prisma`
   - Run `pnpm prisma migrate dev --name descriptive_migration_name` to create and apply migration
   - Run `pnpm prisma generate` to update client (auto-runs with migrate dev)

3. **Adding New Features**:
   - Check Task Master: `task-master next`
   - Create GraphQL schema if needed
   - Generate types: `pnpm codegen`
   - Implement resolvers in `/src/lib/graphql/resolvers/`
   - Create components using generated hooks
   - Add tests in `/tests/`

### Performance Considerations

- **Image Optimization**: Use Next.js Image with Cloudflare CDN
- **Query Caching**: React Query with 5-minute stale time
- **Rate Limiting**: MusicBrainz API via BullMQ queue
- **Database Indexes**: On userId, albumId for fast lookups
- **Pagination**: Cursor-based for large datasets

### Common Gotchas

- Always run `pnpm codegen` after modifying `.graphql` files
- Use generated GraphQL types (`RecommendationFieldsFragment`) not old REST types
- MusicBrainz API requires rate limiting (1 req/sec)
- Prisma UUID fields require `@db.Uuid` for PostgreSQL
- Next.js Image requires `unoptimized` prop for external images

## TypeScript Standards

### NEVER Use `any` Type

**CRITICAL**: The `any` type is **BANNED** in this codebase. Always use proper TypeScript types.

**Instead of `any`, use:**

1. **Specific interfaces/types** - Define proper types for your data
2. **`unknown`** - When you truly don't know the type (then use type guards)
3. **Generic types** - `<T>` for reusable functions
4. **`Record<string, unknown>`** - For objects with unknown structure
5. **Import existing types** - Check `src/types/` or generated types first

**Example - BAD:**
```typescript
function processRecording(recording: any) {  // ❌ NEVER DO THIS
  return recording.title;
}
```

**Example - GOOD:**
```typescript
interface MusicBrainzRecording {
  id: string;
  title: string;
  score?: number;
  'artist-credit': ArtistCredit[];
  releases: Release[];
}

function processRecording(recording: MusicBrainzRecording) {  // ✅ CORRECT
  return recording.title;
}
```

**For third-party API responses:**
```typescript
// Define the exact structure you expect
interface MusicBrainzArtistCredit {
  name: string;
  artist: {
    id: string;
    name: string;
    'sort-name'?: string;
    disambiguation?: string;
    aliases?: Array<{ name: string; type?: string }>;
  };
}
```
