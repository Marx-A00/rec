/**
 * Search Scoring Module
 *
 * Provides pluggable scoring strategies for correction search results.
 * Admins can switch strategies at runtime to test different approaches.
 */

import type { CorrectionSearchResult } from '../types';

import type {
  SearchScorer,
  ScoredSearchResult,
  ScoringOptions,
  ScoringStrategy,
} from './types';
import { NormalizedScorer } from './normalized-scorer';
import { TieredScorer } from './tiered-scorer';
import { WeightedScorer } from './weighted-scorer';

// Re-export types
export * from './types';

// Default low-confidence threshold (per RESEARCH.md recommendation)
const DEFAULT_LOW_CONFIDENCE_THRESHOLD = 0.5;

/**
 * Service for scoring and ranking correction search results.
 * Supports pluggable strategies for dev testing different scoring approaches.
 *
 * @example
 * const service = getSearchScoringService();
 * service.setStrategy('weighted');
 * const scored = service.scoreResults(results, 'OK Computer', 'Radiohead');
 */
export class SearchScoringService {
  private strategy: ScoringStrategy = 'normalized';
  private lowConfidenceThreshold = DEFAULT_LOW_CONFIDENCE_THRESHOLD;

  /**
   * Set the scoring strategy
   */
  setStrategy(strategy: ScoringStrategy): void {
    this.strategy = strategy;
  }

  /**
   * Get current strategy
   */
  getStrategy(): ScoringStrategy {
    return this.strategy;
  }

  /**
   * Set low-confidence threshold (0-1)
   * Results below this threshold will be flagged as low-confidence
   */
  setLowConfidenceThreshold(threshold: number): void {
    this.lowConfidenceThreshold = Math.max(0, Math.min(1, threshold));
  }

  /**
   * Get current low-confidence threshold
   */
  getLowConfidenceThreshold(): number {
    return this.lowConfidenceThreshold;
  }

  /**
   * Score a list of search results
   * @param results - Raw search results from CorrectionSearchService
   * @param albumQuery - Original album query
   * @param artistQuery - Original artist query (optional)
   * @param options - Optional overrides for strategy and threshold
   * @returns Scored and sorted results (highest score first)
   */
  scoreResults(
    results: CorrectionSearchResult[],
    albumQuery: string,
    artistQuery?: string,
    options?: ScoringOptions
  ): ScoredSearchResult[] {
    const strategy = options?.strategy ?? this.strategy;
    const threshold =
      options?.lowConfidenceThreshold ?? this.lowConfidenceThreshold;

    const scorer = this.getScorer(strategy);

    return results
      .map(result => {
        const scored = scorer.score(result, albumQuery, artistQuery);
        return {
          ...scored,
          isLowConfidence: scored.normalizedScore < threshold,
        };
      })
      .sort((a, b) => b.normalizedScore - a.normalizedScore);
  }

  /**
   * Score a single result (without sorting)
   */
  scoreResult(
    result: CorrectionSearchResult,
    albumQuery: string,
    artistQuery?: string,
    options?: ScoringOptions
  ): ScoredSearchResult {
    const strategy = options?.strategy ?? this.strategy;
    const threshold =
      options?.lowConfidenceThreshold ?? this.lowConfidenceThreshold;

    const scorer = this.getScorer(strategy);
    const scored = scorer.score(result, albumQuery, artistQuery);

    return {
      ...scored,
      isLowConfidence: scored.normalizedScore < threshold,
    };
  }

  /**
   * Get scorer instance for strategy
   */
  private getScorer(strategy: ScoringStrategy): SearchScorer {
    switch (strategy) {
      case 'normalized':
        return new NormalizedScorer();
      case 'tiered':
        return new TieredScorer();
      case 'weighted':
        return new WeightedScorer();
      default:
        return new NormalizedScorer();
    }
  }
}

// Singleton instance
let scoringServiceInstance: SearchScoringService | null = null;

/**
 * Get the singleton SearchScoringService instance
 */
export function getSearchScoringService(): SearchScoringService {
  if (!scoringServiceInstance) {
    scoringServiceInstance = new SearchScoringService();
  }
  return scoringServiceInstance;
}
