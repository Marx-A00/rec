# Spotify Data Pipeline Architecture

## Overview
Fetch trending music from Spotify → Cache in DB → Display in UI → Enrich with MusicBrainz (background)

## Pipeline Flow

```
[Spotify API] 
    ↓ (every 6 hours OR on-demand if stale)
[Cache in Database as JSON]
    ↓ (immediate)
[Display in Browse UI]
    ↓ (background, 1 req/sec)
[MusicBrainz Enrichment]
    ↓
[Update Cache with MB IDs]
```

## Components

### 1. Database Schema
```prisma
// Simple cache table (starting point)
model CacheData {
  id        String   @id @default(cuid())
  key       String   @unique  // 'spotify_trending', 'spotify_new_releases', etc.
  data      Json     // Raw response from Spotify
  expires   DateTime // When to refresh
  metadata  Json?    // Optional: MB matches, processing status, etc.
  
  @@index([key, expires])
}

// Future: Track history (Option 4)
model AlbumAppearance {
  id        String   @id @default(cuid())
  albumId   String   // Reference to Album
  source    String   // 'spotify_trending', 'spotify_viral', etc.
  position  Int?     // Chart position
  seenAt    DateTime @default(now())
}
```

### 2. Data Flow

#### A. Spotify Fetch & Cache (`/api/spotify/sync`)
```typescript
// Triggers:
// - On-demand when user visits Browse page (if data > 6 hours old)
// - Cron job every 6 hours (optional)
// - Manual trigger via admin panel (future)

// TODO: Think about shape of spotify data
// Will it be paginated?

async function syncSpotifyData() {
  // 1. Check cache freshness
  const cache = await prisma.cacheData.findUnique({
    where: { key: 'spotify_trending' }
  });
  
  if (cache && cache.expires > new Date()) {
    return { source: 'cache', data: cache.data };
  }
  
  // 2. Fetch from Spotify
  const spotifyData = await fetch('/api/spotify/trending');
  
  // 3. Store in cache
  await prisma.cacheData.upsert({
    where: { key: 'spotify_trending' },
    create: {
      key: 'spotify_trending',
      data: spotifyData,
      expires: new Date(Date.now() + 6 * 60 * 60 * 1000) // 6 hours
    },
    update: {
      data: spotifyData,
      expires: new Date(Date.now() + 6 * 60 * 60 * 1000)
    }
  });
  
  // 4. Queue MB enrichment (non-blocking)
  queueMusicBrainzEnrichment(spotifyData);
  
  return { source: 'fresh', data: spotifyData };
}
```

#### B. Browse Page Data Fetching

```typescript
// TODO: Fix Browse Page lmfaooo 
// TODO: Add colors to TODO TREE cuh
// In BrowsePageClient.tsx
useEffect(() => {
  // 1. Trigger sync (non-blocking)
  fetch('/api/spotify/sync').catch(() => {});
  
  // 2. Load from cache (always fast)
  fetch('/api/cache/trending')
    .then(res => res.json())
    .then(data => {
      setNewReleases(data.newReleases);
      setTrendingArtists(data.trendingArtists);
      setPopularAlbums(data.popularAlbums);
    });
}, []);
```

#### C. MusicBrainz Enrichment (Background)
```typescript
// Simple version: Script that runs continuously
// Future version: Proper queue (BullMQ)

async function enrichNextAlbum() {
  // 1. Get cache data
  const cache = await prisma.cacheData.findUnique({
    where: { key: 'spotify_trending' }
  });
  
  if (!cache) return;
  
  const data = cache.data;
  const metadata = cache.metadata || { processed: [] };
  
  // 2. Find next unprocessed album
  const unprocessed = data.newReleases.find(
    album => !metadata.processed.includes(album.id)
  );
  
  if (!unprocessed) return;
  
  // 3. Search MusicBrainz (rate limited)
  await rateLimiter.wait('musicbrainz');
  const mbResult = await searchMusicBrainz(
    `${unprocessed.name} ${unprocessed.artists}`
  );
  
  // 4. Update metadata
  metadata.processed.push(unprocessed.id);
  metadata.mbMatches = metadata.mbMatches || {};
  metadata.mbMatches[unprocessed.id] = mbResult;
  
  await prisma.cacheData.update({
    where: { key: 'spotify_trending' },
    data: { metadata }
  });
}

// Run every second
setInterval(enrichNextAlbum, 1000);
```

## API Endpoints

### Public Endpoints
- `GET /api/spotify/trending` - Raw Spotify data (rate limited)
- `GET /api/spotify/sync` - Trigger sync & return cached data
- `GET /api/cache/trending` - Get cached trending data (fast)

### Future Endpoints
- `GET /api/albums/appearances/:id` - Get trending history for an album
- `POST /api/albums/add-from-trending` - Add trending album to user collection
- `GET /api/stats/trending` - Analytics on trending patterns

## Rate Limiting Strategy

### Spotify
- Development: ~180 requests/minute (plenty)
- Use cache to minimize requests
- 6-hour cache duration

### MusicBrainz  
- Hard limit: 1 request/second
- Simple DB-based rate limiter for now
- Future: Redis-based distributed lock

## Migration Path

### Phase 1: JSON Cache (Current)
- Simple CacheData table
- Store raw Spotify responses
- Display in UI

### Phase 2: MusicBrainz Enrichment
- Background script
- Add MB IDs to metadata
- Display when available

### Phase 3: Historical Tracking
- Parse JSON into AlbumAppearance records
- Track trending history
- Build analytics

### Phase 4: Production Scale
- Redis for rate limiting
- BullMQ for job queues  
- Dedicated worker processes
- Monitoring & alerts

## Environment Variables Needed

```env
# Already have
SPOTIFY_CLIENT_ID=xxx
SPOTIFY_CLIENT_SECRET=xxx

# Will need
MUSICBRAINZ_USER_AGENT=YourApp/1.0 (your@email.com)
CACHE_DURATION_HOURS=6
ENABLE_BACKGROUND_SYNC=true
```

## Benefits of This Approach

1. **Fast UI** - Never waiting on external APIs
2. **Rate Limit Safe** - Centralized limiting
3. **Resilient** - External API down? Show cached data
4. **Evolve Later** - JSON cache can become anything
5. **Historical Data** - Track what was trending when
6. **Own Your Data** - Not dependent on Spotify forever

## Next Steps

1. ✅ Spotify API endpoint exists (`/api/spotify/trending`)
2. ⬜ Add CacheData model to Prisma schema
3. ⬜ Create sync endpoint (`/api/spotify/sync`)
4. ⬜ Update Browse page to use cached data
5. ⬜ Add MusicBrainz enrichment script
6. ⬜ Test end-to-end pipeline