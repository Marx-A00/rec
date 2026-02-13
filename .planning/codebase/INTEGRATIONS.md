# External Integrations

**Analysis Date:** 2026-01-23

## APIs & External Services

### Music Data

**MusicBrainz** - Primary music metadata source

- SDK: `musicbrainz-api`
- Service: `src/lib/musicbrainz/musicbrainz-service.ts`
- Queue Service: `src/lib/musicbrainz/queue-service.ts`
- Rate limiting: 1 req/sec via BullMQ queue

**Spotify** - Album/artist enrichment, new releases

- SDK: `@spotify/web-api-ts-sdk`
- Auth: Client credentials flow
- Env: `SPOTIFY_CLIENT_ID`, `SPOTIFY_CLIENT_SECRET`
- Scheduler: `src/lib/spotify/scheduler.ts`
- Processor: `src/lib/queue/processors/spotify-processor.ts`

**Last.fm** - Artist images and metadata

- Service: `src/lib/lastfm/search.ts`
- Auth: `LASTFM_API_KEY`, `LASTFM_API_SECRET`
- Used for artist image enrichment

**Discogs** - Legacy album data (migration in progress)

- Service: `src/lib/discogs/mappers.ts`
- Being deprecated in favor of MusicBrainz

## Data Storage

### Database

- PostgreSQL
- ORM: Prisma
- Connection: `DATABASE_URL` (pooled via pgBouncer)
- Direct: `DIRECT_URL` (for migrations)
- Schema: `prisma/schema.prisma`
- Client: `src/lib/prisma.ts`

### Caching

- Redis
- Client: ioredis
- Manager: `src/lib/queue/redis.ts`
- Used for: BullMQ job queue, rate limiting
- Config: `REDIS_HOST`, `REDIS_PORT`, `REDIS_PASSWORD`

### File Storage

**Cloudflare Images** - Primary image CDN

- Service: `src/lib/cloudflare-images.ts`
- Env: `CLOUDFLARE_ACCOUNT_ID`, `CLOUDFLARE_API_TOKEN`
- Delivery: `CLOUDFLARE_IMAGES_DELIVERY_URL`
- Variants: thumbnail, small, medium, large, public

**Cloudflare R2** - Object storage (secondary)

- Service: `src/lib/r2.ts`
- Uses AWS S3 SDK for compatibility
- Types: album-art, user-avatars, user-uploads

## Authentication & Identity

### Auth Provider

- NextAuth.js 5.0.0-beta
- Config: `auth.ts`
- Strategy: JWT sessions
- Adapter: Prisma

### OAuth Providers

- Google: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`
- Spotify: Uses same credentials as API access

### Credentials Auth

- Email/password with bcrypt hashing
- Username or email login supported
- Password storage: `hashedPassword` field

## Background Jobs

### Queue System

- BullMQ
- Queue name: `musicbrainz`
- Config: `src/lib/queue/config.ts`
- Worker: `src/workers/queue-worker.ts`
- Dashboard: Bull Board on port 3001

### Job Types

- `search-artists` - MusicBrainz artist search
- `search-releases` - MusicBrainz release search
- `get-artist` - Fetch single artist
- `get-release` - Fetch single release
- `spotify:sync-new-releases` - Sync Spotify new releases
- `musicbrainz:sync-new-releases` - Sync MusicBrainz releases
- `enrichment:*` - Data enrichment jobs

### Schedulers

- Spotify: `src/lib/spotify/scheduler.ts`
- MusicBrainz: `src/lib/musicbrainz/new-releases-scheduler.ts`
- Use BullMQ repeatable jobs (persist in Redis)

## API Layer

### GraphQL

- Server: Apollo Server 5.x
- Route: `src/app/api/graphql/route.ts`
- Schema: `src/graphql/schema.graphql`
- Resolvers: `src/lib/graphql/resolvers/`

### Code Generation

- Config: `codegen.yml`
- Output: `src/generated/graphql.ts`
- Plugins: typescript, typescript-operations, typescript-react-query

### REST Endpoints

- `/api/auth/*` - Authentication
- `/api/albums/*` - Album operations
- `/api/artists/*` - Artist operations
- `/api/users/*` - User operations
- `/api/spotify/*` - Spotify sync
- `/api/admin/*` - Admin operations

## Environment Configuration

### Required

```
DATABASE_URL
DIRECT_URL
NEXTAUTH_URL
NEXTAUTH_SECRET
GOOGLE_CLIENT_ID
GOOGLE_CLIENT_SECRET
SPOTIFY_CLIENT_ID
SPOTIFY_CLIENT_SECRET
REDIS_HOST
REDIS_PORT
CLOUDFLARE_ACCOUNT_ID
CLOUDFLARE_API_TOKEN
```

### Optional

```
LASTFM_API_KEY
LASTFM_API_SECRET
R2_ACCESS_KEY_ID
R2_SECRET_ACCESS_KEY
```

### Feature Flags

```
NEXT_PUBLIC_ENABLE_MOSAIC_EDITOR
NEXT_PUBLIC_ENABLE_COLLECTION_EDITOR
NEXT_PUBLIC_ADMIN_OVERLAY
NEXT_PUBLIC_ADMIN_EMAIL
```

## Image Sources (next.config.ts)

Remote patterns configured:

- `i.discogs.com` - Discogs images
- `img.discogs.com` - Discogs images
- `lh3.googleusercontent.com` - Google profile images
- `i.scdn.co` - Spotify images
- `imagedelivery.net` - Cloudflare Images
- `coverartarchive.org` - MusicBrainz cover art
- `archive.org` - Archive.org images

---

_Integration audit: 2026-01-23_
