# Album Recommendation App

This application allows users to search for albums using the Discogs API and create recommendations by pairing albums together with a rating score.

## Features

- **Authentication**: Sign in with Google, Spotify, or email/password
- **User Registration**: Create accounts with email and password
- Search for albums using the Discogs API
- View album details including cover art, artist, release date, and genre
- Create album recommendations by selecting a basis album and a recommended album
- Rate recommendations on a scale of 1-10

## Setup

1. Clone the repository
2. Install dependencies:
   ```
   pnpm install
   ```
3. Set up environment variables:
   - Copy `.env.example` to `.env.local`
   - Configure your database URL, NextAuth secret, and OAuth provider credentials
   - For testing, create `.env.test` with your test database configuration
4. Set up the database:
   ```
   pnpm prisma generate
   pnpm prisma db push
   ```
5. Set up testing (optional):
   ```
   pnpm test:setup
   ```
6. Start the development server:
   ```
   pnpm dev
   ```
7. Open [http://localhost:3000](http://localhost:3000) in your browser to see the application.

## Testing

This project uses [Playwright](https://playwright.dev/) for end-to-end testing with a Test-Driven Development (TDD) approach.

### Test Setup

1. **Create Test Environment File**:
   Create `.env.test` in your project root with your test database configuration:

   ```env
   # Test Database (separate from production!)
   DATABASE_URL="postgresql://postgres:[YOUR-TEST-PASSWORD]@db.[YOUR-TEST-PROJECT].supabase.co:5432/postgres"
   DIRECT_URL="postgresql://postgres:[YOUR-TEST-PASSWORD]@db.[YOUR-TEST-PROJECT].supabase.co:5432/postgres"

   # NextAuth.js (same as main)
   NEXTAUTH_URL=http://127.0.0.1:3000
   NEXTAUTH_SECRET="YUjO35DuswlAp7FroWlHb3atZmljPZa19TxTRBMRq+g="
   NEXTAUTH_DEBUG=true

   # OAuth providers (same as main)
   GOOGLE_CLIENT_ID="your-google-client-id"
   GOOGLE_CLIENT_SECRET="your-google-client-secret"
   ```

2. **Initialize Test Database**:
   ```bash
   pnpm test:setup
   ```
   This command will:
   - Run database migrations on your test database
   - Install Playwright browsers

### Running Tests

- **Run all tests**:

  ```bash
  pnpm test
  ```

- **Run specific test**:

  ```bash
  npx playwright test --grep "test name"
  ```

- **Run tests with UI** (interactive mode):

  ```bash
  pnpm test:ui
  ```

- **Debug tests** (step through with DevTools):

  ```bash
  pnpm test:debug
  ```

- **View test reports**:
  ```bash
  pnpm test:report
  ```

### Test Database Management

- **Apply migrations to test database**:

  ```bash
  pnpm test:migrate
  ```

- **Reset test database** (clears all data):
  ```bash
  pnpm test:reset
  ```

### Test Files

- `tests/auth.spec.ts` - Authentication flow tests (registration, login, etc.)
- `tests/login.spec.ts` - User login functionality tests
- `tests/global-setup.ts` - Test environment setup and data seeding

### Test Configuration

Tests are configured to:

- Use a separate test database to avoid affecting production data
- Create test users automatically via global setup
- Run against `http://localhost:3000` (development server)
- Generate HTML reports for test results

**⚠️ Important**: Always ensure your tests use the test database, not production!

## Authentication

The app supports multiple authentication methods:

- **Email/Password**: Create an account at `/auth/register` or sign in at `/auth/signin`
- **Google OAuth**: Sign in with your Google account
- **Spotify OAuth**: Sign in with your Spotify account

### Registration Flow

1. Visit `/auth/register` to create a new account
2. Fill in your email, password, and optional name
3. Password requirements:
   - Minimum 8 characters
   - At least one uppercase letter
   - At least one lowercase letter
   - At least one number
4. After successful registration, you'll be automatically signed in

## Usage

1. Navigate to the recommendation page
2. Search for an album by title or artist
3. Select an album from the search results to set as the basis album
4. Switch to "Recommended Album" mode and search for another album
5. Select an album from the search results to set as the recommended album
6. Adjust the score using the slider
7. Click "Create Recommendation" to submit your recommendation

## BullMQ Queue System

This application uses **BullMQ** with Redis for handling MusicBrainz API requests with rate limiting (1 request per second).

### Prerequisites

1. **Docker**: Ensure Docker is running. If using Colima:

   ```bash
   colima start
   ```

2. **Redis**: Start a Redis server using Docker:

   ```bash
   docker run -d --name redis -p 6379:6379 redis:latest
   ```

3. **Environment Variables**: Add Redis configuration to your `.env`:
   ```env
   # Redis Configuration for BullMQ
   REDIS_URL=redis://localhost:6379
   REDIS_HOST=localhost
   REDIS_PORT=6379
   REDIS_PASSWORD=
   REDIS_DB=0
   ```

### Queue Development Setup

1. **Start Queue System** (Dashboard + Worker):

   ```bash
   pnpm queue:dev
   ```

   This starts both the Bull Board dashboard and persistent worker with colored logs.

2. **Monitor Dashboard**:
   - **URL**: `http://localhost:3001/admin/queues`
   - **Features**: Real-time job monitoring, retry management, queue statistics

### Queue Commands

#### Core Services

- `pnpm worker` - Start persistent production worker
- `pnpm dashboard` - Start Bull Board monitoring dashboard
- `pnpm queue:dev` - Start both dashboard + worker together

#### Testing & Development

- `pnpm queue:add` - Add single fast job (Bladee - Eversince)
- `pnpm queue:slow` - Add 30-second slow job (perfect for testing Active tab)
- `pnpm queue:mock` - Generate 10 varied test jobs with different types

#### Legacy Testing Tools

- `pnpm test:worker` - Start test worker (development only)
- `pnpm queue:test-service` - Test real MusicBrainz API calls

### Queue Architecture

#### Production Worker (`src/workers/queue-worker.ts`)

- ✅ **Always running** - no startup delays
- ✅ **Auto-restart** - recovers from crashes (max 5 attempts)
- ✅ **Graceful shutdown** - handles SIGTERM, SIGINT, uncaught exceptions
- ✅ **Rate limiting** - 1 request per second to MusicBrainz API
- ✅ **Job retention** - keeps last 100 completed, 50 failed jobs
- ✅ **Enhanced logging** - ready, active, completed, failed, stalled events
- ✅ **Multi-service** - handles 21 job types across 6 services (MusicBrainz, Spotify, enrichment, etc.)

#### Worker Log Color Coding

The queue system uses color-coded borders AND layer labels to help you easily identify which part of the system is logging. Each log now shows its layer in the header!

**Queue Layer:**
- 🔵 **Cyan borders** - `QUEUING JOB [QUEUE LAYER]` - Job queued to Redis

**Queue Events Layer:**
- 🟡 **Yellow borders** - `⏳ WAITING FOR JOB [QUEUE EVENTS LAYER]` - Waiting for job completion
- 🟢 **Green borders** - `✅ JOB COMPLETED [QUEUE EVENTS LAYER]` - Job completed successfully
- 🔴 **Red borders** - `❌ JOB FAILED [QUEUE EVENTS LAYER]` - Job failed with errors

**Worker Layer:**
- 🔵 **Blue borders** - `PROCESSING [WORKER LAYER]` - Worker starts processing job
- 🟢 **Green borders** - `COMPLETED [WORKER LAYER]` - Worker finished job

**Processor Layer:**
- 🟡 **Yellow borders** - `✅ Completed [PROCESSOR LAYER]` - Job processor completed

**API Layer:**
- 🟣 **Magenta borders** - `✅ [API LAYER] MusicBrainz` - MusicBrainz API call completed

**Search Layer:**
- 🟣 **Magenta borders** - `🎨 [SEARCH LAYER]` - Cover art URL generation (SearchOrchestrator)

**Log Prefixes** (plain text logs):
- `[Queue]` - Queue layer events (job becomes active)
- No prefix - Worker/Processor/API layer events

**Example Log Flow**:
```
──────────────────────────────────────────────────────────── (Cyan)
QUEUING JOB [QUEUE LAYER]
────────────────────────────────────────────────────────────
  Job ID:     4003
  Type:       musicbrainz:search-releases
  Request ID: search-releases-1760110137509
  Priority:   1
  Details:    Query: "tupac" • Limit: 7 • Offset: 0
────────────────────────────────────────────────────────────

──────────────────────────────────────────────────────────── (Yellow)
⏳ WAITING FOR JOB [QUEUE EVENTS LAYER]
────────────────────────────────────────────────────────────
  Job ID:   4003
  Timeout:  30000ms
────────────────────────────────────────────────────────────

🔄 [Queue] Processing musicbrainz:search-releases (ID: 4003) • Query: "tupac"

──────────────────────────────────────────────────  (Blue)
PROCESSING [WORKER LAYER]
──────────────────────────────────────────────────
  Job:      musicbrainz:search-releases
  ID:       #4003
  Details:  Query: "tupac"
──────────────────────────────────────────────────

──────────────────────────────────────────────────────────── (Magenta)
✅ [API LAYER] MusicBrainz searchReleaseGroups in 497ms • Success: 100% • Failures: 0
────────────────────────────────────────────────────────────

──────────────────────────────────────────────────────────── (Yellow)
✅ Completed [PROCESSOR LAYER] musicbrainz:search-releases ["tupac"] (ID: 4003) in 497ms • Results: 23
────────────────────────────────────────────────────────────

✅ Completed musicbrainz:search-releases (ID: 4003) in 478ms • Results: 23

──────────────────────────────────────────────────  (Green)
COMPLETED [WORKER LAYER]
──────────────────────────────────────────────────
  Job ID:   4003
  Job:      musicbrainz:search-releases • Query: "tupac"
  Duration: 503ms
  Results:  23
──────────────────────────────────────────────────

──────────────────────────────────────────────────────────── (Green)
✅ JOB COMPLETED [QUEUE EVENTS LAYER]
────────────────────────────────────────────────────────────
  Job ID:     4003
  Success:    Yes
  Results:    23
  Preview:    "All Eyez on Me" + 22 more
────────────────────────────────────────────────────────────
✅ Resolving pending job 4003

──────────────────────────────────────────────────────────── (Magenta)
🎨 [SEARCH LAYER] Cover Art URL • "All Eyez on Me" → https://coverartarchive.org/...
────────────────────────────────────────────────────────────
```

This layered approach makes it easy to trace which part of the system (Queue → QueueEvents → Worker → Processor → API → Search) is generating each log message.

#### Queue Features

- **Rate Limiting**: 1 req/sec to comply with MusicBrainz API limits
- **Job Types**: `search-artists`, `search-releases`, `get-artist`, `get-release`
- **Error Handling**: Automatic retries with exponential backoff
- **Monitoring**: Professional Bull Board UI with real-time updates
- **Job Persistence**: Redis-backed reliable job storage

#### Integration

The `QueuedMusicBrainzService` wraps the original `MusicBrainzService` and provides the same interface while adding:

- Automatic queuing of all API calls
- Rate limit compliance
- Job result caching
- Promise-based await interface

### Queue Monitoring

**Bull Board Dashboard**: `http://localhost:3001/admin/queues`

**Features**:

- ✅ **Real-time Updates** - Live job processing without rate limiting
- ✅ **Active Jobs** - See jobs currently being processed
- ✅ **Job Management** - Retry, delete, and manage jobs
- ✅ **Queue Statistics** - Performance metrics and insights
- ✅ **Error Tracking** - Detailed error logs and stack traces
- ✅ **Multiple Tabs** - Waiting, Active, Completed, Failed, Delayed
- ✅ **Professional UI** - Modern design with dark/light themes

### Development Workflow

1. **Start Development Stack**:

   ```bash
   # Terminal 1: Queue system
   pnpm queue:dev

   # Terminal 2: Next.js app
   pnpm dev
   ```

2. **Test Queue Functionality**:

   ```bash
   # Add fast job
   pnpm queue:add

   # Add slow job (30s) - perfect for seeing Active tab
   pnpm queue:slow

   # Generate test activity
   pnpm queue:mock
   ```

3. **Monitor**: Visit `http://localhost:3001/admin/queues` to see jobs processing

### Production Considerations

- **Persistent Worker**: Always run `pnpm worker` in production
- **Process Manager**: Use PM2, systemd, or Docker for worker management
- **Redis**: Use managed Redis service (AWS ElastiCache, Redis Cloud)
- **Monitoring**: Bull Board dashboard shows health and performance
- **Scaling**: Add more worker instances for higher throughput (respecting rate limits)

## Database & Deployment

### Database Schema Migrations

**Local Development:**
```bash
# 1. Edit prisma/schema.prisma with your changes
# 2. Create and apply migration
pnpm prisma migrate dev --name describe_your_change

# This will:
# - Create a migration file in prisma/migrations/
# - Apply it to your local database
# - Regenerate Prisma client
```

**Production Deployment (Railway):**
```bash
# 1. Commit your schema changes and migrations
git add prisma/schema.prisma prisma/migrations/
git commit -m "feat: add new database field"

# 2. Push to main
git push origin main

# Railway automatically:
# - Detects the new commit
# - Builds the application
# - Runs `prisma migrate deploy` (via railway-start.sh)
# - Deploys with updated schema
```

**⚠️ Important Notes:**
- **Never use `prisma db push` in production** - it bypasses migrations and can cause issues
- **Always use migrations** for production database changes
- **Test migrations locally** before pushing to production
- Migrations run automatically on Railway deployment - no manual intervention needed

**Manual Migration (Emergency Only):**

If you need to manually run migrations in Railway:
1. Go to Railway dashboard → Your service
2. Click "Deploy" → "Run command"
3. Execute: `pnpm prisma migrate deploy`

### Deployment Architecture

**Railway Services:**
- **Web Service**: Next.js frontend (runs on push to `main`)
- **Worker Service**: BullMQ background jobs (separate service with `SERVICE_TYPE=worker`)

**Environment Variables:**
- Local: `.env.local` (Supabase development database)
- Test: `.env.test` (Supabase test database)
- Production: Railway environment variables (PostgreSQL production database)

**Database Environments:**
- **Local**: Supabase PostgreSQL (development)
- **Test**: Supabase PostgreSQL (separate test database)
- **Production**: Railway PostgreSQL (production)

## Technologies Used

- Next.js
- React
- TypeScript
- Tailwind CSS
- **BullMQ** - Redis-backed job queue for API rate limiting
- **Redis** - In-memory data structure store for queue persistence
- **Bull Board** - Professional queue monitoring dashboard
- Discogs API (via Disconnect library)
- MusicBrainz API (rate-limited via BullMQ)
- Playwright (for testing)

## Future Optimizations

The following optimizations are documented for when scale demands them. **Not necessary until we hit these numbers.**

### Social Feed Query (UNION ALL)

**Location:** `src/lib/graphql/resolvers/queries.ts` - `socialFeed` resolver

**Current approach:** 3 separate Prisma queries (follows, recommendations, collection_adds) merged and sorted in memory.

**Optimization:** Rewrite using raw SQL with `UNION ALL` to let the database handle sorting and limiting in a single round-trip.

**When to implement:**
- Users following 100+ people
- 10k+ activities in the database
- Noticeable slow response times on the social feed endpoint

**Why not now:** Current implementation handles ~60 rows in memory (3 queries × 20 limit), which is trivial. Prisma's type safety and maintainability outweigh the marginal performance gains at current scale.

## License

MIT
