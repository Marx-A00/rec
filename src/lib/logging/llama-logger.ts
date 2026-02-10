// src/lib/logging/llama-logger.ts
// Centralized logging system for tracking entity lifecycle operations (creation, enrichment, correction, caching)

import {
  PrismaClient,
  LlamaLog,
  LlamaLogCategory,
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
export type EnrichmentSource =
  | 'SPOTIFY'
  | 'MUSICBRAINZ'
  | 'DISCOGS'
  | 'LASTFM'
  | (string & {});

export interface LlamaLogData {
  entityType?: EnrichmentEntityType | null;
  entityId?: string | null;
  artistId?: string | null;
  albumId?: string | null;
  trackId?: string | null;
  operation: EnrichmentOperation;
  category?: LlamaLogCategory;
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
  /** Parent job ID for immediate parent tracking in job chains */
  parentJobId?: string | null;
  /** Root job ID for hierarchy queries (original album job). Auto-computed for root jobs. */
  rootJobId?: string | null;
  /** Whether this is a root job (true) or child job (false). Auto-computed from parentJobId if not provided. */
  isRootJob?: boolean;
  triggeredBy?: string | null;
  /** User ID for tracking manual/user-initiated operations */
  userId?: string | null;
}

/**
 * Infer category from operation and status
 */
function inferCategory(
  operation: EnrichmentOperation,
  status: EnrichmentStatus
): LlamaLogCategory {
  // Check for FAILED status first
  if (status === 'FAILED') {
    return 'FAILED';
  }

  // Check operation patterns
  const opLower = operation.toLowerCase();
  if (opLower.startsWith('cache:') || opLower.includes('cache')) {
    return 'CACHED';
  }
  if (opLower.includes('admin_correction') || opLower.includes('correction')) {
    return 'CORRECTED';
  }
  if (opLower.startsWith('enrichment:') || opLower.includes('enrich')) {
    return 'ENRICHED';
  }

  // Default to CREATED for unknown operations
  return 'CREATED';
}

export class LlamaLogger {
  private prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  /**
   * Log an enrichment operation
   * Non-blocking: errors are logged but not thrown
   */
  async logEnrichment(data: LlamaLogData): Promise<void> {
    try {
      // Determine which ID field to use based on entity type
      let artistId: string | null = null;
      let albumId: string | null = null;
      let trackId: string | null = null;

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

      // Auto-compute isRootJob from parentJobId if not explicitly provided
      const isRootJob =
        data.isRootJob !== undefined ? data.isRootJob : !data.parentJobId;

      // Compute rootJobId: use provided value, or set to jobId for root jobs
      const rootJobId = data.rootJobId ?? (isRootJob ? data.jobId : null);

      // Use provided category or infer from operation/status
      const category =
        data.category ?? inferCategory(data.operation, data.status);

      await this.prisma.llamaLog.create({
        data: {
          entityType: data.entityType ?? null,
          entityId: data.entityId ?? null,
          artistId,
          albumId,
          trackId,
          operation: data.operation,
          category,
          sources: data.sources,
          status: data.status,
          reason: data.reason ?? null,
          fieldsEnriched: data.fieldsEnriched,
          dataQualityBefore: data.dataQualityBefore ?? null,
          dataQualityAfter: data.dataQualityAfter ?? null,
          errorMessage: data.errorMessage ?? null,
          errorCode: data.errorCode ?? null,
          retryCount: data.retryCount ?? 0,
          durationMs: data.durationMs ?? null,
          apiCallCount: data.apiCallCount ?? 0,
          metadata: data.metadata
            ? (data.metadata as Prisma.InputJsonValue)
            : Prisma.JsonNull,
          jobId: data.jobId ?? null,
          parentJobId: data.parentJobId ?? null,
          rootJobId,
          isRootJob,
          triggeredBy: data.triggeredBy ?? null,
          userId: data.userId ?? null,
        },
      });

      const rootIndicator = isRootJob ? ' [ROOT]' : '';
      const rootInfo = rootJobId ? ` root:${rootJobId.slice(0, 8)}` : '';
      console.log(
        `[LlamaLogger] Logged ${data.operation} for ${data.entityType}:${data.entityId} - Status: ${data.status}${rootIndicator}${rootInfo}`
      );
    } catch (error) {
      console.warn('[LlamaLogger] Failed to log enrichment:', error);
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
  ): Promise<LlamaLog[]> {
    const whereClause = this.buildEntityWhereClause(entityType, entityId);

    return await this.prisma.llamaLog.findMany({
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
  ): Promise<LlamaLog | null> {
    const whereClause = this.buildEntityWhereClause(entityType, entityId);

    return await this.prisma.llamaLog.findFirst({
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

    const recentNoData = await this.prisma.llamaLog.findFirst({
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

    const recentFailure = await this.prisma.llamaLog.findFirst({
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

    const latestFailedAttempt = await this.prisma.llamaLog.findFirst({
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
 * Factory function to create a LlamaLogger instance
 */
export function createLlamaLogger(prisma: PrismaClient): LlamaLogger {
  return new LlamaLogger(prisma);
}
