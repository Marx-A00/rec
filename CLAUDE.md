# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

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
pnpm prisma db push        # Push schema changes to database
pnpm db:seed              # Seed database with initial data
pnpm db:reset             # Reset and re-seed database
```

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

### MusicBrainz Integration
- **Rate Limiting**: 1 request/second via BullMQ
- **Queue Service**: `/src/lib/musicbrainz/queue-service.ts`
- **Worker**: `/src/workers/musicbrainz-worker.ts`
- **Job Types**: `search-artists`, `search-releases`, `get-artist`, `get-release`

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
const { data, fetchNextPage, hasNextPage } = useInfiniteGetRecommendationFeedQuery(
  { limit: 10 },
  {
    initialPageParam: undefined,
    getNextPageParam: (lastPage) => lastPage.recommendationFeed?.cursor
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

### Development Workflow

1. **GraphQL Changes** (See `.taskmaster/docs/procedures/graphql-data-fetching.md` for detailed guide):
   - Modify schema in `/src/graphql/schema.graphql`
   - Add queries in `/src/graphql/queries/`
   - Run `pnpm codegen` to generate types and hooks
   - Use generated hooks in components

2. **Database Changes**:
   - Update `prisma/schema.prisma`
   - Run `pnpm prisma generate` to update client
   - Run `pnpm prisma db push` to update database

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
