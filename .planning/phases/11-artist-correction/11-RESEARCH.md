# Phase 11: Artist Correction - Research

**Researched:** 2026-01-27
**Domain:** Artist correction workflow adaptation from album patterns
**Confidence:** HIGH

## Summary

Phase 11 adapts the established album correction workflow (Phases 2-10) for artist entities. The project has proven patterns for MusicBrainz search with scoring, preview generation with diff engine, and atomic application with audit logging. This phase extends those patterns to the Artist model, leveraging existing MusicBrainz artist search capabilities and the mature correction infrastructure.

Key architectural decisions from album correction carry over directly: queue-based search with ADMIN priority tier, service layer before GraphQL resolvers, pluggable scoring strategies with normalized/tiered/weighted options, session-only state management via useCorrectionModalState, and atomic transactions with enrichment logging. The main adaptation work involves mapping artist-specific fields (name, disambiguation, country, type, begin/end dates, gender, IPI, ISNI) to the existing preview and apply patterns.

MusicBrainz provides comprehensive artist data through the `/ws/2/artist` endpoint with extensive inc parameters (aliases, releases, release-groups, area-rels, tags, ratings). Artist search returns disambiguation, type (Person/Group/Orchestra/Choir/Character/Other), country, and life-span data. The Cover Art Archive has no artist images, so the UI will use placeholder avatars or omit images entirely.

User decisions from CONTEXT.md establish: "Fix Data" buttons in both artist table rows and detail pages, identical modal styling to album correction (1100px width, dark zinc theme), preview shows all available MusicBrainz fields including partial dates, search results include 2-3 top releases for artist disambiguation, selective field checkboxes for apply, and optional re-enrichment trigger for related albums after correction.

**Primary recommendation:** Create artist-specific service classes (ArtistCorrectionSearchService, ArtistCorrectionPreviewService, ArtistCorrectionApplyService) that mirror album service architecture. Extend GraphQL schema with artist correction types. Adapt existing CorrectionModal component structure or create ArtistCorrectionModal following identical UX patterns. Reuse all scoring, queueing, and state management infrastructure without modification.

## Standard Stack

All infrastructure exists in the project. No new dependencies required.

### Core

| Library         | Version | Purpose                     | Why Standard                                                        |
| --------------- | ------- | --------------------------- | ------------------------------------------------------------------- |
| musicbrainz-api | 0.25.1  | MusicBrainz artist API      | Already integrated, supports artist search and lookup with includes |
| BullMQ          | 4.15.0  | Queue with rate limiting    | Existing 1 req/sec pattern applies to artist operations             |
| Prisma          | current | Database ORM with relations | Artist model exists, AlbumArtist join table for cascading updates   |
| Apollo GraphQL  | current | API layer                   | Extend with artist correction types following album patterns        |
| TanStack Query  | v5      | Client data fetching        | Generated hooks for artist correction queries/mutations             |

### Supporting

| Library   | Version | Purpose                   | When to Use                                    |
| --------- | ------- | ------------------------- | ---------------------------------------------- |
| fuzzysort | 3.1.0   | Artist name matching      | Reuse existing scoring strategies for artists  |
| Redis     | 5.3.0   | Session state persistence | Optional for cross-session correction tracking |

### Alternatives Considered

None. Artist correction uses identical infrastructure to album correction. The decision to reuse patterns rather than rebuild is explicit in phase requirements.

## Architecture Patterns

### Recommended Project Structure

```
src/lib/correction/artist/
├── search-service.ts          # Artist search with scoring (mirrors album search-service.ts)
├── preview/
│   ├── preview-service.ts     # Fetch artist + MB artist, generate diffs
│   ├── diff-engine.ts         # Compare artist fields (name, country, dates, type)
│   ├── normalizers.ts         # Parse MusicBrainz artist response
│   └── types.ts               # ArtistCorrectionPreview, ArtistFieldDiff
├── apply/
│   ├── apply-service.ts       # Atomic artist update with AlbumArtist cascade
│   ├── field-selector.ts      # Build artist update data from selections
│   └── types.ts               # ArtistApplyInput, ArtistAppliedChanges
└── types.ts                   # Shared types: ArtistSearchResult, ArtistSelections

src/components/admin/correction/artist/
├── ArtistCorrectionModal.tsx  # Modal shell (same step pattern as album)
├── search/
│   ├── ArtistSearchView.tsx   # Search input + results
│   ├── ArtistSearchCard.tsx   # Result card with disambiguation + top releases
│   └── NoResultsState.tsx     # Reuse existing component
├── preview/
│   ├── ArtistPreviewView.tsx  # Field comparison layout
│   ├── ArtistFieldComparison.tsx  # Name, country, dates, type display
│   └── ReleasesList.tsx       # Show "X albums in database" + top MB releases
└── apply/
    ├── ArtistApplyView.tsx    # Field selection form
    ├── ArtistMetadataSection.tsx  # Checkboxes for name, country, dates
    └── ExternalIdSection.tsx  # Checkboxes for MBID, IPI, ISNI

src/graphql/
├── schema.graphql             # Extend with artist correction types
└── queries/
    ├── artistCorrectionSearch.graphql
    ├── artistCorrectionPreview.graphql
    └── mutations/artistCorrectionApply.graphql
```

### Pattern 1: Artist Search with Release Context

**What:** Artist search results include 2-3 top releases to help disambiguate common names
**When to use:** Artist search where multiple artists share the same name (e.g., "John Smith")
**Example:**

```typescript
// Source: Adapted from album CorrectionSearchService pattern
import { getQueuedMusicBrainzService } from '@/lib/musicbrainz/queue-service';
import { PRIORITY_TIERS } from '@/lib/queue';

export interface ArtistSearchResult {
  artistMbid: string;
  name: string;
  sortName: string;
  disambiguation?: string;
  type?: 'Person' | 'Group' | 'Orchestra' | 'Choir' | 'Character' | 'Other';
  country?: string;
  area?: string;
  beginDate?: string; // Partial date: "1965" or "1965-03" or "1965-03-21"
  endDate?: string;
  ended?: boolean;
  gender?: string;
  mbScore: number;
  topReleases?: Array<{
    // NEW: For disambiguation in UI
    title: string;
    year?: string;
    type?: string;
  }>;
}

export class ArtistCorrectionSearchService {
  private mbService = getQueuedMusicBrainzService();

  async search(query: string, limit = 10): Promise<ArtistSearchResult[]> {
    // Search artists with ADMIN priority
    const artists = await this.mbService.searchArtists(
      query,
      limit,
      0,
      PRIORITY_TIERS.ADMIN
    );

    // For each artist, fetch top 3 releases for context
    const resultsWithReleases = await Promise.all(
      artists.map(async artist => {
        try {
          // Fetch top 3 release groups by this artist
          const releases = await this.mbService.getArtistReleaseGroups(
            artist.id,
            3,
            0
          );

          return {
            ...this.mapToArtistResult(artist),
            topReleases:
              releases.releaseGroups?.slice(0, 3).map(rg => ({
                title: rg.title,
                year: rg.firstReleaseDate?.substring(0, 4),
                type: rg.primaryType,
              })) || [],
          };
        } catch (error) {
          // If release fetch fails, still return artist without releases
          console.warn(`Failed to fetch releases for artist ${artist.id}`);
          return this.mapToArtistResult(artist);
        }
      })
    );

    return resultsWithReleases;
  }

  private mapToArtistResult(artist: ArtistSearchResult): ArtistSearchResult {
    return {
      artistMbid: artist.id,
      name: artist.name,
      sortName: artist.sortName,
      disambiguation: artist.disambiguation,
      type: artist.type as ArtistSearchResult['type'],
      country: artist.country,
      area: artist.lifeSpan?.area,
      beginDate: artist.lifeSpan?.begin,
      endDate: artist.lifeSpan?.end,
      ended: artist.lifeSpan?.ended,
      gender: artist.gender,
      mbScore: artist.score,
    };
  }
}
```

### Pattern 2: Artist Preview with Album Context

**What:** Preview shows artist changes plus count of albums in database by this artist
**When to use:** Artist preview step to give admin context about correction impact
**Example:**

```typescript
// Source: Adapted from album CorrectionPreviewService pattern
import { prisma } from '@/lib/prisma';
import { getQueuedMusicBrainzService } from '@/lib/musicbrainz/queue-service';
import { PRIORITY_TIERS } from '@/lib/queue';

export interface ArtistCorrectionPreview {
  currentArtist: Artist;
  sourceResult: ArtistSearchResult;
  mbArtistData: MBArtistData | null;
  fieldDiffs: ArtistFieldDiff[];
  albumCount: number; // NEW: How many albums will be affected
  summary: {
    totalFields: number;
    changedFields: number;
    addedFields: number;
    modifiedFields: number;
  };
}

export class ArtistCorrectionPreviewService {
  private mbService = getQueuedMusicBrainzService();

  async generatePreview(
    artistId: string,
    searchResult: ArtistSearchResult
  ): Promise<ArtistCorrectionPreview> {
    // Fetch current artist
    const currentArtist = await prisma.artist.findUnique({
      where: { id: artistId },
    });

    if (!currentArtist) {
      throw new Error(`Artist not found: ${artistId}`);
    }

    // Count albums by this artist (for impact context)
    const albumCount = await prisma.albumArtist.count({
      where: { artistId },
    });

    // Fetch full MusicBrainz artist data
    const mbArtistData = await this.fetchMBArtistData(searchResult.artistMbid);

    // Generate field diffs
    const fieldDiffs = this.generateFieldDiffs(currentArtist, mbArtistData);

    // Generate summary
    const summary = this.generateSummary(fieldDiffs);

    return {
      currentArtist,
      sourceResult: searchResult,
      mbArtistData,
      fieldDiffs,
      albumCount,
      summary,
    };
  }

  private async fetchMBArtistData(
    artistMbid: string
  ): Promise<MBArtistData | null> {
    try {
      const data = await this.mbService.getArtist(
        artistMbid,
        ['aliases', 'area-rels', 'tags', 'ratings', 'release-groups'],
        PRIORITY_TIERS.ADMIN
      );

      return this.transformMBArtist(data);
    } catch (error) {
      console.error('Failed to fetch MusicBrainz artist:', error);
      return null;
    }
  }

  private generateFieldDiffs(
    currentArtist: Artist,
    mbData: MBArtistData | null
  ): ArtistFieldDiff[] {
    const diffs: ArtistFieldDiff[] = [];

    // Name
    diffs.push({
      field: 'name',
      changeType: this.classifyChange(currentArtist.name, mbData?.name),
      current: currentArtist.name,
      source: mbData?.name || null,
    });

    // Disambiguation
    diffs.push({
      field: 'disambiguation',
      changeType: this.classifyChange(
        currentArtist.disambiguation,
        mbData?.disambiguation
      ),
      current: currentArtist.disambiguation,
      source: mbData?.disambiguation || null,
    });

    // Country
    diffs.push({
      field: 'countryCode',
      changeType: this.classifyChange(
        currentArtist.countryCode,
        mbData?.country
      ),
      current: currentArtist.countryCode,
      source: mbData?.country || null,
    });

    // Type
    diffs.push({
      field: 'artistType',
      changeType: this.classifyChange(currentArtist.artistType, mbData?.type),
      current: currentArtist.artistType,
      source: mbData?.type || null,
    });

    // Begin date (partial dates preserved)
    diffs.push({
      field: 'beginDate',
      changeType: this.classifyChange(
        currentArtist.beginDate,
        mbData?.lifeSpan?.begin
      ),
      current: currentArtist.beginDate,
      source: mbData?.lifeSpan?.begin || null,
    });

    // End date
    diffs.push({
      field: 'endDate',
      changeType: this.classifyChange(
        currentArtist.endDate,
        mbData?.lifeSpan?.end
      ),
      current: currentArtist.endDate,
      source: mbData?.lifeSpan?.end || null,
    });

    // Gender (for Person type)
    if (mbData?.type === 'Person') {
      diffs.push({
        field: 'gender',
        changeType: this.classifyChange(currentArtist.gender, mbData?.gender),
        current: currentArtist.gender,
        source: mbData?.gender || null,
      });
    }

    // Area (city/region)
    diffs.push({
      field: 'area',
      changeType: this.classifyChange(currentArtist.area, mbData?.area?.name),
      current: currentArtist.area,
      source: mbData?.area?.name || null,
    });

    // MusicBrainz ID
    diffs.push({
      field: 'musicbrainzId',
      changeType: this.classifyChange(currentArtist.musicbrainzId, mbData?.id),
      current: currentArtist.musicbrainzId,
      source: mbData?.id || null,
    });

    // IPI codes (first IPI only for simplicity)
    const firstIPI = mbData?.ipis?.[0];
    diffs.push({
      field: 'ipi',
      changeType: this.classifyChange(currentArtist.ipi, firstIPI),
      current: currentArtist.ipi,
      source: firstIPI || null,
    });

    // ISNI codes (first ISNI only)
    const firstISNI = mbData?.isnis?.[0];
    diffs.push({
      field: 'isni',
      changeType: this.classifyChange(currentArtist.isni, firstISNI),
      current: currentArtist.isni,
      source: firstISNI || null,
    });

    return diffs;
  }

  private classifyChange(
    current: string | null | undefined,
    source: string | null | undefined
  ): 'UNCHANGED' | 'ADDED' | 'MODIFIED' | 'REMOVED' | 'CONFLICT' {
    if (current === source) return 'UNCHANGED';
    if (!current && source) return 'ADDED';
    if (current && !source) return 'REMOVED';
    if (current && source && current !== source) return 'MODIFIED';
    return 'UNCHANGED';
  }

  private generateSummary(diffs: ArtistFieldDiff[]) {
    const changedFields = diffs.filter(d => d.changeType !== 'UNCHANGED');
    return {
      totalFields: diffs.length,
      changedFields: changedFields.length,
      addedFields: diffs.filter(d => d.changeType === 'ADDED').length,
      modifiedFields: diffs.filter(d => d.changeType === 'MODIFIED').length,
    };
  }
}
```

### Pattern 3: Artist Apply with Album Cascade

**What:** Applying artist correction cascades to AlbumArtist records (albums get updated artist)
**When to use:** Artist apply step when admin confirms field selections
**Example:**

```typescript
// Source: Adapted from album ApplyCorrectionService pattern
import { Prisma, PrismaClient } from '@prisma/client';
import { prisma as defaultPrisma } from '@/lib/prisma';

export interface ArtistApplyInput {
  artistId: string;
  preview: ArtistCorrectionPreview;
  selections: ArtistFieldSelections;
  expectedUpdatedAt: Date;
  adminUserId: string;
  reenrichAlbums?: boolean; // NEW: Trigger album re-enrichment
}

export class ArtistCorrectionApplyService {
  private prisma: PrismaClient;

  constructor(prisma?: PrismaClient) {
    this.prisma = prisma ?? defaultPrisma;
  }

  async applyCorrection(input: ArtistApplyInput): Promise<ArtistApplyResult> {
    const { artistId, preview, selections, expectedUpdatedAt, adminUserId } =
      input;

    try {
      // Fetch current artist state for audit
      const beforeArtist = await this.prisma.artist.findUnique({
        where: { id: artistId },
      });

      if (!beforeArtist) {
        return {
          success: false,
          error: {
            code: 'ARTIST_NOT_FOUND',
            message: `Artist ${artistId} not found`,
          },
        };
      }

      // Transaction: update artist + log correction
      const result = await this.prisma.$transaction(
        async tx => {
          // Optimistic locking check
          const current = await tx.artist.findUnique({
            where: { id: artistId },
            select: { updatedAt: true },
          });

          if (!current) {
            throw new Error(`Artist ${artistId} not found during transaction`);
          }

          if (current.updatedAt.getTime() !== expectedUpdatedAt.getTime()) {
            throw new StaleDataError(
              'Artist was modified since preview. Please refresh.'
            );
          }

          // Build update data from selections
          const updateData = this.buildArtistUpdateData(preview, selections);

          // Apply updates with HIGH data quality
          const updatedArtist = await tx.artist.update({
            where: { id: artistId },
            data: {
              ...updateData,
              dataQuality: 'HIGH',
              enrichmentStatus: 'COMPLETED',
              lastEnriched: new Date(),
            },
          });

          // Cascade update to AlbumArtist records
          // This ensures albums show the correct artist name/info
          const albumArtists = await tx.albumArtist.findMany({
            where: { artistId },
            select: { albumId: true },
          });

          // Note: Prisma doesn't have cascade update, but AlbumArtist links
          // by ID, so albums will automatically reflect new artist data
          // when they query through the relation.
          // If we stored denormalized artist names on albums, we'd update them here.

          return { updatedArtist, affectedAlbumCount: albumArtists.length };
        },
        {
          timeout: 10000,
          isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
        }
      );

      // Post-transaction: Audit logging
      await this.logCorrection(
        artistId,
        adminUserId,
        beforeArtist,
        result.updatedArtist,
        selections
      );

      // Optional: Trigger re-enrichment of affected albums
      if (input.reenrichAlbums) {
        // Queue enrichment jobs for each album
        // Implementation depends on enrichment queue system
        console.log(
          `Queued re-enrichment for ${result.affectedAlbumCount} albums`
        );
      }

      return {
        success: true,
        artist: result.updatedArtist,
        changes: this.buildAppliedChanges(
          beforeArtist,
          result.updatedArtist,
          selections
        ),
        affectedAlbumCount: result.affectedAlbumCount,
      };
    } catch (error) {
      return this.handleError(error);
    }
  }

  private buildArtistUpdateData(
    preview: ArtistCorrectionPreview,
    selections: ArtistFieldSelections
  ): Prisma.ArtistUpdateInput {
    const data: Prisma.ArtistUpdateInput = {};

    // Apply selected metadata fields
    if (selections.metadata.name && preview.mbArtistData?.name) {
      data.name = preview.mbArtistData.name;
    }
    if (
      selections.metadata.disambiguation &&
      preview.mbArtistData?.disambiguation
    ) {
      data.disambiguation = preview.mbArtistData.disambiguation;
    }
    if (selections.metadata.countryCode && preview.mbArtistData?.country) {
      data.countryCode = preview.mbArtistData.country;
    }
    if (selections.metadata.artistType && preview.mbArtistData?.type) {
      data.artistType = preview.mbArtistData.type;
    }
    if (selections.metadata.area && preview.mbArtistData?.area?.name) {
      data.area = preview.mbArtistData.area.name;
    }
    if (
      selections.metadata.beginDate &&
      preview.mbArtistData?.lifeSpan?.begin
    ) {
      data.beginDate = preview.mbArtistData.lifeSpan.begin;
    }
    if (selections.metadata.endDate && preview.mbArtistData?.lifeSpan?.end) {
      data.endDate = preview.mbArtistData.lifeSpan.end;
    }
    if (selections.metadata.gender && preview.mbArtistData?.gender) {
      data.gender = preview.mbArtistData.gender;
    }

    // Apply external IDs
    if (selections.externalIds.musicbrainzId && preview.mbArtistData?.id) {
      data.musicbrainzId = preview.mbArtistData.id;
    }
    if (selections.externalIds.ipi && preview.mbArtistData?.ipis?.[0]) {
      data.ipi = preview.mbArtistData.ipis[0];
    }
    if (selections.externalIds.isni && preview.mbArtistData?.isnis?.[0]) {
      data.isni = preview.mbArtistData.isnis[0];
    }

    return data;
  }

  private async logCorrection(
    artistId: string,
    adminUserId: string,
    beforeArtist: Artist,
    afterArtist: Artist,
    selections: ArtistFieldSelections
  ): Promise<void> {
    try {
      const changedFields = this.getChangedFieldNames(
        beforeArtist,
        afterArtist
      );

      await this.prisma.enrichmentLog.create({
        data: {
          entityType: 'ARTIST',
          artistId,
          userId: adminUserId,
          operation: 'admin_correction',
          status: 'SUCCESS',
          sources: ['musicbrainz'],
          fieldsEnriched: changedFields,
          dataQualityBefore: beforeArtist.dataQuality,
          dataQualityAfter: 'HIGH',
          metadata: {
            before: this.serializeArtist(beforeArtist),
            after: this.serializeArtist(afterArtist),
            selections,
          } as unknown as Prisma.JsonObject,
          triggeredBy: 'admin_ui',
        },
      });
    } catch (error) {
      console.warn('[ArtistCorrectionApplyService] Logging failed:', error);
    }
  }

  private getChangedFieldNames(before: Artist, after: Artist): string[] {
    const fields: string[] = [];
    if (before.name !== after.name) fields.push('name');
    if (before.disambiguation !== after.disambiguation)
      fields.push('disambiguation');
    if (before.countryCode !== after.countryCode) fields.push('countryCode');
    if (before.artistType !== after.artistType) fields.push('artistType');
    if (before.area !== after.area) fields.push('area');
    if (before.beginDate !== after.beginDate) fields.push('beginDate');
    if (before.endDate !== after.endDate) fields.push('endDate');
    if (before.gender !== after.gender) fields.push('gender');
    if (before.musicbrainzId !== after.musicbrainzId)
      fields.push('musicbrainzId');
    if (before.ipi !== after.ipi) fields.push('ipi');
    if (before.isni !== after.isni) fields.push('isni');
    return fields;
  }

  private serializeArtist(artist: Artist) {
    return {
      name: artist.name,
      disambiguation: artist.disambiguation,
      countryCode: artist.countryCode,
      artistType: artist.artistType,
      area: artist.area,
      beginDate: artist.beginDate,
      endDate: artist.endDate,
      gender: artist.gender,
      musicbrainzId: artist.musicbrainzId,
      ipi: artist.ipi,
      isni: artist.isni,
    };
  }

  private buildAppliedChanges(
    before: Artist,
    after: Artist,
    selections: ArtistFieldSelections
  ): ArtistAppliedChanges {
    const metadata: string[] = [];
    if (selections.metadata.name && before.name !== after.name)
      metadata.push('name');
    if (
      selections.metadata.disambiguation &&
      before.disambiguation !== after.disambiguation
    )
      metadata.push('disambiguation');
    // ... etc for all fields

    const externalIds: string[] = [];
    if (
      selections.externalIds.musicbrainzId &&
      before.musicbrainzId !== after.musicbrainzId
    )
      externalIds.push('musicbrainzId');
    // ... etc

    return {
      metadata,
      externalIds,
      dataQualityBefore: before.dataQuality ?? 'LOW',
      dataQualityAfter: 'HIGH',
    };
  }

  private handleError(error: unknown): ArtistApplyResult {
    if (error instanceof StaleDataError) {
      return {
        success: false,
        error: { code: 'STALE_DATA', message: error.message },
      };
    }

    const message = error instanceof Error ? error.message : 'Unknown error';
    return {
      success: false,
      error: { code: 'TRANSACTION_FAILED', message },
    };
  }
}
```

### Anti-Patterns to Avoid

**Don't create separate queue infrastructure for artists**
Artists use the same MusicBrainz queue with ADMIN priority. No need for artist-specific queue or priority tier.

**Don't rebuild scoring from scratch**
The existing scoring strategies (normalized, tiered, weighted) work for artist name matching. Extend the search-scoring service to accept artist results, don't create artist-specific scorers.

**Don't skip optimistic locking**
Artist corrections must use expectedUpdatedAt checks just like albums. Concurrent edits to the same artist are rare but catastrophic if allowed.

**Don't denormalize artist data onto albums**
Album→Artist relation is through AlbumArtist join table. Don't copy artist names/countries onto Album model. Let Prisma relations handle data fetching.

## Don't Hand-Roll

Problems with existing solutions:

| Problem                  | Don't Build             | Use Instead                                        | Why                                                          |
| ------------------------ | ----------------------- | -------------------------------------------------- | ------------------------------------------------------------ |
| Artist search scoring    | Custom artist matcher   | Extend existing SearchScoringService               | Normalized/tiered/weighted strategies work for artist names  |
| Diff visualization       | Artist-specific diff UI | Reuse FieldComparison components with artist props | Album field diff pattern applies to artist fields            |
| Partial date handling    | Custom date parser      | Store as-is from MusicBrainz, display as text      | MB partial dates ("1965", "1965-03") don't need parsing      |
| Artist type enum         | Database enum           | Store as string, validate in application layer     | MusicBrainz types can change, string is more flexible        |
| Album cascade updates    | Manual AlbumArtist sync | Let Prisma relations handle                        | No denormalization needed, relations are efficient           |
| Modal state management   | Artist-specific state   | Extend useCorrectionModalState with artist mode    | Session storage pattern works for both albums and artists    |
| Re-enrichment triggering | Custom enrichment queue | Use existing enrichment job queue                  | BullMQ queue already handles album enrichment, add job types |

**Key insight:** Artist correction is 95% pattern reuse. The 5% of new code is artist-specific field mapping, not infrastructure.

## Common Pitfalls

### Pitfall 1: MusicBrainz Artist Type Confusion

**What goes wrong:** Treating "artist type" as a database enum instead of freeform string
**Why it happens:** MusicBrainz supports Person, Group, Orchestra, Choir, Character, Other, and may add new types
**How to avoid:** Store artist type as VARCHAR(20), validate at application layer, display as plain text
**Warning signs:** Migration failures when MusicBrainz adds new artist types (e.g., "Ensemble", "Collaboration")

### Pitfall 2: Partial Date Parsing

**What goes wrong:** Trying to parse "1965" or "1965-03" into full Date objects
**Why it happens:** Assuming all dates are complete YYYY-MM-DD format
**How to avoid:** Store begin/end dates as VARCHAR, preserve MusicBrainz precision, display as-is in UI
**Warning signs:** "Invalid date" errors when processing historic artists with only year data

### Pitfall 3: Artist Search Without Release Context

**What goes wrong:** Showing 10 results all named "John Smith" with no way to distinguish
**Why it happens:** Artist names alone don't disambiguate (unlike album title + artist)
**How to avoid:** Fetch top 2-3 releases per artist in search results, show release titles as subtitles
**Warning signs:** Admin confusion, wrong artist selection, corrections applied to wrong artist entity

### Pitfall 4: Ignoring AlbumArtist Position

**What goes wrong:** Updating artist cascades to albums but breaks artist credit ordering
**Why it happens:** AlbumArtist has a position field for multi-artist albums (Various Artists)
**How to avoid:** Don't modify AlbumArtist records during artist correction, only update Artist table
**Warning signs:** Album artist credits reorder after correction, "feat." artists swap positions

### Pitfall 5: Re-enrichment Without User Consent

**What goes wrong:** Automatically triggering enrichment for 500+ albums after artist correction
**Why it happens:** Assuming re-enrichment is always desired
**How to avoid:** Make re-enrichment opt-in with "Re-enrich X albums?" prompt on success
**Warning signs:** Queue flooding, slow admin UI, unexpected album metadata changes

### Pitfall 6: Gender Field for Groups

**What goes wrong:** Showing gender selection for artist type "Group" or "Orchestra"
**Why it happens:** Not checking artist type before rendering gender field
**How to avoid:** Only show gender field when type is "Person", hide for all other types
**Warning signs:** Nonsensical gender values on band entities, user confusion

### Pitfall 7: IPI/ISNI Multi-Value Flattening

**What goes wrong:** Artist has 3 IPI codes, correction only saves first one
**Why it happens:** IPI and ISNI are arrays in MusicBrainz, single fields in database
**How to avoid:** Store first value only, document limitation, add note in UI "First IPI shown"
**Warning signs:** Missing IPI codes after correction, admin reports "data disappeared"

## Code Examples

Verified patterns from the correction infrastructure:

### Reusing Album Scoring for Artists

```typescript
// Source: Adapted from existing SearchScoringService (src/lib/correction/scoring/index.ts)
import { getSearchScoringService } from '@/lib/correction/scoring';

// Scoring works for artists too - just pass artist name as "album" query
const scoringService = getSearchScoringService();

const scoredArtists = scoringService.scoreResults(
  artistSearchResults,
  artistQueryName, // Use artist name as primary query
  undefined, // No secondary query for artists
  { strategy: 'normalized', lowConfidenceThreshold: 0.5 }
);

// Returns ScoredSearchResult[] with normalizedScore, displayScore, breakdown
```

### Extending useCorrectionModalState for Artists

```typescript
// Source: Extend existing hook (src/hooks/useCorrectionModalState.ts)
export function useCorrectionModalState(
  entityId: string | null,
  entityType: 'album' | 'artist' = 'album' // NEW: Support both
) {
  const storageKey = entityId
    ? `correction-modal-${entityType}-${entityId}` // Separate namespaces
    : null;

  // Rest of hook logic stays identical
  // Step management, selectedResultMbid, manualEditMode all work the same
}
```

### Artist Search Result Card with Top Releases

```typescript
// Source: New component, follows SearchResultCard.tsx pattern
export function ArtistSearchCard({
  artist,
  onSelect,
}: {
  artist: ScoredArtistSearchResult;
  onSelect: () => void;
}) {
  return (
    <div className="border rounded p-4 hover:bg-zinc-800 cursor-pointer" onClick={onSelect}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <h3 className="font-medium text-white">{artist.name}</h3>
          {artist.disambiguation && (
            <p className="text-sm text-zinc-400 mt-0.5">{artist.disambiguation}</p>
          )}
          <div className="flex gap-3 mt-2 text-xs text-zinc-500">
            {artist.type && <span>{artist.type}</span>}
            {artist.country && <span>{artist.country}</span>}
            {artist.beginDate && <span>Born: {artist.beginDate}</span>}
          </div>
          {/* NEW: Top releases for disambiguation */}
          {artist.topReleases && artist.topReleases.length > 0 && (
            <div className="mt-3 space-y-1">
              <p className="text-xs text-zinc-600 uppercase tracking-wide">Top Releases</p>
              {artist.topReleases.map((release, i) => (
                <div key={i} className="text-xs text-zinc-400">
                  {release.title} {release.year && `(${release.year})`}
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="ml-4">
          <Badge variant="secondary">{Math.round(artist.normalizedScore * 100)}%</Badge>
        </div>
      </div>
    </div>
  );
}
```

### Artist Field Diff with Partial Dates

```typescript
// Source: Adapt FieldComparison component for artist fields
export function ArtistFieldComparison({ diff }: { diff: ArtistFieldDiff }) {
  const renderValue = (value: string | null, field: string) => {
    if (!value) return <span className="text-zinc-600">—</span>;

    // Partial dates displayed as-is (no parsing)
    if (field === 'beginDate' || field === 'endDate') {
      return <span className="font-mono">{value}</span>;
    }

    // Artist type displayed as plain text
    if (field === 'artistType') {
      return <Badge variant="outline">{value}</Badge>;
    }

    return <span>{value}</span>;
  };

  return (
    <div className="flex items-start justify-between py-2 border-b border-zinc-800">
      <span className="text-sm text-zinc-400 w-32">{diff.field}</span>
      <div className="flex-1 flex gap-4">
        <div className="flex-1">
          <span className="text-xs text-zinc-600">Current</span>
          <div className="mt-1">{renderValue(diff.current, diff.field)}</div>
        </div>
        <div className="flex-1">
          <span className="text-xs text-zinc-600">Source</span>
          <div className="mt-1">{renderValue(diff.source, diff.field)}</div>
        </div>
      </div>
      <Badge variant={changeTypeVariant(diff.changeType)}>
        {diff.changeType}
      </Badge>
    </div>
  );
}
```

## State of the Art

| Old Approach                   | Current Approach                 | When Changed | Impact                                               |
| ------------------------------ | -------------------------------- | ------------ | ---------------------------------------------------- |
| Manual artist enrichment       | Admin correction workflow        | Phase 11     | Structured process, audit trail, quality tracking    |
| Direct MusicBrainz API calls   | Queue-based rate limiting        | Phase 1      | No rate limit violations, reliable service           |
| Single scoring strategy        | Pluggable scoring (3 strategies) | Phase 2      | Admins can experiment, pick best for their data      |
| Full database refresh          | Selective field application      | Phase 9      | Preserve good data, only update incorrect fields     |
| Album-only correction          | Album + Artist correction        | Phase 11     | Complete data quality coverage for music entities    |
| No cascade handling            | AlbumArtist-aware corrections    | Phase 11     | Artist changes reflected on all linked albums        |
| Manual enrichment coordination | Optional re-enrichment trigger   | Phase 11     | Efficient bulk album updates after artist correction |

**Deprecated/outdated:**

None. Artist correction is new functionality. Album correction patterns established in Phases 2-10 are current best practices.

## Open Questions

Things that couldn't be fully resolved:

1. **Artist Image Handling**
   - What we know: Cover Art Archive doesn't host artist photos, only release art
   - What's unclear: Should UI show placeholder avatars, initials, or omit images entirely?
   - Recommendation: Start with no images (cleaner than placeholder), revisit if user feedback requests them. Could integrate Spotify artist images in future phase.

2. **Multi-Value IPI/ISNI Storage**
   - What we know: MusicBrainz returns arrays of IPI/ISNI codes, database schema has single fields
   - What's unclear: Should we extend Artist model to support multiple codes, or accept first-only limitation?
   - Recommendation: Store first value only for MVP. Add note in preview UI "First IPI shown (X others available)". Future enhancement: add ArtistIPI/ArtistISNI join tables.

3. **Re-enrichment Scope**
   - What we know: Artist corrections can affect hundreds of albums
   - What's unclear: Should re-enrichment be per-album (slow), batch (complex), or skip entirely?
   - Recommendation: Implement as optional POST-correction operation with progress UI. Queue enrichment jobs for affected albums with USER priority. Admin sees "Re-enriching 47 albums..." progress bar.

4. **Artist Search Pre-fill**
   - What we know: Album search pre-fills with current album title + artist name
   - What's unclear: Should artist search pre-fill with just name, or name + disambiguation, or name + country?
   - Recommendation: Pre-fill with name + disambiguation if available (matches MB query pattern). Country is useful for multi-result disambiguation but shouldn't filter initial search.

## Sources

### Primary (HIGH confidence)

- MusicBrainz API Documentation - [https://musicbrainz.org/doc/MusicBrainz_API](https://musicbrainz.org/doc/MusicBrainz_API)
- MusicBrainz Artist Entity - [https://musicbrainz.org/doc/Artist](https://musicbrainz.org/doc/Artist)
- Existing album correction services (search-service.ts, preview-service.ts, apply-service.ts) - Verified implementation patterns
- CONTEXT.md Phase 11 decisions - User requirements and UX specifications
- Prisma schema.prisma - Artist model fields and relations

### Secondary (MEDIUM confidence)

- MusicBrainz API Search - [https://musicbrainz.org/doc/MusicBrainz_API/Search](https://musicbrainz.org/doc/MusicBrainz_API/Search)
- MusicBrainz Database Schema - [https://musicbrainz.org/doc/MusicBrainz_Database/Schema](https://musicbrainz.org/doc/MusicBrainz_Database/Schema)
- Python musicbrainzngs documentation - [https://python-musicbrainzngs.readthedocs.io/en/latest/api/](https://python-musicbrainzngs.readthedocs.io/en/latest/api/)

### Tertiary (LOW confidence)

None. All findings verified against codebase or official MusicBrainz documentation.

## Metadata

**Confidence breakdown:**

- Standard stack: HIGH - All libraries already integrated and proven in album correction
- Architecture: HIGH - Direct adaptation of verified album correction patterns
- Pitfalls: HIGH - Artist-specific issues documented from MusicBrainz data model

**Research date:** 2026-01-27
**Valid until:** 60 days (stable domain - MusicBrainz API rarely changes)
