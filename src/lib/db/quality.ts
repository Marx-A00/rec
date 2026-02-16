// src/lib/db/quality.ts
// Centralized helper for initial data quality field assignment.
// Used by all album/artist/track creation sites to standardize
// the dataQuality / enrichmentStatus / lastEnriched triple.

export interface QualityIdentifiers {
  musicbrainzId?: string | null;
  spotifyId?: string | null;
  discogsId?: string | null;
}

export interface InitialQualityFields {
  dataQuality: 'LOW' | 'MEDIUM';
  enrichmentStatus: 'PENDING';
  lastEnriched: null;
}

/**
 * Derive the initial quality fields for a newly-created entity.
 *
 * Rules:
 *   - Any authoritative ID present (musicbrainzId, discogsId, spotifyId) → MEDIUM
 *   - No authoritative IDs → LOW (needs enrichment)
 *   - enrichmentStatus always starts PENDING
 *   - lastEnriched always starts null
 */
export function getInitialQuality(
  identifiers: QualityIdentifiers = {}
): InitialQualityFields {
  const hasAuthoritativeId =
    identifiers.musicbrainzId ||
    identifiers.discogsId ||
    identifiers.spotifyId;

  const dataQuality: 'LOW' | 'MEDIUM' = hasAuthoritativeId ? 'MEDIUM' : 'LOW';

  return {
    dataQuality,
    enrichmentStatus: 'PENDING',
    lastEnriched: null,
  };
}
