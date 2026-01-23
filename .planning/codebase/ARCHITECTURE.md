# Architecture

**Analysis Date:** 2026-01-23

## Pattern

**Full-Stack Next.js with GraphQL**
- Next.js App Router for routing and SSR
- Apollo Server for GraphQL API
- Prisma for database access
- BullMQ for background jobs

## Layers

```
┌─────────────────────────────────────────────────────────┐
│                    React Components                      │
│              (src/components/, src/app/)                 │
├─────────────────────────────────────────────────────────┤
│                 Generated GraphQL Hooks                  │
│                  (src/generated/graphql.ts)              │
├─────────────────────────────────────────────────────────┤
│                   GraphQL Resolvers                      │
│              (src/lib/graphql/resolvers/)                │
├─────────────────────────────────────────────────────────┤
│                   Service Layer                          │
│      (src/lib/musicbrainz/, src/lib/spotify/, etc.)     │
├─────────────────────────────────────────────────────────┤
│                      Prisma ORM                          │
│              (prisma/schema.prisma)                      │
├─────────────────────────────────────────────────────────┤
│                     PostgreSQL                           │
└─────────────────────────────────────────────────────────┘
```

## Data Flow

### Read Path
1. React component uses generated hook (e.g., `useGetAlbumQuery`)
2. Hook calls GraphQL API at `/api/graphql`
3. Apollo Server routes to appropriate resolver
4. Resolver uses Prisma to fetch from PostgreSQL
5. Data flows back through layers

### Write Path
1. Component calls mutation hook
2. GraphQL mutation executes
3. Resolver validates input
4. Prisma writes to database
5. Cache invalidated via React Query

### Background Jobs
1. API endpoint or scheduler adds job to BullMQ
2. Worker (`src/workers/queue-worker.ts`) picks up job
3. Processor fetches from external API (MusicBrainz, Spotify)
4. Results written to database via Prisma

## Key Abstractions

### GraphQL Schema
- Location: `src/graphql/schema.graphql`
- Defines types, queries, mutations
- Code generation produces TypeScript types

### Resolvers
- Location: `src/lib/graphql/resolvers/`
- `queries.ts` - Read operations
- `mutations.ts` - Write operations
- `index.ts` - Combines all resolvers

### Services
- `src/lib/musicbrainz/` - MusicBrainz API wrapper
- `src/lib/spotify/` - Spotify API wrapper
- `src/lib/queue/` - BullMQ queue management
- `src/lib/cloudflare-images.ts` - Image CDN

### Data Loaders
- Location: `src/lib/graphql/dataloaders/`
- Batch and cache database queries
- Prevents N+1 query problems

## Entry Points

### Web Application
- `src/app/layout.tsx` - Root layout
- `src/app/(main)/layout.tsx` - Authenticated layout
- `src/app/m/layout.tsx` - Mobile layout

### API
- `src/app/api/graphql/route.ts` - GraphQL endpoint
- `src/app/api/auth/[...nextauth]/route.ts` - Auth endpoints

### Background Processing
- `src/workers/queue-worker.ts` - Job processor

## Authentication Flow

1. User authenticates via NextAuth (Google/Spotify/Credentials)
2. JWT session created with user info
3. Session available via `getServerSession()` on server
4. Session available via `useSession()` on client
5. GraphQL context includes authenticated user

## Mobile Architecture

Separate mobile routes at `/m/*`:
- `/m` - Mobile home/feed
- `/m/search` - Mobile search
- `/m/albums/[id]` - Album detail
- `/m/artists/[id]` - Artist detail
- `/m/profile/[userId]` - User profile
- `/m/settings` - Settings

Pattern: Server component fetches data, passes to client component (`*Client.tsx`)

---

*Architecture analysis: 2026-01-23*
