# Developer Changelog

Technical changelog documenting backend architecture changes, API updates, and implementation details.

---

## [v1.0.0] - The Big Rewrite - October 2025

**Commit Range:** `b86cc85..HEAD` (~169 commits)

### 🏗️ Major Architecture Changes

#### Backend Infrastructure
- **Complete Discogs → MusicBrainz Migration**
  - Removed all Discogs API dependencies
  - Implemented MusicBrainz API client with full entity support (artists, releases, recordings, labels)
  - Added MusicBrainz ID (MBID) tracking across all music entities
  - Implemented MB scoring algorithm for fuzzy matching results

#### Database Layer
- **Prisma ORM Migration**
  - Migrated entire data layer to Prisma
  - PostgreSQL schema with proper UUID fields (`@db.Uuid`)
  - Added migrations for canonical album/artist storage
  - Schema updates for: tracks, user priority queue, cloudflare URLs, artist metadata
  - Fixed duplicate key constraints and foreign key relationships

- **New Database Models:**
  ```prisma
  - Track (with MusicBrainz recording support)
  - UserPriorityQueue (for rate limiting user requests)
  - CloudflareImageCache (for optimized image serving)
  - Enhanced Album model with MusicBrainz metadata
  - Enhanced Artist model with image URLs and disambiguation
  ```

#### API Layer - GraphQL Implementation
- **Apollo GraphQL Server** (`/api/graphql`)
  - Complete REST → GraphQL migration
  - Defined comprehensive GraphQL schema (`src/graphql/schema.graphql`)
  - Implemented resolvers for queries and mutations
  - Added GraphQL context with Prisma client injection

- **Code Generation Pipeline:**
  - Set up `graphql-codegen` for TypeScript type generation
  - Auto-generated React Query hooks from `.graphql` files
  - Generated resolver types for type-safe server code
  - Added watch mode for development

- **GraphQL Queries/Mutations:**
  - `search` - Universal search with filtering
  - `albums` - Album queries with pagination
  - `artistByMusicBrainzId` - External artist lookup
  - `artistDiscography` - Release group browsing
  - `getAlbumRecommendations` - Recommendation fetching
  - `getMyCollectionAlbums` - User collection queries
  - Mutations for recommendations, collections, follows

#### Queue System - BullMQ Implementation
- **Redis-backed Job Queue:**
  - Implemented BullMQ for MusicBrainz API rate limiting (1 req/sec)
  - Created `QueuedMusicBrainzService` wrapper around all MB API calls
  - Job types: `search-artists`, `search-releases`, `search-recordings`, `get-artist`, `get-release`, `browse-release-groups`
  - Worker process with automatic job processing
  - QueueEvents listener for real-time job completion tracking
  - Bull Board dashboard integration for queue monitoring

- **Queue Configuration:**
  - Limiter: 1 request per 1000ms (respects MusicBrainz rate limits)
  - Concurrency: 1 (sequential processing)
  - Retry strategy: 3 attempts with exponential backoff
  - Job retention: last 100 completed, last 50 failed

- **Priority Queue System:**
  - User-based priority queue tracking
  - Request ID generation for job correlation
  - Pending jobs Map with Promise-based resolution

### 🔄 Data Flow Changes

#### Search Architecture
- **SearchOrchestrator** (`src/lib/search/SearchOrchestrator.ts`)
  - Unified search interface supporting multiple sources
  - Local database search via Prisma
  - External MusicBrainz search via queue
  - Deduplication by artist + title
  - Result merging and prioritization

- **Fuzzy Search Implementation:**
  - Integrated `fuzzysort` library for fuzzy string matching
  - Custom string similarity utilities (`src/lib/utils/string-similarity.ts`)
  - Fuzzy matching for artist names and album titles

- **Removed Components:**
  - Deleted `IntentDetector` (weighted intent system)
  - Removed `SearchResultRenderer` and deprecated search components
  - Cleaned up REST-based search endpoints

#### Data Enrichment Pipeline
1. User searches/adds album
2. Check local database first
3. If not found, queue MusicBrainz job
4. Worker processes job with rate limiting
5. Enrich data with cover art from MusicBrainz
6. Cache images via Cloudflare
7. Store in local database
8. Return enriched result to user

### 🎨 Frontend Architecture

#### React Query (TanStack Query v5)
- Migrated all data fetching to React Query
- Generated hooks from GraphQL queries
- Implemented infinite query patterns for pagination
- Default query options: 5min stale time, 10min gc time

#### Component Updates
- **Search Components:**
  - `SimpleSearchBar` - Main header search
  - `UniversalSearchBar` - Full search page
  - `AlbumSearchBackwardCompatible` - Recommendation flow search
  - Marked old components as `@deprecated`

- **Data Components:**
  - Migrated `CollectionAlbumsPanel` to GraphQL
  - Updated `RecommendationCard` with new data shape
  - Enhanced `AlbumModal` with source tracking
  - Added `DiscographyTab` with MusicBrainz data

### 🔧 Developer Experience

#### Tooling & Scripts
- **Railway Deployment:**
  - Smart start script for web/worker services
  - Separate worker process configuration
  - Environment-based service detection

- **Pre-commit Hooks:**
  - Type checking on push to main
  - Quick checks for feature branches
  - Husky integration

- **Removed Scripts:**
  - Cleaned up legacy backfill scripts
  - Removed Discogs-related utilities
  - Deleted obsolete test scripts

#### Logging & Monitoring
- **Chalk-based Logging:**
  - Color-coded console output
  - Queue layer (cyan borders)
  - Worker layer (yellow borders)
  - Completion events (green borders)
  - Errors (red)

- **Admin Dashboard:**
  - Queue statistics and metrics
  - Job history viewer
  - Clickable jobs for details
  - Health check endpoints
  - Testing tools

### 🔐 API Changes

#### Removed REST Endpoints
```
❌ /api/spotify/sync
❌ /api/albums/[id]/recommendations (now GraphQL)
❌ Legacy collection REST routes
```

#### Updated REST Endpoints
```
✅ /api/albums/search - Now uses SearchOrchestrator
✅ /api/albums/[id]/cache-cover - Cloudflare integration
✅ /api/artists/[id]/cache-image - Cloudflare integration
✅ /api/graphql - New GraphQL endpoint
```

#### Breaking Changes
- `searchArtists` return type changed (reverted in commit 2540762)
- Album schema now requires source field
- Artist navigation requires source parameter
- Collection albums use GraphQL shape

### 📦 Dependencies

#### Added
```json
{
  "apollo-server": "^4.x",
  "bullmq": "^5.x",
  "fuzzysort": "^2.x",
  "@graphql-codegen/cli": "^5.x",
  "@tanstack/react-query": "^5.x",
  "prisma": "^5.x",
  "ioredis": "^5.x",
  "chalk": "^5.x"
}
```

#### Removed
```json
{
  "discogs-client": "removed",
  "legacy REST utilities": "removed"
}
```

### 🗄️ Database Schema Updates

#### New Tables/Models
- `Track` - Recording data from MusicBrainz
- `UserPriorityQueue` - Rate limiting tracking
- `CloudflareImageCache` - Image optimization metadata

#### Updated Models
- `Album` - Added MusicBrainz fields, cover art URLs, primary/secondary types
- `Artist` - Added image URLs, disambiguation, sort names
- `User` - Added `createdAt` timestamp
- `Recommendation` - Added source tracking
- `Collection` - Layout preferences (horizontal/vertical)

#### Migrations
- Canonical album/artist migration
- Track support migration
- Prisma schema updates for UUID consistency
- Database push workflow for development

### 🔒 Type Safety Improvements

- Generated TypeScript types from GraphQL schema
- Resolver types for type-safe server code
- Removed all `any` types (banned in codebase)
- Proper typing for MusicBrainz API responses
- Type guards for external data validation

### 🧪 Testing & Quality

- Pre-commit hooks for type checking
- Build validation before push to main
- Testing tab in admin dashboard
- Queue monitoring tools
- Health check endpoints

### 🚀 Performance Optimizations

- **Caching Strategy:**
  - React Query cache (5min stale)
  - Cloudflare image cache
  - Local database for frequent queries
  - Redis queue for job management

- **Rate Limiting:**
  - MusicBrainz: 1 req/sec via BullMQ
  - User priority queue tracking
  - Deduplication of identical requests

- **Image Optimization:**
  - Cloudflare image resizing
  - Automatic format conversion
  - CDN delivery
  - Cache headers

### 📝 Code Organization

```
src/
├── lib/
│   ├── graphql/          # GraphQL resolvers & context
│   ├── musicbrainz/      # MusicBrainz API client & queue
│   ├── queue/            # BullMQ setup & processors
│   ├── search/           # Search orchestration
│   └── utils/            # Fuzzy matching utilities
├── graphql/
│   ├── schema.graphql    # GraphQL type definitions
│   └── queries/          # Client-side queries
├── generated/            # Auto-generated from GraphQL
├── workers/              # Background job processors
└── components/           # React components
```

### 🐛 Technical Fixes

- Fixed Redis connection during Next.js build phase
- Resolved TypeScript errors for production builds
- Fixed BullMQ JSON parsing in QueueEvents
- Fixed Cloudflare "resource already exists" errors
- Fixed duplicate album prevention logic
- Fixed artist/album image mapping
- Fixed collection album navigation with source params
- Fixed import order ESLint violations
- Fixed deprecated `.substr()` usage (use `.substring()`)

### 🔮 Future Considerations

- Potential Last.fm integration (attempted, reverted to Spotify)
- "Listen Later" feature (WIP, not completed)
- Weighted intent search system (backed up, reverted)
- Recording data extraction (partial implementation)
- Pagination improvements for infinite scroll
- Admin monitoring in production (currently disabled)

---

## [v0.9.x] - Pre-Rewrite Era

The original Discogs-based architecture before the September 2025 rewrite.

### Original Tech Stack
- Discogs API for music data
- REST API endpoints
- Direct database queries without Prisma
- No queue system
- Client-side data fetching

---

**Maintainer Notes:**
- This rewrite touched ~169 commits over one month
- Starting commit: `b86cc85` ("feat: BIG changes coming cuh")
- Ending commit: `1a5ef9b` (current HEAD)
- Major refactor required careful migration of user data
- Testing was done incrementally via `clean-start` branch
