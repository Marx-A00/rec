// src/lib/enrichment/enrichment-logger.ts
// Centralized enrichment logging system for tracking data enrichment operations

import {
  PrismaClient,
  EnrichmentLog,
  EnrichmentEntityType,
  EnrichmentStatus,
  DataQuality,
  Prisma,
} from '@prisma/client';
import { JOB_TYPES } from '@/lib/queue/jobs';

/**
 * Common enrichment operation types
 * Uses actual job type constants for type safety, but allows custom strings
 */
export type EnrichmentOperation =
  | typeof JOB_TYPES.ENRICH_ARTIST
  | typeof JOB_TYPES.ENRICH_ALBUM
  | typeof JOB_TYPES.ENRICH_TRACK
  | typeof JOB_TYPES.CHECK_ARTIST_ENRICHMENT
  | typeof JOB_TYPES.CHECK_ALBUM_ENRICHMENT
  | typeof JOB_TYPES.CHECK_TRACK_ENRICHMENT
  | typeof JOB_TYPES.CACHE_ARTIST_IMAGE
  | typeof JOB_TYPES.CACHE_ALBUM_COVER_ART
  | (string & {}); // Allow any string, but suggest the above types in IDE

/**
 * Common data sources used in enrichment operations
 */
export type EnrichmentSource = 'SPOTIFY' | 'MUSICBRAINZ' | 'DISCOGS' | 'LASTFM' | (string & {});

export interface EnrichmentLogData {
  entityType?: EnrichmentEntityType | null;
  entityId?: string | null;
  artistId?: string | null;
  albumId?: string | null;
  trackId?: string | null;
  operation: EnrichmentOperation;
  sources: EnrichmentSource[];
  status: EnrichmentStatus;
  reason?: string | null;
  fieldsEnriched: string[];
  dataQualityBefore?: DataQuality | null;
  dataQualityAfter?: DataQuality | null;
  errorMessage?: string | null;
  errorCode?: string | null;
  retryCount?: number;
  durationMs?: number | null;
  apiCallCount?: number;
  metadata?: Record<string, unknown> | null;
  jobId?: string | null;
  triggeredBy?: string | null;
}

export class EnrichmentLogger {
  private prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  /**
   * Log an enrichment operation
   * Non-blocking: errors are logged but not thrown
   */
  async logEnrichment(data: EnrichmentLogData): Promise<void> {
    try {
      // Determine which ID field to use based on entity type
      let artistId: string | undefined;
      let albumId: string | undefined;
      let trackId: string | undefined;

      if (data.entityType === 'ARTIST' && data.entityId) {
        artistId = data.entityId;
      } else if (data.artistId) {
        artistId = data.artistId;
      }

      if (data.entityType === 'ALBUM' && data.entityId) {
        albumId = data.entityId;
      } else if (data.albumId) {
        albumId = data.albumId;
      }

      if (data.entityType === 'TRACK' && data.entityId) {
        trackId = data.entityId;
      } else if (data.trackId) {
        trackId = data.trackId;
      }

      await this.prisma.enrichmentLog.create({
        data: {
          entityType: data.entityType ?? undefined,
          entityId: data.entityId ?? undefined,
          artistId,
          albumId,
          trackId,
          operation: data.operation,
          sources: data.sources,
          status: data.status,
          reason: data.reason ?? undefined,
          fieldsEnriched: data.fieldsEnriched,
          dataQualityBefore: data.dataQualityBefore ?? undefined,
          dataQualityAfter: data.dataQualityAfter ?? undefined,
          errorMessage: data.errorMessage ?? undefined,
          errorCode: data.errorCode ?? undefined,
          retryCount: data.retryCount ?? 0,
          durationMs: data.durationMs ?? undefined,
          apiCallCount: data.apiCallCount ?? 0,
          metadata: data.metadata
            ? (data.metadata as Prisma.InputJsonValue)
            : undefined,
          jobId: data.jobId ?? undefined,
          triggeredBy: data.triggeredBy ?? undefined,
        },
      });

      console.log(
        `[EnrichmentLogger] Logged ${data.operation} for ${data.entityType}:${data.entityId} - Status: ${data.status}`
      );
    } catch (error) {
      console.warn('[EnrichmentLogger] Failed to log enrichment:', error);
      // Don't throw - logging shouldn't break the enrichment process
    }
  }

  /**
   * Get enrichment history for an entity
   */
  async getHistory(
    entityType: EnrichmentEntityType,
    entityId: string,
    limit: number = 50
  ): Promise<EnrichmentLog[]> {
    const whereClause = this.buildEntityWhereClause(entityType, entityId);

    return await this.prisma.enrichmentLog.findMany({
      where: whereClause,
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  /**
   * Get the most recent enrichment attempt for an entity
   */
  async getLatestAttempt(
    entityType: EnrichmentEntityType,
    entityId: string
  ): Promise<EnrichmentLog | null> {
    const whereClause = this.buildEntityWhereClause(entityType, entityId);

    return await this.prisma.enrichmentLog.findFirst({
      where: whereClause,
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Check if entity has recent NO_DATA_AVAILABLE status
   * Used to avoid re-attempting enrichment for entities with no data
   */
  async hasRecentNoDataStatus(
    entityType: EnrichmentEntityType,
    entityId: string,
    withinDays: number = 90
  ): Promise<boolean> {
    const whereClause = this.buildEntityWhereClause(entityType, entityId);
    const timeWindow = new Date(Date.now() - withinDays * 24 * 60 * 60 * 1000);

    const recentNoData = await this.prisma.enrichmentLog.findFirst({
      where: {
        ...whereClause,
        status: 'NO_DATA_AVAILABLE',
        createdAt: { gte: timeWindow },
      },
    });

    return recentNoData !== null;
  }

  /**
   * Check if entity has recent failure status
   * Used to implement cooldown period after failures
   */
  async hasRecentFailure(
    entityType: EnrichmentEntityType,
    entityId: string,
    withinDays: number = 7
  ): Promise<boolean> {
    const whereClause = this.buildEntityWhereClause(entityType, entityId);
    const timeWindow = new Date(Date.now() - withinDays * 24 * 60 * 60 * 1000);

    const recentFailure = await this.prisma.enrichmentLog.findFirst({
      where: {
        ...whereClause,
        status: 'FAILED',
        createdAt: { gte: timeWindow },
      },
    });

    return recentFailure !== null;
  }

  /**
   * Get retry count from the most recent failed attempt
   */
  async getRetryCount(
    entityType: EnrichmentEntityType,
    entityId: string
  ): Promise<number> {
    const whereClause = this.buildEntityWhereClause(entityType, entityId);

    const latestFailedAttempt = await this.prisma.enrichmentLog.findFirst({
      where: {
        ...whereClause,
        status: 'FAILED',
      },
      orderBy: { createdAt: 'desc' },
      select: { retryCount: true },
    });

    return latestFailedAttempt?.retryCount ?? 0;
  }

  /**
   * Helper method to build where clause for entity queries
   */
  private buildEntityWhereClause(
    entityType: EnrichmentEntityType,
    entityId: string
  ): Record<string, unknown> {
    switch (entityType) {
      case 'ARTIST':
        return { artistId: entityId };
      case 'ALBUM':
        return { albumId: entityId };
      case 'TRACK':
        return { trackId: entityId };
      default:
        return { entityType, entityId };
    }
  }
}

/**
 * Factory function to create an EnrichmentLogger instance
 */
export function createEnrichmentLogger(
  prisma: PrismaClient
): EnrichmentLogger {
  return new EnrichmentLogger(prisma);
}
