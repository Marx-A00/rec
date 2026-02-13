// src/lib/musicbrainz/mbid-verifier.ts
/**
 * MBID verification utility
 * Detects when MusicBrainz returns a redirected (canonical) MBID
 *
 * MusicBrainz merges entities over time. When an entity is merged,
 * the old MBID redirects to the new canonical MBID. The API returns
 * the canonical MBID silently - no redirect indication in response.
 *
 * This utility compares requested vs returned MBIDs to detect redirects.
 */

/**
 * Result of MBID verification
 */
export interface MbidVerificationResult<T> {
  /** The original data from MusicBrainz */
  data: T;
  /** The MBID that was requested */
  requestedMbid: string;
  /** The MBID that was returned (may differ if redirected) */
  returnedMbid: string;
  /** True if the returned MBID differs from requested */
  wasRedirected: boolean;
}

/**
 * Verify if a MusicBrainz lookup returned a different MBID than requested
 *
 * @param requestedMbid - The MBID sent to the API
 * @param result - The result object from MusicBrainz (must have 'id' field)
 * @returns Verification result with redirect detection
 *
 * @example
 * const artist = await musicBrainzService.getArtist(mbid);
 * const verified = verifyMbid(mbid, artist);
 * if (verified.wasRedirected) {
 *   console.warn(`MBID redirect: ${verified.requestedMbid} -> ${verified.returnedMbid}`);
 * }
 */
export function verifyMbid<T extends { id: string }>(
  requestedMbid: string,
  result: T
): MbidVerificationResult<T> {
  const wasRedirected = requestedMbid !== result.id;

  if (wasRedirected) {
    console.warn(`🔀 MBID redirect detected: ${requestedMbid} -> ${result.id}`);
  }

  return {
    data: result,
    requestedMbid,
    returnedMbid: result.id,
    wasRedirected,
  };
}

/**
 * Type guard to check if an object has an 'id' string property
 */
export function hasIdProperty(obj: unknown): obj is { id: string } {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'id' in obj &&
    typeof (obj as Record<string, unknown>).id === 'string'
  );
}
