# New Releases Enrichment: Trackless Albums Investigation

**Date:** 2026-02-05
**Status:** Investigation Complete, Implementation Plan Ready
**Related:** [DB-cleanup-plan.md](./DB-cleanup-plan.md), [database-cleanup PRD](../.taskmaster/docs/PRDs/database-cleanup.md)

---

## Executive Summary

Investigation into why albums end up with no tracks after enrichment. Found **265 trackless albums** with three distinct root causes requiring different fixes.

**Key Decision:** Use existing `EnrichmentLog` system for tracking (no schema migration needed). The `jobId` field links related log entries from the same enrichment pipeline.

---

## 1. MusicBrainz Data Model: Release Groups vs Releases

### The Key Distinction

**Release Group** = The abstract concept of an album
- "This Is Acting" by Sia is ONE release group
- Contains metadata like primary type (album/single/EP), secondary types (live, compilation, remix)

**Release** = A specific physical/digital release of that album
- "This Is Acting (10th Anniversary Edition)" is a **release** under the "This Is Acting" release group
- Multiple releases can exist: original, deluxe, remastered, regional variants, etc.

### Current Implementation

We **only search release-groups**, never individual releases:

```typescript
// src/lib/musicbrainz/basic-service.ts
const response = await this.api.search('release-group', {
  query: finalQuery,
  limit,
  offset,
  inc: ['artist-credits'],
});
```

### The Problem

When Spotify has "This Is Acting (10th Anniversary Edition)", our search query is:
```
releasegroup:"This Is Acting (10th Anniversary Edition)" AND artist:"Sia"
```

But MusicBrainz has:
```
release-group: "This Is Acting"
  └── release: "This Is Acting (10th Anniversary Edition)"
```

**We're searching at the wrong level!** The edition/variant info is on the **release**, not the **release-group**.

### Verified Example: Sia - "This Is Acting (10th Anniversary Edition)"

**Search for full title (FAILS):**
```
GET /ws/2/release-group/?query=releasegroup:"This Is Acting (10th Anniversary Edition)" AND artist:"Sia"
Result: 0 release groups found
```

**Search for base title (SUCCEEDS):**
```
GET /ws/2/release-group/?query=releasegroup:"This Is Acting" AND artist:"Sia"
Result: 1 release group found (ID: 2eb49f55-ad2a-43fa-a54f-90d0759d7f62)
```

**The 10th Anniversary Edition exists as a release under that group:**
```
GET /ws/2/release-group/2eb49f55-ad2a-43fa-a54f-90d0759d7f62?inc=releases
Result: 17 releases including "This Is Acting - 2026-01-29 (10th anniversary edition)"
```

---

## 2. Trackless Albums: Current State

### Distribution by Source and Year

- SPOTIFY 2026: 190 albums (brand new releases)
- SPOTIFY 2025: 66 albums (recent releases)
- MUSICBRAINZ 2025: 1 album
- MUSICBRAINZ 2024: 4 albums (singles with featuring artists)
- MUSICBRAINZ 2019: 1 album (edition suffix issue)
- MUSICBRAINZ 2004: 1 album (MM..FOOD - no artist linked)
- MUSICBRAINZ 2002: 1 album (Madvillainy - tracks never fetched)
- MUSICBRAINZ 1994: 1 album (Delete Yourself - never enriched)

**Total: 265 trackless albums**

---

## 3. Three Root Causes Identified

### Scenario 1: Brand New Spotify Releases (256 albums)

**Problem:** Albums too new to exist in MusicBrainz yet.

MusicBrainz is community-edited, so new releases take time to be catalogued. Albums released in late 2025/2026 often don't exist in MusicBrainz.

**Examples:**
- "Poema" by J Balvin (2026-01-29) - Not in MusicBrainz
- "Deletreo" by Nicky Jam (2026-01-29) - Not in MusicBrainz
- "Ever Since U Left Me" by French Montana (2026-01-23) - Not in MusicBrainz

**Current Behavior:**
- Enrichment searches MusicBrainz → No match found
- Album marked `COMPLETED` with `data_quality: LOW`
- **0 tracks created**

**Fix:** Fallback to Spotify track fetching when MusicBrainz fails. The function `fetchSpotifyAlbumTracks()` exists in `src/lib/spotify/mappers.ts` but is **never called**.

---

### Scenario 2: Edition/Variant Title Mismatch (est. 5-10 albums)

**Problem:** Spotify title includes edition suffix that doesn't exist as a release-group in MusicBrainz.

**Examples:**
- "This Is Acting (10th Anniversary Edition)" - Sia
- "Wasteland, Baby! (Special Edition)" - Hozier
- "The End Of Genesys (Deluxe)" - Anyma

**Current Behavior:**
- Search: `releasegroup:"This Is Acting (10th Anniversary Edition)"`
- Result: 0 matches (because it's a release, not a release-group)
- Album marked `COMPLETED` with no MusicBrainz ID
- **0 tracks created**

**Fix:** Use title analysis to detect editions, then search releases directly or strip suffix and search release-groups.

---

### Scenario 3: MusicBrainz Imports Without Track Fetching (9 albums)

**Problem:** Albums imported directly from MusicBrainz already have `musicbrainz_id` but tracks were never fetched.

**Examples:**
- Madvillainy by Madvillain (2002) - Tracks never fetched
- Delete Yourself by Atari Teenage Riot (1994) - Never enriched (`last_enriched: null`)
- MM..FOOD by MF DOOM (2004) - No artist linked

**Fix:** Re-run enrichment for these albums.

---

## 4. Current Enrichment Pipeline Flow

### How Albums Get Imported from Spotify

1. **Spotify Scheduler** runs via BullMQ repeatable jobs
2. Uses Spotify Search API with `tag:new year:YYYY` filter
3. Creates album with minimal data:
   - `source: 'SPOTIFY'`
   - `dataQuality: 'LOW'`
   - `enrichmentStatus: 'PENDING'`
   - **No tracks created from Spotify**

### How Enrichment Works

1. **Check if enrichment needed** via `shouldEnrichAlbum()`
2. **If album has `musicbrainz_id`:** Fetch full data directly (1 API call)
3. **If no `musicbrainz_id`:** Search MusicBrainz with query:
   ```
   releasegroup:"Album Title" AND artist:"Artist" AND type:album AND status:official
   ```
4. **Find best match** using hybrid scoring:
   - MusicBrainz score (70% weight)
   - Jaccard similarity on title + artist (30% weight)
   - Threshold: > 0.8 to proceed
5. **If match found:** Fetch releases and create tracks
6. **If no match:** Mark `COMPLETED` with `data_quality: LOW` and **0 tracks**

### The Gap: No Spotify Track Fallback

```typescript
// src/lib/spotify/mappers.ts - EXISTS but NEVER CALLED
async function fetchSpotifyAlbumTracks(albumId: string): Promise<SpotifyTrackData[]>
```

**Design Decision:** MusicBrainz track data is preferred because it includes ISRC codes, proper artist credits, and YouTube URLs. But when MusicBrainz fails, we get **nothing** instead of lower-quality Spotify data.

---

## 5. What We Already Have (No Migration Needed!)

### Existing Track Source Tracking

The `Track` model already has a `source` field:

```prisma
model Track {
  source           ContentSource   @default(MUSICBRAINZ)
  // ContentSource enum: MUSICBRAINZ | SPOTIFY | DISCOGS | etc.
}
```

### Existing EnrichmentLog System

The `EnrichmentLog` model already tracks everything we need:

```prisma
model EnrichmentLog {
  id                 String                 @id
  entityType         EnrichmentEntityType?  // ALBUM | ARTIST | TRACK
  albumId            String?                @db.Uuid
  operation          String                 // e.g., "ENRICH_ALBUM"
  sources            String[]               // e.g., ["MUSICBRAINZ", "SPOTIFY"]
  status             EnrichmentStatus       // SUCCESS | FAILED | NO_DATA_AVAILABLE | etc.
  reason             String?                // Human-readable explanation
  fieldsEnriched     String[]               // e.g., ["tracks", "genres"]
  dataQualityBefore  DataQuality?
  dataQualityAfter   DataQuality?
  errorMessage       String?
  durationMs         Int?
  apiCallCount       Int
  metadata           Json?                  // Extra context (search queries, scores, etc.)
  jobId              String?                // Links related logs together!
  triggeredBy        String?                // "manual", "sync", "re-enrichment"
  createdAt          DateTime
}
```

### The jobId Field Links Related Logs

When a single enrichment attempt involves multiple steps (MB search → MB fail → Spotify fallback), they all share the same `jobId`:

```
EnrichmentLog #1:
  jobId: "enrich-album-abc123-1707134400"  ← Same!
  operation: ENRICH_ALBUM
  sources: ['MUSICBRAINZ']
  status: NO_DATA_AVAILABLE
  reason: "No MusicBrainz match - album too new"
  fieldsEnriched: []

EnrichmentLog #2:
  jobId: "enrich-album-abc123-1707134400"  ← Same!
  operation: SPOTIFY_TRACK_FALLBACK
  sources: ['SPOTIFY']
  status: SUCCESS
  reason: "Fallback to Spotify tracks after MusicBrainz failed"
  fieldsEnriched: ['tracks']
```

### Existing MusicBrainz Service Methods

Already implemented in `src/lib/musicbrainz/basic-service.ts`:

- ✅ `searchReleaseGroups(query)` - Search for albums
- ✅ `getReleaseGroup(mbid, includes)` - Get album details
- ✅ `getRelease(mbid, includes)` - Get specific release details
- ✅ `getReleaseRecordings(releaseMbid)` - Get tracks from a release

**Missing (need to add):**

- ❌ `searchReleases(query)` - Search releases directly (for edition matching)
- ❌ Browse releases by release-group ID (to find editions under a release-group)

### Existing UI Components

- ✅ `EnrichmentLogTable` component shows full enrichment history
- ✅ Expandable rows show field changes (before → after)
- ✅ Status badges (Success, Partial, No Data, Failed)
- ✅ Source badges (MUSICBRAINZ, SPOTIFY, etc.)

---

## 6. Refined Enrichment Strategy

### Core Principles

1. **MusicBrainz First** - Always try MusicBrainz before falling back to Spotify
2. **Spotify Fallback** - Only use Spotify tracks when MusicBrainz fails completely
3. **Weekly Re-enrichment** - Retry MusicBrainz for albums that used Spotify fallback
4. **Full Logging** - Use existing EnrichmentLog with `jobId` to link related attempts

### Enrichment Flow

```
New Album from Spotify
        │
        ▼
┌───────────────────────────────────┐
│ 1. Try MusicBrainz Search         │
│    - Full title search            │
│    - Edition detection + release  │
│      search if needed             │
│    - Base title fallback          │
│                                   │
│    Log: operation=ENRICH_ALBUM    │
│          sources=['MUSICBRAINZ']  │
│          jobId=<shared-id>        │
└───────────────┬───────────────────┘
                │
        Found?  │
       ┌────────┴────────┐
       │ YES             │ NO
       ▼                 ▼
┌─────────────────┐  ┌─────────────────────────────────┐
│ Create tracks   │  │ 2. Spotify Track Fallback       │
│ from MB         │  │    - Fetch tracks from Spotify  │
│ Track.source:   │  │    - Track.source: SPOTIFY      │
│   MUSICBRAINZ   │  │    - dataQuality: MEDIUM        │
│ quality: HIGH   │  │                                 │
│                 │  │    Log: operation=SPOTIFY_TRACK │
│ Log: status=    │  │            _FALLBACK            │
│   SUCCESS       │  │          sources=['SPOTIFY']    │
└─────────────────┘  │          jobId=<same-id>        │
                     └─────────────────────────────────┘
                                    │
                                    ▼
                     ┌─────────────────────────────────┐
                     │ 3. Weekly Re-enrichment Job     │
                     │    - Query EnrichmentLog for    │
                     │      SPOTIFY_TRACK_FALLBACK     │
                     │    - Retry MusicBrainz search   │
                     │    - If found: replace tracks   │
                     │                                 │
                     │    Log: operation=RE_ENRICH     │
                     │          _ALBUM                 │
                     │          jobId=<new-id>         │
                     └─────────────────────────────────┘
```

### How EnrichmentLog Tracks Everything

**Example: Album "Poema" by J Balvin**

**Initial enrichment (Feb 5):**
```
EnrichmentLog #1 (jobId: "enrich-poema-abc123"):
  operation: ENRICH_ALBUM
  sources: ['MUSICBRAINZ']
  status: NO_DATA_AVAILABLE
  reason: "No MusicBrainz match - album released 1 week ago"
  fieldsEnriched: []
  dataQualityAfter: LOW
  metadata: {
    albumTitle: "Poema",
    artistName: "J Balvin",
    mbSearchQuery: 'releasegroup:"Poema" AND artist:"J Balvin"',
    mbResultCount: 0
  }

EnrichmentLog #2 (jobId: "enrich-poema-abc123"):  ← Same jobId!
  operation: SPOTIFY_TRACK_FALLBACK
  sources: ['SPOTIFY']
  status: SUCCESS
  reason: "Created tracks from Spotify after MusicBrainz failed"
  fieldsEnriched: ['tracks']
  dataQualityAfter: MEDIUM
  metadata: {
    tracksCreated: 12,
    fallbackReason: "No MusicBrainz match"
  }
```

**Weekly re-enrichment (Feb 12):**
```
EnrichmentLog #3 (jobId: "re-enrich-poema-def456"):  ← New jobId
  operation: RE_ENRICH_ALBUM
  sources: ['MUSICBRAINZ']
  status: SUCCESS
  reason: "Weekly re-enrichment - MusicBrainz match found"
  fieldsEnriched: ['musicbrainzId', 'genres', 'tracks']
  dataQualityBefore: MEDIUM
  dataQualityAfter: HIGH
  metadata: {
    mbMatchScore: 0.95,
    previousTrackSource: "SPOTIFY",
    tracksReplaced: 12,
    tracksCreated: 12
  }
```

### UI Display (Already Built!)

The `EnrichmentLogTable` component will show:

```
📦 Job: enrich-poema-abc123 (Feb 5)
  ├─ ENRICH_ALBUM       | MUSICBRAINZ | ⚠️ No Data  | "No MB match - album too new"
  └─ SPOTIFY_FALLBACK   | SPOTIFY     | ✅ Success  | tracks

📦 Job: re-enrich-poema-def456 (Feb 12)
  └─ RE_ENRICH_ALBUM    | MUSICBRAINZ | ✅ Success  | tracks, genres, mbId | MEDIUM → HIGH
```

### Query for Re-enrichment Candidates

```sql
-- Find albums that used Spotify fallback and haven't been re-tried in 7+ days
SELECT DISTINCT el.album_id, a.title, a.spotify_id
FROM enrichment_logs el
JOIN albums a ON el.album_id = a.id
WHERE el.operation = 'SPOTIFY_TRACK_FALLBACK'
  AND el.status = 'SUCCESS'
  AND NOT EXISTS (
    SELECT 1 FROM enrichment_logs el2 
    WHERE el2.album_id = el.album_id 
      AND el2.operation = 'RE_ENRICH_ALBUM'
      AND el2.created_at > NOW() - INTERVAL '7 days'
  )
  -- Optional: Stop retrying after 8 weeks (8 attempts)
  AND (
    SELECT COUNT(*) FROM enrichment_logs el3
    WHERE el3.album_id = el.album_id
      AND el3.operation = 'RE_ENRICH_ALBUM'
  ) < 8;
```

---

## 7. Title Analysis: Edition/Version Detection

### Implemented: `src/lib/musicbrainz/title-utils.ts` ✅

```typescript
interface TitleAnalysis {
  originalTitle: string;
  isEditionOrVersion: boolean;    // true if Deluxe, Remix, Live, etc.
  hasFeaturing: boolean;          // true if feat./with detected
  editionText: string | null;     // e.g., "10th Anniversary Edition"
  featuringText: string | null;   // e.g., "feat. Travis Scott"
  baseTitle: string;              // title with edition stripped, featuring kept
  detectedKeywords: string[];     // which keywords triggered detection
}

function analyzeTitle(title: string): TitleAnalysis;
function isEditionOrVersion(title: string): boolean;
function getBaseTitle(title: string): string;
```

**Keywords Detected:**

Edition keywords:
- `deluxe`, `anniversary`, `edition`, `special`, `extended`, `expanded`
- `remaster`, `remastered`, `collector`, `collector's`, `limited`, `bonus`, `complete`

Version keywords:
- `remix`, `mix`, `live`, `unplugged`, `acoustic`, `symphonic`, `orchestral`
- `instrumental`, `version`, `ver.`, `sped up`, `slowed`, `super slowed`
- `en vivo`, `ao vivo` (Spanish/Portuguese live)

**Test Results:**

```
📀 "This Is Acting (10th Anniversary Edition)"
   → isEditionOrVersion: true
   → baseTitle: "This Is Acting"
   → keywords: [anniversary, edition]

📀 "Rosary (feat. Travis Scott)"
   → isEditionOrVersion: false (correct - it's a featuring, not an edition)
   → hasFeaturing: true

📀 "wgft (Remix) [feat. Chris Brown]"
   → isEditionOrVersion: true
   → baseTitle: "wgft [feat. Chris Brown]"  (featuring kept!)
   → keywords: [remix, mix]
```

---

## 8. Proposed Search Algorithm

### Flow Diagram

```
Album: "This Is Acting (10th Anniversary Edition)" by Sia
                    │
                    ▼
        ┌─────────────────────┐
        │  analyzeTitle()     │
        │  isEditionOrVersion │
        │      = true         │
        └──────────┬──────────┘
                   │
                   ▼
        ┌─────────────────────┐
        │ Search RELEASE-GROUP│
        │ with FULL title     │
        │ (quick check)       │
        └──────────┬──────────┘
                   │
          Found?   │
         ┌─────────┴─────────┐
         │ NO                │ YES (unlikely for editions)
         ▼                   ▼
┌─────────────────┐   ┌─────────────────┐
│ Search RELEASES │   │ Use release-    │
│ with FULL title │   │ group as normal │
└────────┬────────┘   └─────────────────┘
         │
   Found?│
   ┌─────┴─────┐
   │ YES       │ NO
   ▼           ▼
┌──────────┐  ┌─────────────────────┐
│ Use this │  │ Search RELEASE-GROUP│
│ release  │  │ with BASE title     │
│ for data │  │ "This Is Acting"    │
└──────────┘  └──────────┬──────────┘
                         │
                   Found?│
                   ┌─────┴─────┐
                   │ YES       │ NO
                   ▼           ▼
          ┌─────────────┐  ┌─────────────┐
          │ Get releases│  │ No MB match │
          │ under group │  │ → Spotify   │
          │ Find best   │  │   fallback  │
          │ match       │  └─────────────┘
          └──────┬──────┘
                 │
                 ▼
          ┌─────────────┐
          │ Use matched │
          │ release for │
          │ track data  │
          └─────────────┘
```

---

## 9. Implementation Plan

### Phase 1: Title Analysis ✅ COMPLETE
- [x] Create `src/lib/musicbrainz/title-utils.ts`
- [x] Implement `analyzeTitle()`, `isEditionOrVersion()`, `getBaseTitle()`
- [x] Test with real album titles from database

### Phase 2: MusicBrainz Release Search
- [ ] Add `searchReleases(query)` method to `basic-service.ts`
- [ ] Add method to browse releases by release-group ID
- [ ] Implement `findBestReleaseMatch()` for matching releases by title

**Files to modify:**
- `src/lib/musicbrainz/basic-service.ts`
- `src/lib/musicbrainz/musicbrainz-service.ts` (wrapper)

### Phase 3: Enrichment Pipeline Update
- [ ] Update `enrichment-processor.ts` to use title analysis
- [ ] Implement the edition search flow (full title → release search → base title)
- [ ] Store release IDs (not just release-group IDs) when matching editions
- [ ] Ensure `jobId` is passed through all log calls
- [ ] Test with edition albums: Sia, Hozier, Panic! at the Disco

**Files to modify:**
- `src/lib/queue/processors/enrichment-processor.ts`
- `src/lib/queue/processors/utils.ts` (add release matching)

### Phase 4: Spotify Track Fallback
- [ ] Add new operation type: `SPOTIFY_TRACK_FALLBACK`
- [ ] Wire up `fetchSpotifyAlbumTracks()` in enrichment pipeline
- [ ] Create tracks with `source: 'SPOTIFY'` when MusicBrainz fails
- [ ] Set album `dataQuality: MEDIUM` for Spotify-only tracks
- [ ] Log fallback with same `jobId` as the failed MB attempt
- [ ] Add descriptive `reason` field explaining why fallback was used

**Files to modify:**
- `src/lib/queue/processors/enrichment-processor.ts`
- `src/lib/queue/jobs.ts` (add operation constant)
- `src/lib/logging/activity-logger.ts` (add operation constant)

### Phase 5: Weekly Re-enrichment Job
- [ ] Add new operation type: `RE_ENRICH_ALBUM`
- [ ] Create BullMQ repeatable job for weekly re-enrichment
- [ ] Query EnrichmentLog for `SPOTIFY_TRACK_FALLBACK` successes
- [ ] Filter out albums re-tried in last 7 days
- [ ] Stop retrying after 8 failures (~2 months)
- [ ] If MB match found: delete Spotify tracks, create MB tracks
- [ ] Log each attempt with descriptive `reason`

**Files to create/modify:**
- `src/lib/queue/jobs.ts` (add job type)
- `src/lib/queue/processors/enrichment-processor.ts` (add handler)
- `src/workers/queue-worker.ts` (register handler)

### Phase 6: Re-enrich Existing Trackless Albums
- [ ] One-time script to re-enrich 9 albums with MB IDs but no tracks
- [ ] One-time script to run Spotify fallback for 256 trackless albums
- [ ] Monitor EnrichmentLog to verify tracks are created

**Files to create:**
- `src/scripts/re-enrich-trackless-albums.ts`

### Phase 7: UI Enhancements (Optional)
- [ ] Group EnrichmentLog entries by `jobId` in the UI
- [ ] Show "Track Source: MusicBrainz ✓" or "Track Source: Spotify ⚠️" on album pages
- [ ] Add admin dashboard metrics for track sources

**Files to modify:**
- `src/components/admin/EnrichmentLogTable.tsx`
- `src/components/albumDetails/AlbumAdminActions.tsx`

---

## 10. Related Files

**Enrichment Pipeline:**
- `src/lib/queue/processors/enrichment-processor.ts` - Main enrichment logic
- `src/lib/queue/processors/utils.ts` - Matching utilities
- `src/lib/queue/jobs.ts` - Job type definitions

**MusicBrainz Integration:**
- `src/lib/musicbrainz/basic-service.ts` - Direct MusicBrainz API calls
- `src/lib/musicbrainz/musicbrainz-service.ts` - Rate-limited wrapper
- `src/lib/musicbrainz/title-utils.ts` - Edition/version detection ✅

**Spotify Integration:**
- `src/lib/spotify/mappers.ts` - Contains `fetchSpotifyAlbumTracks()`
- `src/lib/spotify/scheduler.ts` - New releases sync

**Logging:**
- `src/lib/logging/activity-logger.ts` - Operation/source constants
- `src/lib/enrichment/enrichment-logger.ts` - EnrichmentLog helper

**UI:**
- `src/components/admin/EnrichmentLogTable.tsx` - Enrichment history display

---

## Appendix: SQL Queries

### Find all trackless albums
```sql
SELECT 
  a.id, a.title, a.source, a.spotify_id, a.musicbrainz_id,
  a.enrichment_status, a.data_quality, a.release_date
FROM albums a
WHERE a.id NOT IN (SELECT DISTINCT album_id FROM tracks WHERE album_id IS NOT NULL)
  AND a.enrichment_status = 'COMPLETED'
ORDER BY a.release_date DESC;
```

### Find albums that used Spotify fallback (after implementation)
```sql
SELECT DISTINCT el.album_id, a.title, el.created_at
FROM enrichment_logs el
JOIN albums a ON el.album_id = a.id
WHERE el.operation = 'SPOTIFY_TRACK_FALLBACK'
  AND el.status = 'SUCCESS'
ORDER BY el.created_at DESC;
```

### Find re-enrichment candidates
```sql
SELECT DISTINCT el.album_id, a.title, a.spotify_id,
  (SELECT COUNT(*) FROM enrichment_logs el3
   WHERE el3.album_id = el.album_id AND el3.operation = 'RE_ENRICH_ALBUM') as attempt_count
FROM enrichment_logs el
JOIN albums a ON el.album_id = a.id
WHERE el.operation = 'SPOTIFY_TRACK_FALLBACK'
  AND el.status = 'SUCCESS'
  AND NOT EXISTS (
    SELECT 1 FROM enrichment_logs el2 
    WHERE el2.album_id = el.album_id 
      AND el2.operation = 'RE_ENRICH_ALBUM'
      AND el2.created_at > NOW() - INTERVAL '7 days'
  );
```

### Find albums with MusicBrainz IDs but no tracks
```sql
SELECT id, title, musicbrainz_id, enrichment_status, last_enriched
FROM albums 
WHERE musicbrainz_id IS NOT NULL
  AND id NOT IN (SELECT DISTINCT album_id FROM tracks WHERE album_id IS NOT NULL);
```

### Track source distribution (after implementation)
```sql
SELECT 
  t.source,
  COUNT(DISTINCT t.album_id) as album_count,
  COUNT(*) as track_count
FROM tracks t
GROUP BY t.source
ORDER BY album_count DESC;
```
