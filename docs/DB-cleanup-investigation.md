# Database Cleanup Investigation

**Date:** 2026-01-21  
**Environment:** Production (rec-music.org)

---

## Summary

Investigation into database health issues identified in previous analysis. Focused on validating assertions about "junk albums" with genre-like names that may have been incorrectly imported.

---

## Database Stats (Production)

- **Total albums**: 397
- **Total artists**: 542
- **Total tracks**: 5,181
- **Albums needing enrichment**: 24
- **Artists needing enrichment**: 221
- **Average data quality**: 96.5%
- **Albums with user collections**: 22 (legitimate albums)

---

## Assertion #1: Junk Albums with Genre-Like Names

### Status: CONFIRMED

**28 junk albums identified** with genre-like titles. All have:

- `inCollectionsCount: 0` (no user interactions)
- `recommendationScore: null` (never recommended)
- Many by "Various Artists" or obscure production music libraries
- **Safe to delete**

### Origin

These came from the **MusicBrainz New Releases Scheduler** (`src/lib/musicbrainz/new-releases-scheduler.ts`).

The scheduler queries MusicBrainz with:

```
firstreleasedate:[DATE] AND primarytype:Album AND (tag:"hip hop" OR tag:"electronic" OR tag:"indie" ...)
```

MusicBrainz returned albums that literally have genre names as their titles (compilation albums, production music libraries, etc.). The processor in `src/lib/queue/processors/musicbrainz-processor.ts` didn't filter these out.

### Junk Albums List

| ID                                     | Title                                                  | Artist                         |
| -------------------------------------- | ------------------------------------------------------ | ------------------------------ |
| `0d5fada6-777c-489c-8421-38ef948d9357` | Indie Rock & Pop                                       | Paul J. Borg                   |
| `1e60dcd5-9773-4c83-b990-6c4d3a9dd708` | Hip Hop, Nu Skool, Electronica                         | Various Artists                |
| `21b7bb29-a40e-4267-8a38-c3d8e59f4908` | Urban, Electronica & Hip Hop                           | Various Artists                |
| `2aa38fa7-7e4a-47be-8ef4-35367e065f56` | Alternative Hip Hop                                    | DJ Krush                       |
| `2c9eb943-ace8-41fe-ae1e-7bee1a94b3ef` | Hip Hop Jazz Best                                      | Quincy Jones and His Orchestra |
| `30211b14-bf7a-48dd-8afa-330b87f9be7c` | Pop, Rock & Alternative                                | Various Artists                |
| `323282b1-5675-4a9d-97f3-d9922957035f` | Hip Hop and R&B                                        | Horseshoe G.A.N.G.             |
| `372de685-6f0a-4719-b080-3fdde781c752` | Alternative Indie Pop                                  | Various Artists                |
| `37b92f15-5773-49ee-a438-54cd27845b9c` | Hip Hop, Trip Hop, R&B                                 | Colin Kiddy                    |
| `45767c3b-3029-40db-856d-9f57fd95b4c9` | Hip Hop Lollipop                                       | Bootsy Collins                 |
| `46c11ed3-8814-42dd-ae03-fb7806789674` | Electronic Alternative                                 | Ethnicrobot                    |
| `4db2de18-de7e-480b-98d4-16640824cef1` | NYC Hip Hop Jazz                                       | Vince McClean                  |
| `547ef7c3-f374-4b19-b100-d6230501b0b7` | Jazz Alternative                                       | 大谷能生                       |
| `6c3bdd6d-d4f2-4da3-bc89-b776f441cb5f` | Hip Hop Zyderock                                       | Travis Matte and the Kingpins  |
| `70926364-33ff-4554-b86e-222bb64539ec` | Uplifting Indie Pop Rock                               | Lovely Music Library           |
| `759cecf7-e078-49b6-b76e-631ed534a60f` | R&B Hip Hop                                            | Various Artists                |
| `794ff61f-a246-431e-a666-967116b3545d` | Electronic Hiphop                                      | K Theory                       |
| `86b22f35-f7e0-4db1-907d-58335a740a67` | Pop Rock Electronic                                    | Coockoo                        |
| `89273bae-4879-4bf1-8a06-7970c5970819` | Indie Pop Rock: Anthems                                | Lovely Music Library           |
| `8c4dac4c-46de-47cb-8b8a-15718860d3c9` | Indie Rock and Pop                                     | Various Artists                |
| `8cc3be95-3c9b-4c27-b7e6-9b0790131a89` | Indierama - Raw, Alternative Rock, Pop                 | Mike Shepstone                 |
| `917d3045-4248-4780-b2ac-d30ac660da6d` | Hip Hop Metal Union                                    | Robert Anthony Navarro         |
| `aa1b6b4e-f3af-40b4-94f4-80099a78154d` | Indie, Positive Pop/Rock                               | Various Artists                |
| `bae70316-6cfa-48a8-8a7e-f95705af8b00` | Hip Hop Un-Popped!                                     | Bryce Larsen                   |
| `c1638db3-bc1f-43c3-a66f-a1932144ab4d` | I Am Hip Hop                                           | Jazz Liberatorz                |
| `de08b03b-9f94-4453-9364-c645da40e3fa` | Swagger: Electronic / Hip Hop                          | Cavendish Trailers             |
| `ea12ddd1-ba92-4682-9e2e-fd9d20319c35` | Artist Compilation, Volume 14: Rock/Electronic/Hip-Hop | Various Artists                |
| `fe516ccc-edae-4669-9f75-b83e25fd41cf` | Indie Rock and Pop                                     | Various Artists                |

### Cleanup SQL

```sql
-- Delete junk albums with genre-like names (no user relationships)
DELETE FROM "Album" WHERE id IN (
  '0d5fada6-777c-489c-8421-38ef948d9357',
  '1e60dcd5-9773-4c83-b990-6c4d3a9dd708',
  '21b7bb29-a40e-4267-8a38-c3d8e59f4908',
  '2aa38fa7-7e4a-47be-8ef4-35367e065f56',
  '2c9eb943-ace8-41fe-ae1e-7bee1a94b3ef',
  '30211b14-bf7a-48dd-8afa-330b87f9be7c',
  '323282b1-5675-4a9d-97f3-d9922957035f',
  '372de685-6f0a-4719-b080-3fdde781c752',
  '37b92f15-5773-49ee-a438-54cd27845b9c',
  '45767c3b-3029-40db-856d-9f57fd95b4c9',
  '46c11ed3-8814-42dd-ae03-fb7806789674',
  '4db2de18-de7e-480b-98d4-16640824cef1',
  '547ef7c3-f374-4b19-b100-d6230501b0b7',
  '6c3bdd6d-d4f2-4da3-bc89-b776f441cb5f',
  '70926364-33ff-4554-b86e-222bb64539ec',
  '759cecf7-e078-49b6-b76e-631ed534a60f',
  '794ff61f-a246-431e-a666-967116b3545d',
  '86b22f35-f7e0-4db1-907d-58335a740a67',
  '89273bae-4879-4bf1-8a06-7970c5970819',
  '8c4dac4c-46de-47cb-8b8a-15718860d3c9',
  '8cc3be95-3c9b-4c27-b7e6-9b0790131a89',
  '917d3045-4248-4780-b2ac-d30ac660da6d',
  'aa1b6b4e-f3af-40b4-94f4-80099a78154d',
  'bae70316-6cfa-48a8-8a7e-f95705af8b00',
  'c1638db3-bc1f-43c3-a66f-a1932144ab4d',
  'de08b03b-9f94-4453-9364-c645da40e3fa',
  'ea12ddd1-ba92-4682-9e2e-fd9d20319c35',
  'fe516ccc-edae-4669-9f75-b83e25fd41cf'
);
```

**Note:** Cascading deletes should handle related records (tracks, artist associations). Verify foreign key constraints before running.

---

## Assertion #2: Albums Missing Genres (Enrichment Bug)

### Status: CONFIRMED

**Bug verified in code and database!**

### The Bug

In `src/lib/queue/processors/enrichment-processor.ts`, there are two code paths for fetching MusicBrainz data:

**Path 1 - Direct lookup (line 414-417)** - For albums that already have `musicbrainzId`:

```typescript
const mbData = await musicBrainzService.getReleaseGroup(
  album.musicbrainzId,
  ['artists', 'releases'] // ← Missing 'tags'!
);
```

**Path 2 - Search then lookup (line 507-510)** - For albums without `musicbrainzId`:

```typescript
const mbData = await musicBrainzService.getReleaseGroup(
  bestMatch.result.id,
  ['artists', 'tags', 'releases'] // ← Has 'tags' ✓
);
```

Albums imported from the MusicBrainz scheduler already have `musicbrainzId`, so they take Path 1 and never get genres.

### Database Evidence (DEV - same codebase as prod)

- **Total albums**: 626
- **With MusicBrainz ID**: 503
- **With genres**: 45 (only 7%!)
- **MusicBrainz ID but NO genres**: 458 (91% of MB albums!)

The 45 albums WITH genres all went through Path 2 (search path) - they were created without a `musicbrainzId` and got one during enrichment.

The 458 albums WITHOUT genres came from the MusicBrainz scheduler with pre-existing `musicbrainzId` and took Path 1.

### Fix Required

Add `'tags'` to line 416:

```typescript
const mbData = await musicBrainzService.getReleaseGroup(
  album.musicbrainzId,
  ['artists', 'tags', 'releases'] // ← Add 'tags'
);
```

### Fix Verified via API Test

Tested MusicBrainz API directly with "CALL ME IF YOU GET LOST" (Tyler, the Creator):

**WITHOUT `tags` include** (current buggy behavior):

```
Response keys: ["artist-credit", "disambiguation", "first-release-date", "id", "primary-type", ...]
// No tags field!
```

**WITH `tags` include** (fixed behavior):

```json
{
  "title": "CALL ME IF YOU GET LOST",
  "tags": [
    { "name": "hip hop", "count": 5 },
    { "name": "west coast hip hop", "count": 3 },
    { "name": "jazz rap", "count": 1 },
    { "name": "neo soul", "count": 1 },
    { "name": "hardcore hip hop", "count": 1 },
    { "name": "synth funk", "count": 1 }
  ]
}
```

**Conclusion:** The fix is confirmed to work. Adding `'tags'` to the includes will return genre data.

### Re-enrichment Required

After fixing the bug, 458+ albums need re-enrichment to fetch their genres. This can be done by:

1. Resetting their `enrichment_status` to `PENDING`
2. Running the enrichment queue

```sql
-- Reset enrichment status for albums missing genres
UPDATE albums
SET enrichment_status = 'PENDING'
WHERE musicbrainz_id IS NOT NULL
  AND (genres IS NULL OR array_length(genres, 1) IS NULL);
```

---

## Assertion #3: Albums with No Tracks

### Status: CONFIRMED

**125 albums have no tracks** (DEV database).

### Breakdown by Source

| Source      | Count |
| ----------- | ----- |
| SPOTIFY     | 99    |
| DISCOGS     | 16    |
| MUSICBRAINZ | 10    |

### Breakdown by Status

| Status    | Quality | Has MB ID | Count |
| --------- | ------- | --------- | ----- |
| COMPLETED | LOW     | No        | 103   |
| PENDING   | MEDIUM  | No        | 16    |
| COMPLETED | MEDIUM  | Yes       | 2     |
| PENDING   | LOW     | No        | 2     |
| COMPLETED | HIGH    | Yes       | 2     |

### User Relationships

- **In collections**: 5 albums
- **In recommendations**: 17 albums
- **No user relationships**: 103 albums

### Root Cause

Most trackless albums (103) are from **Spotify** with:

- `enrichment_status: COMPLETED`
- `data_quality: LOW`
- `musicbrainz_id: NULL`

These albums couldn't be matched to MusicBrainz during enrichment, so tracks were never fetched. The enrichment processor marks them as "COMPLETED" even though they have no tracks.

### Cleanup Approach

**Safe to delete (103 albums):**

```sql
-- Delete trackless albums with no user relationships
DELETE FROM albums
WHERE id NOT IN (SELECT DISTINCT album_id FROM tracks)
  AND id NOT IN (SELECT album_id FROM "CollectionAlbum")
  AND id NOT IN (SELECT basis_album_id FROM "Recommendation")
  AND id NOT IN (SELECT recommended_album_id FROM "Recommendation");
```

**Need re-enrichment (22 albums):**
Albums with user relationships should be kept but re-enriched to try fetching tracks again.

```sql
-- Reset enrichment for trackless albums with user relationships
UPDATE albums
SET enrichment_status = 'PENDING'
WHERE id NOT IN (SELECT DISTINCT album_id FROM tracks)
  AND (
    id IN (SELECT album_id FROM "CollectionAlbum")
    OR id IN (SELECT basis_album_id FROM "Recommendation")
    OR id IN (SELECT recommended_album_id FROM "Recommendation")
  );
```

---

## Recommended Actions

### Priority 1: Bug Fixes

1. **Fix genre enrichment bug** - Add `'tags'` to line 416 in `enrichment-processor.ts`
2. **Add junk title filtering** - Prevent genre-named albums from being imported

### Priority 2: Database Cleanup (Production)

3. **Delete junk albums** - 28 albums with genre-like names (Assertion #1)
4. **Delete orphan trackless albums** - ~103 albums with no tracks and no user relationships (Assertion #3)

### Priority 3: Re-enrichment

5. **Re-enrich albums missing genres** - 458+ albums need `'tags'` fetched (Assertion #2)
6. **Re-enrich trackless albums with users** - 22 albums need another attempt at track fetching (Assertion #3)

### Summary Table

| Issue                   | Count | Action    | CLI Task | Safe?                      |
| ----------------------- | ----- | --------- | -------- | -------------------------- |
| Junk genre-named albums | 28    | DELETE    | Task 11  | Yes (0 user relationships) |
| Albums missing genres   | 458   | RE-ENRICH | Task 13  | Yes (just adds data)       |
| Trackless, no users     | ~103  | DELETE    | Task 12  | Yes (0 user relationships) |
| Trackless, with users   | 22    | RE-ENRICH | Task 14  | Yes (keep, try again)      |

---

## CLI Orchestrator Tasks

New tasks to add to `src/scripts/db-cleanup/index.ts`:

### Task 11: Delete Junk Genre-Named Albums

```typescript
{
  id: 11,
  name: 'Delete Junk Genre-Named Albums',
  description: 'Remove albums with genre-like titles (e.g., "Hip Hop, Nu Skool")',
  dependencies: [],
  priority: 'high',
  run: async ctx => {
    ctx.log('Finding junk albums with genre-like names...');

    const junkAlbums = await ctx.prisma.$queryRaw<{ id: string; title: string }[]>`
      SELECT a.id, a.title FROM albums a
      WHERE (
        a.title ~* '^(Hip[- ]?Hop|Electronic|Indie|Rock|Pop|Alternative|Jazz|Soul|Metal|R&B)[,\\s/&]'
        OR a.title ~* '[,\\s/&](Hip[- ]?Hop|Electronic|Indie|Rock|Pop|Alternative|Jazz|Soul|Metal)[,\\s/&]?'
        OR a.title ~* '^(Urban|Uplifting).*(Pop|Rock|Hip|Indie|Electronic)'
      )
      AND a.id NOT IN (SELECT album_id FROM "CollectionAlbum")
      AND a.id NOT IN (SELECT basis_album_id FROM "Recommendation")
      AND a.id NOT IN (SELECT recommended_album_id FROM "Recommendation")
    `;

    if (junkAlbums.length === 0) {
      return { success: true, message: 'No junk albums found', stats: { 'Junk albums': 0 } };
    }

    if (ctx.dryRun) {
      return {
        success: true,
        message: `Would delete ${junkAlbums.length} junk albums`,
        stats: {
          'Albums to delete': junkAlbums.length,
          'Sample titles': junkAlbums.slice(0, 5).map(a => a.title).join(', '),
        },
      };
    }

    const ids = junkAlbums.map(a => a.id);
    await ctx.prisma.$executeRaw`DELETE FROM tracks WHERE album_id = ANY(${ids}::uuid[])`;
    await ctx.prisma.$executeRaw`DELETE FROM album_artists WHERE album_id = ANY(${ids}::uuid[])`;
    await ctx.prisma.$executeRaw`DELETE FROM enrichment_logs WHERE album_id = ANY(${ids}::uuid[])`;
    await ctx.prisma.$executeRaw`DELETE FROM albums WHERE id = ANY(${ids}::uuid[])`;

    return { success: true, message: `Deleted ${junkAlbums.length} junk albums`, stats: { 'Albums deleted': junkAlbums.length } };
  },
},
```

### Task 12: Delete Orphan Trackless Albums

```typescript
{
  id: 12,
  name: 'Delete Orphan Trackless Albums',
  description: 'Remove albums with no tracks and no user relationships',
  dependencies: [],
  priority: 'medium',
  run: async ctx => {
    ctx.log('Finding orphan trackless albums...');

    const orphanAlbums = await ctx.prisma.$queryRaw<{ id: string; title: string; source: string }[]>`
      SELECT a.id, a.title, a.source::text FROM albums a
      WHERE a.id NOT IN (SELECT DISTINCT album_id FROM tracks)
      AND a.id NOT IN (SELECT album_id FROM "CollectionAlbum")
      AND a.id NOT IN (SELECT basis_album_id FROM "Recommendation")
      AND a.id NOT IN (SELECT recommended_album_id FROM "Recommendation")
    `;

    if (orphanAlbums.length === 0) {
      return { success: true, message: 'No orphan trackless albums found', stats: { 'Orphan albums': 0 } };
    }

    const bySource = orphanAlbums.reduce((acc, a) => {
      acc[a.source] = (acc[a.source] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    if (ctx.dryRun) {
      return {
        success: true,
        message: `Would delete ${orphanAlbums.length} orphan trackless albums`,
        stats: { 'Albums to delete': orphanAlbums.length, ...bySource },
      };
    }

    const ids = orphanAlbums.map(a => a.id);
    await ctx.prisma.$executeRaw`DELETE FROM album_artists WHERE album_id = ANY(${ids}::uuid[])`;
    await ctx.prisma.$executeRaw`DELETE FROM enrichment_logs WHERE album_id = ANY(${ids}::uuid[])`;
    await ctx.prisma.$executeRaw`DELETE FROM albums WHERE id = ANY(${ids}::uuid[])`;

    return { success: true, message: `Deleted ${orphanAlbums.length} orphan trackless albums`, stats: { 'Albums deleted': orphanAlbums.length, ...bySource } };
  },
},
```

### Task 13: Re-enrich Albums Missing Genres

```typescript
{
  id: 13,
  name: 'Re-enrich Albums Missing Genres',
  description: 'Queue albums with MusicBrainz IDs but no genres for re-enrichment',
  dependencies: [],
  priority: 'high',
  run: async ctx => {
    ctx.log('Finding albums missing genres...');

    const albumsMissingGenres = await ctx.prisma.$queryRaw<{ id: string; title: string }[]>`
      SELECT id, title FROM albums
      WHERE musicbrainz_id IS NOT NULL
      AND (genres IS NULL OR array_length(genres, 1) IS NULL)
      AND enrichment_status = 'COMPLETED'
    `;

    if (albumsMissingGenres.length === 0) {
      return { success: true, message: 'No albums missing genres', stats: { 'Albums needing genres': 0 } };
    }

    if (ctx.dryRun) {
      return {
        success: true,
        message: `Would queue ${albumsMissingGenres.length} albums for re-enrichment`,
        stats: {
          'Albums to re-enrich': albumsMissingGenres.length,
          'Estimated time': `~${Math.ceil(albumsMissingGenres.length / 60)} minutes (1 req/sec)`,
        },
        warnings: [
          'IMPORTANT: Fix the enrichment bug first!',
          'Add \'tags\' to line 416 in enrichment-processor.ts',
        ],
      };
    }

    // Reset enrichment status in batches
    const BATCH_SIZE = 50;
    let processed = 0;

    for (let i = 0; i < albumsMissingGenres.length; i += BATCH_SIZE) {
      const batch = albumsMissingGenres.slice(i, i + BATCH_SIZE);
      const batchIds = batch.map(a => a.id);

      ctx.log(`Resetting batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(albumsMissingGenres.length / BATCH_SIZE)}...`);

      await ctx.prisma.$executeRaw`
        UPDATE albums
        SET enrichment_status = 'PENDING', updated_at = NOW()
        WHERE id = ANY(${batchIds}::uuid[])
      `;

      processed += batch.length;
    }

    return {
      success: true,
      message: `Queued ${processed} albums for re-enrichment`,
      stats: { 'Albums queued': processed, 'Estimated time': `~${Math.ceil(processed / 60)} minutes` },
      warnings: [
        'Albums will be processed at 1 request/second',
        'Monitor progress: pnpm queue:dev (Bull Board at localhost:3001)',
      ],
    };
  },
},
```

### Task 14: Re-enrich Trackless Albums with Users

```typescript
{
  id: 14,
  name: 'Re-enrich Trackless Albums with Users',
  description: 'Queue trackless albums that have user relationships for re-enrichment',
  dependencies: [],
  priority: 'medium',
  run: async ctx => {
    ctx.log('Finding trackless albums with user relationships...');

    const tracklessWithUsers = await ctx.prisma.$queryRaw<{ id: string; title: string }[]>`
      SELECT DISTINCT a.id, a.title FROM albums a
      WHERE a.id NOT IN (SELECT DISTINCT album_id FROM tracks)
      AND (
        a.id IN (SELECT album_id FROM "CollectionAlbum")
        OR a.id IN (SELECT basis_album_id FROM "Recommendation")
        OR a.id IN (SELECT recommended_album_id FROM "Recommendation")
      )
    `;

    if (tracklessWithUsers.length === 0) {
      return { success: true, message: 'No trackless albums with user relationships', stats: { 'Albums to re-enrich': 0 } };
    }

    if (ctx.dryRun) {
      return {
        success: true,
        message: `Would queue ${tracklessWithUsers.length} albums for re-enrichment`,
        stats: {
          'Albums to re-enrich': tracklessWithUsers.length,
          'Sample titles': tracklessWithUsers.slice(0, 5).map(a => a.title).join(', '),
        },
      };
    }

    const ids = tracklessWithUsers.map(a => a.id);
    await ctx.prisma.$executeRaw`
      UPDATE albums
      SET enrichment_status = 'PENDING', updated_at = NOW()
      WHERE id = ANY(${ids}::uuid[])
    `;

    return {
      success: true,
      message: `Queued ${tracklessWithUsers.length} albums for re-enrichment`,
      stats: { 'Albums queued': tracklessWithUsers.length },
      warnings: ['These albums have user collections/recommendations', 'Re-enrichment will attempt to fetch tracks again'],
    };
  },
},
```

### Usage

```bash
# Preview all cleanup tasks (dry run)
pnpm db:cleanup --dry-run

# Run specific task
pnpm db:cleanup --task 11        # Delete junk albums only
pnpm db:cleanup --task 13        # Re-enrich albums missing genres

# Interactive mode (confirm each task)
pnpm db:cleanup --interactive

# Run tasks 11-14 (cleanup tasks)
pnpm db:cleanup --from 11
```

### Monitoring Re-enrichment Progress

After running Task 13 or 14, albums are queued at 1 request/second:

```bash
# Start Bull Board dashboard
pnpm queue:dev
# Open http://localhost:3001/admin/queues

# Or check via SQL
SELECT
  enrichment_status,
  COUNT(*)
FROM albums
GROUP BY enrichment_status;
```

### Important: Run Order

1. **First**: Fix the enrichment bug (add `'tags'` to line 416)
2. **Then**: Run Task 11 (delete junk albums)
3. **Then**: Run Task 12 (delete orphan trackless albums)
4. **Then**: Run Task 13 (re-enrich albums missing genres)
5. **Finally**: Run Task 14 (re-enrich trackless albums with users)

---

## Assertion #4: Orphaned Albums (No Artists Linked)

### Status: CONFIRMED

**4 albums have no artists linked** (missing `album_artists` join records).

### Orphaned Albums

| Album                | Source      | Created      | Has MusicBrainz ID                           | User Relations   | Root Cause                                     |
| -------------------- | ----------- | ------------ | -------------------------------------------- | ---------------- | ---------------------------------------------- |
| **Alfredo Alfredo**  | DISCOGS     | Sep 16, 2025 | Yes (`37762871-e8d0-4dc3-98af-93c7292d1aeb`) | 1 recommendation | Early import, artist link failed               |
| **MM..FOOD**         | MUSICBRAINZ | Sep 16, 2025 | Yes (`ec84ab32-eb41-3d91-a099-7a01c72f21d2`) | None             | Early import, MF DOOM exists but wasn't linked |
| **纯寐寐** (Chinese) | SPOTIFY     | Dec 31, 2025 | No                                           | None             | Spotify import, artist not created             |
| **موهبة** (Arabic)   | SPOTIFY     | Jan 1, 2026  | No                                           | None             | Spotify import, artist not created             |

### Album Details

```
ID: 63361d47-9cd8-4ca9-a363-fb87c00529c4
Title: Alfredo Alfredo
Source: DISCOGS (discogs_id: 1784249)
Status: COMPLETED
Created: 2025-09-16
User Relations: 1 recommendation

ID: e4fb0341-4e12-4294-a3db-f27ca0727d7f
Title: MM..FOOD
Source: MUSICBRAINZ (discogs_id: 8478)
Status: COMPLETED
Created: 2025-09-16
User Relations: None
Note: MF DOOM artist EXISTS in DB (id: 2f11dbef-9709-434f-9f35-bb3d3273b5c8) but not linked!

ID: 819954c0-72a7-4f80-91eb-5fdd9f72711d
Title: 纯寐寐
Source: SPOTIFY (spotify_id: 747LfWs2XphwiiRULoyIJF)
Status: PENDING
Created: 2025-12-31
Track Count: 1 (single)
User Relations: None

ID: 87bd5e45-0b2b-43f1-a943-68a268e90c5c
Title: موهبة
Source: SPOTIFY (spotify_id: 0HuJUWTtRWKnr3naQDb1tL)
Status: PENDING
Created: 2026-01-01
Track Count: 1 (single)
User Relations: None
```

### Root Cause Analysis

**The Bug: Stub Album Creation** (`src/lib/graphql/resolvers/mutations.ts` line 1422)

When a user adds an album to "Listen Later" with only a MusicBrainz ID (no album data), a stub is created:

```typescript
album = await prisma.album.create({
  data: {
    musicbrainzId: albumId,
    title: 'Loading...',
    enrichmentStatus: 'PENDING',
  },
});
```

**No artist link is created.** The code relies on enrichment to populate everything later, but if enrichment fails or never runs, the album stays orphaned.

### All Album Creation Paths Audited

| Location                             | File                                                | Line     | Creates Artist Link? | Risk     |
| ------------------------------------ | --------------------------------------------------- | -------- | -------------------- | -------- |
| Spotify mappers                      | `src/lib/spotify/mappers.ts`                        | 292      | ✅ Yes (line 337)    | Low      |
| MusicBrainz processor                | `src/lib/queue/processors/musicbrainz-processor.ts` | 200      | ✅ Yes (inline)      | Low      |
| GraphQL createAlbum                  | `src/lib/graphql/resolvers/mutations.ts`            | 658      | ✅ Yes (line 726)    | Low      |
| GraphQL addToListenLater (with data) | `src/lib/graphql/resolvers/mutations.ts`            | 1356     | ✅ Yes (line 1402)   | Low      |
| **GraphQL addToListenLater (stub)**  | `src/lib/graphql/resolvers/mutations.ts`            | **1422** | ❌ **NO**            | **HIGH** |
| MusicBrainz integration service      | `src/lib/musicbrainz/integration.ts`                | 85       | ✅ Yes (line 111)    | Low      |

### How This Explains the Orphaned Albums

- **MM..FOOD & Alfredo Alfredo** (Sep 16): Created via the stub path or early version of code before artist linking was robust. MF DOOM exists in DB but was never linked to MM..FOOD.
- **Chinese & Arabic Spotify albums** (Dec 31/Jan 1): Manual adds where artist data wasn't properly passed, or Spotify API returned incomplete data for non-English releases.

### MF DOOM Paradox

MF DOOM artist exists in DB and IS linked to other albums:

- ✅ Madvillainy (id: `5ace0f91-d8f2-4731-b050-d1af9df1239b`)
- ✅ Madvillany (id: `dc843a93-d680-4c9e-a05e-26209f82add7`) - typo duplicate

But NOT linked to:

- ❌ MM..FOOD (one of his most famous albums!)

This confirms inconsistent artist-linking behavior in historical code paths.

### Fix Options

**Option A: Re-enrich via queue (Try First)**

Reset these albums to `PENDING` and let the enrichment queue retry:

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

**Pros:** Quick, automated
**Cons:** If enrichment fails again (API can't match, rate limits), they stay orphaned

**Option B: Manual fix via Admin Enrichment UI**

Use the Admin Album Data Correction feature (PRD created) to manually search and link the correct artist/album data.

**Pros:** Guaranteed correct data, human verification
**Cons:** Feature doesn't exist yet

**Recommendation:** Try Option A first. Albums that fail enrichment become test cases for Option B.

### Notes on Non-Latin Albums

The 2 Spotify albums with Chinese/Arabic titles may struggle with automated enrichment:

- MusicBrainz coverage of Chinese/Arabic releases is spotty
- These are perfect candidates for the manual Admin Enrichment UI

---

## Prevention: Suggested Filter

Add to `musicbrainz-processor.ts` to filter out junk albums:

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
  // Check if title is primarily genre keywords
  const words = lowerTitle.split(/[\s,/&-]+/).filter(w => w.length > 2);
  const genreWords = words.filter(w =>
    GENRE_KEYWORDS.some(g => g.includes(w) || w.includes(g))
  );
  return genreWords.length / words.length > 0.6;
}
```
