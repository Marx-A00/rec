/**
 * ArtistCorrectionApplyService - Atomic artist correction application with audit logging.
 *
 * Applies admin corrections to artists using Prisma interactive transactions.
 * Ensures all-or-nothing updates with complete audit trail.
 *
 * Key features:
 * - Atomic transaction wrapping artist updates
 * - Optimistic locking via expectedUpdatedAt to prevent concurrent modifications
 * - Full audit logging with before/after field deltas
 * - Data quality updates (admin corrections = HIGH)
 * - Source-conditional external ID storage (musicbrainzId vs discogsId)
 * - Cloudflare image caching on imageUrl changes
 *
 * @example
 * ```typescript
 * import { getArtistCorrectionApplyService } from '@/lib/correction/artist/apply';
 *
 * const service = getArtistCorrectionApplyService();
 * const result = await service.applyCorrection({
 *   artistId: 'artist-123',
 *   preview: correctionPreview,
 *   selections: fieldSelections,
 *   expectedUpdatedAt: artist.updatedAt,
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
import type { Artist } from '@prisma/client';

import { prisma as defaultPrisma } from '@/lib/prisma';
import { getMusicBrainzQueue, JOB_TYPES } from '@/lib/queue';

import type { ArtistCorrectionPreview } from '../preview/types';

import type {
  ArtistApplyErrorCode,
  ArtistApplyInput,
  ArtistApplyResult,
  ArtistAppliedChanges,
  ArtistAuditLogPayload,
  ArtistFieldDelta,
  ArtistFieldSelections,
} from './types';

// ============================================================================
// Source Type
// ============================================================================

/** Correction source type - lowercase for service layer */
type CorrectionSource = 'musicbrainz' | 'discogs';

// ============================================================================
// Error Classes
// ============================================================================

/**
 * Error thrown when artist was modified between preview and apply.
 */
export class StaleDataError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'StaleDataError';
  }
}

// ============================================================================
// ArtistCorrectionApplyService Class
// ============================================================================

/**
 * Service for applying corrections to artists atomically.
 *
 * Uses Prisma interactive transactions to ensure all-or-nothing updates.
 * Implements optimistic locking to prevent concurrent modification conflicts.
 */
export class ArtistCorrectionApplyService {
  private prisma: PrismaClient;

  constructor(prisma?: PrismaClient) {
    this.prisma = prisma ?? (defaultPrisma as unknown as PrismaClient);
  }

  /**
   * Applies a correction to an artist atomically.
   *
   * @param input - Apply input containing artist ID, preview, selections, and admin info
   * @returns ArtistApplyResult indicating success with changes or failure with error
   */
  async applyCorrection(input: ArtistApplyInput): Promise<ArtistApplyResult> {
    const { artistId, preview, selections, expectedUpdatedAt, adminUserId } =
      input;

    try {
      // ================================================================
      // Pre-Transaction Phase: Prepare all data
      // ================================================================

      // 1. Fetch current artist state for audit log
      const beforeArtist = await this.prisma.artist.findUnique({
        where: { id: artistId },
      });

      if (!beforeArtist) {
        return this.createErrorResult(
          'ARTIST_NOT_FOUND',
          `Artist ${artistId} not found`
        );
      }

      // 2. Determine source from preview
      const source = this.determineSource(preview);

      // 3. Build artist update data from preview and selections
      const artistUpdateData = this.buildArtistUpdateData(
        preview,
        selections,
        source
      );

      // ================================================================
      // Transaction Phase: Apply all changes atomically
      // ================================================================

      const result = await this.prisma.$transaction(
        async tx => {
          // 1. Optimistic locking check
          const current = await tx.artist.findUnique({
            where: { id: artistId },
            select: { updatedAt: true },
          });

          if (!current) {
            throw new Error(`Artist ${artistId} not found during transaction`);
          }

          if (current.updatedAt.getTime() !== expectedUpdatedAt.getTime()) {
            throw new StaleDataError(
              'Artist was modified since preview was generated. Please refresh and try again.'
            );
          }

          // 2. Update artist fields (always update quality even if no metadata changes)
          const updateWithQuality = {
            ...artistUpdateData,
            dataQuality: 'HIGH' as const,
            enrichmentStatus: 'COMPLETED' as const,
            lastEnriched: new Date(),
          };

          const updatedArtist = await tx.artist.update({
            where: { id: artistId },
            data: updateWithQuality,
          });

          // 3. Count affected albums via albumArtist join
          const affectedAlbumCount = await tx.albumArtist.count({
            where: { artistId },
          });

          return {
            updatedArtist,
            affectedAlbumCount,
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

      // Fetch updated artist for audit "after" state
      const afterArtist = await this.prisma.artist.findUnique({
        where: { id: artistId },
      });

      // Log correction (outside transaction - logging failure should not fail correction)
      await this.logCorrection(
        artistId,
        adminUserId,
        beforeArtist,
        afterArtist!,
        selections,
        preview
      );

      // Queue Cloudflare image caching if imageUrl changed
      const imageChanged =
        afterArtist?.imageUrl &&
        beforeArtist.imageUrl !== afterArtist.imageUrl;
      if (imageChanged) {
        await this.queueImageUpload(artistId);
      }

      // Build response
      const changes = this.buildAppliedChanges(
        beforeArtist,
        afterArtist!,
        result.affectedAlbumCount,
        selections,
        source
      );

      return {
        success: true,
        artist: result.updatedArtist,
        changes,
        affectedAlbumCount: result.affectedAlbumCount,
      };
    } catch (error) {
      return this.handleError(error);
    }
  }

  // ============================================================================
  // Helper Methods
  // ============================================================================

  /**
   * Determines the correction source from preview data.
   * Discogs IDs are numeric strings, MusicBrainz IDs are UUIDs.
   */
  private determineSource(preview: ArtistCorrectionPreview): CorrectionSource {
    const id = preview.mbArtistData?.id;
    if (!id) {
      return 'musicbrainz'; // Default for backward compatibility
    }

    // Discogs IDs are purely numeric strings
    const isDiscogs = /^\d+$/.test(id);
    return isDiscogs ? 'discogs' : 'musicbrainz';
  }

  /**
   * Builds Prisma update data from preview and selections.
   * Only includes fields where selection is true.
   */
  private buildArtistUpdateData(
    preview: ArtistCorrectionPreview,
    selections: ArtistFieldSelections,
    source: CorrectionSource
  ): Prisma.ArtistUpdateInput {
    const updateData: Prisma.ArtistUpdateInput = {};
    const mbData = preview.mbArtistData;

    if (!mbData) {
      return updateData;
    }

    // Metadata fields
    if (selections.metadata.name && mbData.name) {
      updateData.name = mbData.name;
    }
    if (selections.metadata.disambiguation) {
      updateData.biography = mbData.disambiguation ?? null;
    }
    // Country, artistType, area, beginDate only from MusicBrainz (Discogs doesn't provide these)
    if (selections.metadata.countryCode && source === 'musicbrainz') {
      updateData.countryCode = mbData.country ?? null;
    }
    if (selections.metadata.artistType && source === 'musicbrainz') {
      updateData.artistType = mbData.type ?? null;
    }
    if (selections.metadata.area && source === 'musicbrainz') {
      updateData.area = mbData.area?.name ?? null;
    }
    if (selections.metadata.beginDate && source === 'musicbrainz') {
      // Store begin year as formedYear if available
      const beginYear = mbData.lifeSpan?.begin
        ? parseInt(mbData.lifeSpan.begin.substring(0, 4), 10)
        : null;
      if (beginYear && !isNaN(beginYear)) {
        updateData.formedYear = beginYear;
      }
    }
    // Note: endDate not stored in Artist model - could be added later
    // Note: gender not stored in Artist model - could be added later

    // External ID fields (source-conditional)
    if (source === 'musicbrainz' && selections.externalIds.musicbrainzId && mbData.id) {
      updateData.musicbrainzId = mbData.id;
      updateData.source = 'MUSICBRAINZ';
    } else if (source === 'discogs' && selections.externalIds.discogsId && mbData.id) {
      updateData.discogsId = mbData.id; // Already string (numeric)
      updateData.source = 'DISCOGS';
    }

    // Note: IPI and ISNI not stored in Artist model - could be added later

    return updateData;
  }

  /**
   * Creates an error result with the given code and message.
   */
  private createErrorResult(
    code: ArtistApplyErrorCode,
    message: string
  ): ArtistApplyResult {
    return {
      success: false,
      error: { code, message },
    };
  }

  /**
   * Handles errors and maps them to ArtistApplyResult.
   */
  private handleError(error: unknown): ArtistApplyResult {
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
          return this.createErrorResult('ARTIST_NOT_FOUND', 'Artist not found');
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
    artistId: string,
    adminUserId: string,
    beforeArtist: Artist,
    afterArtist: Artist,
    selections: ArtistFieldSelections,
    preview: ArtistCorrectionPreview
  ): Promise<void> {
    try {
      // Determine source from preview
      const source = this.determineSource(preview);

      // Build audit payload with only changed fields
      const auditPayload = this.buildAuditPayload(
        beforeArtist,
        afterArtist,
        selections,
        source
      );

      // Build list of changed field names
      const changedFields = this.getChangedFieldNames(auditPayload);

      await this.prisma.llamaLog.create({
        data: {
          entityType: 'ARTIST',
          artistId,
          userId: adminUserId,
          operation: 'admin_correction',
          status: 'SUCCESS',
          sources: [source], // Use actual source instead of hardcoded
          fieldsEnriched: changedFields,
          dataQualityBefore: beforeArtist.dataQuality,
          dataQualityAfter: 'HIGH',
          metadata: auditPayload as unknown as Prisma.JsonObject,
          triggeredBy: 'admin_ui',
        },
      });
    } catch (error) {
      // Log warning but don't fail the correction
      console.warn(
        '[ArtistCorrectionApplyService] Failed to log correction:',
        error
      );
    }
  }

  /**
   * Queue Cloudflare image caching for the artist.
   * Uses CACHE_ARTIST_IMAGE job via BullMQ.
   */
  private async queueImageUpload(artistId: string): Promise<void> {
    try {
      const queue = getMusicBrainzQueue();

      await queue.addJob(
        JOB_TYPES.CACHE_ARTIST_IMAGE,
        {
          artistId,
          requestId: `artist-correction-${artistId}-${Date.now()}`,
        },
        {
          priority: 6, // Medium priority for admin corrections
          attempts: 3,
          backoff: { type: 'exponential', delay: 2000 },
        }
      );

      console.log(
        `[ArtistCorrectionApplyService] Queued image caching for artist ${artistId}`
      );
    } catch (error) {
      // Log warning but don't fail the correction
      console.warn(
        '[ArtistCorrectionApplyService] Failed to queue image caching:',
        error
      );
    }
  }

  /**
   * Builds audit log payload with before/after deltas.
   */
  private buildAuditPayload(
    beforeArtist: Artist,
    afterArtist: Artist,
    selections: ArtistFieldSelections,
    source: CorrectionSource = 'musicbrainz'
  ): ArtistAuditLogPayload {
    // Metadata field deltas
    const metadata: ArtistFieldDelta[] = [];

    if (selections.metadata.name && beforeArtist.name !== afterArtist.name) {
      metadata.push({
        field: 'name',
        before: beforeArtist.name,
        after: afterArtist.name,
      });
    }
    if (
      selections.metadata.disambiguation &&
      beforeArtist.biography !== afterArtist.biography
    ) {
      metadata.push({
        field: 'disambiguation',
        before: beforeArtist.biography,
        after: afterArtist.biography,
      });
    }
    if (
      selections.metadata.countryCode &&
      beforeArtist.countryCode !== afterArtist.countryCode
    ) {
      metadata.push({
        field: 'countryCode',
        before: beforeArtist.countryCode,
        after: afterArtist.countryCode,
      });
    }
    if (
      selections.metadata.artistType &&
      beforeArtist.artistType !== afterArtist.artistType
    ) {
      metadata.push({
        field: 'artistType',
        before: beforeArtist.artistType,
        after: afterArtist.artistType,
      });
    }
    if (selections.metadata.area && beforeArtist.area !== afterArtist.area) {
      metadata.push({
        field: 'area',
        before: beforeArtist.area,
        after: afterArtist.area,
      });
    }
    if (
      selections.metadata.beginDate &&
      beforeArtist.formedYear !== afterArtist.formedYear
    ) {
      metadata.push({
        field: 'formedYear',
        before: beforeArtist.formedYear,
        after: afterArtist.formedYear,
      });
    }

    // External ID deltas (source-conditional)
    const externalIds: ArtistFieldDelta[] = [];

    if (
      source === 'musicbrainz' &&
      selections.externalIds.musicbrainzId &&
      beforeArtist.musicbrainzId !== afterArtist.musicbrainzId
    ) {
      externalIds.push({
        field: 'musicbrainzId',
        before: beforeArtist.musicbrainzId,
        after: afterArtist.musicbrainzId,
      });
    } else if (
      source === 'discogs' &&
      selections.externalIds.discogsId &&
      beforeArtist.discogsId !== afterArtist.discogsId
    ) {
      externalIds.push({
        field: 'discogsId',
        before: beforeArtist.discogsId,
        after: afterArtist.discogsId,
      });
    }

    return { metadata, externalIds };
  }

  /**
   * Gets list of changed field names from audit payload.
   */
  private getChangedFieldNames(payload: ArtistAuditLogPayload): string[] {
    const fields: string[] = [];

    for (const delta of payload.metadata) {
      fields.push(delta.field);
    }
    for (const delta of payload.externalIds) {
      fields.push(delta.field);
    }

    return fields;
  }

  /**
   * Builds the ArtistAppliedChanges response object.
   */
  private buildAppliedChanges(
    beforeArtist: Artist,
    afterArtist: Artist,
    affectedAlbumCount: number,
    selections: ArtistFieldSelections,
    source: CorrectionSource = 'musicbrainz'
  ): ArtistAppliedChanges {
    const metadata: string[] = [];

    if (selections.metadata.name && beforeArtist.name !== afterArtist.name) {
      metadata.push('name');
    }
    if (
      selections.metadata.disambiguation &&
      beforeArtist.biography !== afterArtist.biography
    ) {
      metadata.push('disambiguation');
    }
    if (
      selections.metadata.countryCode &&
      beforeArtist.countryCode !== afterArtist.countryCode
    ) {
      metadata.push('countryCode');
    }
    if (
      selections.metadata.artistType &&
      beforeArtist.artistType !== afterArtist.artistType
    ) {
      metadata.push('artistType');
    }
    if (selections.metadata.area && beforeArtist.area !== afterArtist.area) {
      metadata.push('area');
    }
    if (
      selections.metadata.beginDate &&
      beforeArtist.formedYear !== afterArtist.formedYear
    ) {
      metadata.push('formedYear');
    }

    // External IDs (source-conditional)
    const externalIds: string[] = [];

    if (
      source === 'musicbrainz' &&
      selections.externalIds.musicbrainzId &&
      beforeArtist.musicbrainzId !== afterArtist.musicbrainzId
    ) {
      externalIds.push('musicbrainzId');
    } else if (
      source === 'discogs' &&
      selections.externalIds.discogsId &&
      beforeArtist.discogsId !== afterArtist.discogsId
    ) {
      externalIds.push('discogsId');
    }

    return {
      metadata,
      externalIds,
      affectedAlbumCount,
      dataQualityBefore: beforeArtist.dataQuality ?? 'LOW',
      dataQualityAfter: 'HIGH',
    };
  }
}

// ============================================================================
// Singleton Export
// ============================================================================

/**
 * Global singleton for ArtistCorrectionApplyService.
 * Uses globalThis pattern for Next.js HMR safety.
 */
const globalForApply = globalThis as unknown as {
  artistCorrectionApplyService?: ArtistCorrectionApplyService;
};

/**
 * Get singleton ArtistCorrectionApplyService instance.
 * Safe for Next.js HMR in development.
 */
export function getArtistCorrectionApplyService(): ArtistCorrectionApplyService {
  if (!globalForApply.artistCorrectionApplyService) {
    globalForApply.artistCorrectionApplyService =
      new ArtistCorrectionApplyService();
  }
  return globalForApply.artistCorrectionApplyService;
}
