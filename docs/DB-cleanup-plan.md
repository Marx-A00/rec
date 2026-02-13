# Database Cleanup Plan

**Date:** 2026-01-22  
**Environment:** Production (rec-music.org)  
**Related:** [DB-cleanup-investigation.md](./DB-cleanup-investigation.md)

---

## Overview

This document organizes the findings from the database investigation into actionable cleanup tasks, grouped by problem area.

**Summary of Issues:**

| Problem                      | Count | Priority | Action Type            |
| ---------------------------- | ----- | -------- | ---------------------- |
| Junk genre-named albums      | 28    | High     | Delete                 |
| Albums missing genres        | 458+  | High     | Bug fix + Re-enrich    |
| Trackless orphan albums      | ~103  | Medium   | Delete                 |
| Trackless albums with users  | 22    | Medium   | Re-enrich              |
| Orphaned albums (no artists) | 4     | Low      | Re-enrich / Manual fix |

---

# Problem 1: Junk Albums with Genre-Like Names

## Information Gathered

**Count:** 28 albums  
**Source:** MusicBrainz New Releases Scheduler  
**User Impact:** None (0 collections, 0 recommendations)

These albums have titles that are literally genre names (e.g., "Hip Hop, Nu Skool, Electronica", "Indie Rock & Pop"). They came from MusicBrainz queries that returned compilation albums and production music libraries.

**Origin:** `src/lib/musicbrainz/new-releases-scheduler.ts` queries MusicBrainz with genre tags, and the processor (`src/lib/queue/processors/musicbrainz-processor.ts`) doesn't filter out albums with genre-like titles.

**Examples:**

- "Hip Hop, Nu Skool, Electronica" - Various Artists
- "Urban, Electronica & Hip Hop" - Various Artists
- "Uplifting Indie Pop Rock" - Lovely Music Library
- "Swagger: Electronic / Hip Hop" - Cavendish Trailers

**Full list:** See [DB-cleanup-investigation.md](./DB-cleanup-investigation.md#junk-albums-list)

## Tasks to Fix

### Task 1.1: Delete Junk Albums (Data Cleanup)

**Priority:** High  
**Risk:** Low (no user relationships)  
**CLI Task:** Task 11

```sql
DELETE FROM albums WHERE id IN (
  '0d5fada6-777c-489c-8421-38ef948d9357',
  '1e60dcd5-9773-4c83-b990-6c4d3a9dd708',
  -- ... (28 total IDs in investigation doc)
);
```

**Pre-requisites:**

- Verify cascading deletes handle `tracks`, `album_artists`, `enrichment_logs`

### Task 1.2: Add Junk Title Filter (Prevention)

**Priority:** Medium  
**File:** `src/lib/queue/processors/musicbrainz-processor.ts`

Add filter function to reject albums with genre-heavy titles:

```typescript
const GENRE_KEYWORDS = [
  'hip hop',
  'hip-hop',
  'electronic',
  'indie',
  'rock',
  'pop',
  'alternative',
  'jazz',
  'soul',
  'metal',
  'r&b',
  'electronica',
];

function isJunkTitle(title: string): boolean {
  const lowerTitle = title.toLowerCase();
  const words = lowerTitle.split(/[\s,/&-]+/).filter(w => w.length > 2);
  const genreWords = words.filter(w =>
    GENRE_KEYWORDS.some(g => g.includes(w) || w.includes(g))
  );
  return genreWords.length / words.length > 0.6;
}
```

---

# Problem 2: Albums Missing Genres (Enrichment Bug)

## Information Gathered

**Count:** 458+ albums (91% of MusicBrainz albums)  
**Root Cause:** Bug in enrichment processor  
**User Impact:** Albums display without genre tags

**The Bug:** Two code paths in `src/lib/queue/processors/enrichment-processor.ts`:

| Path              | Condition                 | Includes                          | Has Genres? |
| ----------------- | ------------------------- | --------------------------------- | ----------- |
| Path 1 (line 414) | Album has `musicbrainzId` | `['artists', 'releases']`         | NO          |
| Path 2 (line 507) | Album needs search        | `['artists', 'tags', 'releases']` | YES         |

Albums from MusicBrainz scheduler already have `musicbrainzId`, so they take Path 1 and never fetch genres.

**Verified via API test:** Adding `'tags'` to the includes returns genre data correctly.

## Tasks to Fix

### Task 2.1: Fix Enrichment Bug (Code Fix)

**Priority:** High  
**File:** `src/lib/queue/processors/enrichment-processor.ts`  
**Line:** 416

Change:

```typescript
const mbData = await musicBrainzService.getReleaseGroup(
  album.musicbrainzId,
  ['artists', 'releases'] // BUG: Missing 'tags'
);
```

To:

```typescript
const mbData = await musicBrainzService.getReleaseGroup(
  album.musicbrainzId,
  ['artists', 'tags', 'releases'] // FIXED: Added 'tags'
);
```

### Task 2.2: Re-enrich Albums Missing Genres (Data Cleanup)

**Priority:** High  
**Depends on:** Task 2.1 (bug must be fixed first!)  
**CLI Task:** Task 13  
**Estimated time:** ~8 minutes (458 albums at 1 req/sec)

```sql
UPDATE albums
SET enrichment_status = 'PENDING'
WHERE musicbrainz_id IS NOT NULL
  AND (genres IS NULL OR array_length(genres, 1) IS NULL)
  AND enrichment_status = 'COMPLETED';
```

**Monitoring:**

```bash
pnpm queue:dev  # Bull Board at localhost:3001
```

---

# Problem 3: Trackless Albums

## Information Gathered

**Total Count:** 125 albums with no tracks  
**Breakdown:**

- 103 albums with NO user relationships (safe to delete)
- 22 albums WITH user relationships (keep, re-enrich)

**By Source:**

- SPOTIFY: 99
- DISCOGS: 16
- MUSICBRAINZ: 10

**Root Cause:** Albums couldn't be matched to MusicBrainz during enrichment, so tracks were never fetched. Enrichment marks them "COMPLETED" despite having no tracks.

## Tasks to Fix

### Task 3.1: Delete Orphan Trackless Albums (Data Cleanup)

**Priority:** Medium  
**Risk:** Low (no user relationships)  
**CLI Task:** Task 12

```sql
DELETE FROM albums
WHERE id NOT IN (SELECT DISTINCT album_id FROM tracks)
  AND id NOT IN (SELECT album_id FROM "CollectionAlbum")
  AND id NOT IN (SELECT basis_album_id FROM "Recommendation")
  AND id NOT IN (SELECT recommended_album_id FROM "Recommendation");
```

### Task 3.2: Re-enrich Trackless Albums with Users (Data Cleanup)

**Priority:** Medium  
**CLI Task:** Task 14

```sql
UPDATE albums
SET enrichment_status = 'PENDING'
WHERE id NOT IN (SELECT DISTINCT album_id FROM tracks)
  AND (
    id IN (SELECT album_id FROM "CollectionAlbum")
    OR id IN (SELECT basis_album_id FROM "Recommendation")
    OR id IN (SELECT recommended_album_id FROM "Recommendation")
  );
```

**Note:** If re-enrichment fails again, these become candidates for the Admin Enrichment UI (manual data correction).

---

# Problem 4: Orphaned Albums (No Artists Linked)

## Information Gathered

**Count:** 4 albums  
**Root Cause:** Stub album creation path doesn't create artist links

**Affected Albums:**

| Album            | Source      | User Relations   | Notes                                |
| ---------------- | ----------- | ---------------- | ------------------------------------ |
| Alfredo Alfredo  | DISCOGS     | 1 recommendation | Has MusicBrainz ID                   |
| MM..FOOD         | MUSICBRAINZ | None             | MF DOOM exists in DB but not linked! |
| 纯寐寐 (Chinese) | SPOTIFY     | None             | Single, non-Latin title              |
| موهبة (Arabic)   | SPOTIFY     | None             | Single, non-Latin title              |

**The Bug:** `src/lib/graphql/resolvers/mutations.ts` line 1422

When adding album to "Listen Later" with only MusicBrainz ID:

```typescript
album = await prisma.album.create({
  data: {
    musicbrainzId: albumId,
    title: 'Loading...',
    enrichmentStatus: 'PENDING',
  },
});
// NO artist link created!
```

**Code Audit Results:**

| Creation Path                        | Creates Artist Link? |
| ------------------------------------ | -------------------- |
| Spotify mappers                      | Yes                  |
| MusicBrainz processor                | Yes                  |
| GraphQL createAlbum                  | Yes                  |
| GraphQL addToListenLater (with data) | Yes                  |
| **GraphQL addToListenLater (stub)**  | **NO**               |
| MusicBrainz integration service      | Yes                  |

## Tasks to Fix

### Task 4.1: Re-enrich Orphaned Albums (Data Cleanup - Try First)

**Priority:** Low  
**Risk:** Low

```sql
UPDATE albums
SET enrichment_status = 'PENDING'
WHERE id IN (
  '87bd5e45-0b2b-43f1-a943-68a268e90c5c',  -- موهبة
  '819954c0-72a7-4f80-91eb-5fdd9f72711d',  -- 纯寐寐
  'e4fb0341-4e12-4294-a3db-f27ca0727d7f',  -- MM..FOOD
  '63361d47-9cd8-4ca9-a363-fb87c00529c4'   -- Alfredo Alfredo
);
```

**Expected outcome:** Enrichment should create artist links if it can match the albums.

**Fallback:** If enrichment fails (especially for non-Latin titles), use Admin Enrichment UI for manual correction.

### Task 4.2: Fix Stub Creation Bug (Code Fix)

**Priority:** Medium  
**File:** `src/lib/graphql/resolvers/mutations.ts`  
**Line:** ~1422

Ensure stub albums either:

1. Create a placeholder artist link, OR
2. Always include artist data in the creation payload

**Option A:** Require artist data for album creation
**Option B:** Create "Unknown Artist" placeholder and let enrichment fix it

### Task 4.3: Manual Correction via Admin UI (Future)

**Priority:** Low  
**Depends on:** Admin Album Data Correction feature (PRD exists)

For albums that can't be automatically enriched (non-Latin titles, obscure releases), use the manual search and link UI.

---

# Execution Order

## Phase 1: Bug Fixes (Do First)

1. **Task 2.1** - Fix genre enrichment bug (add `'tags'` to line 416)
2. **Task 4.2** - Fix stub album creation (optional, prevents future orphans)
3. **Task 1.2** - Add junk title filter (optional, prevents future junk)

## Phase 2: Data Cleanup (Safe Deletes)

4. **Task 1.1** - Delete 28 junk genre-named albums
5. **Task 3.1** - Delete ~103 orphan trackless albums

## Phase 3: Re-enrichment

6. **Task 2.2** - Re-enrich 458+ albums missing genres (~8 min)
7. **Task 3.2** - Re-enrich 22 trackless albums with users
8. **Task 4.1** - Re-enrich 4 orphaned albums (no artists)

## Phase 4: Manual Cleanup (If Needed)

9. **Task 4.3** - Manual fix for albums that fail re-enrichment

---

# CLI Commands

```bash
# Preview all cleanup (dry run)
pnpm db:cleanup --dry-run

# Run specific tasks
pnpm db:cleanup --task 11   # Delete junk albums
pnpm db:cleanup --task 12   # Delete orphan trackless
pnpm db:cleanup --task 13   # Re-enrich missing genres
pnpm db:cleanup --task 14   # Re-enrich trackless with users

# Run all cleanup tasks
pnpm db:cleanup --from 11

# Monitor enrichment progress
pnpm queue:dev  # Bull Board at localhost:3001
```

---

# Success Metrics

After cleanup:

| Metric                 | Before  | After (Expected) |
| ---------------------- | ------- | ---------------- |
| Junk albums            | 28      | 0                |
| Albums with genres     | 45 (7%) | 500+ (80%+)      |
| Trackless orphans      | ~103    | 0                |
| Albums without artists | 4       | 0                |

---

# Related Documents

- [DB-cleanup-investigation.md](./DB-cleanup-investigation.md) - Full investigation details
- [trackless-albums.md](./trackless-albums.md) - Detailed trackless album analysis
- [PRDs/admin-album-data-correction.md](../.taskmaster/docs/PRDs/admin-album-data-correction.md) - Manual correction UI spec
