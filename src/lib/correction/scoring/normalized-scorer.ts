/**
 * Normalized Scorer: 0-1 scale using string similarity
 * Good for: Simple, interpretable scores
 */

import {
  calculateStringSimilarity,
  normalizeString,
} from '@/lib/utils/string-similarity';
import type { CorrectionSearchResult } from '../types';
import type {
  SearchScorer,
  ScoredSearchResult,
  ScoreBreakdown,
} from './types';

/**
 * Normalized scorer: 0-1 scale using string similarity
 * Produces consistent 0-1 normalized scores for all components
 */
export class NormalizedScorer implements SearchScorer {
  readonly strategy = 'normalized' as const;

  score(
    result: CorrectionSearchResult,
    albumQuery: string,
    artistQuery?: string
  ): ScoredSearchResult {
    // Calculate title similarity
    const titleScore = calculateStringSimilarity(result.title, albumQuery);

    // Calculate artist similarity (boost exact matches)
    let artistScore = 0;
    if (artistQuery && result.primaryArtistName) {
      artistScore = calculateStringSimilarity(
        result.primaryArtistName,
        artistQuery
      );
      // Boost if exact match after normalization
      if (
        normalizeString(result.primaryArtistName) ===
        normalizeString(artistQuery)
      ) {
        artistScore = Math.min(1, artistScore * 1.2);
      }
    }

    // Year score: 1.0 if year present, 0 if not (simple presence check)
    const yearScore = result.firstReleaseDate ? 1.0 : 0;

    // Combine scores with weighted average
    // With artist: title (1.0) + artist (1.0) + year (0.5) = 2.5 max weight
    // Without artist: title (1.0) + year (0.5) = 1.5 max weight
    const normalizedScore = artistQuery
      ? (titleScore + artistScore + yearScore * 0.5) / 2.5
      : (titleScore + yearScore * 0.5) / 1.5;

    const breakdown: ScoreBreakdown = {
      titleScore: Math.round(titleScore * 100) / 100,
      artistScore: Math.round(artistScore * 100) / 100,
      yearScore: yearScore,
    };

    return {
      ...result,
      normalizedScore: Math.round(normalizedScore * 100) / 100,
      displayScore: Math.round(normalizedScore * 100) / 100,
      breakdown,
      isLowConfidence: false, // Set by service
      scoringStrategy: 'normalized',
    };
  }
}

export default NormalizedScorer;
