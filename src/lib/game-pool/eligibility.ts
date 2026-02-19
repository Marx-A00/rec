// src/lib/game-pool/eligibility.ts
// Validation logic for album game pool eligibility

import { Album, AlbumGameStatus } from '@prisma/client';

export interface EligibilityResult {
  eligible: boolean;
  reason?: string;
}

/**
 * Validate whether an album can be marked as ELIGIBLE for the game pool.
 *
 * Requirements for eligibility:
 * - Must have cover art (cloudflareImageId)
 * - Must have release date
 * - Must have at least one artist
 *
 * @param album - Album with required fields (cloudflareImageId, releaseDate, title)
 * @param hasArtists - Whether the album has at least one associated artist
 * @returns EligibilityResult with eligible flag and optional reason
 */
export function validateEligibility(
  album: Pick<Album, 'cloudflareImageId' | 'releaseDate' | 'title'>,
  hasArtists: boolean
): EligibilityResult {
  if (!album.cloudflareImageId) {
    return {
      eligible: false,
      reason: 'Album must have cover art (cloudflareImageId) to be eligible',
    };
  }

  if (!album.releaseDate) {
    return {
      eligible: false,
      reason: 'Album must have a release date to be eligible',
    };
  }

  if (!hasArtists) {
    return {
      eligible: false,
      reason: 'Album must have at least one artist to be eligible',
    };
  }

  return { eligible: true };
}

/**
 * Validate whether a status transition is allowed.
 * Currently all transitions are allowed, but this function provides
 * a hook for future business logic (e.g., requiring approval for certain transitions).
 *
 * @param _from - Current status
 * @param _to - Desired status
 * @returns true if transition is allowed
 */
export function isValidStatusTransition(
  _from: AlbumGameStatus,
  _to: AlbumGameStatus
): boolean {
  // All transitions currently allowed
  // Future: Could add rules like "EXCLUDED -> ELIGIBLE requires admin approval"
  return true;
}
