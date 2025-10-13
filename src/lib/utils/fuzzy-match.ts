// src/lib/utils/fuzzy-match.ts
/**
 * Fuzzy matching utility for artist names between MusicBrainz and Last.fm
 * Uses fuzzysort for intelligent string matching with normalization
 */

import fuzzysort from 'fuzzysort';
import type { LastFmSearchResult } from '../lastfm/search';

/**
 * Match confidence levels based on fuzzysort score
 */
export type MatchConfidence = 'high' | 'medium' | 'low' | 'none';

/**
 * Result of a fuzzy match operation
 */
export interface FuzzyMatchResult {
  match: LastFmSearchResult;
  score: number;
  confidence: MatchConfidence;
}

/**
 * Score threshold for acceptable matches
 * Scores are negative in fuzzysort - higher (closer to 0) is better
 */
const MATCH_THRESHOLD = -5000;

/**
 * Normalize artist name for fuzzy matching
 * - Remove special characters like $ and &
 * - Normalize spacing
 * - Convert to lowercase
 * - Preserve unicode letters (Björk stays björk)
 *
 * @example
 * normalizeArtistName("A$AP Rocky") // "asap rocky"
 * normalizeArtistName("Björk & The Gang") // "bjork and the gang"
 */
export function normalizeArtistName(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD') // Decompose accented characters (ö → o + combining diacritic)
    .replace(/[\u0300-\u036f]/g, '') // Remove diacritics (ö → o, é → e)
    .replace(/\$/g, 's') // Replace dollar signs with 's' (A$AP → ASAP)
    .replace(/&/g, 'and') // Replace ampersands with 'and'
    .replace(/[^\w\s]/g, '') // Remove other special characters except word chars and spaces
    .replace(/\s+/g, ' ') // Normalize multiple spaces to single space
    .trim();
}

/**
 * Get match confidence level based on fuzzysort score
 *
 * @param score - Fuzzysort score (negative number, higher is better)
 * @returns Confidence level
 */
export function getMatchConfidence(score: number): MatchConfidence {
  if (score >= -1000) return 'high';
  if (score >= -3000) return 'medium';
  if (score >= MATCH_THRESHOLD) return 'low';
  return 'none';
}

/**
 * Find the best matching Last.fm result for a MusicBrainz artist name
 * Uses fuzzy string matching with normalization to handle variations
 *
 * @param artistName - The MusicBrainz artist name to match
 * @param lastFmResults - Array of Last.fm search results to search through
 * @returns Best match with score and confidence, or null if no acceptable match
 *
 * @example
 * const results = await searchLastFmArtists("radiohead");
 * const match = findLastFmMatch("Radiohead", results);
 * if (match?.confidence === 'high') {
 *   console.log(`Found exact match: ${match.match.name}`);
 * }
 */
export function findLastFmMatch(
  artistName: string,
  lastFmResults: LastFmSearchResult[]
): FuzzyMatchResult | null {
  if (!lastFmResults || lastFmResults.length === 0) {
    return null;
  }

  // Normalize the query artist name
  const normalizedQuery = normalizeArtistName(artistName);

  // Normalize all Last.fm result names and prepare for fuzzysort
  const normalizedResults = lastFmResults.map(result => ({
    original: result,
    normalized: normalizeArtistName(result.name),
  }));

  // Use fuzzysort to find best match
  const searchResults = fuzzysort.go(
    normalizedQuery,
    normalizedResults,
    {
      key: 'normalized',
      threshold: MATCH_THRESHOLD, // Only return matches with score >= -5000
      limit: 1, // Only need the best match
    }
  );

  // No matches found or score below threshold
  if (searchResults.length === 0 || !searchResults[0]) {
    return null;
  }

  const bestMatch = searchResults[0];
  const score = bestMatch.score;
  const confidence = getMatchConfidence(score);

  return {
    match: bestMatch.obj.original,
    score,
    confidence,
  };
}

/**
 * Find matches for multiple artist names at once
 * Useful for batch operations
 *
 * @param artistNames - Array of MusicBrainz artist names
 * @param lastFmResults - Array of Last.fm search results
 * @returns Map of artist names to their best matches
 */
export function findMultipleMatches(
  artistNames: string[],
  lastFmResults: LastFmSearchResult[]
): Map<string, FuzzyMatchResult | null> {
  const matches = new Map<string, FuzzyMatchResult | null>();

  for (const artistName of artistNames) {
    const match = findLastFmMatch(artistName, lastFmResults);
    matches.set(artistName, match);
  }

  return matches;
}
