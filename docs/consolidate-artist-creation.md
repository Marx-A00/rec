# PRD: Consolidate Artist Creation into a Single Shared Helper

**Status:** Draft
**Created:** 2026-02-13
**Relates to:** Task 7 (Artist Image Pipeline), general tech debt reduction

---

## Problem Statement

There are **13 production code paths** that create artist records, spread across 6 files. Each path implements its own dedup logic, field-setting, enrichment queueing, and logging — with subtle and inconsistent differences between them. This duplication has already produced real bugs and makes any change to artist creation logic require touching many files.

### Current Artist Creation Sites

**`src/lib/graphql/resolvers/mutations.ts`** (7 paths)
- `addArtist` (~line 330) — The "gold standard" with full dedup, enrichment, priorityManager, and LlamaLog
- `createTrack` (~line 540) — Name-only dedup, queue-check enrichment, no logging
- `addAlbum` (~line 860) — Name-only dedup, queue-check enrichment, no logging
- `addAlbumToCollectionWithCreate` (~line 1760) — Name-only dedup inside tx, deferred enrichment
- `addToListenLater` (~line 2000) — Name-only dedup, queue-check enrichment, no logging
- `createRecommendation` (~line 2450) — Name-only dedup inside tx, deferred enrichment
- `manualCorrectionApply` (~line 3900) — Name-only dedup inside tx, **no enrichment at all**, **invalid enum value**

**`src/lib/queue/processors/musicbrainz-processor.ts`** (1 path)
- Artist creation during MusicBrainz sync — musicbrainzId dedup, inline Spotify image fetch

**`src/lib/queue/processors/enrichment-processor.ts`** (1 path)
- Featured artist creation during track enrichment — musicbrainzId dedup, inline Spotify image fetch, LlamaLog

**`src/lib/musicbrainz/integration.ts`** (2 paths)
- `findOrCreateArtist` — musicbrainzId + name dedup, inline Spotify image fetch, no logging
- `createAlbumWithArtists` — musicbrainzId + name dedup inside tx, no enrichment, no logging

**`src/lib/spotify/mappers.ts`** (1 path)
- `findOrCreateArtist` — spotifyId + name dedup, no enrichment, no logging

**`src/lib/correction/apply/apply-service.ts`** (1 path)
- Correction apply — discogsId or musicbrainzId dedup inside tx, no enrichment

---

## Existing Bugs Found

1. **Invalid enum value**: `manualCorrectionApply` uses `source: 'MANUAL'` but `ContentSource` enum has no `MANUAL` value. Should be `USER_SUBMITTED`.

2. **Missing enrichment**: `manualCorrectionApply` creates artists with no enrichment queueing at all — newly created artists from corrections never get images or metadata.

3. **Weak dedup in mutations**: Most mutation paths dedup only by `name`, missing `musicbrainzId`/`spotifyId` checks. This means if an artist already exists with a matching external ID but a slightly different name, a duplicate gets created.

4. **No logging in most paths**: Only `addArtist` and `enrichment-processor` write LlamaLog entries for artist creation. All other paths are invisible to the provenance system.

5. **No enrichment in Spotify mapper**: Artists created during Spotify sync get no enrichment queueing, so they only get images if the Spotify sync itself provided one in the `artistImageMap`.

6. **No enrichment in integration service**: `createAlbumWithArtists` creates artists with no Spotify image fetch and no enrichment queueing.

---

## Proposed Solution

Create a single shared `findOrCreateArtist()` function in a new `src/lib/artists/` directory. All 13 creation sites will call this function instead of implementing inline logic.

### Core Design

**Location:** `src/lib/artists/find-or-create.ts`

**Unified dedup order** (first match wins):
1. `musicbrainzId` (unique index)
2. `spotifyId` (unique index)
3. `discogsId` (via findFirst)
4. `name` (case-insensitive, via findFirst)

**External ID backfill:** When an existing artist is found by name but the caller provided an external ID the artist doesn't have, the ID is backfilled onto the existing record. This matches the current Spotify mapper behavior and prevents future duplicates.

**Three enrichment strategies:**
- `'queue-check'` — Queue a `CHECK_ARTIST_ENRICHMENT` BullMQ job (used by mutations)
- `'inline-fetch'` — Call `tryFetchSpotifyArtistImage` synchronously + queue `CACHE_ARTIST_IMAGE` (used by background workers)
- `'none'` — Skip enrichment entirely (used by corrections, or deferred for transactional paths)

**Transaction awareness:** An explicit `insideTransaction` flag tells the helper not to run side effects (enrichment, logging). Callers use a separate `runPostCreateSideEffects()` function after the transaction commits.

**Optional LlamaLog logging:** Configured via a `logging` option object. If omitted, no log entry is created. This lets us gradually add logging to paths that currently have none.

**Error isolation:** Enrichment and logging failures are caught and logged as warnings. They never crash the calling mutation or processor.

### Function Signature (simplified)

```typescript
findOrCreateArtist(options: {
  db: PrismaClient | TransactionClient;
  identity: { name: string; musicbrainzId?: string; spotifyId?: string; discogsId?: string };
  fields?: { imageUrl?: string; source?: ContentSource; dataQuality?: DataQuality; ... };
  enrichment?: 'queue-check' | 'inline-fetch' | 'none';
  queueCheckOptions?: { source, priority, priorityManager, ... };
  inlineFetchOptions?: { parentJobId };
  logging?: { operation, sources, parentJobId, rootJobId, userId, ... } | null;
  insideTransaction?: boolean;
  backfillExternalIds?: boolean;  // default: true
}): Promise<{ artist: Artist; created: boolean }>

runPostCreateSideEffects(artist: Artist, options: { enrichment, queueCheckOptions, logging, ... }): Promise<void>
```

### Return Value

```typescript
{ artist: Artist; created: boolean }
```

The `created` flag lets callers know whether they need to run post-create logic (e.g., connecting artist to album, logging).

---

## Migration Strategy

### Incremental, one-commit-per-site

Each creation site is migrated in its own commit. If a regression is found, it can be isolated to the exact commit and reverted without affecting other sites. No big-bang switchover.

### Migration order (risk-graduated)

1. **Create the helper** (zero risk — no callers yet)
2. **`addArtist`** (gold standard, highest confidence, simplest 1:1 mapping)
3. **`createTrack`, `addAlbum`** (identical simple patterns)
4. **`addToListenLater`** (same pattern, minor differences)
5. **`addAlbumToCollectionWithCreate`, `createRecommendation`** (transactional — deferred side effects)
6. **`manualCorrectionApply`** (bug fixes bundled with migration)
7. **Background processors** (musicbrainz-processor, enrichment-processor — more critical paths)
8. **Integration service** (2 sub-paths)
9. **Spotify mapper** (rename existing function)
10. **Correction apply-service** (Discogs + MusicBrainz sub-paths)
11. **Cleanup** (remove debug logs, dead code, update CLAUDE.md)

### Behavior parity verification

For each migration, verify:
- Same artist is found (not duplicated) when the same name/ID is provided
- Created artist has identical fields to the old code path
- Same enrichment job type is queued with same priority/source
- Same LlamaLog operation/sources/parent chain (or explicitly documented addition)

---

## What Changes for Each Call Site

### Non-transactional mutations (addArtist, createTrack, addAlbum, addToListenLater)

**Before:** ~30-60 lines of inline findFirst + create + setImmediate enrichment queueing
**After:** ~10-20 lines calling `findOrCreateArtist()` with appropriate options

### Transactional mutations (addAlbumToCollectionWithCreate, createRecommendation, manualCorrectionApply)

**Before:** Inline create inside `$transaction`, enrichment queued after tx via `setImmediate`
**After:** `findOrCreateArtist({ insideTransaction: true, enrichment: 'none' })` inside tx, then `runPostCreateSideEffects()` after tx commits

### Background processors (musicbrainz-processor, enrichment-processor)

**Before:** Inline dedup + create + `tryFetchSpotifyArtistImage` + `CACHE_ARTIST_IMAGE` queueing
**After:** `findOrCreateArtist({ enrichment: 'inline-fetch' })` — all inline fetch logic moves into the helper

### Integration service (findOrCreateArtist, createAlbumWithArtists)

**Before:** Method-level dedup + create + inline Spotify fetch (or nothing for tx path)
**After:** Delegates to shared helper, method becomes a thin wrapper

### Spotify mapper (findOrCreateArtist)

**Before:** spotifyId + name dedup, returns artist ID string
**After:** `findOrCreateArtist({ enrichment: 'none' })`, caller uses `result.artist.id`

### Correction apply-service

**Before:** discogsId or musicbrainzId dedup with upsert semantics
**After:** `findOrCreateArtist()` + explicit update for the "found but needs name update" case

---

## Files Affected

**New files:**
- `src/lib/artists/types.ts`
- `src/lib/artists/find-or-create.ts`
- `src/lib/artists/index.ts`

**Modified files:**
- `src/lib/queue/jobs.ts` (add `'manual_add'` to source union)
- `src/lib/graphql/resolvers/mutations.ts` (7 sites)
- `src/lib/queue/processors/musicbrainz-processor.ts` (1 site)
- `src/lib/queue/processors/enrichment-processor.ts` (1 site)
- `src/lib/musicbrainz/integration.ts` (2 sites)
- `src/lib/spotify/mappers.ts` (1 site)
- `src/lib/correction/apply/apply-service.ts` (1 site)

---

## Risk Mitigation

- **Incremental commits**: Each site migrated independently, revertable in isolation
- **Transaction safety**: Side effects always run after transaction commits via explicit API
- **Error isolation**: Enrichment/logging failures never crash callers
- **Bug fixes separated**: `manualCorrectionApply` fixes are in their own commit with clear messaging
- **No behavior changes by default**: Each migration preserves exact current behavior unless explicitly documented (e.g., adding missing enrichment)

---

## Open Decisions

1. **Add LlamaLog to paths that currently lack it?** The helper makes it trivial. Recommendation: add it for consistency, document in each commit.

2. **Add enrichment to Spotify mapper?** Currently has none. Recommendation: keep as-is during migration, add in follow-up.

3. **Expand `CheckArtistEnrichmentJobData` source union?** Need to add `'manual_add'` for the `addArtist` migration. May want `'musicbrainz_sync'` later for worker migrations.

---

## Verification Strategy

The shared helper will include a built-in `[ARTIST-HELPER]` log line (chalk magenta, same style as the Tier debug logs) that fires on every create and every find. After each migration step, we trigger the relevant user action and confirm the log appears in the terminal.

### Built-in helper log

The `findOrCreateArtist()` function itself will log on every call:

```
[ARTIST-HELPER] CREATED "Artist Name" via <caller> (enrichment: queue-check)
[ARTIST-HELPER] FOUND "Artist Name" via <caller> (dedup: spotifyId)
```

The `via <caller>` comes from a required `caller` string option (e.g., `'addArtist'`, `'createTrack'`, `'musicbrainz-processor'`). This tells us exactly which code path hit the helper, so we can confirm each migration is wired up correctly.

### Step-by-step verification

**After Step 1 (helper created):** `pnpm type-check` passes. No runtime test needed — no callers yet.

**After Step 3 (addArtist migrated):**
- Go to the UI, manually add an artist
- Confirm `[ARTIST-HELPER] CREATED "..." via addArtist` (or `FOUND` if artist already exists)
- Confirm `CHECK_ARTIST_ENRICHMENT` job appears in Bull Board

**After Step 4 (createTrack, addAlbum migrated):**
- Add an album with a new artist via "Add Album" flow
- Confirm `[ARTIST-HELPER] CREATED "..." via addAlbum`
- Confirm enrichment job queued

**After Step 5 (addToListenLater migrated):**
- Add an album to Listen Later that has a new artist
- Confirm `[ARTIST-HELPER] CREATED "..." via addToListenLater`

**After Step 6 (addAlbumToCollectionWithCreate, createRecommendation migrated):**
- Add an album to a collection (with a new artist name)
- Confirm `[ARTIST-HELPER] CREATED "..." via addAlbumToCollectionWithCreate`
- Create a recommendation with a new artist
- Confirm `[ARTIST-HELPER] CREATED "..." via createRecommendation`

**After Step 7 (manualCorrectionApply migrated):**
- Apply a correction that creates a new artist
- Confirm `[ARTIST-HELPER] CREATED "..." via manualCorrectionApply`
- Confirm enrichment job queued (this is the bug fix — previously had none)

**After Step 8 (background processors migrated):**
- Queue a small MusicBrainz sync (or wait for one to fire)
- Confirm `[ARTIST-HELPER] CREATED "..." via musicbrainz-processor`
- Add an album that triggers track enrichment with featured artists
- Confirm `[ARTIST-HELPER] CREATED "..." via enrichment-processor`

**After Step 9 (integration service migrated):**
- Trigger a MusicBrainz album lookup that creates new artists
- Confirm `[ARTIST-HELPER] CREATED "..." via integration-service`

**After Step 10 (Spotify mapper migrated):**
- Run a small Spotify sync
- Confirm `[ARTIST-HELPER] CREATED "..." via spotify-mapper`

**After Step 11 (correction apply-service migrated):**
- Apply a Discogs or MusicBrainz correction
- Confirm `[ARTIST-HELPER] CREATED "..." via correction-apply`

**After Step 12 (cleanup):**
- Remove the `[ARTIST-HELPER]` logs (or keep them permanently at debug level — TBD)
- Final `pnpm type-check` and `pnpm lint` pass

### Dedup verification

For any step, also test the "found" path: trigger the same action with an artist that already exists and confirm:
- `[ARTIST-HELPER] FOUND "..." via <caller> (dedup: name)` appears
- No duplicate artist record created in the database
- No enrichment job queued (since artist already exists)

---

## Success Criteria

- All 13 artist creation paths use the shared `findOrCreateArtist()` helper
- Zero duplicate artist creation regressions
- `manualCorrectionApply` bugs are fixed (valid enum, enrichment queueing added)
- Type-check passes (`pnpm type-check`)
- All existing functionality preserved (verified via `[ARTIST-HELPER]` logs after each step)
- Each migration step has a corresponding manual verification confirming the helper was hit
