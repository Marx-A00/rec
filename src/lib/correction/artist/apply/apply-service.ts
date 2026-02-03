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

import type { ArtistCorrectionPreview, MBArtistData } from '../preview/types';

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

      // 2. Build artist update data from preview and selections
      const artistUpdateData = this.buildArtistUpdateData(preview, selections);

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
        selections
      );

      // Build response
      const changes = this.buildAppliedChanges(
        beforeArtist,
        afterArtist!,
        result.affectedAlbumCount,
        selections
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
   * Builds Prisma update data from preview and selections.
   * Only includes fields where selection is true.
   */
  private buildArtistUpdateData(
    preview: ArtistCorrectionPreview,
    selections: ArtistFieldSelections
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
    if (selections.metadata.countryCode) {
      updateData.countryCode = mbData.country ?? null;
    }
    if (selections.metadata.artistType) {
      updateData.artistType = mbData.type ?? null;
    }
    if (selections.metadata.area) {
      updateData.area = mbData.area?.name ?? null;
    }
    if (selections.metadata.beginDate) {
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

    // External ID fields
    if (selections.externalIds.musicbrainzId && mbData.id) {
      updateData.musicbrainzId = mbData.id;
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
    selections: ArtistFieldSelections
  ): Promise<void> {
    try {
      // Build audit payload with only changed fields
      const auditPayload = this.buildAuditPayload(
        beforeArtist,
        afterArtist,
        selections
      );

      // Build list of changed field names
      const changedFields = this.getChangedFieldNames(auditPayload);

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
   * Builds audit log payload with before/after deltas.
   */
  private buildAuditPayload(
    beforeArtist: Artist,
    afterArtist: Artist,
    selections: ArtistFieldSelections
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

    // External ID deltas
    const externalIds: ArtistFieldDelta[] = [];
    if (
      selections.externalIds.musicbrainzId &&
      beforeArtist.musicbrainzId !== afterArtist.musicbrainzId
    ) {
      externalIds.push({
        field: 'musicbrainzId',
        before: beforeArtist.musicbrainzId,
        after: afterArtist.musicbrainzId,
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
    selections: ArtistFieldSelections
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

    const externalIds: string[] = [];
    if (
      selections.externalIds.musicbrainzId &&
      beforeArtist.musicbrainzId !== afterArtist.musicbrainzId
    ) {
      externalIds.push('musicbrainzId');
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
