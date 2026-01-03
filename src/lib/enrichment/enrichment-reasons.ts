/**
 * Standard reason strings for enrichment logging
 * Provides consistent, human-readable explanations for why enrichments occurred or were skipped
 */

export const SKIP_REASONS = {
  COOLDOWN_NO_DATA:
    'Cooldown: Recent NO_DATA_AVAILABLE status (within 90 days)',
  COOLDOWN_FAILED: 'Cooldown: Recent FAILED enrichment (within 7 days)',
  ALREADY_ENRICHED: 'Already enriched: High data quality with recent update',
  IN_PROGRESS: 'Enrichment already in progress',
  MISSING_DEPENDENCY: (field: string) =>
    `Missing critical dependency: ${field}`,
  MISSING_MUSICBRAINZ_ID: 'Missing MusicBrainz ID required for enrichment',
} as const;

export const SUCCESS_REASONS = {
  SCHEDULED_SYNC: 'Scheduled weekly sync',
  MANUAL_ADMIN: 'Manual admin-initiated enrichment',
  INITIAL_ENRICHMENT: (entityType: string) =>
    `New ${entityType.toLowerCase()} - Initial enrichment`,
  QUALITY_IMPROVEMENT: (before: string, after: string) =>
    `Data quality improvement: ${before} → ${after}`,
  FORCE_ENRICHMENT: 'Force re-enrichment: Admin override',
  AUTO_ENRICHMENT: 'Automated enrichment: Missing critical fields',
} as const;

export const CORRECTION_REASONS = {
  ADMIN_CORRECTION: (field: string) =>
    `Manual correction: Admin updated ${field}`,
  BUG_FIX: 'Bug fix: Correcting malformed data',
  DEV_TESTING: 'Development: Testing enrichment pipeline',
  DATA_REFRESH: 'Data refresh: Updating stale information',
} as const;

export const FAILURE_REASONS = {
  API_ERROR: (source: string) => `API error from ${source}`,
  RATE_LIMIT: (source: string) => `Rate limit exceeded for ${source}`,
  NO_DATA_FOUND: (sources: string[]) =>
    `No data available from sources: ${sources.join(', ')}`,
  NETWORK_ERROR: 'Network error: Unable to reach external services',
  INVALID_DATA: 'Invalid data: External source returned malformed response',
  TIMEOUT: 'Request timeout: External service did not respond in time',
} as const;

/**
 * Helper to construct a dynamic reason with multiple missing fields
 */
export function missingFieldsReason(fields: string[]): string {
  if (fields.length === 0) return 'Missing required fields';
  if (fields.length === 1) return SKIP_REASONS.MISSING_DEPENDENCY(fields[0]);
  return `Missing critical dependencies: ${fields.join(', ')}`;
}

/**
 * Helper to determine success reason based on enrichment context
 */
export function determineSuccessReason(params: {
  triggeredBy?: string;
  isFirstEnrichment: boolean;
  entityType: string;
  dataQualityBefore?: string;
  dataQualityAfter?: string;
  isForced?: boolean;
}): string {
  const {
    triggeredBy,
    isFirstEnrichment,
    entityType,
    dataQualityBefore,
    dataQualityAfter,
    isForced,
  } = params;

  // Force enrichment takes priority
  if (isForced) {
    return SUCCESS_REASONS.FORCE_ENRICHMENT;
  }

  // Initial enrichment
  if (isFirstEnrichment) {
    return SUCCESS_REASONS.INITIAL_ENRICHMENT(entityType);
  }

  // Data quality improvement
  if (
    dataQualityBefore &&
    dataQualityAfter &&
    dataQualityBefore !== dataQualityAfter
  ) {
    return SUCCESS_REASONS.QUALITY_IMPROVEMENT(
      dataQualityBefore,
      dataQualityAfter
    );
  }

  // Manual admin trigger
  if (triggeredBy === 'admin_manual') {
    return SUCCESS_REASONS.MANUAL_ADMIN;
  }

  // Scheduled worker
  if (triggeredBy === 'worker') {
    return SUCCESS_REASONS.SCHEDULED_SYNC;
  }

  // Default
  return SUCCESS_REASONS.AUTO_ENRICHMENT;
}
