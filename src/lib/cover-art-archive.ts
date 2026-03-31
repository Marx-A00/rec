/**
 * Centralized Cover Art Archive URL construction.
 *
 * CAA size suffixes:
 *   - no suffix → original uploaded image (typically 1400-3000px)
 *   - `-1200`   → 1200px
 *   - `-500`    → 500px
 *   - `-250`    → 250px
 */

export type CAASize = 'full' | '1200' | '500' | '250';

function sizeSuffix(size: CAASize): string {
  return size === 'full' ? '' : `-${size}`;
}

/**
 * Build a CAA URL for a release-group front cover.
 * Used when we have a MusicBrainz release-group ID.
 */
export function getCAAUrl(
  releaseGroupMbid: string,
  size: CAASize = 'full'
): string {
  return `https://coverartarchive.org/release-group/${releaseGroupMbid}/front${sizeSuffix(size)}`;
}

/**
 * Build a CAA URL for a specific release front cover.
 * Used when we have a MusicBrainz release ID (not release-group).
 */
export function getCAAUrlForRelease(
  releaseMbid: string,
  size: CAASize = 'full'
): string {
  return `https://coverartarchive.org/release/${releaseMbid}/front${sizeSuffix(size)}`;
}

/**
 * Build a CAA URL using a specific CAA image ID + release MBID.
 * Used by ListenBrainz which provides caa_id and caa_release_mbid.
 */
export function getCAAUrlFromCaaId(
  releaseMbid: string,
  caaId: number | string,
  size: CAASize = 'full'
): string {
  return `https://coverartarchive.org/release/${releaseMbid}/${caaId}${sizeSuffix(size)}.jpg`;
}
