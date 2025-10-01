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

// ✅ RESOLVED: Spotify data shape is documented in src/lib/spotify/types.ts
// ✅ YES: Spotify API is paginated - see pagination section below

async function syncSpotifyData() {
  // 1. Check cache freshness
  const cache = await prisma.cacheData.findUnique({
    where: { key: 'spotify_trending' },
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
      expires: new Date(Date.now() + 6 * 60 * 60 * 1000), // 6 hours
    },
    update: {
      data: spotifyData,
      expires: new Date(Date.now() + 6 * 60 * 60 * 1000),
    },
  });

  // 4. Queue MB enrichment (non-blocking)
  queueMusicBrainzEnrichment(spotifyData);

  return { source: 'fresh', data: spotifyData };
}
```

#### B. Browse Page Data Fetching

```typescript
useEffect(() => {
  // 1. Trigger sync (non-blocking)
  // Legacy endpoint removed; use GraphQL mutation or scheduler instead.
  // Example: trigger via admin panel or background job.

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
    where: { key: 'spotify_trending' },
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
    data: { metadata },
  });
}

// Run every second
setInterval(enrichNextAlbum, 1000);
```

## Spotify Data Structure & Pagination

### Overview

✅ **Spotify API responses ARE paginated** for most endpoints. Our current implementation handles basic pagination through the `limit` parameter, but doesn't implement full pagination traversal yet.

### Current Data Shape (Cached in DB)

Based on `src/lib/spotify/types.ts` and current implementation:

```typescript
interface SpotifyCacheData {
  newReleases: SpotifyAlbumData[]; // 20 items (limit=20)
  featuredPlaylists: SpotifyPlaylistData[]; // 10 items (limit=10)
  topCharts: SpotifyTopChart[]; // 2 playlists × 10 tracks each
  popularArtists: SpotifyArtistGroup[]; // 4 search terms × 5 artists each
  recommendations: any[]; // Currently empty
  fetchedAt: string; // ISO timestamp
}
```

### Spotify API Pagination Patterns

#### 1. New Releases (`/browse/new-releases`)

```typescript
// Current: Limited to 20 albums
const newReleases = await spotifyClient.browse.getNewReleases('US', 20);

// Response structure:
{
  albums: {
    href: string,      // API URL for this page
    items: Album[],    // 20 albums max
    limit: number,     // 20 (what we requested)
    next: string | null,   // URL for next page (if exists)
    offset: number,    // 0 (current offset)
    previous: string | null, // URL for previous page
    total: number      // Total available albums (e.g., 500+)
  }
}
```

#### 2. Featured Playlists (`/browse/featured-playlists`)

```typescript
// Current: Limited to 10 playlists
const featured = await spotifyClient.browse.getFeaturedPlaylists('US', 10);

// Same pagination structure as above
{
  playlists: {
    href: string,
    items: Playlist[],  // 10 playlists max
    limit: 10,
    next: string | null,
    offset: 0,
    previous: string | null,
    total: number       // Total featured playlists available
  }
}
```

#### 3. Playlist Tracks (`/playlists/{id}/tracks`)

```typescript
// Current: Limited to 10 tracks per playlist
const tracks = await spotifyClient.playlists.getPlaylistItems(
  playlist.id, 'US', undefined, 10, 0
);

// Response:
{
  href: string,
  items: PlaylistTrack[],  // 10 tracks max
  limit: 10,
  next: string | null,
  offset: 0,
  previous: string | null,
  total: number            // Total tracks in playlist (could be 1000+)
}
```

### Data Quality & Completeness

#### Current Limitations

- **New Releases**: Only first 20 albums (Spotify returns 500+ per week)
- **Featured Playlists**: Only first 10 playlists
- **Top Charts**: Only 2 playlists × 10 tracks = 20 tracks total
- **Popular Artists**: 4 search terms × 5 artists = 20 artists total

#### Full Pagination Implementation (Future)

```typescript
// Example: Fetch all new releases for the week
async function fetchAllNewReleases(market = 'US') {
  const allAlbums = [];
  let offset = 0;
  const limit = 50; // Max allowed per request

  while (true) {
    const response = await spotifyClient.browse.getNewReleases(
      market,
      limit,
      offset
    );

    allAlbums.push(...response.albums.items);

    // Check if we have more pages
    if (!response.albums.next || response.albums.items.length < limit) {
      break;
    }

    offset += limit;

    // Rate limiting protection (Spotify allows ~180 req/min)
    await new Promise(resolve => setTimeout(resolve, 500)); // 2 requests/second
  }

  return allAlbums;
}
```

### Rate Limiting Considerations

#### Current Approach (Safe)

- **New Releases**: 1 request per sync
- **Featured Playlists**: 1 request per sync
- **Top Charts**: 1 request (categories) + 2 requests (playlist tracks) = 3 total
- **Artist Search**: 4 requests (search terms)
- **Total per sync**: ~9 requests every 6 hours

#### Full Pagination (Needs Rate Limiting)

- **New Releases**: Could be 10+ requests for full week data
- **Featured Playlists**: 2-3 requests for all playlists
- **Top Charts**: 5-10 requests for full chart data
- **Total**: 20-30 requests per sync

### Storage Implications

#### Current Storage (~100KB per cache entry)

```typescript
// Approximate sizes:
newReleases: 20 albums × 2KB = 40KB
featuredPlaylists: 10 playlists × 1KB = 10KB
topCharts: 20 tracks × 2KB = 40KB
popularArtists: 20 artists × 1KB = 20KB
// Total: ~110KB per cache entry
```

#### Full Pagination Storage (~2MB per cache entry)

```typescript
// If we paginated everything:
newReleases: 500 albums × 2KB = 1MB
featuredPlaylists: 50 playlists × 1KB = 50KB
topCharts: 500 tracks × 2KB = 1MB
popularArtists: 100 artists × 1KB = 100KB
// Total: ~2.15MB per cache entry
```

### Recommended Approach

#### Phase 1: Current (✅ Implemented)

- Limited pagination for quick overview
- Low storage and API usage
- Good for browse/discovery UI

#### Phase 2: Smart Pagination (📋 Future)

- Paginate new releases (get 50-100 albums instead of 20)
- Keep featured playlists limited (10 is sufficient)
- Expand top charts to 3-5 playlists with 20 tracks each
- Monitor storage growth and API usage

#### Phase 3: Full Pagination (📋 Advanced)

- Implement background job for full data sync
- Store historical data for trending analysis
- Add database indexing for performance
- Implement proper queue system for API calls

### Data Structure References

- **Full Type Definitions**: `src/lib/spotify/types.ts`
- **API Implementation**: `src/app/api/spotify/sync/route.ts`
- **GraphQL Schema**: `src/graphql/schema.graphql` (lines 598-644)
- **Processing Logic**: `src/lib/spotify/mappers.ts`

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
