/**
 * Weighted Scorer: 0-100 scale with multiple signals
 * Good for: Fine-grained ranking with transparent breakdown
 */

import {
  calculateStringSimilarity,
  normalizeString,
} from '@/lib/utils/string-similarity';

import type { CorrectionSearchResult } from '../types';

import type { SearchScorer, ScoredSearchResult, ScoreBreakdown } from './types';

/**
 * Weighted scorer: 0-100 scale with multiple signals
 * Provides transparent breakdown of how each component contributes
 */
export class WeightedScorer implements SearchScorer {
  readonly strategy = 'weighted' as const;

  // Point allocations for each signal
  private readonly WEIGHTS = {
    title: 40, // 40 points max
    artist: 40, // 40 points max
    year: 10, // 10 points for having year data
    mbScore: 10, // 10 points from MB search relevance
  };

  score(
    result: CorrectionSearchResult,
    albumQuery: string,
    artistQuery?: string
  ): ScoredSearchResult {
    // Title match (0-40 points)
    const titleSimilarity = calculateStringSimilarity(result.title, albumQuery);
    const titleScore = titleSimilarity * this.WEIGHTS.title;

    // Artist match (0-40 points) - only if artist query provided
    let artistScore = 0;
    if (artistQuery && result.primaryArtistName) {
      const artistSimilarity = calculateStringSimilarity(
        result.primaryArtistName,
        artistQuery
      );
      artistScore = artistSimilarity * this.WEIGHTS.artist;

      // Bonus for exact match (up to 10%)
      if (
        normalizeString(result.primaryArtistName) ===
        normalizeString(artistQuery)
      ) {
        artistScore = Math.min(this.WEIGHTS.artist, artistScore * 1.1);
      }
    }

    // Year presence (0-10 points)
    const yearScore = result.firstReleaseDate ? this.WEIGHTS.year : 0;

    // MusicBrainz relevance score (0-10 points) - normalized from 0-100
    const mbScoreNormalized = (result.mbScore / 100) * this.WEIGHTS.mbScore;

    // Calculate total (max depends on whether artist was searched)
    const maxScore = artistQuery
      ? this.WEIGHTS.title +
        this.WEIGHTS.artist +
        this.WEIGHTS.year +
        this.WEIGHTS.mbScore
      : this.WEIGHTS.title + this.WEIGHTS.year + this.WEIGHTS.mbScore;

    const totalScore = artistQuery
      ? titleScore + artistScore + yearScore + mbScoreNormalized
      : titleScore + yearScore + mbScoreNormalized;

    const normalizedScore = totalScore / maxScore;

    const breakdown: ScoreBreakdown = {
      titleScore: Math.round(titleScore * 10) / 10,
      artistScore: Math.round(artistScore * 10) / 10,
      yearScore,
      mbScore: Math.round(mbScoreNormalized * 10) / 10,
    };

    return {
      ...result,
      normalizedScore: Math.round(normalizedScore * 100) / 100,
      displayScore: Math.round(totalScore),
      breakdown,
      isLowConfidence: false, // Set by service
      scoringStrategy: 'weighted',
    };
  }
}

export default WeightedScorer;
