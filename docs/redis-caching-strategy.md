# Redis Caching & Rate Limiting Strategy

## Overview

General-purpose Redis caching layer + rate limiting for all external APIs. Uses the existing Redis instance (shared with BullMQ). Goals:

- Reduce external API calls (rate limits, latency, cost)
- Ensure every external API has rate limit protection (double protection pattern)
- Cache expensive/frequent DB queries
- Progressive rollout — start with similar artists, expand over time

---

## Infrastructure

### 1. Redis Cache Helper (`src/lib/cache/redis-cache.ts`)

General-purpose cache utility. All cache consumers use this — no one-off Redis calls scattered around.

```typescript
get<T>(key: string): Promise<T | null>
set<T>(key: string, value: T, ttlSeconds: number): Promise<void>
setMiss(key: string, ttlSeconds: number): Promise<void>   // sentinel for "checked, nothing found"
isMiss(value: unknown): boolean                            // check if value is a sentinel
invalidate(key: string): Promise<void>
invalidatePattern(pattern: string): Promise<void>          // e.g., "cache:artist:abc123:*"
```

Generics flow through — `get<string>()` returns `string | null`, `get<SimilarArtistResult[]>()` returns `SimilarArtistResult[] | null`. Under the hood it's `JSON.stringify`/`JSON.parse` with Redis storing strings.

**Sentinel value:** `"__MISS__"` — means "we checked, nothing there." Prevents re-fetching data that doesn't exist.

**Three cache states:**
- No key — never checked, go fetch
- Key with value — cached data, use it
- Key with sentinel — checked before, nothing found, skip

### 2. Cache Key Registry (`src/lib/cache/keys.ts`)

Single source of truth for every cache key in the app. Typed key builders with autocomplete — nobody hand-writes key strings.

```typescript
export const CACHE_KEYS = {
  // Spotify images (Tier 1)
  spotifyImage: (mbid: string) => `cache:spotify-image:${mbid}`,

  // Similar artists results (Tier 1)
  similarArtists: (mbid: string) => `cache:similar-artists:${mbid}`,

  // Spotify search (Tier 3)
  spotifySearch: (query: string) => `cache:spotify-search:${normalize(query)}`,

  // Last.fm (Tier 2)
  lastfmSearch: (query: string) => `cache:lastfm-search:${normalize(query)}`,
  lastfmSimilar: (key: string) => `cache:lastfm-similar:${key}`,
  lastfmInfo: (name: string) => `cache:lastfm-info:${normalize(name)}`,

  // ListenBrainz (Tier 2)
  listenbrainzSimilar: (mbid: string) => `cache:listenbrainz-similar:${mbid}`,

  // DB query caches (Tier 4)
  discography: (artistId: string, source: string) => `cache:discography:${artistId}:${source}`,
  albumDetails: (albumId: string) => `cache:album-details:${albumId}`,
  searchResults: (query: string, type: string) => `cache:search:${normalize(query)}:${type}`,
  countArtistAlbums: (artistId: string) => `cache:count:artist-albums:${artistId}`,
  countArtistTracks: (artistId: string) => `cache:count:artist-tracks:${artistId}`,
  countAlbumCollections: (albumId: string) => `cache:count:album-collections:${albumId}`,
  countCollectionAlbums: (collectionId: string) => `cache:count:collection-albums:${collectionId}`,

  // User-specific (Tier 5)
  userCollections: (userId: string) => `cache:user-collections:${userId}`,
  userRecs: (userId: string) => `cache:user-recs:${userId}`,
} as const;

// TTLs in one place too
export const CACHE_TTLS = {
  SPOTIFY_IMAGE: 7 * 24 * 60 * 60,      // 7 days
  SIMILAR_ARTISTS: 7 * 24 * 60 * 60,    // 7 days
  SPOTIFY_SEARCH: 60 * 60,              // 1 hour
  LASTFM: 7 * 24 * 60 * 60,              // 7 days (aligned with SIMILAR_ARTISTS composed cache)
  LISTENBRAINZ: 7 * 24 * 60 * 60,       // 7 days
  DISCOGRAPHY: 7 * 24 * 60 * 60,        // 7 days
  ALBUM_DETAILS: 24 * 60 * 60,          // 24 hours
  SEARCH_RESULTS: 5 * 60,               // 5 minutes
  COUNTS: 60 * 60,                       // 1 hour
  USER_COLLECTIONS: 15 * 60,            // 15 minutes
  USER_RECS: 10 * 60,                   // 10 minutes
} as const;
```

Usage:
```typescript
import { CACHE_KEYS, CACHE_TTLS } from '@/lib/cache/keys';

const image = await cache.get<string>(CACHE_KEYS.spotifyImage(mbid));
await cache.set(CACHE_KEYS.spotifyImage(mbid), url, CACHE_TTLS.SPOTIFY_IMAGE);
```

### 3. Unified Spotify Client (`src/lib/spotify/client.ts`)

**The problem:** Spotify calls are split across two patterns with no rate limiting on either:
1. `src/lib/spotify/search.ts` — raw `fetch()` with hand-rolled token caching
2. Everywhere else — `SpotifyApi.withClientCredentials()` from `@spotify/web-api-ts-sdk`, instantiated fresh in 4 different files

The official Spotify SDK (`@spotify/web-api-ts-sdk`) has no built-in rate limiter, no retry on 429, no caching. It just handles auth and gives typed methods.

**The fix:** One Spotify client that wraps the SDK and adds what it should've had:

```
// src/lib/spotify/client.ts — singleton, used everywhere
import { SpotifyApi } from '@spotify/web-api-ts-sdk';

const spotifyClient = createSpotifyClient({
  rateLimiter: redisRateLimiter,  // sliding window, ~10 req/sec
  retryOn429: true,               // auto-retry with Retry-After header
  cache: redisCache,              // optional, per-method cache integration
});

// Methods (replaces all existing Spotify call sites):
spotifyClient.searchArtists(query)       // replaces raw fetch in search.ts
spotifyClient.getArtistsByIds(ids)       // replaces raw fetch in search.ts
spotifyClient.searchAlbums(query)        // replaces SpotifyApi in processors
spotifyClient.getAlbumTracks(albumId)    // replaces SpotifyApi in mappers
spotifyClient.searchNewReleases(opts)    // replaces SpotifyApi in spotify-processor
```

Every method goes through the rate limiter automatically. The rate limiter is Redis-backed (sliding window counter) so it works across both web server and worker processes.

**Files this replaces/consolidates:**
- `src/lib/spotify/search.ts` — raw `fetch()` calls → use client methods
- `src/lib/spotify/artist-image-helper.ts` — calls `searchSpotifyArtists()` → use `spotifyClient.searchArtists()`
- `src/lib/queue/processors/spotify-processor.ts` — creates its own `SpotifyApi` instance → use shared client
- `src/lib/spotify/mappers.ts` — creates its own `SpotifyApi` for `fetchSpotifyAlbumTracks` → use shared client
- `src/app/api/spotify/sync/route.ts` — creates its own `SpotifyApi` instance → use shared client
- `src/app/api/spotify/trending/route.ts` — creates its own `SpotifyApi` instance → use shared client
- `src/lib/search/SearchOrchestrator.ts` — imports `searchSpotifyArtists` → use shared client
- `src/lib/api/unified-artist-service.ts` — imports `searchSpotifyArtists` → use shared client
- `src/lib/queue/processors/enrichment-processor.ts` — imports `searchSpotifyArtists` → use shared client

**Why not BullMQ for Spotify?** Search needs to feel instant. BullMQ makes it async (queue → poll → results), which is too slow for user-facing search. The built-in rate limiter keeps calls synchronous while still protecting against rate limits.

**Double protection for every external API:**
- MusicBrainz: `musicbrainz-api` library rate limiter + BullMQ queue
- Spotify: unified client rate limiter + Redis cache
- Last.fm: BullMQ queue + Redis cache (moving from inline to queued)
- ListenBrainz: BullMQ queue + Redis cache (moving from inline to queued)
- Discogs: BullMQ queue (already in place)

---

## Current State of External API Calls

### Already Queued (good)
- MusicBrainz — all calls through BullMQ, 1 req/sec
- Discogs — all calls through BullMQ
- Scheduled syncs — Spotify, MusicBrainz, ListenBrainz, Deezer new releases

### Inline, No Rate Limiting (needs work)
- `searchSpotifyArtists()` — called from SearchOrchestrator (every user search), unified-artist-service (every MB artist page), artist-image-helper (enrichment)
- `getArtistsByIds()` — Spotify batch artist fetch, called from enrichment
- `searchLastFmArtists()` — called inline during search (optional fallback)
- `getSimilarArtists()` — Last.fm similar artists, called inline during enrichment + similar artists feature
- `getLastFmArtistInfo()` — Last.fm artist info, called inline during enrichment
- `fetchSimilarArtists()` — ListenBrainz similar artists, called inline during similar artists feature
- Cloudflare image uploads — inline, but low volume

---

## Priority Tiers

### Tier 1 — Similar Artists Feature (build first)

These directly unblock the similar artists image loading feature.

#### 1a. Spotify Artist Images
- **Key:** `cache:spotify-image:{mbid}`
- **Value:** image URL string or sentinel
- **TTL:** 7 days
- **Write:** Queue worker after Spotify fetch
- **Read:** Similar artists resolver, anywhere artist images are needed
- **Invalidate:** Manual admin action or TTL expiry

#### 1b. Similar Artists Results (MusicBrainz path)
- **Key:** `cache:similar-artists:{mbid}`
- **Value:** JSON array of `{name, mbid, similarity, source}`
- **TTL:** 7 days
- **Write:** Queue worker after Last.fm + ListenBrainz fetch
- **Read:** `similarArtists` resolver when `source=musicbrainz`
- **Invalidate:** TTL expiry (artist similarity is stable)

#### 1c. Spotify Rate Limiter
- **What:** Built-in rate limiter for `searchSpotifyArtists()` and all Spotify client calls
- **Pattern:** Same as `musicbrainz-api` library — rate limiting baked into the client
- **Limit:** TBD (Spotify doesn't publish exact numbers, start conservative — e.g., 10 req/sec)
- **Scope:** All Spotify API calls go through this, not just similar artists

---

### Tier 2 — Move Last.fm + ListenBrainz to Queue + Cache

These are currently inline with no rate limiting. They were added recently for the similar artists feature but should go through the queue like everything else.

#### 2a. Last.fm API (all 3 endpoints)
- **Currently:** `searchLastFmArtists()`, `getSimilarArtists()`, `getLastFmArtistInfo()` all inline
- **Change:** Route through BullMQ, cache results in Redis
- **Keys:**
  - `cache:lastfm-search:{query}`
  - `cache:lastfm-similar:{artist-name-or-mbid}`
  - `cache:lastfm-info:{artist-name}`
- **TTL:** 7 days (Last.fm data is stable — aligned with the composed `similar-artists` cache)
- **Impact:** Enrichment, similar artists

#### 2b. ListenBrainz Similar Artists
- **Currently:** `fetchSimilarArtists()` called inline
- **Change:** Route through BullMQ, cache results in Redis
- **Key:** `cache:listenbrainz-similar:{mbid}`
- **TTL:** 7 days (similarity data is very stable)
- **Impact:** Similar artists feature, enrichment

---

### Tier 3 — Spotify Cache Layer

Spotify stays inline (not queued) for UX reasons, but gets Redis caching + the built-in rate limiter from Tier 1c.

#### 3a. Spotify Artist Search Cache
- **Currently:** `searchSpotifyArtists()` hits Spotify on every call
- **Change:** Check Redis cache first, only hit Spotify on cache miss
- **Key:** `cache:spotify-search:{normalized-query}`
- **TTL:** 1 hour (search results are somewhat dynamic)
- **Impact:** Every user search, artist image lookups, enrichment
- **Fallback on 429:** Return MusicBrainz-only results, search still works

---

### Tier 4 — Expensive DB Query Caching

Frequently-called database queries that return mostly static data.

#### 4a. Count Fields (N+1 problem)
- **Problem:** `albumCount`, `trackCount`, `inCollectionsCount` fire a separate COUNT query per item in every list
- **Keys:**
  - `cache:count:artist-albums:{artistId}`
  - `cache:count:artist-tracks:{artistId}`
  - `cache:count:album-collections:{albumId}`
  - `cache:count:collection-albums:{collectionId}`
- **TTL:** 1 hour
- **Invalidate on:** album/track creation, collection add/remove
- **Impact:** Every artist list, album list, collection list

#### 4b. Artist Discography
- **Problem:** Fetches from MusicBrainz API on every artist page (Discogs discography is not yet implemented — returns `[]`)
- **Key:** `cache:discography:{artistId}:{source}`
- **TTL:** 7 days (discography rarely changes)
- **Invalidate on:** artist enrichment
- **Impact:** Every artist detail page (MusicBrainz source only for now)

#### 4c. Album Details with Tracks
- **Problem:** Shallow album load + separate batched dataloader queries (artists via `artistsByAlbumLoader`, tracks via `tracksByAlbumLoader`) on every album page — not a single deep join, but still multiple round-trips per page view
- **Key:** `cache:album-details:{albumId}`
- **TTL:** 24 hours
- **Invalidate on:** album enrichment, track enrichment
- **Impact:** Every album detail page

#### 4d. Search Results
- **Problem:** Same search query from different users hits the same APIs/DB
- **Key:** `cache:search:{normalized-query}:{type}`
- **TTL:** 5 minutes (search feels fresh but avoids duplicate work)
- **Impact:** Every search request

---

### Tier 5 — User-Specific Data

Lower priority — these change more often and are user-scoped.

#### 5a. User Profile Collections
- **Problem:** 4-level nested join on every profile visit
- **Key:** `cache:user-collections:{userId}`
- **TTL:** 15 minutes
- **Invalidate on:** collection add/remove/reorder

#### 5b. User Recommendations
- **Key:** `cache:user-recs:{userId}`
- **TTL:** 10 minutes
- **Invalidate on:** recommendation create/update/delete

---

## Similar Artists UI Behavior

### Initial Load (tab click)
- Show **4** similar artists, sorted images-first then by similarity
- No external API calls from the resolver — only reads from DB / Redis
- Any artists missing images get background fetch jobs queued

### "Show All" Button
- Expands to **10** artists
- Same sources, higher limit
- `refetchInterval` (~3s) on the query catches images as background jobs complete

### Local Artist Path (`source=local`)
- `ArtistSimilarity` data already exists from enrichment sync
- Resolver reads from DB, checks Redis for images
- Missing image + no Redis key → queue a Spotify fetch job
- Worker fetches via `tryFetchSpotifyArtistImage` (goes through rate limiter), saves `imageUrl` to artist DB record or Redis

### MusicBrainz Artist Path (`source=musicbrainz`)
- No local data — resolver checks Redis for cached similar artists results
- Cache miss → queue a `FETCH_SIMILAR_ARTISTS` job (Last.fm + ListenBrainz through BullMQ)
- Worker fetches, caches full result set in Redis, queues Spotify image jobs
- Frontend polls with `refetchInterval` until results land
- Next visit → Redis has everything, zero API calls

---

## Cache Invalidation Strategy

### Event-Based Invalidation

When certain actions happen, invalidate related cache keys:

- **Artist enrichment completes** → `cache:discography:{id}:*`, related `cache:album-details:*`, `cache:count:artist-*:{id}`
- **Album enrichment completes** → `cache:album-details:{id}`, `cache:count:album-*:{id}`
- **Collection add/remove** → `cache:user-collections:{userId}`, `cache:count:collection-*:{collectionId}`, `cache:count:album-collections:{albumId}`
- **Recommendation create/delete** → `cache:user-recs:{userId}`
- **Similar artists sync** → `cache:similar-artists:{mbid}`

### TTL as Safety Net

Every key has a TTL. Even without explicit invalidation, stale data expires and gets refreshed. TTLs are set conservatively — better to re-fetch slightly more often than show stale data.

### Admin Cache Flush

Simple admin endpoint to flush specific cache namespaces or individual keys. No server restart needed.

---

## Queue Job Changes

### New Job Types

- `FETCH_SIMILAR_ARTISTS` — Fetch from Last.fm + ListenBrainz, cache in Redis
- `FETCH_ARTIST_IMAGE` — Fetch from Spotify (through rate limiter), cache in Redis or DB
- `LASTFM_SIMILAR_ARTISTS` — Last.fm similar artists (moved from inline)
- `LASTFM_ARTIST_INFO` — Last.fm artist info (moved from inline)
- `LASTFM_SEARCH_ARTISTS` — Last.fm artist search (moved from inline)
- `LISTENBRAINZ_SIMILAR_ARTISTS` — ListenBrainz similar artists (moved from inline)

---

## Implementation Order

1. **Redis cache helper** — `src/lib/cache/redis-cache.ts` (general-purpose, used everywhere)
2. **Unified Spotify client** — `src/lib/spotify/client.ts` (singleton, rate limited, replaces all 9 call sites)
3. **Tier 1** — Spotify image cache + similar artists cache + UI changes (unblocks the feature)
4. **Tier 2** — Move Last.fm + ListenBrainz inline calls to BullMQ + cache
5. **Tier 3** — Spotify search cache layer (plug into unified client)
6. **Tier 4** — DB query caching (counts, discography, album details, search)
7. **Tier 5** — User-specific caching
8. **Admin flush endpoint** — cache management without restarts

---

## Files to Create/Modify

### New Files
- `src/lib/cache/redis-cache.ts` — general-purpose cache helper (typed generics)
- `src/lib/cache/keys.ts` — cache key registry + TTL constants (single source of truth)
- `src/lib/spotify/client.ts` — unified Spotify client (singleton, rate limited, replaces raw fetch + scattered SDK instances)
- `src/lib/queue/processors/image-fetch-processor.ts` — Spotify image fetch worker
- `src/lib/queue/processors/similar-artists-processor.ts` — similar artists fetch worker

### Modified Files (Spotify client consolidation)
- `src/lib/spotify/search.ts` — gut raw `fetch()` calls, delegate to unified client (or remove entirely)
- `src/lib/spotify/artist-image-helper.ts` — use unified client
- `src/lib/search/SearchOrchestrator.ts` — use unified client instead of importing `searchSpotifyArtists`
- `src/lib/api/unified-artist-service.ts` — use unified client
- `src/lib/spotify/mappers.ts` — use unified client instead of creating its own `SpotifyApi`
- `src/lib/queue/processors/spotify-processor.ts` — use unified client
- `src/lib/queue/processors/enrichment-processor.ts` — use unified client
- `src/app/api/spotify/sync/route.ts` — use unified client
- `src/app/api/spotify/trending/route.ts` — use unified client

### Modified Files (caching + queue changes)
- `src/lib/queue/jobs.ts` — new job types
- `src/lib/queue/processors/index.ts` — register new processors
- `src/lib/graphql/resolvers/index.ts` — use cache in resolvers, remove inline Last.fm/ListenBrainz calls
- `src/lib/api/similar-artists-service.ts` — use queued Last.fm/ListenBrainz instead of inline
- `src/components/artistDetails/tabs/SimilarArtistsTab.tsx` — UI changes (4 initial, show all button, polling)
- `src/graphql/schema.graphql` — query param changes
