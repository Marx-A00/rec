// src/lib/musicbrainz/enrichment-logic.ts
/**
 * Intelligent enrichment decision logic for albums and artists
 * Determines when MusicBrainz enrichment is needed based on data quality and recency
 */

import { LlamaLogger } from '@/lib/logging/llama-logger';

export interface EnrichmentDecision {
  shouldEnrich: boolean;
  reason: string;
  confidence: number; // 0-1 scale
}

export interface AlbumEnrichmentData {
  id: string;
  musicbrainzId: string | null;
  title: string;
  releaseDate: Date | null;
  dataQuality: 'LOW' | 'MEDIUM' | 'HIGH' | null;
  enrichmentStatus:
    | 'PENDING'
    | 'IN_PROGRESS'
    | 'COMPLETED'
    | 'FAILED'
    | 'SUCCESS'
    | 'PARTIAL_SUCCESS'
    | 'NO_DATA_AVAILABLE'
    | 'SKIPPED'
    | 'PREVIEW'
    | null;
  lastEnriched: Date | null;
  artists?: Array<{
    artist: {
      id: string;
      name: string;
      musicbrainzId: string | null;
    };
  }>;
}

export interface ArtistEnrichmentData {
  id: string;
  musicbrainzId: string | null;
  name: string;
  biography: string | null;
  formedYear: number | null;
  countryCode: string | null;
  imageUrl: string | null;
  cloudflareImageId: string | null;
  dataQuality: 'LOW' | 'MEDIUM' | 'HIGH' | null;
  enrichmentStatus:
    | 'PENDING'
    | 'IN_PROGRESS'
    | 'COMPLETED'
    | 'FAILED'
    | 'SUCCESS'
    | 'PARTIAL_SUCCESS'
    | 'NO_DATA_AVAILABLE'
    | 'SKIPPED'
    | 'PREVIEW'
    | null;
  lastEnriched: Date | null;
}

/**
 * Determine if an album needs MusicBrainz enrichment
 * @param album Album data with enrichment metadata
 * @param llamaLogger Optional logger to check enrichment history and cooldowns
 * @returns EnrichmentDecision with shouldEnrich boolean and reason (or Promise<EnrichmentDecision> if logger is provided)
 */
export function shouldEnrichAlbum(
  album: AlbumEnrichmentData,
  llamaLogger?: LlamaLogger
): EnrichmentDecision | Promise<EnrichmentDecision> {
  // If no logger provided, use synchronous logic (backward compatible)
  if (!llamaLogger) {
    return shouldEnrichAlbumSync(album);
  }

  // Async logic with enrichment history checks
  return shouldEnrichAlbumAsync(album, llamaLogger);
}

/**
 * Synchronous enrichment check (original logic)
 */
function shouldEnrichAlbumSync(album: AlbumEnrichmentData): EnrichmentDecision {
  // Skip if enrichment is currently in progress
  if (album.enrichmentStatus === 'IN_PROGRESS') {
    return {
      shouldEnrich: false,
      reason: 'Enrichment already in progress',
      confidence: 1.0,
    };
  }

  // Always enrich if never enriched or failed
  if (!album.lastEnriched || album.enrichmentStatus === 'FAILED') {
    return {
      shouldEnrich: true,
      reason:
        album.enrichmentStatus === 'FAILED'
          ? 'Previous enrichment failed'
          : 'Never enriched',
      confidence: 0.95,
    };
  }

  // Re-enrich if missing critical fields (prioritize this over time-based checks)
  const missingFields = [];
  if (!album.musicbrainzId) missingFields.push('musicbrainzId');
  if (!album.releaseDate) missingFields.push('releaseDate');

  if (missingFields.length > 0) {
    return {
      shouldEnrich: true,
      reason: `Missing critical fields: ${missingFields.join(', ')}`,
      confidence: 0.9,
    };
  }

  // 🎵 NEW: Re-enrich if album has no tracks (for pure MusicBrainz track approach)
  // Check if the album has any tracks at all
  if (
    'tracks' in album &&
    Array.isArray(album.tracks) &&
    album.tracks.length === 0
  ) {
    return {
      shouldEnrich: true,
      reason: 'Album has no tracks - needs track enrichment',
      confidence: 0.85,
    };
  }

  // Re-enrich if data quality is low and it's been more than 30 days
  if (album.dataQuality === 'LOW' && album.lastEnriched) {
    const daysSinceEnrichment = Math.floor(
      (Date.now() - new Date(album.lastEnriched).getTime()) /
        (1000 * 60 * 60 * 24)
    );
    if (daysSinceEnrichment > 30) {
      return {
        shouldEnrich: true,
        reason: `Low quality data older than 30 days (${daysSinceEnrichment} days)`,
        confidence: 0.7,
      };
    }
  }

  return {
    shouldEnrich: false,
    reason: `High quality data enriched ${album.lastEnriched ? 'recently' : 'previously'}`,
    confidence: 0.8,
  };
}

/**
 * Async enrichment check with history logging
 */
async function shouldEnrichAlbumAsync(
  album: AlbumEnrichmentData,
  llamaLogger: LlamaLogger
): Promise<EnrichmentDecision> {
  // Check enrichment history for cooldown periods FIRST
  const hasNoData = await llamaLogger.hasRecentNoDataStatus(
    'ALBUM',
    album.id,
    90
  );
  if (hasNoData) {
    console.log(
      `⏭️  Album ${album.id} (${album.title}) marked as NO_DATA_AVAILABLE within 90 days, skipping enrichment`
    );
    return {
      shouldEnrich: false,
      reason: 'Cooldown: Recent NO_DATA_AVAILABLE status (within 90 days)',
      confidence: 1.0,
    };
  }

  const hasRecentFailure = await llamaLogger.hasRecentFailure(
    'ALBUM',
    album.id,
    7
  );
  if (hasRecentFailure) {
    console.log(
      `⏭️  Album ${album.id} (${album.title}) failed enrichment within 7 days, skipping (cooldown period)`
    );
    return {
      shouldEnrich: false,
      reason: 'Cooldown: Recent FAILED enrichment (within 7 days)',
      confidence: 1.0,
    };
  }

  // Run existing synchronous logic
  return shouldEnrichAlbumSync(album);
}

/**
 * Determine if an artist needs MusicBrainz enrichment
 * @param artist Artist data with enrichment metadata
 * @param llamaLogger Optional logger to check enrichment history and cooldowns
 * @returns EnrichmentDecision with shouldEnrich boolean and reason (or Promise<EnrichmentDecision> if logger is provided)
 */
export function shouldEnrichArtist(
  artist: ArtistEnrichmentData,
  llamaLogger?: LlamaLogger
): EnrichmentDecision | Promise<EnrichmentDecision> {
  // If no logger provided, use synchronous logic (backward compatible)
  if (!llamaLogger) {
    return shouldEnrichArtistSync(artist);
  }

  // Async logic with enrichment history checks
  return shouldEnrichArtistAsync(artist, llamaLogger);
}

/**
 * Synchronous enrichment check (original logic)
 */
function shouldEnrichArtistSync(
  artist: ArtistEnrichmentData
): EnrichmentDecision {
  // Skip if enrichment is currently in progress
  if (artist.enrichmentStatus === 'IN_PROGRESS') {
    return {
      shouldEnrich: false,
      reason: 'Enrichment already in progress',
      confidence: 1.0,
    };
  }

  // Always enrich if never enriched or failed
  if (!artist.lastEnriched || artist.enrichmentStatus === 'FAILED') {
    return {
      shouldEnrich: true,
      reason:
        artist.enrichmentStatus === 'FAILED'
          ? 'Previous enrichment failed'
          : 'Never enriched',
      confidence: 0.95,
    };
  }

  // Re-enrich if missing critical fields (including image!)
  const missingFields = [];
  if (!artist.musicbrainzId) missingFields.push('musicbrainzId');
  if (!artist.biography) missingFields.push('biography');
  if (!artist.imageUrl) missingFields.push('imageUrl');

  if (missingFields.length > 0) {
    return {
      shouldEnrich: true,
      reason: `Missing critical fields: ${missingFields.join(', ')}`,
      confidence: 0.9,
    };
  }

  // Re-enrich if data quality is low and it's been more than 30 days
  if (artist.dataQuality === 'LOW' && artist.lastEnriched) {
    const daysSinceEnrichment = Math.floor(
      (Date.now() - new Date(artist.lastEnriched).getTime()) /
        (1000 * 60 * 60 * 24)
    );
    if (daysSinceEnrichment > 30) {
      return {
        shouldEnrich: true,
        reason: `Low quality data older than 30 days (${daysSinceEnrichment} days)`,
        confidence: 0.7,
      };
    }
  }

  return {
    shouldEnrich: false,
    reason: `High quality data enriched ${artist.lastEnriched ? 'recently' : 'previously'}`,
    confidence: 0.8,
  };
}

/**
 * Async enrichment check with history logging
 */
async function shouldEnrichArtistAsync(
  artist: ArtistEnrichmentData,
  llamaLogger: LlamaLogger
): Promise<EnrichmentDecision> {
  // Check enrichment history for cooldown periods FIRST
  const hasNoData = await llamaLogger.hasRecentNoDataStatus(
    'ARTIST',
    artist.id,
    90
  );
  if (hasNoData) {
    console.log(
      `⏭️  Artist ${artist.id} (${artist.name}) marked as NO_DATA_AVAILABLE within 90 days, skipping enrichment`
    );
    return {
      shouldEnrich: false,
      reason: 'Cooldown: Recent NO_DATA_AVAILABLE status (within 90 days)',
      confidence: 1.0,
    };
  }

  const hasRecentFailure = await llamaLogger.hasRecentFailure(
    'ARTIST',
    artist.id,
    7
  );
  if (hasRecentFailure) {
    console.log(
      `⏭️  Artist ${artist.id} (${artist.name}) failed enrichment within 7 days, skipping (cooldown period)`
    );
    return {
      shouldEnrich: false,
      reason: 'Cooldown: Recent FAILED enrichment (within 7 days)',
      confidence: 1.0,
    };
  }

  // Run existing synchronous logic
  return shouldEnrichArtistSync(artist);
}

/**
 * Detailed enrichment analysis with confidence scoring
 * @param album Album data with enrichment metadata
 * @returns detailed enrichment decision
 */
export function analyzeAlbumEnrichmentNeed(
  album: AlbumEnrichmentData
): EnrichmentDecision {
  // Skip if enrichment is currently in progress
  if (album.enrichmentStatus === 'IN_PROGRESS') {
    return {
      shouldEnrich: false,
      reason: 'Enrichment already in progress',
      confidence: 1.0,
    };
  }

  // Never enriched or failed - high confidence to enrich
  if (!album.lastEnriched || album.enrichmentStatus === 'FAILED') {
    return {
      shouldEnrich: true,
      reason:
        album.enrichmentStatus === 'FAILED'
          ? 'Previous enrichment failed'
          : 'Never enriched',
      confidence: 0.95,
    };
  }

  // Missing critical fields - high confidence to enrich
  const missingFields = [];
  if (!album.musicbrainzId) missingFields.push('musicbrainzId');
  if (!album.releaseDate) missingFields.push('releaseDate');

  if (missingFields.length > 0) {
    return {
      shouldEnrich: true,
      reason: `Missing critical fields: ${missingFields.join(', ')}`,
      confidence: 0.9,
    };
  }

  // Check data quality and recency
  if (album.dataQuality === 'LOW' && album.lastEnriched) {
    const daysSinceEnrichment = Math.floor(
      (Date.now() - new Date(album.lastEnriched).getTime()) /
        (1000 * 60 * 60 * 24)
    );

    if (daysSinceEnrichment > 30) {
      return {
        shouldEnrich: true,
        reason: `Low quality data older than 30 days (${daysSinceEnrichment} days)`,
        confidence: 0.7,
      };
    }
  }

  // Data looks good, no enrichment needed
  return {
    shouldEnrich: false,
    reason: `High quality data enriched ${album.lastEnriched ? 'recently' : 'previously'}`,
    confidence: 0.8,
  };
}

/**
 * Detailed enrichment analysis with confidence scoring for artists
 * @param artist Artist data with enrichment metadata
 * @returns detailed enrichment decision
 */
export function analyzeArtistEnrichmentNeed(
  artist: ArtistEnrichmentData
): EnrichmentDecision {
  // Skip if enrichment is currently in progress
  if (artist.enrichmentStatus === 'IN_PROGRESS') {
    return {
      shouldEnrich: false,
      reason: 'Enrichment already in progress',
      confidence: 1.0,
    };
  }

  // Never enriched or failed - high confidence to enrich
  if (!artist.lastEnriched || artist.enrichmentStatus === 'FAILED') {
    return {
      shouldEnrich: true,
      reason:
        artist.enrichmentStatus === 'FAILED'
          ? 'Previous enrichment failed'
          : 'Never enriched',
      confidence: 0.95,
    };
  }

  // Missing critical fields - high confidence to enrich (including image!)
  const missingFields = [];
  if (!artist.musicbrainzId) missingFields.push('musicbrainzId');
  if (!artist.biography) missingFields.push('biography');
  if (!artist.imageUrl) missingFields.push('imageUrl');

  if (missingFields.length > 0) {
    return {
      shouldEnrich: true,
      reason: `Missing critical fields: ${missingFields.join(', ')}`,
      confidence: 0.9,
    };
  }

  // Check data quality and recency
  if (artist.dataQuality === 'LOW' && artist.lastEnriched) {
    const daysSinceEnrichment = Math.floor(
      (Date.now() - new Date(artist.lastEnriched).getTime()) /
        (1000 * 60 * 60 * 24)
    );

    if (daysSinceEnrichment > 30) {
      return {
        shouldEnrich: true,
        reason: `Low quality data older than 30 days (${daysSinceEnrichment} days)`,
        confidence: 0.7,
      };
    }
  }

  // Data looks good, no enrichment needed
  return {
    shouldEnrich: false,
    reason: `High quality data enriched ${artist.lastEnriched ? 'recently' : 'previously'}`,
    confidence: 0.8,
  };
}

/**
 * Calculate enrichment priority based on user action source and explicit priority
 * @param source Source of the enrichment request
 * @param priority Explicit priority level
 * @returns Priority score (0-10)
 */
export function calculateEnrichmentPriority(
  source: string,
  priority?: string
): number {
  // Base priority from explicit priority setting
  let basePriority = 0;
  switch (priority) {
    case 'high':
      basePriority = 8;
      break;
    case 'medium':
      basePriority = 5;
      break;
    case 'low':
      basePriority = 2;
      break;
    default:
      basePriority = 5; // medium default
  }

  // Boost priority based on source (user actions get higher priority)
  switch (source) {
    case 'collection_add':
    case 'recommendation_create':
      return Math.min(basePriority + 2, 10); // User actions get +2 boost (max 10)
    case 'search':
      return Math.min(basePriority + 1, 10); // Search gets +1 boost
    case 'browse':
    case 'manual':
    default:
      return basePriority; // No boost for passive actions
  }
}

/**
 * Map enrichment source to user action for job data
 * @param source Source of the enrichment request
 * @returns Valid user action for job data
 */
export function mapSourceToUserAction(
  source: string
): 'collection_add' | 'recommendation_create' | 'search' | 'browse' {
  switch (source) {
    case 'collection_add':
      return 'collection_add';
    case 'recommendation_create':
      return 'recommendation_create';
    case 'search':
      return 'search';
    case 'browse':
      return 'browse';
    case 'manual':
      return 'browse'; // Map manual to browse
    default:
      return 'browse'; // Default fallback
  }
}
