// src/components/admin/job-detail-utils.ts
/**
 * Utilities for parsing BullMQ job data into structured display fields.
 * Used by JobDetailPanel and other admin components.
 */

// ============================================================================
// Types
// ============================================================================

export interface JobDetailField {
  label: string;
  value: string | number | boolean | null | undefined;
  /** Optional hint for rendering (e.g. 'code' for monospace, 'list' for arrays) */
  hint?: 'code' | 'list' | 'id';
}

// ============================================================================
// Job Type Detection Helpers
// ============================================================================

export function isSyncJob(jobName: string): boolean {
  return (
    jobName.startsWith('spotify:sync') ||
    jobName.startsWith('musicbrainz:sync') ||
    jobName.startsWith('listenbrainz:sync')
  );
}

export function isEnrichmentJob(jobName: string): boolean {
  return jobName.startsWith('enrichment:') || jobName.startsWith('check:');
}

export function isMusicBrainzSearchJob(jobName: string): boolean {
  return jobName.startsWith('musicbrainz:search-');
}

export function isMusicBrainzLookupJob(jobName: string): boolean {
  return (
    jobName.startsWith('musicbrainz:lookup-') ||
    jobName.startsWith('musicbrainz:browse-')
  );
}

export function isCacheJob(jobName: string): boolean {
  return jobName.startsWith('cache:');
}

export function isDiscogsJob(jobName: string): boolean {
  return jobName.startsWith('discogs:');
}

export function isDeezerJob(jobName: string): boolean {
  return jobName.startsWith('deezer:');
}

export function isUncoverJob(jobName: string): boolean {
  return jobName.startsWith('uncover:');
}

export function isListenBrainzJob(jobName: string): boolean {
  return jobName.startsWith('listenbrainz:');
}

// ============================================================================
// Job Category Label
// ============================================================================

export function getJobCategory(jobName: string): string {
  if (isMusicBrainzSearchJob(jobName)) return 'MusicBrainz Search';
  if (isMusicBrainzLookupJob(jobName)) return 'MusicBrainz Lookup';
  if (jobName.startsWith('check:')) return 'Enrichment Check';
  if (jobName.startsWith('enrichment:')) return 'Enrichment';
  if (jobName.startsWith('spotify:sync')) return 'Spotify Sync';
  if (jobName.startsWith('musicbrainz:sync')) return 'MusicBrainz Sync';
  if (isDeezerJob(jobName)) return 'Deezer Import';
  if (isCacheJob(jobName)) return 'Cache';
  if (isDiscogsJob(jobName)) return 'Discogs';
  if (isUncoverJob(jobName)) return 'Uncover';
  if (isListenBrainzJob(jobName)) return 'ListenBrainz Sync';
  if (jobName.startsWith('migration:')) return 'Migration';
  return 'Other';
}

// ============================================================================
// Field Extraction
// ============================================================================

/**
 * Extracts context-aware display fields from job.data based on the job type.
 * Returns labeled fields relevant to each specific job type instead of raw JSON.
 */
export function getJobDetailFields(
  jobName: string,
  data: Record<string, unknown>
): JobDetailField[] {
  // MusicBrainz Search jobs
  if (isMusicBrainzSearchJob(jobName)) {
    return compact([
      field('Query', data.query),
      field('Limit', data.limit),
      field('Offset', data.offset),
      field('Request ID', data.requestId, 'id'),
    ]);
  }

  // MusicBrainz Lookup / Browse jobs
  if (isMusicBrainzLookupJob(jobName)) {
    return compact([
      field('MBID', data.mbid || data.artistMbid, 'id'),
      field('Includes', formatArray(data.includes), 'list'),
      field('Limit', data.limit),
      field('Offset', data.offset),
      field('Request ID', data.requestId, 'id'),
    ]);
  }

  // Enrichment check jobs
  if (jobName.startsWith('check:')) {
    return compact([
      field('Album ID', data.albumId, 'id'),
      field('Artist ID', data.artistId, 'id'),
      field('Track ID', data.trackId, 'id'),
      field('Source', data.source),
      field('Priority', data.priority),
      field('Force', data.force),
      field('Parent Job ID', data.parentJobId, 'id'),
      field('Request ID', data.requestId, 'id'),
    ]);
  }

  // Enrichment execution jobs
  if (jobName.startsWith('enrichment:')) {
    return compact([
      field('Album ID', data.albumId, 'id'),
      field('Artist ID', data.artistId, 'id'),
      field('Track ID', data.trackId, 'id'),
      field('Source', data.source),
      field('Priority', data.priority),
      field('Force', data.force),
      field('Parent Job ID', data.parentJobId, 'id'),
      field('Request ID', data.requestId, 'id'),
    ]);
  }

  // Spotify Sync jobs
  if (jobName.startsWith('spotify:sync')) {
    return compact([
      field('Limit', data.limit),
      field('Country', data.country),
      field('Pages', data.pages),
      field('Min Followers', data.minFollowers),
      field('Genre Tags', formatArray(data.genreTags), 'list'),
      field('Year', data.year),
      field('Source', data.source),
      field('Request ID', data.requestId, 'id'),
    ]);
  }

  // MusicBrainz Sync jobs
  if (jobName.startsWith('musicbrainz:sync')) {
    return compact([
      field('Query', data.query),
      field('Limit', data.limit),
      field('Date From', (data.dateRange as Record<string, unknown>)?.from),
      field('Date To', (data.dateRange as Record<string, unknown>)?.to),
      field('Genres', formatArray(data.genres), 'list'),
      field('Source', data.source),
      field('Request ID', data.requestId, 'id'),
    ]);
  }

  // Deezer Import jobs
  if (isDeezerJob(jobName)) {
    const selectedCount = Array.isArray(data.selectedDeezerIds)
      ? data.selectedDeezerIds.length
      : undefined;
    return compact([
      field('Playlist ID', data.playlistId, 'id'),
      field('Playlist Name', data.playlistName),
      field('Selected Albums', selectedCount),
      field('Source', data.source),
      field('Request ID', data.requestId, 'id'),
    ]);
  }

  // Cache jobs
  if (isCacheJob(jobName)) {
    return compact([
      field('Album ID', data.albumId, 'id'),
      field('Artist ID', data.artistId, 'id'),
      field('Priority', data.priority),
      field('Parent Job ID', data.parentJobId, 'id'),
      field('Request ID', data.requestId, 'id'),
    ]);
  }

  // Discogs jobs
  if (isDiscogsJob(jobName)) {
    return compact([
      field('Album ID', data.albumId, 'id'),
      field('Artist ID', data.artistId, 'id'),
      field('Discogs ID', data.discogsId, 'id'),
      field('Master ID', data.masterId, 'id'),
      field('Artist Name', data.artistName),
      field('Album Title', data.albumTitle),
      field('Limit', data.limit),
      field('Parent Job ID', data.parentJobId, 'id'),
      field('Request ID', data.requestId, 'id'),
    ]);
  }

  // ListenBrainz Sync jobs
  if (isListenBrainzJob(jobName)) {
    return compact([
      field('Days', data.days),
      field('Include Future', data.includeFuture),
      field('Primary Types', formatArray(data.primaryTypes), 'list'),
      field('Priority', data.priority),
      field('Source', data.source),
      field('Parent Job ID', data.parentJobId, 'id'),
      field('Request ID', data.requestId, 'id'),
    ]);
  }

  // Uncover Daily Challenge
  if (isUncoverJob(jobName)) {
    return compact([
      field('Date', data.date),
      field('Source', data.source),
      field('Request ID', data.requestId, 'id'),
    ]);
  }

  // Migration jobs
  if (jobName.startsWith('migration:')) {
    return compact([
      field('Create Backup', data.createBackup),
      field('Batch Size', data.batchSize),
      field('Request ID', data.requestId, 'id'),
    ]);
  }

  // Fallback: return nothing (JobDetailPanel will show raw JSON)
  return [];
}

/**
 * Extracts display fields from job.result for the result section.
 */
export function getJobResultFields(
  result: Record<string, unknown>
): JobDetailField[] {
  return compact([
    field('Success', result.success),
    field(
      'Duration',
      result.metadata
        ? `${(result.metadata as Record<string, unknown>).duration}ms`
        : undefined
    ),
    field('Error', (result.error as Record<string, unknown>)?.message),
  ]);
}

// ============================================================================
// Internal Helpers
// ============================================================================

function field(
  label: string,
  value: unknown,
  hint?: JobDetailField['hint']
): JobDetailField | null {
  if (value === undefined || value === null || value === '') return null;
  const displayValue =
    typeof value === 'object'
      ? JSON.stringify(value)
      : (value as string | number | boolean);
  return { label, value: displayValue, hint };
}

function compact(fields: (JobDetailField | null)[]): JobDetailField[] {
  return fields.filter((f): f is JobDetailField => f !== null);
}

function formatArray(value: unknown): string | undefined {
  if (!Array.isArray(value) || value.length === 0) return undefined;
  return value.join(', ');
}
