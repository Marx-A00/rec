// src/lib/utils/string-similarity.ts
/**
 * Generalized fuzzy string matching utility using fuzzysort
 * Replaces manual Jaccard similarity calculations with optimized fuzzy matching
 */

import fuzzysort from 'fuzzysort';

/**
 * Normalize a string for comparison
 * - Removes special characters
 * - Normalizes spacing
 * - Converts to lowercase
 * - Removes diacritics (é → e, ö → o)
 */
export function normalizeString(str: string): string {
  return str
    .toLowerCase()
    .normalize('NFD') // Decompose accented characters
    .replace(/[\u0300-\u036f]/g, '') // Remove diacritics
    .replace(/\$/g, 's') // Replace dollar signs with 's' (A$AP → ASAP)
    .replace(/&/g, 'and') // Replace ampersands with 'and'
    .replace(/[^\w\s]/g, '') // Remove other special characters
    .replace(/\s+/g, ' ') // Normalize multiple spaces
    .trim();
}

/**
 * Calculate string similarity score (0-1 scale)
 * Uses fuzzysort for intelligent matching with typo tolerance
 *
 * @param str1 - First string to compare
 * @param str2 - Second string to compare
 * @returns Similarity score from 0 (no match) to 1 (exact match)
 *
 * @example
 * calculateStringSimilarity("The Beatles", "Beatles") // ~0.95
 * calculateStringSimilarity("Radiohead", "Radio Head") // ~0.90
 * calculateStringSimilarity("A$AP Rocky", "ASAP Rocky") // ~0.98
 */
export function calculateStringSimilarity(str1: string, str2: string): number {
  // Normalize both strings
  const normalized1 = normalizeString(str1);
  const normalized2 = normalizeString(str2);

  // Exact match after normalization
  if (normalized1 === normalized2) return 1.0;

  // Empty strings
  if (normalized1.length === 0 || normalized2.length === 0) return 0.0;

  // Use fuzzysort for fuzzy matching
  const result = fuzzysort.single(normalized1, normalized2);

  if (!result) return 0.0;

  // Convert fuzzysort score (negative, closer to 0 is better) to 0-1 scale
  // Fuzzysort scores typically range from 0 (perfect) to -10000 (terrible)
  // We map this to 0-1 scale with some tuning
  const score = result.score;

  // Map fuzzysort scores to 0-1 range:
  // 0 → 1.0 (perfect match)
  // -1000 → ~0.9 (very good)
  // -3000 → ~0.7 (decent)
  // -5000 → ~0.5 (acceptable)
  // -10000+ → ~0.0 (poor)

  const normalized = Math.max(0, 1 + score / 10000);
  return normalized;
}

/**
 * Find the best match from an array of candidates
 *
 * @param query - String to match against
 * @param candidates - Array of candidate strings
 * @param threshold - Minimum score to accept (0-1), default 0.5
 * @returns Best match with score, or null if no match above threshold
 *
 * @example
 * findBestMatch("Beatles", ["The Beatles", "Beach Boys", "Bee Gees"])
 * // { match: "The Beatles", score: 0.95, index: 0 }
 */
export function findBestMatch(
  query: string,
  candidates: string[],
  threshold = 0.5
): { match: string; score: number; index: number } | null {
  if (candidates.length === 0) return null;

  const normalized = normalizeString(query);
  const normalizedCandidates = candidates.map(c => ({
    original: c,
    normalized: normalizeString(c),
  }));

  const results = fuzzysort.go(normalized, normalizedCandidates, {
    key: 'normalized',
    limit: 1,
  });

  if (results.length === 0 || !results[0]) return null;

  const bestMatch = results[0];
  const score = Math.max(0, 1 + bestMatch.score / 10000);

  if (score < threshold) return null;

  return {
    match: bestMatch.obj.original,
    score,
    index: candidates.indexOf(bestMatch.obj.original),
  };
}

/**
 * Find all matches above a threshold
 *
 * @param query - String to match against
 * @param candidates - Array of candidate strings
 * @param threshold - Minimum score to accept (0-1), default 0.5
 * @returns Array of matches sorted by score (best first)
 */
export function findAllMatches(
  query: string,
  candidates: string[],
  threshold = 0.5
): Array<{ match: string; score: number; index: number }> {
  if (candidates.length === 0) return [];

  const normalized = normalizeString(query);
  const normalizedCandidates = candidates.map(c => ({
    original: c,
    normalized: normalizeString(c),
  }));

  const results = fuzzysort.go(normalized, normalizedCandidates, {
    key: 'normalized',
  });

  return results
    .map(result => ({
      match: result.obj.original,
      score: Math.max(0, 1 + result.score / 10000),
      index: candidates.indexOf(result.obj.original),
    }))
    .filter(r => r.score >= threshold)
    .sort((a, b) => b.score - a.score);
}
