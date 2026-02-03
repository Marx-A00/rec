# Phase 3: Preview Service - Research

**Researched:** 2026-01-23
**Domain:** Diff generation and data comparison for album metadata
**Confidence:** HIGH

## Summary

This research investigates how to build a robust preview/diff service that compares current album data with MusicBrainz search results at the field level. The standard approach uses specialized diff libraries for different data types (text, objects, arrays) combined with normalization strategies to ensure meaningful comparisons.

The existing `EnrichmentFieldDiff` pattern in this codebase provides a foundation, but Phase 3 requires character-level granularity for text, position-based track alignment, and comprehensive field coverage including artist credits, cover art, and external IDs.

**Primary recommendation:** Use the `diff` npm package (jsdiff) for character-level text comparison, standard JavaScript object comparison for structured fields, position-based array indexing for track alignment, and String.normalize() for Unicode normalization. Don't hand-roll diff algorithms or normalization logic.

## Standard Stack

The established libraries/tools for diff generation and data comparison:

### Core

| Library          | Version | Purpose                                | Why Standard                                                                                                 |
| ---------------- | ------- | -------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| diff             | 8.0.3   | Character/word/line level text diffing | Most widely used JS diff library (7,644+ dependents), actively maintained, implements Myers' O(ND) algorithm |
| deep-object-diff | 1.1.9   | Deep comparison of nested objects      | Lightweight, zero dependencies, handles circular references, TypeScript support                              |

### Supporting

| Library            | Version | Purpose                                  | When to Use                                                         |
| ------------------ | ------- | ---------------------------------------- | ------------------------------------------------------------------- |
| String.normalize() | Native  | Unicode normalization (NFD/NFC)          | Comparing text with accents/diacritics (e.g., "Cancún" vs "Cancun") |
| date-fns           | 3.x     | Date component extraction and comparison | When need to highlight year/month/day differences separately        |

### Alternatives Considered

| Instead of         | Could Use             | Tradeoff                                                       |
| ------------------ | --------------------- | -------------------------------------------------------------- |
| diff               | simple-text-diff      | Simpler but less feature-rich, no unified diff support         |
| deep-object-diff   | lodash.isEqual        | Only returns boolean, not the differences themselves           |
| String.normalize() | Custom accent removal | More complex, harder to maintain, potential Unicode edge cases |

**Installation:**

```bash
npm install diff deep-object-diff date-fns
```

## Architecture Patterns

### Recommended Project Structure

```
src/lib/correction/
├── preview/                # New preview module
│   ├── preview-service.ts  # Main service class
│   ├── diff-engine.ts      # Diff computation logic
│   ├── normalizers.ts      # Text/data normalization
│   ├── field-mappers.ts    # MB result → comparable format
│   └── types.ts            # Preview-specific types
├── search-service.ts       # Existing (Phase 2)
├── scoring/                # Existing (Phase 2)
└── types.ts                # Shared types
```

### Pattern 1: Service Layer with Dependency Injection

**What:** PreviewService orchestrates diff generation, delegates to specialized engines
**When to use:** Need to swap diff strategies or add new data sources
**Example:**

```typescript
// Source: Phase 2 pattern (correction-search.service.ts)
export class CorrectionPreviewService {
  private diffEngine: DiffEngine;
  private mbService = getQueuedMusicBrainzService();

  constructor(diffEngine?: DiffEngine) {
    this.diffEngine = diffEngine ?? new DiffEngine();
  }

  async generatePreview(
    currentAlbum: Album,
    searchResult: CorrectionSearchResult
  ): Promise<CorrectionPreview> {
    // Fetch full MB release data if needed (inc=recordings+artist-credits)
    const mbRelease = await this.fetchMBReleaseData(
      searchResult.releaseGroupMbid
    );

    // Generate field-by-field diff
    const fieldDiffs = this.diffEngine.compareAlbums(currentAlbum, mbRelease);

    return {
      currentData: currentAlbum,
      sourceData: mbRelease,
      diffs: fieldDiffs,
      summary: this.summarizeChanges(fieldDiffs),
    };
  }
}
```

### Pattern 2: Five-State Change Classification

**What:** Added, Modified, Removed, Conflict, Unchanged states for each field
**When to use:** Need to distinguish between different change types for UI rendering
**Example:**

```typescript
export type ChangeType =
  | 'ADDED'
  | 'MODIFIED'
  | 'REMOVED'
  | 'CONFLICT'
  | 'UNCHANGED';

export interface FieldDiff {
  field: string;
  changeType: ChangeType;
  currentValue: unknown;
  sourceValue: unknown;
  // Character-level changes for text fields
  changes?: Array<{ value: string; added?: boolean; removed?: boolean }>;
  // For arrays (tracks, genres, etc.)
  arrayDiff?: {
    added: unknown[];
    removed: unknown[];
    modified: Array<{ current: unknown; source: unknown }>;
  };
}

function classifyChange(current: unknown, source: unknown): ChangeType {
  const hasCurrentValue = current !== null && current !== undefined;
  const hasSourceValue = source !== null && source !== undefined;

  if (!hasCurrentValue && hasSourceValue) return 'ADDED';
  if (hasCurrentValue && !hasSourceValue) return 'REMOVED';
  if (!hasCurrentValue && !hasSourceValue) return 'UNCHANGED';

  // Both have values - check if different
  const currentNorm = normalize(current);
  const sourceNorm = normalize(source);

  if (currentNorm === sourceNorm) return 'UNCHANGED';
  return 'CONFLICT'; // Both have different non-null values
}
```

### Pattern 3: Normalization Before Comparison

**What:** Apply consistent normalization (trim, lowercase, Unicode NFD) before diffing
**When to use:** Every text comparison to avoid false positives from formatting
**Example:**

```typescript
// Source: MDN String.normalize() + research findings
export class TextNormalizer {
  /**
   * Normalize text for comparison - removes accents, trims, lowercase
   */
  static normalize(text: string | null | undefined): string {
    if (!text) return '';

    return text
      .normalize('NFD') // Decompose Unicode (é → e + ́)
      .replace(/[\u0300-\u036f]/g, '') // Remove diacritics
      .toLowerCase()
      .trim()
      .replace(/\s+/g, ' '); // Collapse whitespace
  }

  /**
   * Check if two strings are semantically equal (normalized match)
   */
  static areEqual(
    a: string | null | undefined,
    b: string | null | undefined
  ): boolean {
    return this.normalize(a) === this.normalize(b);
  }
}
```

### Pattern 4: Position-Based Track Alignment

**What:** Align tracks by position (track 1 vs track 1), show additions/removals at end
**When to use:** Comparing track listings from different sources
**Example:**

```typescript
interface TrackDiff {
  position: number;
  currentTrack?: Track;
  sourceTrack?: MBRecording;
  changeType: 'MATCH' | 'MODIFIED' | 'ADDED' | 'REMOVED';
  titleDiff?: Array<{ value: string; added?: boolean; removed?: boolean }>;
  durationDiff?: { current: number; source: number; delta: number };
}

function alignTracks(
  currentTracks: Track[],
  sourceTracks: MBRecording[]
): TrackDiff[] {
  const maxLength = Math.max(currentTracks.length, sourceTracks.length);
  const aligned: TrackDiff[] = [];

  for (let i = 0; i < maxLength; i++) {
    const current = currentTracks[i];
    const source = sourceTracks[i];

    if (current && source) {
      // Both exist - check for modifications
      const titleNorm = TextNormalizer.normalize(current.title);
      const sourceNorm = TextNormalizer.normalize(source.title);

      aligned.push({
        position: i + 1,
        currentTrack: current,
        sourceTrack: source,
        changeType: titleNorm === sourceNorm ? 'MATCH' : 'MODIFIED',
        titleDiff:
          titleNorm !== sourceNorm
            ? diffChars(current.title, source.title)
            : undefined,
        durationDiff:
          current.durationMs !== source.length
            ? {
                current: current.durationMs,
                source: source.length,
                delta: Math.abs(current.durationMs - source.length),
              }
            : undefined,
      });
    } else if (current && !source) {
      aligned.push({
        position: i + 1,
        currentTrack: current,
        changeType: 'REMOVED',
      });
    } else if (!current && source) {
      aligned.push({
        position: i + 1,
        sourceTrack: source,
        changeType: 'ADDED',
      });
    }
  }

  return aligned;
}
```

### Pattern 5: Date Component Highlighting

**What:** Parse dates into year/month/day, highlight which components changed
**When to use:** Comparing release dates where partial information may differ
**Example:**

```typescript
interface DateDiff {
  field: 'releaseDate';
  changeType: ChangeType;
  current: { year?: number; month?: number; day?: number } | null;
  source: { year?: number; month?: number; day?: number } | null;
  componentChanges: {
    year: 'MATCH' | 'MODIFIED' | 'ADDED' | 'REMOVED';
    month: 'MATCH' | 'MODIFIED' | 'ADDED' | 'REMOVED';
    day: 'MATCH' | 'MODIFIED' | 'ADDED' | 'REMOVED';
  };
}

function parseDateComponents(
  dateString: string | null
): { year?: number; month?: number; day?: number } | null {
  if (!dateString) return null;

  const parts = dateString.split('-');
  return {
    year: parts[0] ? parseInt(parts[0]) : undefined,
    month: parts[1] ? parseInt(parts[1]) : undefined,
    day: parts[2] ? parseInt(parts[2]) : undefined,
  };
}

function compareDateComponents(
  current: Date | null,
  source: string | null
): DateDiff {
  const currentParts = current
    ? parseDateComponents(current.toISOString().split('T')[0])
    : null;
  const sourceParts = parseDateComponents(source);

  return {
    field: 'releaseDate',
    changeType: classifyChange(currentParts, sourceParts),
    current: currentParts,
    source: sourceParts,
    componentChanges: {
      year: classifyChange(currentParts?.year, sourceParts?.year),
      month: classifyChange(currentParts?.month, sourceParts?.month),
      day: classifyChange(currentParts?.day, sourceParts?.day),
    },
  };
}
```

### Anti-Patterns to Avoid

- **Comparing raw strings without normalization** - Leads to false positives for "The Beatles" vs "the beatles"
- **Using === for date comparison** - Date objects with same value aren't equal, use .getTime()
- **Not handling null/undefined explicitly** - Null vs empty string should be distinguished
- **Computing diffs synchronously in request handler** - Large track lists can block event loop, use async
- **Returning MusicBrainz raw response to UI** - UI shouldn't parse MB structure, service layer maps to domain types

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem                   | Don't Build                        | Use Instead                                         | Why                                                                          |
| ------------------------- | ---------------------------------- | --------------------------------------------------- | ---------------------------------------------------------------------------- |
| Character-level text diff | Custom string comparison algorithm | `diff` library's `diffChars()`                      | Myers' algorithm is complex, handles edge cases, outputs standardized format |
| Unicode normalization     | Regex to remove accents            | `String.normalize('NFD')` + diacritic range removal | Native method handles all Unicode forms correctly (NFD, NFC, NFKC, NFKD)     |
| Deep object comparison    | Recursive property check           | `deep-object-diff` or lodash.isEqual                | Handles circular refs, special types (Date, Map, Set), prototype chains      |
| Array diff with edits     | Manual index tracking              | Position-based alignment with change classification | Track additions/removals/modifications is error-prone with indices           |
| Date parsing/comparison   | String splitting                   | Native Date constructor or `date-fns`               | Timezone handling, leap years, invalid dates edge cases                      |

**Key insight:** Diff algorithms have subtle edge cases (longest common subsequence, optimal edit distance) that are well-solved in libraries. Custom implementations miss edge cases and are harder to test.

## Common Pitfalls

### Pitfall 1: Normalizing After Diff Instead of Before

**What goes wrong:** Running diff on raw strings, then trying to filter "unimportant" changes
**Why it happens:** Seems easier to compute all diffs then filter, but loses context
**How to avoid:** Always normalize inputs before diffing - `diffChars(normalize(a), normalize(b))`
**Warning signs:** UI shows changes for "The Beatles" → "the beatles", whitespace-only diffs

### Pitfall 2: Assuming MusicBrainz Data is Always Complete

**What goes wrong:** Accessing `mbResult.tags[0].name` without null checks, crashes on missing data
**Why it happens:** Sample queries return complete data, production has sparse records
**How to avoid:** Optional chaining (`mbResult.tags?.[0]?.name`) and null coalescing (`?? 'Unknown'`)
**Warning signs:** TypeError: Cannot read property 'name' of undefined in production

### Pitfall 3: Not Distinguishing Conflict from Modification

**What goes wrong:** Treating "null → value" (ADDED) same as "value1 → value2" (CONFLICT)
**Why it happens:** Both are "changes", but admin decision is different (accept vs choose)
**How to avoid:** Five-state classification - ADDED means enriching empty field, CONFLICT means choosing between values
**Warning signs:** UI suggests "adding" data that overwrites existing values

### Pitfall 4: Character-Level Diff on Long Text

**What goes wrong:** Generating character diff for 500-word descriptions, massive output
**Why it happens:** User context says "character-level highlighting", apply to all text
**How to avoid:** Character-level for short fields (title, artist), word/line-level for long fields (description), length threshold (< 100 chars = character-level)
**Warning signs:** Preview response size > 1MB, UI rendering lag

### Pitfall 5: Comparing Track Count Instead of Actual Tracks

**What goes wrong:** "Album has 12 tracks, MB has 12 tracks" → marked as match, but tracks are different
**Why it happens:** Easier to compare count than align individual tracks
**How to avoid:** Always position-align tracks and compare titles/durations individually
**Warning signs:** Admin approves "match" but actual track names differ

### Pitfall 6: Not Fetching Full MusicBrainz Release Data

**What goes wrong:** Search result has limited fields, preview shows "Track listing: Not available"
**Why it happens:** Phase 2 search returns release group summary, not full release with tracks
**How to avoid:** Preview service must fetch full release data with `inc=recordings+artist-credits` to get track listings
**Warning signs:** Preview shows cover art and title but no track comparison

### Pitfall 7: Ignoring Artist Credit Complexity

**What goes wrong:** Displaying "Artist: John Lennon, Paul McCartney" when credit is "Lennon–McCartney"
**Why it happens:** Joining artist names with comma, ignoring joinphrases in artist-credit
**How to avoid:** MusicBrainz artist-credit has joinphrase field (e.g., " & ", " feat. "), reconstruct as credited
**Warning signs:** Artist display doesn't match how MB shows it (e.g., "Featuring" vs "feat.")

## Code Examples

Verified patterns from research:

### Character-Level Text Diff (jsdiff)

```typescript
// Source: https://github.com/kpdecker/jsdiff
import { diffChars } from 'diff';

function computeTextDiff(current: string, source: string) {
  const changes = diffChars(current, source);

  // changes = [
  //   { value: 'The Dark Side of ', count: 17 },
  //   { value: 'T', removed: true },
  //   { value: 't', added: true },
  //   { value: 'he Moon', count: 7 }
  // ]

  return changes;
}
```

### Unicode Normalization for Comparison

```typescript
// Source: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/normalize
// Source: https://claritydev.net/blog/diacritic-insensitive-string-comparison-javascript

function normalizeForComparison(text: string): string {
  return text
    .normalize('NFD') // Decompose: é → e + ́
    .replace(/[\u0300-\u036f]/g, '') // Remove combining diacritics
    .toLowerCase()
    .trim();
}

// Example: "Cancún" vs "Cancun"
normalizeForComparison('Cancún') === normalizeForComparison('Cancun'); // true
```

### Deep Object Difference

```typescript
// Source: https://github.com/mattphillips/deep-object-diff
import { detailedDiff } from 'deep-object-diff';

const current = { title: 'Abbey Road', year: 1969, genres: ['rock'] };
const source = { title: 'Abbey Road', year: 1969, genres: ['rock', 'pop'] };

const diff = detailedDiff(current, source);
// diff = {
//   added: {},
//   deleted: {},
//   updated: { genres: ['rock', 'pop'] }
// }
```

### Date Component Comparison

```typescript
// Source: Research on date comparison patterns

function compareDateComponents(current: Date | null, source: string | null) {
  if (!current && !source) return { changeType: 'UNCHANGED' };
  if (!current) return { changeType: 'ADDED', source: parseDate(source) };
  if (!source) return { changeType: 'REMOVED', current: formatDate(current) };

  const currentParts = {
    year: current.getFullYear(),
    month: current.getMonth() + 1,
    day: current.getDate(),
  };

  const sourceParts = parseDate(source); // "2023-04-15" → { year: 2023, month: 4, day: 15 }

  return {
    changeType: 'MODIFIED',
    current: currentParts,
    source: sourceParts,
    changes: {
      year: currentParts.year !== sourceParts.year,
      month: currentParts.month !== sourceParts.month,
      day: currentParts.day !== sourceParts.day,
    },
  };
}
```

### Array Diff with Position Alignment

```typescript
// Source: Pattern derived from track matching requirement

function alignArrays<T>(
  currentItems: T[],
  sourceItems: T[],
  keyExtractor: (item: T) => string
) {
  const maxLength = Math.max(currentItems.length, sourceItems.length);
  const aligned = [];

  for (let i = 0; i < maxLength; i++) {
    const current = currentItems[i];
    const source = sourceItems[i];

    if (current && source) {
      const isMatch = keyExtractor(current) === keyExtractor(source);
      aligned.push({
        position: i + 1,
        current,
        source,
        changeType: isMatch ? 'MATCH' : 'MODIFIED',
      });
    } else if (current) {
      aligned.push({ position: i + 1, current, changeType: 'REMOVED' });
    } else {
      aligned.push({ position: i + 1, source, changeType: 'ADDED' });
    }
  }

  return aligned;
}

// Usage for tracks
const trackDiffs = alignArrays(
  currentAlbum.tracks,
  mbRelease.recordings,
  track => normalizeForComparison(track.title)
);
```

## Field Coverage

Based on MusicBrainz API capabilities and current Album schema:

### Core Album Fields (Always Compare)

- **title** - Character-level diff, normalized
- **releaseDate** - Date component diff (year/month/day)
- **releaseType** (primary-type) - Exact match (Album, EP, Single, etc.)
- **secondaryTypes** - Array diff (Compilation, Live, Remix, etc.)
- **genres** (from tags) - Array diff, top 5 by count
- **musicbrainzId** - Exact match or ADDED

### Artist Fields (Full Detail)

MusicBrainz `artist-credit` structure:

```typescript
{
  artistCredit: [
    {
      name: 'John Lennon', // As credited on release
      artist: {
        id: '...', // MBID
        name: 'John Lennon', // Canonical name
        sortName: 'Lennon, John',
        disambiguation: 'The Beatles member',
      },
      joinphrase: ' & ', // Connector to next artist
    },
  ];
}
```

Compare:

- Artist names (all credited artists, not just primary)
- Artist MBIDs (for linking to artist entities)
- Joinphrases (how artists are connected: " & ", " feat. ", etc.)

### Track Fields (Position-Based Alignment)

For each track position:

- **title** - Character-level diff if modified
- **durationMs** - Show any difference (even 1 second), admin decides
- **trackNumber** / **discNumber** - Position-based, extra tracks marked as added/removed

Track summary for UI:

```typescript
{
  totalCurrent: 12,
  totalSource: 14,
  matching: 10,
  modified: 2,
  added: 2,
  removed: 0
}
```

### Cover Art (Visual Comparison)

- **coverArtUrl** - Side-by-side thumbnails
- Current: Album.coverArtUrl or cloudflareImageId
- Source: Cover Art Archive URL (`https://coverartarchive.org/release/{mbid}/front-250`)

### External IDs (Link Changes)

Compare these linking fields:

- **musicbrainzId** - Primary link, show if added/changed
- **spotifyId** - If available in MB (requires url-rels)
- **discogsId** - If available in MB (requires url-rels)

### Metadata Fields (Optional)

- **barcode** - Exact match or ADDED
- **label** - Character-level diff
- **catalogNumber** - Exact match
- **releaseCountry** - ISO code, exact match

### Fields to Exclude

Don't compare these (internal/computed):

- id, createdAt, updatedAt (internal)
- searchVector (computed)
- dataQuality, enrichmentStatus (system state)
- cloudflareImageId (internal CDN)
- submittedBy (audit)

## State of the Art

| Old Approach                 | Current Approach                                                      | When Changed                          | Impact                                           |
| ---------------------------- | --------------------------------------------------------------------- | ------------------------------------- | ------------------------------------------------ |
| Simple string equality       | Normalized comparison with Unicode NFD                                | Ongoing (2020+)                       | Avoids false positives for accented characters   |
| Boolean "has changes"        | Five-state classification (Added/Modified/Removed/Conflict/Unchanged) | Industry pattern                      | Admin sees exactly what decision to make         |
| Manual diff loops            | Myers' O(ND) algorithm in libraries                                   | Algorithm from 1986, libs since 2010+ | Optimal diff performance, standard output format |
| Count-based track comparison | Position-based alignment with title normalization                     | N/A (project-specific)                | Detects track order changes and title variations |

**Deprecated/outdated:**

- **Levenshtein distance for text diff** - Simple edit distance doesn't show what changed, just that it changed. Use character-level diff which shows insertions/deletions.
- **JSON.stringify comparison** - Breaks on key order, doesn't show field-level changes. Use deep-object-diff.
- **Regex-based accent removal** - Incomplete Unicode support. Use String.normalize('NFD') + diacritic range.

## Open Questions

Things that couldn't be fully resolved:

1. **MusicBrainz release vs release group for tracks**
   - What we know: Search returns release groups, but tracks are on releases (a release group can have multiple releases)
   - What's unclear: Should preview fetch a specific release (how to choose?) or aggregate tracks from all releases in group?
   - Recommendation: Fetch first release in group (via `inc=releases`, take `releases[0]`), then fetch that release with `inc=recordings` for track listing. Document that track listing represents one edition.

2. **How to handle multiple disc albums**
   - What we know: Tracks have discNumber field, MB has media array
   - What's unclear: Display tracks grouped by disc or flat list? How to align disc boundaries?
   - Recommendation: Group by disc, compare disc 1 vs disc 1, disc 2 vs disc 2. Show "Disc added/removed" if disc count differs.

3. **Character-level diff performance threshold**
   - What we know: Character diff on long text creates large output
   - What's unclear: Exact length threshold to switch from character to word-level
   - Recommendation: < 100 chars = character-level, 100-500 = word-level, > 500 = line-level or truncate with "view full diff" toggle

4. **Cover Art Archive 404 handling**
   - What we know: CAA returns 404 if no cover art exists for release/release group
   - What's unclear: Should preview pre-check CAA or let UI handle 404?
   - Recommendation: Include CAA URL in preview, don't pre-check (extra API call). UI component already handles 404 gracefully (AlbumImage pattern).

5. **Artist disambiguation display**
   - What we know: MB has disambiguation field (e.g., "UK electronic artist")
   - What's unclear: Show in preview always, only on conflict, or tooltip?
   - Recommendation: Show in parentheses for all artists in preview (helps admin verify correct match), e.g., "Pink Floyd (UK rock band)"

## Sources

### Primary (HIGH confidence)

- diff library (jsdiff): https://github.com/kpdecker/jsdiff - Character/word/line diffing, Myers' algorithm
- String.normalize() MDN: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/normalize - Unicode normalization (NFD/NFC)
- MusicBrainz API documentation: https://musicbrainz.org/doc/MusicBrainz_API - Release group and release endpoints, inc parameters

### Secondary (MEDIUM confidence)

- deep-object-diff: https://github.com/mattphillips/deep-object-diff - Deep comparison verified via npm package info
- Diacritic removal pattern: https://claritydev.net/blog/diacritic-insensitive-string-comparison-javascript - NFD + Unicode range removal
- Date comparison patterns: https://www.freecodecamp.org/news/compare-two-dates-in-javascript/ - Component extraction methods

### Tertiary (LOW confidence)

- Track alignment algorithms: WebSearch results on music alignment - No specific "track list position-based" algorithm found, pattern derived from requirements
- React diff UI libraries (react-diff-viewer, react-diff-view): https://github.com/praneshr/react-diff-viewer - UI patterns only, not for service layer

## Metadata

**Confidence breakdown:**

- Standard stack: HIGH - diff and deep-object-diff are industry standard, actively maintained
- Architecture: HIGH - Patterns verified in Phase 2 code, normalization verified via MDN
- Pitfalls: MEDIUM - Derived from common comparison issues, some project-specific
- Field coverage: MEDIUM - Based on MB API docs + Prisma schema, awaiting actual MB response validation
- Track alignment: MEDIUM - Position-based pattern is requirement-driven, not library-based

**Research date:** 2026-01-23
**Valid until:** 30 days (stable domain, diff libraries mature)
