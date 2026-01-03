// Activity Logger
// Centralized logging for all data changes (enrichment, manual edits, automated processes)

import {
  PrismaClient,
  EnrichmentEntityType,
  EnrichmentStatus,
  DataQuality,
} from '@prisma/client';

// Operation types - extend this as needed
export const OPERATIONS = {
  // External API enrichment operations
  MUSICBRAINZ_FETCH: 'MUSICBRAINZ_FETCH',
  SPOTIFY_SYNC: 'SPOTIFY_SYNC',
  CACHE_COVER_ART: 'CACHE_COVER_ART',
  LASTFM_FETCH: 'LASTFM_FETCH',

  // Manual user operations
  MANUAL_CREATE: 'MANUAL_CREATE', // User manually typed in all data
  MANUAL_ADD: 'MANUAL_ADD', // Admin added existing entity from external source (e.g., MusicBrainz)
  MANUAL_UPDATE: 'MANUAL_UPDATE',
  MANUAL_DELETE: 'MANUAL_DELETE',
  MANUAL_DATA_QUALITY_UPDATE: 'MANUAL_DATA_QUALITY_UPDATE',

  // Automated system operations
  AUTO_MERGE: 'AUTO_MERGE',
  AUTO_DEDUPE: 'AUTO_DEDUPE',
  BULK_IMPORT: 'BULK_IMPORT',
  SCHEDULED_REFRESH: 'SCHEDULED_REFRESH',
} as const;

export type OperationType = (typeof OPERATIONS)[keyof typeof OPERATIONS];

// Data sources - extend this as needed
export const SOURCES = {
  MUSICBRAINZ: 'MUSICBRAINZ',
  SPOTIFY: 'SPOTIFY',
  LASTFM: 'LASTFM',
  DISCOGS: 'DISCOGS',
  USER: 'USER',
  ADMIN: 'ADMIN', // Admin panel actions
  SYSTEM: 'SYSTEM',
} as const;

export type DataSource = (typeof SOURCES)[keyof typeof SOURCES];

interface LogActivityParams {
  prisma: PrismaClient;
  entityType: EnrichmentEntityType;
  entityId: string;
  operation: OperationType | string;
  sources: DataSource[] | string[];
  fieldsChanged: string[];
  status?: EnrichmentStatus;
  userId?: string | null;
  dataQualityBefore?: DataQuality | null;
  dataQualityAfter?: DataQuality | null;
  errorMessage?: string | null;
  errorCode?: string | null;
  durationMs?: number | null;
  metadata?: Record<string, unknown> | null;
  jobId?: string | null;
  triggeredBy?: string | null;
}

/**
 * Log any data change activity (enrichment, manual edits, automated processes)
 *
 * @example
 * // Manual album creation
 * await logActivity({
 *   prisma,
 *   entityType: 'ALBUM',
 *   entityId: album.id,
 *   operation: OPERATIONS.MANUAL_CREATE,
 *   sources: [SOURCES.USER],
 *   fieldsChanged: ['title', 'artistId', 'releaseDate'],
 *   userId: session.user.id,
 * });
 *
 * @example
 * // MusicBrainz enrichment
 * await logActivity({
 *   prisma,
 *   entityType: 'ARTIST',
 *   entityId: artist.id,
 *   operation: OPERATIONS.MUSICBRAINZ_FETCH,
 *   sources: [SOURCES.MUSICBRAINZ],
 *   fieldsChanged: ['biography', 'countryCode', 'formedYear'],
 *   dataQualityBefore: 'LOW',
 *   dataQualityAfter: 'HIGH',
 *   durationMs: 1234,
 * });
 */
export async function logActivity({
  prisma,
  entityType,
  entityId,
  operation,
  sources,
  fieldsChanged,
  status = 'SUCCESS',
  userId = null,
  dataQualityBefore = null,
  dataQualityAfter = null,
  errorMessage = null,
  errorCode = null,
  durationMs = null,
  metadata = null,
  jobId = null,
  triggeredBy = null,
}: LogActivityParams): Promise<void> {
  try {
    // Build the data object with proper relation syntax
    const data: any = {
      entityType,
      entityId,
      operation,
      sources,
      status,
      fieldsEnriched: fieldsChanged,
      dataQualityBefore,
      dataQualityAfter,
      errorMessage,
      errorCode,
      retryCount: 0,
      durationMs,
      apiCallCount:
        sources.includes(SOURCES.USER) || sources.includes(SOURCES.SYSTEM)
          ? 0
          : 1,
      metadata: metadata as never,
      jobId,
      triggeredBy,
    };

    // Add relation connections based on entity type
    if (entityType === 'ARTIST') {
      data.artist = { connect: { id: entityId } };
    } else if (entityType === 'ALBUM') {
      data.album = { connect: { id: entityId } };
    } else if (entityType === 'TRACK') {
      data.track = { connect: { id: entityId } };
    }

    // Add user relation if userId is provided
    if (userId) {
      data.user = { connect: { id: userId } };
    }

    await prisma.enrichmentLog.create({ data });
  } catch (error) {
    // Log the error but don't throw - we don't want logging failures to break the main operation
    console.error('Failed to log activity:', error);
  }
}

/**
 * Helper function to track field changes between old and new objects
 * Returns an array of field names that changed
 */
export function getChangedFields<T extends Record<string, unknown>>(
  oldData: T,
  newData: Partial<T>
): string[] {
  const changedFields: string[] = [];

  for (const key in newData) {
    if (newData[key] !== undefined && oldData[key] !== newData[key]) {
      changedFields.push(key);
    }
  }

  return changedFields;
}
