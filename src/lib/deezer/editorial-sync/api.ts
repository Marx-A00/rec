// src/lib/deezer/editorial-sync/api.ts
import { detectSuspiciousTitle } from '@/lib/albums/suspicious-title-detection';
import type { DeezerEditorialRelease, DeezerEditorialResponse } from './types';

const DEEZER_BASE_URL = 'https://api.deezer.com';
const PAGE_SIZE = 20;
const PAGINATION_DELAY_MS = 200;

/**
 * Fetch editorial releases for a single genre from Deezer.
 * Paginates through results up to maxReleases.
 */
export async function fetchEditorialReleases(
  genreId: string,
  maxReleases: number
): Promise<DeezerEditorialRelease[]> {
  const releases: DeezerEditorialRelease[] = [];
  let index = 0;

  while (releases.length < maxReleases) {
    const url = `${DEEZER_BASE_URL}/editorial/${genreId}/releases?index=${index}`;
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Deezer API error: ${response.status}`);

    const json: DeezerEditorialResponse = await response.json();
    releases.push(...json.data);

    if (!json.next || json.data.length === 0) break;
    index += PAGE_SIZE;

    if (releases.length < maxReleases) {
      await new Promise(resolve => setTimeout(resolve, PAGINATION_DELAY_MS));
    }
  }

  return releases.slice(0, maxReleases);
}

/**
 * Fetch editorial releases across multiple genres, deduplicating by release ID.
 */
export async function fetchAllGenreReleases(
  genres: string[],
  maxReleases: number
): Promise<DeezerEditorialRelease[]> {
  const allReleases: DeezerEditorialRelease[] = [];
  const seenIds = new Set<number>();

  for (const genre of genres) {
    const releases = await fetchEditorialReleases(genre, maxReleases);
    for (const release of releases) {
      if (!seenIds.has(release.id)) {
        seenIds.add(release.id);
        allReleases.push(release);
      }
    }
    if (allReleases.length >= maxReleases) break;
  }

  return allReleases.slice(0, maxReleases);
}

/**
 * Filter out suspicious titles (deluxe, remastered, compilations, etc.)
 * using the shared suspicious-title-detection module.
 */
export function filterEditorialReleases(
  releases: DeezerEditorialRelease[],
  options: { filterDeluxe: boolean }
): DeezerEditorialRelease[] {
  if (!options.filterDeluxe) return releases;

  return releases.filter(release => {
    const warning = detectSuspiciousTitle(release.title);
    return !warning;
  });
}
