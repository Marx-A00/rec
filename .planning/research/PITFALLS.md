# Pitfalls Research: Admin Data Correction Feature

**Domain:** Admin data correction/enrichment for music catalog
**Researched:** 2026-01-23
**Confidence:** HIGH (verified via MusicBrainz official docs, codebase analysis, community sources)

## Critical Pitfalls

### Pitfall 1: MusicBrainz ID Instability After Merges

**What goes wrong:**
Your local database stores a MusicBrainz ID (MBID) for an album or artist. Later, MusicBrainz community merges duplicate entities, causing your stored ID to redirect to a new canonical ID. Your application fetches data using the old ID, receives data with a NEW ID, and fails to match it to local records.

**Why it happens:**
MusicBrainz is a community-edited database where duplicate entries are regularly merged. When entities merge, one MBID becomes primary and others become redirects. The API returns data with the canonical ID, not the requested ID, without explicit notification that a redirect occurred.

**How to avoid:**

- Always compare returned MBID against requested MBID after every API call
- Implement an ID reconciliation system that detects and updates stale IDs
- Store a `lastVerifiedAt` timestamp and periodically re-validate IDs
- When displaying correction results, explicitly show both old and new IDs if they differ

**Warning signs:**

- API lookups succeed but local record matching fails
- Duplicate albums/artists appearing after data syncs
- "Album not found" errors for records that should exist
- MusicBrainz search returning different ID than what you stored

**Phase to address:**
Phase 1 (Foundation) - Build MBID verification into the core search/lookup flow from day one

---

### Pitfall 2: Using Wrong Prisma Client Inside Transactions

**What goes wrong:**
Inside a `prisma.$transaction()` callback, you accidentally use the global `prisma` client instead of the transaction-scoped `tx` parameter. The transaction opens but never commits, causing database connection leaks and data inconsistency.

**Why it happens:**
The transaction API passes a `tx` parameter that looks nearly identical to the global `prisma` client. IDE autocomplete often suggests the global `prisma` import. The code runs without immediate errors, making the bug invisible until connections exhaust or data is partially written.

**How to avoid:**

- Establish team convention: always name the parameter `tx` and use it exclusively inside the callback
- Add ESLint rule or code review checklist to flag `prisma.` usage inside `$transaction` callbacks
- Keep transaction scopes small and focused - easier to audit
- For data correction, structure the transaction as:
  ```typescript
  await prisma.$transaction(async (tx) => {
    // ALL database operations use tx, never prisma
    const album = await tx.album.update({ ... });
    await tx.albumArtist.deleteMany({ ... });
    await tx.albumArtist.createMany({ ... });
    return album;
  });
  ```

**Warning signs:**

- Database connections slowly exhausting over time
- "Transaction already closed" errors appearing sporadically
- Data inconsistencies where only partial updates occurred
- Prisma connection pool warnings in logs

**Phase to address:**
Phase 2 (Correction Logic) - Establish transaction patterns before implementing any mutation logic

---

### Pitfall 3: Rate Limit Bursts During Admin Search Sessions

**What goes wrong:**
Admin opens correction UI, searches for an album, doesn't find the right one, searches again, then searches for artist to narrow down. Each search triggers multiple MusicBrainz API calls (album search + artist lookup + release group details). Even with 1 req/sec rate limiting, an active admin session can queue dozens of jobs, creating a massive backlog that delays all operations.

**Why it happens:**
Rate limiting is per-API-call, not per-user-session. BullMQ queues jobs globally. A single admin doing "exploratory searching" competes with background enrichment jobs, new release syncs, and other admin operations. The queue becomes a bottleneck, making the UI feel unresponsive.

**How to avoid:**

- Implement job priority levels: admin interactive searches get HIGH priority, background syncs get LOW
- Add debouncing on the UI (don't search on every keystroke, wait 300ms after typing stops)
- Use "search-as-you-type" that returns cached/local results first, then enriches with API results
- Show queue position to admin: "Your search is #3 in queue, estimated 3 seconds"
- Consider BullMQ Pro groups for per-user rate limiting (if scaling to multiple admins)

**Warning signs:**

- Search results taking 5-10+ seconds to appear
- Admins complaining the correction UI "feels slow"
- Queue depth spiking during admin working hours
- Background sync jobs delayed by hours

**Phase to address:**
Phase 1 (Foundation) - Design the queue priority system before building any UI

---

### Pitfall 4: Orphaned Related Records After Album Correction

**What goes wrong:**
Admin corrects an album by replacing it with MusicBrainz data. The code updates album title, release date, and cover art. But the old `AlbumArtist` relationships remain pointing to the wrong artists, or tracks from the old release are now mismatched to the new release.

**Why it happens:**
Album correction is often thought of as "update the album record" when it should be "replace the album entity graph." Related tables (AlbumArtist, Track, potentially CollectionAlbum notes) need coordinated updates. Missing any relationship creates data inconsistency that's hard to detect.

**How to avoid:**

- Define correction as a complete entity replacement, not a partial update
- Use transactions that:
  1. Delete all AlbumArtist records for the album
  2. Update the Album record with new data
  3. Create new AlbumArtist records from MusicBrainz artist credits
  4. Update/replace Track records if track data changed
- Build a preview UI that shows ALL changes (album, artists, tracks) before applying
- Create an audit log entry capturing the before/after state for recovery

**Warning signs:**

- Album shows wrong artist after correction
- Track list doesn't match album metadata
- Search by artist returns albums that shouldn't be associated
- Collection statistics showing inconsistent counts

**Phase to address:**
Phase 2 (Correction Logic) - Design the entity replacement transaction as a single atomic unit

---

### Pitfall 5: No Rollback Path After Correction Applied

**What goes wrong:**
Admin applies a correction. It turns out they selected the wrong MusicBrainz release (wrong pressing, wrong country edition, live album instead of studio). There's no way to undo. The original data is lost. Admin has to manually reconstruct or delete and re-add the album.

**Why it happens:**
Rollback is treated as "nice to have" rather than core functionality. Original data is overwritten in place. No audit trail exists. Even if an admin realizes the mistake immediately, the only options are to make another correction or live with bad data.

**How to avoid:**

- Store the complete before-state in an audit log before any correction
- Implement a "Revert to previous version" action that restores from audit log
- Consider a "soft apply" pattern: correction creates a pending change record that becomes permanent only after admin confirmation
- Show a confirmation dialog with clear diff of what will change
- Keep audit log for 90+ days to allow delayed discovery of mistakes

**Warning signs:**

- Admins hesitant to use the correction feature ("what if I mess up?")
- Repeated corrections to the same album (hunting for the right version)
- Support requests to "undo" a correction
- Data quality declining despite correction feature existing

**Phase to address:**
Phase 3 (UI/Preview) - Build audit logging before implementing the apply action

---

### Pitfall 6: Comparison UI Shows Incomplete Data

**What goes wrong:**
Side-by-side comparison shows album title and artist name, but hides track count, release date, or country. Admin approves correction based on visible data. The hidden differences cause problems: wrong track count means discography stats are off, wrong release date affects sorting, etc.

**Why it happens:**
UI designers focus on the "primary" fields (title, artist, cover art) and treat other fields as secondary. But all fields matter for data integrity. The comparison becomes a false sense of security rather than a real validation tool.

**How to avoid:**

- Show ALL fields that will change, grouped by category (core, metadata, relationships)
- Highlight differences with color coding (red = removing, green = adding, yellow = changing)
- Include a "Show all fields" toggle for comprehensive review
- Show counts for relationship changes: "Will update 12 tracks, link 2 artists"
- Default to showing more data, not less - let admin choose to collapse sections

**Warning signs:**

- Corrections that "looked right" causing downstream issues
- Admins requesting "can you show X in the comparison?"
- Post-correction data audits finding unexpected changes
- User bug reports about albums having wrong metadata after admin activity

**Phase to address:**
Phase 3 (UI/Preview) - Design comprehensive comparison data structure before building UI

---

## Technical Debt Patterns

Shortcuts that seem reasonable but create long-term problems.

**Direct MBID Storage Without Verification:**

- Immediate Benefit: Simpler code, fewer API calls
- Long-term Cost: ID rot as MusicBrainz merges entities over months/years
- When Acceptable: Never for long-term storage. Only for session-scoped cache.

**Skipping Transaction for "Simple" Updates:**

- Immediate Benefit: Faster development, less boilerplate
- Long-term Cost: Orphaned records when partial updates fail
- When Acceptable: Never for multi-entity corrections. OK for truly single-field updates.

**Hardcoded Rate Limit Values:**

- Immediate Benefit: Works now, ship faster
- Long-term Cost: Can't adjust without code deploy when API limits change
- When Acceptable: For initial MVP only. Add config before Phase 2.

**Client-Side Search Debouncing Only:**

- Immediate Benefit: Reduces UI complexity
- Long-term Cost: Doesn't protect against multiple admins or automated scripts
- When Acceptable: For single-admin scenarios. Add server-side throttling for multi-admin.

---

## Integration Gotchas

Common mistakes when connecting to MusicBrainz and managing queues.

**MusicBrainz User-Agent:**

- Common Mistake: Using generic User-Agent or none at all
- Correct Approach: Include app name, version, and contact URL: `YourApp/1.0.0 (https://yourapp.com/contact)`

**MusicBrainz Search vs Lookup:**

- Common Mistake: Using search endpoint when you have an MBID
- Correct Approach: Use `/ws/2/release-group/{mbid}` for lookups, search only when MBID unknown

**BullMQ Job Idempotency:**

- Common Mistake: Assuming duplicate job names prevent duplicates
- Correct Approach: Use explicit `jobId` option: `queue.add(name, data, { jobId: \`search-${mbid}\` })`

**BullMQ Connection Leaks:**

- Common Mistake: Creating new Queue/Worker instances per request
- Correct Approach: Use singleton instances. This codebase does this correctly via `getMusicBrainzQueue()`.

**JSON Response Format:**

- Common Mistake: Forgetting `fmt=json` and trying to parse XML as JSON
- Correct Approach: Always add `fmt=json` to MusicBrainz API URLs or set Accept header

---

## Performance Traps

Patterns that work at small scale but fail as usage grows.

**Unbounded Search Result Processing:**

- Symptoms: Memory spikes when searching common terms like "Love" or "The"
- Prevention: Always paginate, limit to top 20-50 results for display
- When It Breaks: Search terms with 1000+ results

**Sequential API Calls for Related Data:**

- Symptoms: Correction preview takes 10+ seconds to load
- Prevention: Use MusicBrainz `inc` parameter to fetch related data in single request
- When It Breaks: Albums with 5+ artists, each requiring separate lookup

**Full Table Scans for MBID Lookup:**

- Symptoms: Slow responses when checking "does this MBID exist already?"
- Prevention: Index on `musicbrainzId` column (already done in this codebase)
- When It Breaks: Albums table > 100k records

**Synchronous Audit Log Writes:**

- Symptoms: Apply correction action feels slow
- Prevention: Queue audit log writes, don't block the main transaction
- When It Breaks: High volume of corrections in short period

---

## Security Mistakes

Domain-specific security issues beyond general web security.

**Missing Admin Permission Check on Preview:**

- Risk: Non-admins can probe database contents via search/preview endpoints
- Prevention: Check admin role on ALL admin-related endpoints, including read-only ones

**Audit Log Exposes Sensitive Data:**

- Risk: Audit log contains full before/after state, including any user-submitted data
- Prevention: Separate audit log access from general admin access. Consider field-level filtering.

**Queue Dashboard Publicly Accessible:**

- Risk: BullBoard shows job data, queue state, and can be used to manipulate jobs
- Prevention: This codebase uses `/admin/queues` - ensure auth middleware protects this path

**MBID Injection in Search:**

- Risk: Malformed MBID passed to API could cause unexpected behavior
- Prevention: Validate MBID format (UUID) before constructing API URLs

---

## UX Pitfalls

Common user experience mistakes in admin data correction interfaces.

**No Visual Feedback During Search:**

- User Impact: Admin thinks search is broken, clicks repeatedly, queues multiple jobs
- Better Approach: Show loading spinner immediately, indicate queue position if delayed

**Destructive Action Without Confirmation:**

- User Impact: Accidental correction applied, no undo
- Better Approach: Two-step confirmation with explicit diff review

**No Indication of What Changed After Apply:**

- User Impact: Admin unsure if correction worked, may re-apply
- Better Approach: Show "Correction applied" summary with link to updated record

**Search Results Without Context:**

- User Impact: Multiple MusicBrainz results look identical, admin picks randomly
- Better Approach: Show disambiguation info (country, release date, label, format) for each result

**Mobile-Unfriendly Comparison UI:**

- User Impact: Admins on tablets can't use the feature effectively
- Better Approach: Design comparison to stack vertically on narrow screens (this app has mobile routes at /m/)

---

## "Looks Done But Isn't" Checklist

Things that appear complete but are missing critical pieces.

- [ ] **Search Integration:** Often missing debounce logic - verify search doesn't fire on every keystroke
- [ ] **Transaction Logic:** Often missing related entity updates - verify AlbumArtist, Track tables are handled
- [ ] **Preview UI:** Often missing field diff highlighting - verify changes are visually obvious
- [ ] **Apply Action:** Often missing audit logging - verify before-state is captured
- [ ] **Error Handling:** Often missing queue failure recovery - verify failed jobs can be retried
- [ ] **Rate Limiting:** Often missing priority levels - verify admin searches aren't blocked by background jobs
- [ ] **Rollback:** Often missing entirely - verify there's a path to undo corrections
- [ ] **MBID Validation:** Often missing format check - verify UUIDs are validated before API calls

---

## Recovery Strategies

When pitfalls occur despite prevention, how to recover.

**MBID Mismatch Discovered:**

- Recovery Cost: MEDIUM
- Recovery Steps: Query MusicBrainz with old ID to find redirect target, update local record with canonical ID, add verification timestamp

**Orphaned AlbumArtist Records:**

- Recovery Cost: LOW
- Recovery Steps: Run cleanup query to find AlbumArtist records where artistId doesn't match any MusicBrainz artist credit for the album's MBID

**Transaction Left Open:**

- Recovery Cost: HIGH (requires investigation)
- Recovery Steps: Restart worker process to release connections, add logging to identify which code path leaked

**Applied Wrong Correction:**

- Recovery Cost: HIGH without audit log, LOW with audit log
- Recovery Steps: If audit log exists, restore from before-state. If not, manually reconstruct from MusicBrainz or user reports.

**Queue Backlog from Admin Search Storm:**

- Recovery Cost: LOW
- Recovery Steps: Pause non-critical jobs, let admin searches drain, implement priority system before resuming normal operations

---

## Pitfall-to-Phase Mapping

How roadmap phases should address these pitfalls.

**Phase 1 (Foundation):**

- MBID Instability: Build ID verification into search flow
- Rate Limit Bursts: Design queue priority system
- BullMQ Configuration: Set up proper job IDs for idempotency

**Phase 2 (Correction Logic):**

- Wrong Prisma Client: Establish transaction patterns
- Orphaned Records: Design complete entity replacement transaction
- Audit Logging: Implement before-state capture

**Phase 3 (UI/Preview):**

- No Rollback Path: Build revert functionality using audit log
- Incomplete Comparison: Design comprehensive diff structure
- UX Issues: Add loading states, confirmation dialogs, success feedback

**Phase 4 (Polish):**

- Performance Traps: Add monitoring for slow queries
- Security: Audit all endpoints for permission checks
- Edge Cases: Handle MusicBrainz merge scenarios gracefully

---

## Sources

- [MusicBrainz API Documentation](https://musicbrainz.org/doc/MusicBrainz_API) - Official rate limiting and User-Agent requirements
- [MusicBrainz ID Instability Article (2025)](https://eve.gd/2025/10/09/using-a-public-api-or-the-instability-of-musicbrainz-ids/) - Real-world MBID redirect issues
- [Prisma Transaction Documentation](https://www.prisma.io/docs/orm/prisma-client/queries/transactions) - Transaction patterns and pitfalls
- [BullMQ Rate Limiting Documentation](https://docs.bullmq.io/guide/rate-limiting) - Queue rate limiting configuration
- [BullMQ Getting Started Guide (2025)](https://www.dragonflydb.io/guides/bullmq) - Modern BullMQ patterns
- [NN/g Comparison Tables](https://www.nngroup.com/articles/comparison-tables/) - UI design best practices for comparison interfaces
- [Smashing Magazine Feature Comparison](https://www.smashingmagazine.com/2017/08/designing-perfect-feature-comparison-table/) - Detailed comparison UI patterns
- [Data Quality Issues Guide (2025)](https://atlan.com/how-to-fix-data-quality-issues/) - Data correction best practices
- Codebase Analysis: `/src/lib/musicbrainz/`, `/src/app/api/admin/albums/delete/route.ts`, `/prisma/schema.prisma`

---

_Pitfalls research for: Admin Data Correction Feature_
_Researched: 2026-01-23_
