# Similar Artists — Image Loading Plan

## Overview

Progressive image loading for the Similar Artists tab. All external API calls go through BullMQ. Images are cached in Postgres (local artists) or Redis (non-local artists) so repeat visits cost zero API calls.

---

## UI Behavior

### Initial Load (tab click)
- Show **4** similar artists, sorted images-first then by similarity
- No external API calls from the resolver — only reads from DB / Redis
- Any artists missing images get background fetch jobs queued

### "Show All" Button
- Expands to **10** artists
- Same sources, higher limit
- `refetchInterval` (~3s) on the query catches images as background jobs complete

---

## Two Paths

### Local Artist (`source=local`)
- `ArtistSimilarity` data already exists from enrichment sync
- Resolver reads from DB, checks Redis for images on artists missing `imageUrl`
- Missing image + no Redis key → queue a Spotify fetch job
- Worker fetches via `tryFetchSpotifyArtistImage`, saves `imageUrl` to artist DB record
- Cached permanently in Postgres

### MusicBrainz Artist (`source=musicbrainz`)
- No local data — resolver checks Redis for cached similar artists results
- **Cache miss** → queue a job that fetches from Last.fm + ListenBrainz (through the queue, not inline)
- Worker fetches similar artists, caches full result set in Redis, then queues Spotify image fetch jobs for each
- Frontend polls with `refetchInterval` until results land
- **Cache hit** → return cached results immediately, check for missing images, queue fetches if needed
- Next visit → Redis has everything, zero API calls

---

## Redis Image Cache

Uses the existing Redis client (`@/lib/queue/redis`). No new infrastructure.

**Key pattern:** `spotify:artist-image:{mbid}`

**Three states:**
- **No key** → haven't checked yet, queue a Spotify fetch job
- **Key with URL** → image found, return it
- **Key with sentinel value** (e.g., `"none"`) → Spotify had nothing, don't retry

**TTL:** 7 days on all three states. After expiry, next request re-checks Spotify in case something new is available.

---

## Redis Similar Artists Cache (MusicBrainz path only)

**Key pattern:** `similar-artists:{mbid}`

**Value:** JSON array of similar artist results (name, mbid, similarity, source)

**TTL:** 7 days

---

## Queue Jobs

All external API calls go through BullMQ — Last.fm, ListenBrainz, Spotify. Rate limited, consistent.

### `FETCH_SIMILAR_ARTISTS` (new job type)
- Fetches from Last.fm + ListenBrainz
- Caches result set in Redis
- Queues `FETCH_ARTIST_IMAGE` jobs for each result missing an image

### `FETCH_ARTIST_IMAGE` (new job type)
- Calls `tryFetchSpotifyArtistImage(name)`
- If local artist exists → save `imageUrl` to DB
- If not → save to Redis with TTL
- If Spotify returns nothing → save sentinel to Redis with TTL

---

## Resolver Logic (no external API calls)

```
1. Check source
2. If local → read ArtistSimilarity from DB
   If musicbrainz → check Redis cache for similar artists
     - Cache hit → use cached results
     - Cache miss → queue FETCH_SIMILAR_ARTISTS job, return empty (frontend polls)
3. For each artist in results, resolve image:
   a. Local artist record has imageUrl? → use it
   b. Redis has spotify:artist-image:{mbid}? → use it (or skip if sentinel)
   c. Neither → queue FETCH_ARTIST_IMAGE job
4. Sort images-first, then by similarity
5. Return results (limit 4 or 10)
```

---

## Files to Touch

- `src/graphql/schema.graphql` — add `fetchImages` param (or rethink if needed)
- `src/graphql/queries/similarArtists.graphql` — update query variables
- `src/lib/graphql/resolvers/index.ts` — refactor resolver, remove inline API calls
- `src/lib/queue/jobs.ts` — add new job types
- `src/lib/queue/processors/` — add handlers for new jobs
- `src/lib/cache/artist-image-cache.ts` — Redis get/set helpers (new file)
- `src/components/artistDetails/tabs/SimilarArtistsTab.tsx` — limit 4, show-all button, polling
- Run `pnpm codegen` after schema changes
