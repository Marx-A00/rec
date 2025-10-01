// src/lib/musicbrainz/musicbrainz-service.ts
/**
 * Production MusicBrainz service with comprehensive error handling, logging, and monitoring
 * Wraps the basic service with production-ready error handling capabilities
 */

import { musicbrainzService as basicMusicBrainzService } from './basic-service';
import { musicbrainzErrorHandler } from './error-handler';
import type { 
  ArtistSearchResult, 
  ReleaseGroupSearchResult, 
  RecordingSearchResult 
} from './basic-service';

export class MusicBrainzService {
  private baseService = basicMusicBrainzService;
  private errorHandler = musicbrainzErrorHandler;

  /**
   * Search for artists with enhanced error handling and monitoring
   */
  async searchArtists(
    query: string,
    limit = 25,
    offset = 0
  ): Promise<ArtistSearchResult[]> {
    return this.errorHandler.withErrorHandling(
      () => this.baseService.searchArtists(query, limit, offset),
      'searchArtists',
      { query, limit, offset }
    );
  }

  /**
   * Search for release groups (albums) with enhanced error handling
   */
  async searchReleaseGroups(
    query: string,
    limit = 25,
    offset = 0
  ): Promise<ReleaseGroupSearchResult[]> {
    return this.errorHandler.withErrorHandling(
      () => this.baseService.searchReleaseGroups(query, limit, offset),
      'searchReleaseGroups',
      { query, limit, offset }
    );
  }

  /**
   * Search for recordings with enhanced error handling
   */
  async searchRecordings(
    query: string,
    limit = 25,
    offset = 0
  ): Promise<RecordingSearchResult[]> {
    return this.errorHandler.withErrorHandling(
      () => this.baseService.searchRecordings(query, limit, offset),
      'searchRecordings',
      { query, limit, offset }
    );
  }

  /**
   * Get artist by MBID with enhanced error handling
   */
  async getArtist(mbid: string, includes: string[] = []) {
    return this.errorHandler.withErrorHandling(
      () => this.baseService.getArtist(mbid, includes),
      'getArtist',
      { mbid, includes }
    );
  }

  /**
   * Get release group by MBID with enhanced error handling
   */
  async getReleaseGroup(mbid: string, includes: string[] = []) {
    return this.errorHandler.withErrorHandling(
      () => this.baseService.getReleaseGroup(mbid, includes),
      'getReleaseGroup',
      { mbid, includes }
    );
  }

  /**
   * Get recording by MBID with enhanced error handling
   */
  async getRecording(mbid: string, includes: string[] = []) {
    return this.errorHandler.withErrorHandling(
      () => this.baseService.getRecording(mbid, includes),
      'getRecording',
      { mbid, includes }
    );
  }

  /**
   * Get release by MBID with enhanced error handling
   */
  async getRelease(mbid: string, includes: string[] = []) {
    return this.errorHandler.withErrorHandling(
      () => this.baseService.getRelease(mbid, includes),
      'getRelease',
      { mbid, includes }
    );
  }

  /**
   * Browse artist release groups with enhanced error handling
   */
  async getArtistReleaseGroups(artistMbid: string, limit = 50, offset = 0) {
    return this.errorHandler.withErrorHandling(
      () => this.baseService.getArtistReleaseGroups(artistMbid, limit, offset),
      'getArtistReleaseGroups',
      { artistMbid, limit, offset }
    );
  }

  /**
   * Browse release recordings with enhanced error handling
   */
  async getReleaseRecordings(releaseMbid: string, limit = 50, offset = 0) {
    return this.errorHandler.withErrorHandling(
      () => this.baseService.getReleaseRecordings(releaseMbid, limit, offset),
      'getReleaseRecordings',
      { releaseMbid, limit, offset }
    );
  }

  /**
   * Safe search with fallback behavior - tries multiple strategies if initial search fails
   */
  async safeSearchArtists(
    query: string,
    limit = 25,
    offset = 0
  ): Promise<ArtistSearchResult[]> {
    try {
      return await this.searchArtists(query, limit, offset);
    } catch (error) {
      console.warn(`🔄 Primary artist search failed for "${query}", trying fallback strategies`);
      
      // Fallback 1: Try with simplified query (remove special characters)
      const simplifiedQuery = query.replace(/[^\w\s]/g, '').trim();
      if (simplifiedQuery !== query && simplifiedQuery.length > 0) {
        try {
          console.log(`🔄 Trying simplified query: "${simplifiedQuery}"`);
          return await this.searchArtists(simplifiedQuery, limit, offset);
        } catch (fallbackError) {
          console.warn(`🔄 Simplified query also failed for "${simplifiedQuery}"`);
        }
      }

      // Fallback 2: Try with just the first word if it's a multi-word query
      const firstWord = query.split(' ')[0];
      if (firstWord !== query && firstWord.length > 2) {
        try {
          console.log(`🔄 Trying first word only: "${firstWord}"`);
          return await this.searchArtists(firstWord, limit, offset);
        } catch (fallbackError) {
          console.warn(`🔄 First word search also failed for "${firstWord}"`);
        }
      }

      // If all fallbacks fail, return empty array instead of throwing
      console.error(`❌ All search strategies failed for "${query}", returning empty results`);
      return [];
    }
  }

  /**
   * Safe search for release groups with fallback behavior
   */
  async safeSearchReleaseGroups(
    query: string,
    limit = 25,
    offset = 0
  ): Promise<ReleaseGroupSearchResult[]> {
    try {
      return await this.searchReleaseGroups(query, limit, offset);
    } catch (error) {
      console.warn(`🔄 Primary release group search failed for "${query}", trying fallback strategies`);
      
      // Similar fallback strategies as artists
      const simplifiedQuery = query.replace(/[^\w\s]/g, '').trim();
      if (simplifiedQuery !== query && simplifiedQuery.length > 0) {
        try {
          return await this.searchReleaseGroups(simplifiedQuery, limit, offset);
        } catch (fallbackError) {
          console.warn(`🔄 Simplified release group query also failed`);
        }
      }

      console.error(`❌ All release group search strategies failed for "${query}", returning empty results`);
      return [];
    }
  }

  /**
   * Batch search with rate limiting awareness
   */
  async batchSearchArtists(
    queries: string[],
    batchSize = 5,
    delayMs = 1100 // Slightly over 1 second to respect rate limits
  ): Promise<{ query: string; results: ArtistSearchResult[]; error?: string }[]> {
    const results: { query: string; results: ArtistSearchResult[]; error?: string }[] = [];
    
    console.log(`🔍 Starting batch search for ${queries.length} artists (batch size: ${batchSize})`);
    
    for (let i = 0; i < queries.length; i += batchSize) {
      const batch = queries.slice(i, i + batchSize);
      console.log(`🔍 Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(queries.length / batchSize)}`);
      
      for (const query of batch) {
        try {
          const searchResults = await this.safeSearchArtists(query);
          results.push({ query, results: searchResults });
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          results.push({ query, results: [], error: errorMessage });
          console.error(`❌ Batch search failed for "${query}":`, errorMessage);
        }
        
        // Add delay between requests within batch to respect rate limits
        if (batch.indexOf(query) < batch.length - 1) {
          await new Promise(resolve => setTimeout(resolve, delayMs));
        }
      }
      
      // Longer delay between batches
      if (i + batchSize < queries.length) {
        console.log(`⏳ Waiting before next batch...`);
        await new Promise(resolve => setTimeout(resolve, delayMs * 2));
      }
    }
    
    const successCount = results.filter(r => !r.error).length;
    console.log(`✅ Batch search completed: ${successCount}/${queries.length} successful`);
    
    return results;
  }

  /**
   * Get service health information
   */
  getHealthStatus() {
    return this.errorHandler.getHealthStatus();
  }

  /**
   * Get detailed metrics for monitoring
   */
  getMetrics() {
    return this.errorHandler.getMetrics();
  }

  /**
   * Check if service is healthy
   */
  isHealthy(): boolean {
    return this.errorHandler.isHealthy();
  }

  /**
   * Reset metrics (useful for testing)
   */
  resetMetrics() {
    this.errorHandler.resetMetrics();
  }
}

// Export singleton instance
export const musicBrainzService = new MusicBrainzService();
