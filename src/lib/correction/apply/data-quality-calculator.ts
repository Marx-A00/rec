/**
 * Data quality calculation for post-correction scoring.
 * Admin corrections always result in HIGH quality (admin-verified = highest confidence).
 * Weighted scoring is provided for future use (Phase 10 manual edits, enrichment).
 *
 * @example
 * ```typescript
 * // Admin corrections always return HIGH
 * const factors = buildQualityFactors(album, 'admin_correction');
 * const quality = calculateDataQuality(factors);
 * // quality === 'HIGH'
 * ```
 */

import type { Album, Artist, DataQuality, Track } from '@prisma/client';

// ============================================================================
// Types
// ============================================================================

/**
 * Source of the data quality calculation.
 * - admin_correction: Admin-verified corrections (always HIGH)
 * - enrichment: Automated enrichment from external APIs
 * - user_submission: User-submitted data (requires verification)
 */
export type DataQualitySource =
  | 'admin_correction'
  | 'enrichment'
  | 'user_submission';

/**
 * Factors considered when calculating data quality.
 * Each factor represents presence of a data point.
 */
export interface DataQualityFactors {
  /** Album has a title (required) */
  hasTitle: boolean;
  /** Album has a release date */
  hasReleaseDate: boolean;
  /** Album has at least one artist association */
  hasArtists: boolean;
  /** Album has at least one track */
  hasTracks: boolean;
  /** Album has cover art URL */
  hasCoverArt: boolean;
  /** Album has MusicBrainz ID (verified external ID) */
  hasMusicbrainzId: boolean;
  /** Album has barcode (commercial identifier) */
  hasBarcode: boolean;
  /** Source of the quality calculation */
  source: DataQualitySource;
}

// ============================================================================
// Constants
// ============================================================================

/**
 * Point values for each quality factor.
 * Used in weighted scoring for non-admin sources.
 */
const QUALITY_WEIGHTS = {
  // Required fields (critical for identification)
  title: 30,
  artists: 30,
  // Important fields (enhance usability)
  releaseDate: 10,
  tracks: 10,
  coverArt: 10,
  // Bonus fields (external verification)
  musicbrainzId: 5,
  barcode: 5,
} as const;

/**
 * Thresholds for quality tier assignment.
 * - HIGH: >= 80 points (well-documented album)
 * - MEDIUM: >= 50 points (basic info present)
 * - LOW: < 50 points (minimal data)
 */
const QUALITY_THRESHOLDS = {
  HIGH: 80,
  MEDIUM: 50,
} as const;

// ============================================================================
// Main Functions
// ============================================================================

/**
 * Calculates data quality based on presence of various data fields.
 *
 * For admin corrections, always returns HIGH (admin-verified = highest confidence).
 * For other sources, uses weighted scoring.
 *
 * @param factors - The quality factors to evaluate
 * @returns DataQuality enum value (HIGH, MEDIUM, or LOW)
 *
 * @example
 * ```typescript
 * // Admin correction - always HIGH
 * const quality = calculateDataQuality({
 *   hasTitle: true,
 *   hasArtists: true,
 *   // ... other factors
 *   source: 'admin_correction'
 * });
 * // quality === 'HIGH'
 *
 * // Enrichment with most fields present
 * const quality = calculateDataQuality({
 *   hasTitle: true,
 *   hasReleaseDate: true,
 *   hasArtists: true,
 *   hasTracks: true,
 *   hasCoverArt: true,
 *   hasMusicbrainzId: true,
 *   hasBarcode: false,
 *   source: 'enrichment'
 * });
 * // quality === 'HIGH' (95 points >= 80 threshold)
 * ```
 */
export function calculateDataQuality(factors: DataQualityFactors): DataQuality {
  // Admin corrections are always HIGH quality (admin-verified)
  if (factors.source === 'admin_correction') {
    return 'HIGH';
  }

  // Calculate weighted score for other sources
  let score = 0;

  if (factors.hasTitle) {
    score += QUALITY_WEIGHTS.title;
  }
  if (factors.hasArtists) {
    score += QUALITY_WEIGHTS.artists;
  }
  if (factors.hasReleaseDate) {
    score += QUALITY_WEIGHTS.releaseDate;
  }
  if (factors.hasTracks) {
    score += QUALITY_WEIGHTS.tracks;
  }
  if (factors.hasCoverArt) {
    score += QUALITY_WEIGHTS.coverArt;
  }
  if (factors.hasMusicbrainzId) {
    score += QUALITY_WEIGHTS.musicbrainzId;
  }
  if (factors.hasBarcode) {
    score += QUALITY_WEIGHTS.barcode;
  }

  // Assign quality tier based on score
  if (score >= QUALITY_THRESHOLDS.HIGH) {
    return 'HIGH';
  }
  if (score >= QUALITY_THRESHOLDS.MEDIUM) {
    return 'MEDIUM';
  }
  return 'LOW';
}

/**
 * Minimum album shape required for quality factor extraction.
 */
type AlbumWithRelations = Album & {
  tracks: Track[];
  artists: Array<{ artist: Artist }>;
};

/**
 * Builds quality factors from an album with its relations.
 *
 * @param album - Album with tracks and artists loaded
 * @param source - Source of the quality calculation
 * @returns DataQualityFactors ready for calculateDataQuality
 *
 * @example
 * ```typescript
 * const album = await prisma.album.findUnique({
 *   where: { id: 'album-123' },
 *   include: { tracks: true, artists: { include: { artist: true } } }
 * });
 *
 * const factors = buildQualityFactors(album, 'admin_correction');
 * const quality = calculateDataQuality(factors);
 * ```
 */
export function buildQualityFactors(
  album: AlbumWithRelations,
  source: DataQualitySource
): DataQualityFactors {
  return {
    hasTitle: Boolean(album.title && album.title.trim().length > 0),
    hasReleaseDate: album.releaseDate !== null,
    hasArtists: album.artists.length > 0,
    hasTracks: album.tracks.length > 0,
    hasCoverArt: Boolean(album.coverArtUrl || album.cloudflareImageId),
    hasMusicbrainzId: Boolean(album.musicbrainzId),
    hasBarcode: Boolean(album.barcode),
    source,
  };
}

/**
 * Re-export quality thresholds for testing.
 */
export { QUALITY_THRESHOLDS, QUALITY_WEIGHTS };
