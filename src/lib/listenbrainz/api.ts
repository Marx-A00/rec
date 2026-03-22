// src/lib/listenbrainz/api.ts
/**
 * ListenBrainz API client for fetching fresh releases.
 *
 * The fresh-releases endpoint is public (no auth required), returns all
 * results in a single response (no pagination), and has generous rate
 * limits — so a simple fetch function is all we need.
 *
 * Endpoint docs: https://listenbrainz.readthedocs.io/en/latest/users/api/explore.html
 */

import type {
  ListenBrainzArtistPopularity,
  ListenBrainzFreshRelease,
  ListenBrainzFreshReleasesResponse,
} from './types';

const BASE_URL = 'https://api.listenbrainz.org/1';

// ============================================================================
// Fetch Options
// ============================================================================

export interface FetchFreshReleasesOptions {
  /** Lookback/lookahead window in days (1-90, default: 14) */
  days?: number;
  /** Include past releases (default: true) */
  past?: boolean;
  /** Include future releases (default: false) */
  future?: boolean;
  /** Sort order (default: 'release_date') */
  sort?: 'release_date' | 'artist_credit_name' | 'release_name';
}

// ============================================================================
// API Client
// ============================================================================

/**
 * Fetch fresh releases from the ListenBrainz explore API.
 *
 * Returns the raw release list — use `filterReleases()` to narrow down
 * by primary type afterward.
 */
export async function fetchFreshReleases(
  options: FetchFreshReleasesOptions = {}
): Promise<ListenBrainzFreshRelease[]> {
  const {
    days = 14,
    past = true,
    future = false,
    sort = 'release_date',
  } = options;

  const params = new URLSearchParams({
    days: String(days),
    past: String(past),
    future: String(future),
    sort,
  });

  const url = `${BASE_URL}/explore/fresh-releases/?${params.toString()}`;

  const response = await fetch(url, {
    headers: {
      'User-Agent': 'Rec/1.0 (music recommendation platform)',
    },
  });

  if (!response.ok) {
    throw new Error(
      `ListenBrainz API error: ${response.status} ${response.statusText}`
    );
  }

  // Log rate limit warnings
  const remaining = response.headers.get('X-RateLimit-Remaining');
  const resetIn = response.headers.get('X-RateLimit-Reset-In');

  if (remaining && parseInt(remaining) < 10) {
    console.warn(
      `ListenBrainz rate limit low: ${remaining} remaining, resets in ${resetIn}s`
    );
  }

  const data: ListenBrainzFreshReleasesResponse = await response.json();
  return data.payload?.releases ?? [];
}

// ============================================================================
// Filtering
// ============================================================================

interface FilterReleasesOptions {
  /** Allowed primary types (default: Album, EP, Single) */
  primaryTypes?: string[];
  /** Minimum listen count on ListenBrainz to include (default: 0 = no filter) */
  minListenCount?: number;
  /** Max number of releases to return after filtering (default: 0 = no limit) */
  maxReleases?: number;
}

/**
 * Filter releases by primary type and minimum listen count.
 *
 * Only keeps releases whose `release_group_primary_type` is in the
 * allowed list. Releases with no primary type are excluded.
 *
 * The `minListenCount` filter is the main lever for controlling volume —
 * ListenBrainz returns thousands of releases, but most have 0 listens.
 * Setting a threshold (e.g. 5) cuts the volume dramatically.
 */
export function filterReleases(
  releases: ListenBrainzFreshRelease[],
  options: FilterReleasesOptions = {}
): ListenBrainzFreshRelease[] {
  const {
    primaryTypes = ['Album', 'EP', 'Single'],
    minListenCount = 0,
    maxReleases = 0,
  } = options;

  const filtered = releases.filter(release => {
    if (!release.release_group_primary_type) return false;
    if (!primaryTypes.includes(release.release_group_primary_type))
      return false;
    if (minListenCount > 0 && release.listen_count < minListenCount)
      return false;
    return true;
  });

  if (maxReleases > 0 && filtered.length > maxReleases) {
    return filtered.slice(0, maxReleases);
  }

  return filtered;
}

// ============================================================================
// Artist Popularity
// ============================================================================

const POPULARITY_BATCH_SIZE = 200;

/**
 * Fetch artist popularity data from the ListenBrainz Popularity API.
 *
 * POSTs to /1/popularity/artist in batches. Returns a Map keyed by
 * artist MBID. Artists not found in ListenBrainz will have null counts.
 *
 * If a batch fails, it logs a warning and continues with the next batch
 * (graceful degradation — don't block the sync).
 */
export async function fetchArtistPopularity(
  artistMbids: string[]
): Promise<Map<string, ListenBrainzArtistPopularity>> {
  const results = new Map<string, ListenBrainzArtistPopularity>();

  if (artistMbids.length === 0) return results;

  for (let i = 0; i < artistMbids.length; i += POPULARITY_BATCH_SIZE) {
    const batch = artistMbids.slice(i, i + POPULARITY_BATCH_SIZE);

    try {
      const response = await fetch(`${BASE_URL}/popularity/artist`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Rec/1.0 (music recommendation platform)',
        },
        body: JSON.stringify({ artist_mbids: batch }),
      });

      if (!response.ok) {
        console.warn(
          `[ListenBrainz] Popularity API batch ${Math.floor(i / POPULARITY_BATCH_SIZE) + 1} failed: ${response.status} ${response.statusText}`
        );
        continue;
      }

      const data: ListenBrainzArtistPopularity[] = await response.json();

      for (const entry of data) {
        if (entry.artist_mbid) {
          results.set(entry.artist_mbid, entry);
        }
      }
    } catch (error) {
      console.warn(
        `[ListenBrainz] Popularity API batch ${Math.floor(i / POPULARITY_BATCH_SIZE) + 1} error:`,
        error instanceof Error ? error.message : error
      );
      continue;
    }
  }

  return results;
}

/**
 * Filter releases by artist popularity (unique listener count).
 *
 * 1. Extracts unique primary artist MBIDs from releases
 * 2. Batch-fetches popularity data from ListenBrainz
 * 3. Filters releases where primary artist has >= minArtistListeners unique listeners
 * 4. Sorts survivors by popularity descending (most popular first)
 *
 * If the popularity API returns no data at all, returns the original
 * list unchanged (graceful degradation).
 */
export async function filterByArtistPopularity(
  releases: ListenBrainzFreshRelease[],
  minArtistListeners: number
): Promise<ListenBrainzFreshRelease[]> {
  if (minArtistListeners <= 0 || releases.length === 0) return releases;

  // 1. Collect unique primary artist MBIDs
  const uniqueMbids = [
    ...new Set(
      releases
        .map(r => r.artist_mbids?.[0])
        .filter((mbid): mbid is string => !!mbid)
    ),
  ];

  console.log(
    `[ListenBrainz] Looking up popularity for ${uniqueMbids.length} unique artists...`
  );

  // 2. Batch fetch popularity
  const popularityMap = await fetchArtistPopularity(uniqueMbids);

  // Graceful degradation: if we got nothing back, skip filtering
  if (popularityMap.size === 0) {
    console.warn(
      '[ListenBrainz] Popularity API returned no data, skipping artist filter'
    );
    return releases;
  }

  // 3. Filter by minimum unique listeners
  const filtered = releases.filter(release => {
    const primaryMbid = release.artist_mbids?.[0];
    if (!primaryMbid) return false;

    const popularity = popularityMap.get(primaryMbid);
    const userCount = popularity?.total_user_count ?? 0;
    return userCount >= minArtistListeners;
  });

  // 4. Sort by popularity descending (most popular artists first)
  filtered.sort((a, b) => {
    const aCount =
      popularityMap.get(a.artist_mbids?.[0])?.total_user_count ?? 0;
    const bCount =
      popularityMap.get(b.artist_mbids?.[0])?.total_user_count ?? 0;
    return bCount - aCount;
  });

  console.log(
    `[ListenBrainz] ${filtered.length} releases passed artist popularity filter (>= ${minArtistListeners} listeners)`
  );

  return filtered;
}
