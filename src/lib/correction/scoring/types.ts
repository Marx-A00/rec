/**
 * Type definitions for the scoring system.
 * Provides pluggable scoring strategies for correction search results.
 */

import type { CorrectionSearchResult } from '../types';

/**
 * Available scoring strategies
 * - normalized: 0-1 scale using string-similarity
 * - tiered: high/medium/low confidence levels
 * - weighted: 0-100 with multiple signals
 */
export type ScoringStrategy = 'normalized' | 'tiered' | 'weighted';

/**
 * Confidence tier for tiered scoring
 */
export type ConfidenceTier = 'high' | 'medium' | 'low' | 'none';

/**
 * Score breakdown showing component scores
 */
export interface ScoreBreakdown {
  /** Title match score (strategy-specific range) */
  titleScore: number;
  /** Artist match score (strategy-specific range) */
  artistScore: number;
  /** Year/date score (strategy-specific range) */
  yearScore: number;
  /** For tiered strategy: confidence level */
  confidenceTier?: ConfidenceTier;
  /** Any additional signals */
  [key: string]: number | string | undefined;
}

/**
 * A search result with scoring applied
 */
export interface ScoredSearchResult extends CorrectionSearchResult {
  /** Normalized score 0-1 for sorting (all strategies produce this) */
  normalizedScore: number;
  /** Raw display score (0-1, 0-100, or tier name depending on strategy) */
  displayScore: number | string;
  /** Component score breakdown for debugging */
  breakdown: ScoreBreakdown;
  /** True if score is below low-confidence threshold */
  isLowConfidence: boolean;
  /** Which strategy produced this score */
  scoringStrategy: ScoringStrategy;
}

/**
 * Interface for scoring strategy implementations
 */
export interface SearchScorer {
  /**
   * Score a single search result
   * @param result - The search result to score
   * @param albumQuery - Original album query
   * @param artistQuery - Original artist query (optional)
   * @returns Scored result with normalized score, display score, and breakdown
   */
  score(
    result: CorrectionSearchResult,
    albumQuery: string,
    artistQuery?: string
  ): ScoredSearchResult;

  /** Strategy identifier */
  readonly strategy: ScoringStrategy;
}

/**
 * Options for scoring service
 */
export interface ScoringOptions {
  /** Which strategy to use */
  strategy?: ScoringStrategy;
  /** Threshold below which results are flagged as low-confidence (0-1 scale) */
  lowConfidenceThreshold?: number;
}
