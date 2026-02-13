# Architecture Research: Admin Data Correction Feature

**Domain:** Admin data correction for music database (album/artist/track)
**Researched:** 2026-01-23
**Confidence:** HIGH (based on existing codebase patterns)

## System Overview

The admin data correction feature integrates into an existing Next.js 15 app with established patterns for GraphQL, Prisma, and BullMQ. The architecture follows the existing conventions while adding a new "search, preview, apply" workflow for corrections.

```
┌─────────────────────────────────────────────────────────────────────┐
│                         PRESENTATION LAYER                           │
├─────────────────────────────────────────────────────────────────────┤
│  ┌───────────────┐  ┌───────────────┐  ┌───────────────┐           │
│  │ Admin Music   │  │ Correction    │  │ Enrichment    │           │
│  │ Database Page │  │ Modal/Sheet   │  │ Preview Panel │           │
│  └───────┬───────┘  └───────┬───────┘  └───────┬───────┘           │
│          │                  │                  │                    │
├──────────┴──────────────────┴──────────────────┴────────────────────┤
│                         GRAPHQL API LAYER                            │
├─────────────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │                   Apollo Server (/api/graphql)               │    │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐    │    │
│  │  │ Search   │  │ Preview  │  │ Apply    │  │ Query    │    │    │
│  │  │ Resolvers│  │ Resolvers│  │ Resolvers│  │ Resolvers│    │    │
│  │  └──────────┘  └──────────┘  └──────────┘  └──────────┘    │    │
│  └─────────────────────────────────────────────────────────────┘    │
├─────────────────────────────────────────────────────────────────────┤
│                         SERVICE LAYER                                │
├─────────────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐     │
│  │ Correction      │  │ MusicBrainz     │  │ Preview         │     │
│  │ Service         │  │ Queue Service   │  │ Enrichment      │     │
│  │ (NEW)           │  │ (EXISTING)      │  │ (EXISTING)      │     │
│  └────────┬────────┘  └────────┬────────┘  └────────┬────────┘     │
│           │                    │                    │               │
├───────────┴────────────────────┴────────────────────┴───────────────┤
│                         DATA LAYER                                   │
├─────────────────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐              │
│  │  Prisma ORM  │  │   BullMQ     │  │    Redis     │              │
│  │  PostgreSQL  │  │   Queue      │  │    Cache     │              │
│  └──────────────┘  └──────────────┘  └──────────────┘              │
└─────────────────────────────────────────────────────────────────────┘
```

## Component Boundaries

### Existing Components (Leverage As-Is)

| Component                | Location                                             | Responsibility                     | Integration Point               |
| ------------------------ | ---------------------------------------------------- | ---------------------------------- | ------------------------------- |
| QueuedMusicBrainzService | `/src/lib/musicbrainz/queue-service.ts`              | Rate-limited MusicBrainz API calls | All MB searches go through this |
| MusicBrainzService       | `/src/lib/musicbrainz/musicbrainz-service.ts`        | Error handling wrapper             | Direct lookups with MBID        |
| previewAlbumEnrichment   | `/src/lib/enrichment/preview-enrichment.ts`          | Dry-run enrichment with diff       | Extend for correction preview   |
| EnrichmentPreviewResults | `/src/components/admin/EnrichmentPreviewResults.tsx` | Display field diffs                | Reuse for correction UI         |
| EnrichmentLogger         | `/src/lib/enrichment/enrichment-logger.ts`           | Log all enrichment operations      | Log corrections similarly       |
| EnrichmentLog (Prisma)   | `/prisma/schema.prisma`                              | Audit trail storage                | Store correction logs           |

### New Components (To Build)

| Component            | Recommended Location                                 | Responsibility                              |
| -------------------- | ---------------------------------------------------- | ------------------------------------------- |
| CorrectionService    | `/src/lib/correction/correction-service.ts`          | Orchestrates search/preview/apply flow      |
| CorrectionPreview    | `/src/lib/correction/correction-preview.ts`          | Generates diff between current and proposed |
| ApplyCorrection      | `/src/lib/correction/apply-correction.ts`            | Atomic database updates with logging        |
| Correction Resolvers | `/src/lib/graphql/resolvers/correction-resolvers.ts` | GraphQL mutations for correction workflow   |

## Data Flow: Correction Workflow

### Phase 1: Search for Correction Candidate

```
[Admin UI: Click "Search MusicBrainz"]
         │
         ▼
[GraphQL Mutation: searchMusicBrainzForCorrection]
         │
         ▼
[Correction Service: buildSearchQuery(currentEntity)]
         │
         ▼
[QueuedMusicBrainzService: searchReleaseGroups/searchArtists]
         │                    (Rate-limited via BullMQ)
         ▼
[Return: Array of MusicBrainz candidates with match scores]
```

**Pattern:** Follow existing `previewEnrichment` which already does MB search and match scoring.

### Phase 2: Preview Correction

```
[Admin UI: Select MB candidate]
         │
         ▼
[GraphQL Query: previewCorrection(entityId, mbid)]
         │
         ▼
[CorrectionPreview: Fetch full MB data via queue]
         │
         ▼
[CorrectionPreview: Generate field-by-field diff]
         │
         ▼
[Return: CorrectionPreviewResult with fieldsToUpdate[], matchScore]
```

**Key insight:** The existing `PreviewEnrichmentResult` type already contains:

- `fieldsToUpdate: EnrichmentFieldDiff[]`
- `matchScore: number`
- `matchedEntity: string`
- `rawData: JSON`

This structure works for corrections too. Extend rather than replace.

### Phase 3: Apply Correction

```
[Admin UI: Click "Apply Correction"]
         │
         ▼
[GraphQL Mutation: applyCorrection(entityId, correctionInput)]
         │
         ▼
[ApplyCorrection: prisma.$transaction([
    update entity,
    update related (artists/tracks if album),
    create enrichment_log
])]
         │
         ▼
[Return: Updated entity + correction log ID]
```

## Recommended Project Structure

```
src/lib/correction/                    # NEW: Correction service layer
├── correction-service.ts              # Main orchestration
├── correction-preview.ts              # Diff generation (extend preview-enrichment)
├── apply-correction.ts                # Atomic apply with transaction
├── index.ts                           # Public exports
└── types.ts                           # Correction-specific types

src/lib/graphql/resolvers/
├── correction-resolvers.ts            # NEW: GraphQL resolvers for corrections
└── mutations.ts                       # Existing - add correction mutations

src/graphql/
├── schema.graphql                     # Add correction types/mutations
└── queries/
    └── correction.graphql             # Client-side correction queries

src/components/admin/
├── CorrectionSearchModal.tsx          # NEW: MB search interface
├── CorrectionPreviewPanel.tsx         # NEW or extend EnrichmentPreviewResults
└── EnrichmentPreviewResults.tsx       # EXISTING: Reuse for diff display
```

### Structure Rationale

- **`/src/lib/correction/`:** Isolate correction logic from enrichment. While similar, corrections are admin-initiated and may apply different fields than auto-enrichment.
- **Separate resolvers file:** Keeps correction mutations organized, avoids bloating existing mutations.ts further.
- **Extend existing preview pattern:** The `EnrichmentPreviewResults` component already handles field diffs well.

## GraphQL Schema Additions

### New Types

```graphql
# Correction-specific input and output types
input SearchMusicBrainzInput {
  entityType: EnrichmentEntityType! # ALBUM | ARTIST | TRACK
  entityId: UUID!
  query: String # Optional override search query
  limit: Int = 10
}

type MusicBrainzSearchResult {
  mbid: String!
  title: String! # Album title or artist name
  artistCredits: [String!] # For albums
  releaseDate: String
  score: Int! # MusicBrainz relevance score (0-100)
  matchConfidence: Float! # Our calculated match (0-1)
  disambiguation: String # For artists
  type: String # Album type or artist type
  country: String
}

input ApplyCorrectionInput {
  entityType: EnrichmentEntityType!
  entityId: UUID!
  musicbrainzId: String! # The MB ID to use as source
  fieldsToApply: [String!]! # Which fields to update
  reason: String # Admin note for audit
}

type ApplyCorrectionResult {
  success: Boolean!
  message: String
  updatedEntity: CorrectedEntity
  correctionLogId: UUID
  fieldsUpdated: [String!]!
}

union CorrectedEntity = Album | Artist | Track
```

### New Mutations

```graphql
type Mutation {
  # Search MusicBrainz for potential matches
  searchMusicBrainzForCorrection(
    input: SearchMusicBrainzInput!
  ): [MusicBrainzSearchResult!]!

  # Preview what would change if we applied this MB data
  previewCorrection(
    entityType: EnrichmentEntityType!
    entityId: UUID!
    musicbrainzId: String!
  ): PreviewEnrichmentResult! # Reuse existing type
  # Apply the correction with selected fields
  applyCorrection(input: ApplyCorrectionInput!): ApplyCorrectionResult!
}
```

**Pattern:** Reuse `PreviewEnrichmentResult` type from existing preview enrichment. No need for new preview type.

## Service Layer Implementation Patterns

### Pattern 1: Queue Integration for Rate-Limited Calls

**What:** All MusicBrainz API calls MUST go through `QueuedMusicBrainzService` to respect rate limits.
**When to use:** Any MB search, lookup, or browse operation.
**Trade-offs:** Adds latency (queue processing) but prevents 503 errors and bans.

**Example from existing codebase:**

```typescript
// From /src/lib/enrichment/preview-enrichment.ts
import { musicBrainzService } from '../musicbrainz';

// This already uses the queue internally for searches
const searchResults = await musicBrainzService.searchReleaseGroups(
  searchQuery,
  10
);
```

**For corrections:** Follow the same pattern. Don't bypass the queue even for admin operations.

### Pattern 2: Transaction for Atomic Updates

**What:** Use Prisma `$transaction` for multi-table corrections to ensure atomicity.
**When to use:** Any correction that updates the entity AND creates a log entry.
**Trade-offs:** Slightly more complex, but prevents partial updates.

**Example (new pattern for corrections):**

```typescript
// /src/lib/correction/apply-correction.ts
export async function applyAlbumCorrection(
  albumId: string,
  correctionData: CorrectionData,
  userId: string
): Promise<ApplyCorrectionResult> {
  const startTime = Date.now();

  return prisma.$transaction(async tx => {
    // 1. Get current state for diff
    const before = await tx.album.findUnique({
      where: { id: albumId },
      include: { artists: { include: { artist: true } } },
    });

    // 2. Update album
    const updated = await tx.album.update({
      where: { id: albumId },
      data: {
        ...correctionData.albumFields,
        dataQuality: 'HIGH',
        enrichmentStatus: 'COMPLETED',
        lastEnriched: new Date(),
      },
    });

    // 3. Handle artist updates if needed
    if (correctionData.artistFields) {
      await tx.albumArtist.deleteMany({ where: { albumId } });
      await tx.albumArtist.createMany({
        data: correctionData.artistFields,
      });
    }

    // 4. Create correction log (in same transaction)
    const log = await tx.enrichmentLog.create({
      data: {
        entityType: 'ALBUM',
        entityId: albumId,
        albumId: albumId,
        operation: 'MANUAL_CORRECTION',
        sources: ['MUSICBRAINZ', 'ADMIN'],
        status: 'SUCCESS',
        reason: correctionData.reason,
        fieldsEnriched: correctionData.fieldsApplied,
        dataQualityBefore: before?.dataQuality || 'LOW',
        dataQualityAfter: 'HIGH',
        durationMs: Date.now() - startTime,
        apiCallCount: 1,
        triggeredBy: 'admin_correction',
        userId: userId,
        metadata: {
          beforeState: serializeForLog(before),
          musicbrainzId: correctionData.musicbrainzId,
        },
      },
    });

    return {
      success: true,
      updatedEntity: updated,
      correctionLogId: log.id,
      fieldsUpdated: correctionData.fieldsApplied,
    };
  });
}
```

### Pattern 3: Resolver Pattern (Existing)

**What:** Keep resolvers thin, delegate to service layer.
**When to use:** All GraphQL resolvers.
**Trade-offs:** More files, but cleaner separation of concerns.

**Example from existing codebase:**

```typescript
// From /src/lib/graphql/resolvers/mutations.ts
import {
  previewAlbumEnrichment,
  previewArtistEnrichment,
} from '@/lib/enrichment/preview-enrichment';

// Thin resolver - just delegates
previewAlbumEnrichment: async (_, { id }, { user }) => {
  if (!user) throw new GraphQLError('Authentication required');
  if (!isAdmin(user.role)) throw new GraphQLError('Admin required');

  return previewAlbumEnrichment(id); // Service does the work
};
```

**For corrections:** Follow the same pattern.

## Anti-Patterns to Avoid

### Anti-Pattern 1: Bypassing the Queue

**What people do:** Call MusicBrainz API directly for "just one request"
**Why it's wrong:** Leads to rate limit errors (503), potential IP bans, inconsistent error handling
**Do this instead:** Always use `QueuedMusicBrainzService` or `musicBrainzService` which wraps it

### Anti-Pattern 2: Non-Atomic Corrections

**What people do:** Update entity first, then create log in separate operations
**Why it's wrong:** If log creation fails, you have an unaudited change
**Do this instead:** Use `prisma.$transaction` to ensure both succeed or both fail

### Anti-Pattern 3: Over-Engineering the Correction Type

**What people do:** Create entirely new types for corrections separate from enrichment
**Why it's wrong:** The existing `PreviewEnrichmentResult` type already has `fieldsToUpdate`, `matchScore`, etc.
**Do this instead:** Reuse existing types, extend only where necessary

### Anti-Pattern 4: Synchronous MB Calls in Resolvers

**What people do:** `await musicBrainzService.searchArtists(query)` directly in resolver
**Why it's wrong:** If the queue backs up, GraphQL timeout affects the request
**Do this instead:** For long-running operations, consider returning a job ID and polling, though for admin corrections the existing pattern works fine since admins can wait a few seconds.

## Build Order (Dependencies)

Based on the architecture, build in this order:

### Phase 1: Service Layer Foundation

1. **`/src/lib/correction/types.ts`** - Define TypeScript types for correction workflow
2. **`/src/lib/correction/correction-preview.ts`** - Extend preview-enrichment pattern
3. **`/src/lib/correction/apply-correction.ts`** - Transaction-based apply logic
4. **`/src/lib/correction/correction-service.ts`** - Orchestration layer
5. **`/src/lib/correction/index.ts`** - Clean exports

### Phase 2: GraphQL Integration

1. **Update `schema.graphql`** - Add new types and mutations
2. **Create `/src/lib/graphql/resolvers/correction-resolvers.ts`** - Thin resolvers
3. **Update `/src/lib/graphql/resolvers/index.ts`** - Export new resolvers
4. **Run `pnpm codegen`** - Generate TypeScript types and hooks

### Phase 3: UI Components

1. **`/src/components/admin/CorrectionSearchModal.tsx`** - Search UI
2. **Extend `EnrichmentPreviewResults.tsx`** - Add "Apply" button for corrections
3. **Update `/src/app/admin/music-database/page.tsx`** - Wire in correction flow

### Build Order Rationale

- Service layer first: Can be tested independently
- GraphQL second: Depends on service layer, generates hooks for UI
- UI last: Depends on generated hooks from codegen

## Integration with Existing Enrichment

### Relationship to Auto-Enrichment

The correction feature is **adjacent to** but **separate from** auto-enrichment:

| Aspect              | Auto-Enrichment                       | Manual Correction              |
| ------------------- | ------------------------------------- | ------------------------------ |
| Trigger             | User action (add to collection, etc.) | Admin explicit action          |
| Source selection    | Automatic best-match                  | Admin selects from candidates  |
| Field selection     | All available fields                  | Admin selects specific fields  |
| Logging operation   | `ENRICH_ALBUM`                        | `MANUAL_CORRECTION`            |
| Data quality result | Determined by match quality           | Always `HIGH` (admin verified) |

### Reusable Components

| Component                            | Reuse Strategy                                            |
| ------------------------------------ | --------------------------------------------------------- |
| `findBestAlbumMatch()`               | Use for initial ranking, but show all candidates to admin |
| `buildAlbumSearchQuery()`            | Use as default, allow admin override                      |
| `PreviewEnrichmentResult` type       | Reuse as-is for preview response                          |
| `EnrichmentFieldDiff` type           | Reuse for field diff display                              |
| `EnrichmentPreviewResults` component | Extend with "Apply" action button                         |
| `enrichmentLogger.logEnrichment()`   | Use with different `operation` value                      |

## Sources

- Existing codebase: `/src/lib/musicbrainz/queue-service.ts`
- Existing codebase: `/src/lib/enrichment/preview-enrichment.ts`
- Existing codebase: `/src/lib/graphql/resolvers/mutations.ts`
- Existing codebase: `/prisma/schema.prisma` (EnrichmentLog model)
- Project CLAUDE.md conventions

---

_Architecture research for: Admin Data Correction Feature_
_Researched: 2026-01-23_
_Confidence: HIGH - based on established patterns in existing codebase_
