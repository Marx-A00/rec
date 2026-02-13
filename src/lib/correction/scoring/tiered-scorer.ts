/**
 * Tiered Scorer: high/medium/low/none confidence levels
 * Good for: Clear categorical feedback to admins
 */

import fuzzysort from 'fuzzysort';

import { normalizeString } from '@/lib/utils/string-similarity';

import type { CorrectionSearchResult } from '../types';

import type {
  SearchScorer,
  ScoredSearchResult,
  ScoreBreakdown,
  ConfidenceTier,
} from './types';

// Thresholds based on fuzzysort score ranges
// Fuzzysort scores: 0 (perfect) to negative values (worse)
const SCORE_THRESHOLDS = {
  HIGH: -1000, // fuzzysort score >= -1000
  MEDIUM: -3000, // fuzzysort score >= -3000
  LOW: -5000, // fuzzysort score >= -5000
};

function getConfidenceTier(score: number): ConfidenceTier {
  if (score >= SCORE_THRESHOLDS.HIGH) return 'high';
  if (score >= SCORE_THRESHOLDS.MEDIUM) return 'medium';
  if (score >= SCORE_THRESHOLDS.LOW) return 'low';
  return 'none';
}

function tierToNormalized(tier: ConfidenceTier): number {
  switch (tier) {
    case 'high':
      return 1.0;
    case 'medium':
      return 0.7;
    case 'low':
      return 0.4;
    case 'none':
      return 0.1;
  }
}

/**
 * Tiered scorer: high/medium/low/none confidence levels
 * Uses fuzzysort for fuzzy matching and categorizes into tiers
 */
export class TieredScorer implements SearchScorer {
  readonly strategy = 'tiered' as const;

  score(
    result: CorrectionSearchResult,
    albumQuery: string,
    artistQuery?: string
  ): ScoredSearchResult {
    const normalizedTitle = normalizeString(result.title);
    const normalizedQuery = normalizeString(albumQuery);

    // Get fuzzysort score for title
    const titleResult = fuzzysort.single(normalizedQuery, normalizedTitle);
    const titleFuzzyScore = titleResult?.score ?? -10000;
    const titleTier = getConfidenceTier(titleFuzzyScore);

    // Get fuzzysort score for artist if provided
    let artistTier: ConfidenceTier = 'none';
    let artistFuzzyScore = -10000;
    if (artistQuery && result.primaryArtistName) {
      const normalizedArtist = normalizeString(result.primaryArtistName);
      const normalizedArtistQuery = normalizeString(artistQuery);
      const artistResult = fuzzysort.single(
        normalizedArtistQuery,
        normalizedArtist
      );
      artistFuzzyScore = artistResult?.score ?? -10000;
      artistTier = getConfidenceTier(artistFuzzyScore);
    }

    // Combined tier: use the worse of title/artist, but boost if both are good
    let combinedTier: ConfidenceTier;
    if (artistQuery) {
      // Both must be at least medium for high confidence
      if (titleTier === 'high' && artistTier === 'high') {
        combinedTier = 'high';
      } else if (titleTier !== 'none' && artistTier !== 'none') {
        combinedTier =
          titleTier === 'low' || artistTier === 'low' ? 'low' : 'medium';
      } else {
        combinedTier = 'none';
      }
    } else {
      combinedTier = titleTier;
    }

    const yearScore = result.firstReleaseDate ? 1 : 0;

    const breakdown: ScoreBreakdown = {
      titleScore: titleFuzzyScore,
      artistScore: artistFuzzyScore,
      yearScore,
      confidenceTier: combinedTier,
    };

    return {
      ...result,
      normalizedScore: tierToNormalized(combinedTier),
      displayScore: combinedTier,
      breakdown,
      isLowConfidence: false, // Set by service
      scoringStrategy: 'tiered',
    };
  }
}

export default TieredScorer;
