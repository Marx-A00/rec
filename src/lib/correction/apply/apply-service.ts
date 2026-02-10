/**
 * ApplyCorrectionService - Atomic correction application with audit logging.
 *
 * Applies admin corrections to albums using Prisma interactive transactions.
 * Ensures all-or-nothing updates with complete audit trail.
 *
 * Key features:
 * - Atomic transaction wrapping album, track, and artist updates
 * - Optimistic locking via expectedUpdatedAt to prevent concurrent modifications
 * - Full audit logging with before/after field deltas
 * - Data quality updates (admin corrections = HIGH)
 *
 * @example
 * ```typescript
 * import { applyCorrectionService } from '@/lib/correction/apply';
 *
 * const result = await applyCorrectionService.applyCorrection({
 *   albumId: 'album-123',
 *   preview: correctionPreview,
 *   selections: fieldSelections,
 *   expectedUpdatedAt: album.updatedAt,
 *   adminUserId: 'admin-456',
 * });
 *
 * if (result.success) {
 *   console.log('Applied changes:', result.changes);
 * } else {
 *   console.error('Failed:', result.error);
 * }
 * ```
 */

import { Prisma, PrismaClient } from '@prisma/client';
import type { Album, AlbumArtist, Artist, Track } from '@prisma/client';

import { prisma as defaultPrisma } from '@/lib/prisma';

import type { CorrectionPreview, MBRecording } from '../preview/types';

import {
  buildAlbumUpdateData,
  buildTrackCreateData,
  buildTrackUpdateData,
  hasAnyMetadataSelected,
} from './field-selector';
import { matchTracks, type TrackMatch } from './track-matcher';
import type {
  ApplyErrorCode,
  ApplyInput,
  ApplyResult,
  AppliedChanges,
  ArtistChangeLog,
  AuditLogPayload,
  FieldDelta,
  FieldSelections,
  TrackChangeLog,
} from './types';

// ============================================================================
// Error Classes
// ============================================================================

/**
 * Error thrown when album was modified between preview and apply.
 */
export class StaleDataError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'StaleDataError';
  }
}

// ============================================================================
// Types
// ============================================================================

/**
 * Album with relations for before-state capture.
 */
type AlbumWithRelations = Album & {
  tracks: Track[];
  artists: Array<AlbumArtist & { artist: Artist }>;
};

/**
 * Artist info from MusicBrainz source.
 */
interface SourceArtist {
  mbid: string;
  name: string;
}

// ============================================================================
// ApplyCorrectionService Class
// ============================================================================

/**
 * Service for applying corrections to albums atomically.
 *
 * Uses Prisma interactive transactions to ensure all-or-nothing updates.
 * Implements optimistic locking to prevent concurrent modification conflicts.
 */
export class ApplyCorrectionService {
  private prisma: PrismaClient;

  constructor(prisma?: PrismaClient) {
    this.prisma = prisma ?? defaultPrisma;
  }

  /**
   * Applies a correction to an album atomically.
   *
   * @param input - Apply input containing album ID, preview, selections, and admin info
   * @returns ApplyResult indicating success with changes or failure with error
   */
  async applyCorrection(input: ApplyInput): Promise<ApplyResult> {
    const { albumId, preview, selections, expectedUpdatedAt, adminUserId } =
      input;

    try {
      // ================================================================
      // Pre-Transaction Phase: Prepare all data
      // ================================================================

      // 1. Fetch current album state for audit log
      const beforeAlbum = await this.prisma.album.findUnique({
        where: { id: albumId },
        include: {
          tracks: { orderBy: [{ discNumber: 'asc' }, { trackNumber: 'asc' }] },
          artists: {
            include: { artist: true },
            orderBy: { position: 'asc' },
          },
        },
      });

      if (!beforeAlbum) {
        return this.createErrorResult(
          'ALBUM_NOT_FOUND',
          `Album ${albumId} not found`
        );
      }

      // 2. Extract MB tracks from preview
      const mbTracks = this.extractMBTracks(preview);

      // 3. Match tracks (position-first, similarity-fallback)
      const trackMatches = matchTracks(beforeAlbum.tracks, mbTracks);

      // 4. Prepare source artists from preview
      const sourceArtists = this.extractSourceArtists(preview, selections);

      // 5. Build album update data
      const albumUpdateData = hasAnyMetadataSelected(selections)
        ? buildAlbumUpdateData(preview, selections)
        : {};

      // ================================================================
      // Transaction Phase: Apply all changes atomically
      // ================================================================

      const result = await this.prisma.$transaction(
        async tx => {
          // 1. Optimistic locking check
          const current = await tx.album.findUnique({
            where: { id: albumId },
            select: { updatedAt: true },
          });

          if (!current) {
            throw new Error(`Album ${albumId} not found during transaction`);
          }

          if (current.updatedAt.getTime() !== expectedUpdatedAt.getTime()) {
            throw new StaleDataError(
              'Album was modified since preview was generated. Please refresh and try again.'
            );
          }

          // 2. Update album fields (if any selected)
          let updatedAlbum: Album;
          if (Object.keys(albumUpdateData).length > 0) {
            // Set data quality to HIGH for admin corrections
            const updateWithQuality = {
              ...albumUpdateData,
              dataQuality: 'HIGH' as const,
              enrichmentStatus: 'COMPLETED' as const,
            };

            updatedAlbum = await tx.album.update({
              where: { id: albumId },
              data: updateWithQuality,
            });
          } else {
            // Still update quality even if no metadata changes
            updatedAlbum = await tx.album.update({
              where: { id: albumId },
              data: {
                dataQuality: 'HIGH',
                enrichmentStatus: 'COMPLETED',
                lastEnriched: new Date(),
              },
            });
          }

          // 3. Update artist associations
          const artistChanges = await this.updateArtists(
            tx,
            albumId,
            sourceArtists,
            beforeAlbum.artists,
            selections
          );

          // 4. Update tracks
          const trackChanges = await this.updateTracks(
            tx,
            albumId,
            trackMatches,
            selections
          );

          // 5. Update trackCount to match actual track count after changes
          const actualTrackCount = await tx.track.count({
            where: { albumId },
          });
          await tx.album.update({
            where: { id: albumId },
            data: { trackCount: actualTrackCount },
          });

          // 6. Fetch updated album with relations for response
          const afterAlbum = await tx.album.findUnique({
            where: { id: albumId },
            include: {
              tracks: {
                orderBy: [{ discNumber: 'asc' }, { trackNumber: 'asc' }],
              },
              artists: { include: { artist: true } },
            },
          });

          if (!afterAlbum) {
            throw new Error('Album disappeared during transaction');
          }

          return {
            updatedAlbum,
            afterAlbum,
            artistChanges,
            trackChanges,
          };
        },
        {
          timeout: 10000, // 10s for admin operations
          isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
        }
      );

      // ================================================================
      // Post-Transaction Phase: Audit logging
      // ================================================================

      // Log correction (outside transaction - logging failure should not fail correction)
      await this.logCorrection(
        albumId,
        adminUserId,
        beforeAlbum,
        result.afterAlbum,
        trackMatches,
        result.artistChanges,
        result.trackChanges,
        selections,
        preview
      );

      // Build response
      const changes = this.buildAppliedChanges(
        beforeAlbum,
        result.afterAlbum,
        result.artistChanges,
        result.trackChanges,
        selections,
        preview
      );

      return {
        success: true,
        album: result.updatedAlbum,
        changes,
      };
    } catch (error) {
      return this.handleError(error);
    }
  }

  // ============================================================================
  // Helper Methods
  // ============================================================================

  /**
   * Extracts MusicBrainz tracks from preview with disc number.
   */
  private extractMBTracks(preview: CorrectionPreview): MBRecording[] {
    if (!preview.mbReleaseData?.media) {
      return [];
    }

    const tracks: MBRecording[] = [];
    for (const medium of preview.mbReleaseData.media) {
      for (const track of medium.tracks) {
        // Add discNumber to the recording
        tracks.push({
          ...track.recording,
          position: track.position,
          // Cast to include discNumber (matches track-matcher expectation)
          discNumber: medium.position,
        } as MBRecording & { discNumber: number });
      }
    }
    return tracks;
  }

  /**
   * Extracts source artists from preview based on selections.
   */
  private extractSourceArtists(
    preview: CorrectionPreview,
    selections: FieldSelections
  ): SourceArtist[] {
    if (!preview.artistDiff?.source) {
      return [];
    }

    return preview.artistDiff.source
      .filter(artist => {
        // Check if this artist is selected
        const key = artist.mbid ?? artist.name;
        return selections.artists.get(key) === true;
      })
      .map(artist => ({
        mbid: artist.mbid,
        name: artist.name,
      }));
  }

  /**
   * Updates artist associations for the album.
   * Strategy: Delete all existing, upsert and link selected source artists.
   */
  private async updateArtists(
    tx: Prisma.TransactionClient,
    albumId: string,
    sourceArtists: SourceArtist[],
    beforeArtists: Array<AlbumArtist & { artist: Artist }>,
    selections: FieldSelections
  ): Promise<{ added: string[]; removed: string[] }> {
    // If no artists selected, don't change anything
    if (selections.artists.size === 0 || sourceArtists.length === 0) {
      return { added: [], removed: [] };
    }

    // Track before state for audit
    const beforeNames = beforeArtists.map(aa => aa.artist.name);

    // Delete all existing artist associations
    await tx.albumArtist.deleteMany({ where: { albumId } });

    // Upsert each source artist and create association
    const addedNames: string[] = [];
    for (let i = 0; i < sourceArtists.length; i++) {
      const artist = sourceArtists[i];

      // Upsert artist by MusicBrainz ID
      const upsertedArtist = await tx.artist.upsert({
        where: { musicbrainzId: artist.mbid },
        create: {
          musicbrainzId: artist.mbid,
          name: artist.name,
          source: 'MUSICBRAINZ',
          dataQuality: 'HIGH',
          enrichmentStatus: 'COMPLETED',
          lastEnriched: new Date(),
        },
        update: {
          // Only update name if artist exists
          name: artist.name,
          lastEnriched: new Date(),
        },
      });

      // Create album-artist association
      await tx.albumArtist.create({
        data: {
          albumId,
          artistId: upsertedArtist.id,
          role: 'primary',
          position: i,
        },
      });

      addedNames.push(artist.name);
    }

    // Calculate removed (in before but not in added)
    const removed = beforeNames.filter(name => !addedNames.includes(name));
    const added = addedNames.filter(name => !beforeNames.includes(name));

    return { added, removed };
  }

  /**
   * Updates tracks based on matches and selections.
   */
  private async updateTracks(
    tx: Prisma.TransactionClient,
    albumId: string,
    trackMatches: TrackMatch[],
    selections: FieldSelections
  ): Promise<{ added: number; modified: number; removed: number }> {
    let added = 0;
    let modified = 0;
    let removed = 0;

    // Process each track match
    for (const match of trackMatches) {
      switch (match.matchType) {
        case 'POSITION':
        case 'TITLE_SIMILARITY': {
          // Existing track matched to MB track - potentially modify
          if (match.dbTrack && match.mbTrack) {
            const updateData = buildTrackUpdateData(
              match.mbTrack,
              match.dbTrack,
              selections
            );

            if (updateData) {
              await tx.track.update({
                where: { id: match.dbTrack.id },
                data: updateData,
              });
              modified++;
            }
          }
          break;
        }

        case 'NEW': {
          // New track from MB - create if track changes are selected
          if (match.mbTrack) {
            // Check if any track is selected (indicating user wants track updates)
            const anyTrackSelected = Array.from(
              selections.tracks.values()
            ).some(Boolean);
            if (anyTrackSelected || selections.tracks.size === 0) {
              // If no tracks explicitly selected, still add new tracks
              const createData = buildTrackCreateData(
                match.mbTrack,
                albumId,
                match.discNumber
              );
              await tx.track.create({ data: createData });
              added++;
            }
          }
          break;
        }

        case 'ORPHANED': {
          // DB track not in MB - potentially delete
          if (match.dbTrack) {
            const discNum = match.dbTrack.discNumber ?? 1;
            const positionKey = discNum + '-' + match.dbTrack.trackNumber;
            const shouldDelete =
              selections.tracks.get(positionKey) === true ||
              selections.tracks.get(match.dbTrack.id) === true;
            if (shouldDelete) {
              await tx.track.delete({ where: { id: match.dbTrack.id } });
              removed++;
            }
          }
          break;
        }
      }
    }

    return { added, modified, removed };
  }

  /**
   * Creates an error result with the given code and message.
   */
  private createErrorResult(
    code: ApplyErrorCode,
    message: string
  ): ApplyResult {
    return {
      success: false,
      error: { code, message },
    };
  }

  /**
   * Handles errors and maps them to ApplyResult.
   */
  private handleError(error: unknown): ApplyResult {
    if (error instanceof StaleDataError) {
      return this.createErrorResult('STALE_DATA', error.message);
    }

    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      switch (error.code) {
        case 'P2034':
          return this.createErrorResult(
            'TRANSACTION_FAILED',
            'Transaction failed due to write conflict or deadlock'
          );
        case 'P2025':
          return this.createErrorResult('ALBUM_NOT_FOUND', 'Album not found');
        default:
          return this.createErrorResult(
            'TRANSACTION_FAILED',
            `Database error: ${error.code} - ${error.message}`
          );
      }
    }

    // Generic error
    const message = error instanceof Error ? error.message : 'Unknown error';
    return this.createErrorResult('TRANSACTION_FAILED', message);
  }

  /**
   * Logs the correction to enrichment_logs table.
   * Called AFTER transaction succeeds. Logging failure should not fail the correction.
   */
  private async logCorrection(
    albumId: string,
    adminUserId: string,
    beforeAlbum: AlbumWithRelations,
    afterAlbum: AlbumWithRelations,
    trackMatches: TrackMatch[],
    artistChanges: { added: string[]; removed: string[] },
    _trackChanges: { added: number; modified: number; removed: number },
    selections: FieldSelections,
    preview: CorrectionPreview
  ): Promise<void> {
    try {
      // Determine source from preview (default to musicbrainz for backward compatibility)
      const source = preview.sourceResult.source || 'musicbrainz';

      // Build audit payload with only changed fields
      const auditPayload = this.buildAuditPayload(
        beforeAlbum,
        afterAlbum,
        trackMatches,
        artistChanges,
        selections,
        preview
      );

      // Build list of changed field names
      const changedFields = this.getChangedFieldNames(auditPayload);

      await this.prisma.llamaLog.create({
        data: {
          entityType: 'ALBUM',
          albumId,
          userId: adminUserId,
          operation: 'admin_correction',
          category: 'CORRECTED',
          status: 'SUCCESS',
          sources: [source],
          fieldsEnriched: changedFields,
          dataQualityBefore: beforeAlbum.dataQuality,
          dataQualityAfter: 'HIGH',
          metadata: auditPayload as unknown as Prisma.JsonObject,
          triggeredBy: 'admin_ui',
        },
      });
    } catch (error) {
      // Log warning but don't fail the correction
      console.warn('[ApplyCorrectionService] Failed to log correction:', error);
    }
  }

  /**
   * Builds audit log payload with before/after deltas.
   */
  private buildAuditPayload(
    beforeAlbum: AlbumWithRelations,
    afterAlbum: AlbumWithRelations,
    trackMatches: TrackMatch[],
    artistChanges: { added: string[]; removed: string[] },
    selections: FieldSelections,
    preview: CorrectionPreview
  ): AuditLogPayload {
    // Determine source from preview (default to musicbrainz for backward compatibility)
    const source = preview.sourceResult.source || 'musicbrainz';

    // Metadata field deltas
    const metadata: FieldDelta[] = [];

    if (selections.metadata.title && beforeAlbum.title !== afterAlbum.title) {
      metadata.push({
        field: 'title',
        before: beforeAlbum.title,
        after: afterAlbum.title,
      });
    }
    if (selections.metadata.releaseDate) {
      const beforeDate =
        beforeAlbum.releaseDate?.toISOString().split('T')[0] ?? null;
      const afterDate =
        afterAlbum.releaseDate?.toISOString().split('T')[0] ?? null;
      if (beforeDate !== afterDate) {
        metadata.push({
          field: 'releaseDate',
          before: beforeDate,
          after: afterDate,
        });
      }
    }
    if (
      selections.metadata.releaseType &&
      beforeAlbum.releaseType !== afterAlbum.releaseType
    ) {
      metadata.push({
        field: 'releaseType',
        before: beforeAlbum.releaseType,
        after: afterAlbum.releaseType,
      });
    }
    if (
      selections.metadata.releaseCountry &&
      beforeAlbum.releaseCountry !== afterAlbum.releaseCountry
    ) {
      metadata.push({
        field: 'releaseCountry',
        before: beforeAlbum.releaseCountry,
        after: afterAlbum.releaseCountry,
      });
    }
    if (
      selections.metadata.barcode &&
      beforeAlbum.barcode !== afterAlbum.barcode
    ) {
      metadata.push({
        field: 'barcode',
        before: beforeAlbum.barcode,
        after: afterAlbum.barcode,
      });
    }

    // External ID deltas (source-conditional)
    const externalIds: FieldDelta[] = [];
    if (source === 'musicbrainz') {
      if (
        selections.externalIds.musicbrainzId &&
        beforeAlbum.musicbrainzId !== afterAlbum.musicbrainzId
      ) {
        externalIds.push({
          field: 'musicbrainzId',
          before: beforeAlbum.musicbrainzId,
          after: afterAlbum.musicbrainzId,
        });
      }
    } else if (source === 'discogs') {
      if (
        selections.externalIds.discogsId &&
        beforeAlbum.discogsId !== afterAlbum.discogsId
      ) {
        externalIds.push({
          field: 'discogsId',
          before: beforeAlbum.discogsId,
          after: afterAlbum.discogsId,
        });
      }
    }

    // Track change logs - build explicitly to avoid type inference issues
    const tracks: TrackChangeLog[] = [];

    for (const match of trackMatches) {
      if (match.matchType === 'NEW' && match.mbTrack) {
        tracks.push({
          action: 'added',
          trackTitle: match.mbTrack.title,
          position: match.position,
          discNumber: match.discNumber,
        });
      } else if (match.matchType === 'ORPHANED' && match.dbTrack) {
        tracks.push({
          action: 'removed',
          trackTitle: match.dbTrack.title,
          position: match.position,
          discNumber: match.discNumber,
        });
      } else if (
        (match.matchType === 'POSITION' ||
          match.matchType === 'TITLE_SIMILARITY') &&
        match.dbTrack &&
        match.mbTrack
      ) {
        const deltas: FieldDelta[] = [];
        if (match.dbTrack.title !== match.mbTrack.title) {
          deltas.push({
            field: 'title',
            before: match.dbTrack.title,
            after: match.mbTrack.title,
          });
        }
        if (match.dbTrack.durationMs !== match.mbTrack.length) {
          deltas.push({
            field: 'durationMs',
            before: match.dbTrack.durationMs,
            after: match.mbTrack.length ?? null,
          });
        }
        if (deltas.length > 0) {
          tracks.push({
            action: 'modified',
            trackTitle: match.mbTrack.title,
            position: match.position,
            discNumber: match.discNumber,
            deltas,
          });
        }
      }
    }

    // Artist change logs
    const artists: ArtistChangeLog[] = [
      ...artistChanges.added.map(
        (name): ArtistChangeLog => ({ action: 'added', artistName: name })
      ),
      ...artistChanges.removed.map(
        (name): ArtistChangeLog => ({ action: 'removed', artistName: name })
      ),
    ];

    // Cover art delta
    let coverArt: FieldDelta | null = null;
    if (
      selections.coverArt !== 'keep_current' &&
      beforeAlbum.coverArtUrl !== afterAlbum.coverArtUrl
    ) {
      coverArt = {
        field: 'coverArtUrl',
        before: beforeAlbum.coverArtUrl,
        after: afterAlbum.coverArtUrl,
      };
    }

    return { metadata, tracks, artists, externalIds, coverArt };
  }

  /**
   * Gets list of changed field names from audit payload.
   */
  private getChangedFieldNames(payload: AuditLogPayload): string[] {
    const fields: string[] = [];

    for (const delta of payload.metadata) {
      fields.push(delta.field);
    }
    for (const delta of payload.externalIds) {
      fields.push(delta.field);
    }
    if (payload.tracks.length > 0) {
      fields.push('tracks');
    }
    if (payload.artists.length > 0) {
      fields.push('artists');
    }
    if (payload.coverArt) {
      fields.push('coverArt');
    }

    return fields;
  }

  /**
   * Builds the AppliedChanges response object.
   */
  private buildAppliedChanges(
    beforeAlbum: AlbumWithRelations,
    afterAlbum: AlbumWithRelations,
    artistChanges: { added: string[]; removed: string[] },
    trackChanges: { added: number; modified: number; removed: number },
    selections: FieldSelections,
    preview: CorrectionPreview
  ): AppliedChanges {
    // Determine source from preview (default to musicbrainz for backward compatibility)
    const source = preview.sourceResult.source || 'musicbrainz';

    const metadata: string[] = [];

    if (selections.metadata.title && beforeAlbum.title !== afterAlbum.title) {
      metadata.push('title');
    }
    if (selections.metadata.releaseDate) {
      const beforeDate = beforeAlbum.releaseDate?.getTime();
      const afterDate = afterAlbum.releaseDate?.getTime();
      if (beforeDate !== afterDate) {
        metadata.push('releaseDate');
      }
    }
    if (
      selections.metadata.releaseType &&
      beforeAlbum.releaseType !== afterAlbum.releaseType
    ) {
      metadata.push('releaseType');
    }
    if (
      selections.metadata.releaseCountry &&
      beforeAlbum.releaseCountry !== afterAlbum.releaseCountry
    ) {
      metadata.push('releaseCountry');
    }
    if (
      selections.metadata.barcode &&
      beforeAlbum.barcode !== afterAlbum.barcode
    ) {
      metadata.push('barcode');
    }

    // External IDs (source-conditional)
    const externalIds: string[] = [];
    if (source === 'musicbrainz') {
      if (
        selections.externalIds.musicbrainzId &&
        beforeAlbum.musicbrainzId !== afterAlbum.musicbrainzId
      ) {
        externalIds.push('musicbrainzId');
      }
    } else if (source === 'discogs') {
      if (
        selections.externalIds.discogsId &&
        beforeAlbum.discogsId !== afterAlbum.discogsId
      ) {
        externalIds.push('discogsId');
      }
    }

    const coverArtChanged =
      selections.coverArt !== 'keep_current' &&
      beforeAlbum.coverArtUrl !== afterAlbum.coverArtUrl;

    return {
      metadata,
      artists: artistChanges,
      tracks: trackChanges,
      externalIds,
      coverArt: coverArtChanged,
      dataQualityBefore: beforeAlbum.dataQuality ?? 'LOW',
      dataQualityAfter: 'HIGH',
    };
  }
}

// ============================================================================
// Singleton Export
// ============================================================================

/**
 * Global singleton for ApplyCorrectionService.
 * Uses globalThis pattern for Next.js HMR safety.
 */
const globalForApply = globalThis as unknown as {
  applyCorrectionService?: ApplyCorrectionService;
};

export const applyCorrectionService =
  globalForApply.applyCorrectionService ?? new ApplyCorrectionService();

if (process.env.NODE_ENV !== 'production') {
  globalForApply.applyCorrectionService = applyCorrectionService;
}
